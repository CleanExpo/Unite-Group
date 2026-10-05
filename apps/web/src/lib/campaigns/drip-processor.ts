// src/lib/campaigns/drip-processor.ts
// Shared drip-step processor (UNI-2356): advances due enrollments for a
// campaign — live SendGrid sends when dryRun is false, dry-run bookkeeping
// otherwise. Used by POST /api/campaigns/drip (process_pending) and the
// /api/cron/drip-process cron so both paths share one send/advance semantics.

import type { SupabaseClient } from '@supabase/supabase-js'
import { sendEmail, type EmailRecipient } from '@/lib/integrations/sendgrid'
import {
  DRIP_SUPPRESSIONS_TABLE,
  isAllowlistDisabled,
  normaliseEmail,
  parseRecipientAllowlist,
  unsubscribeUrlBuilder,
} from '@/lib/campaigns/drip-unsubscribe'

type JsonObject = Record<string, unknown>

type DripStepRow = {
  id: string
  step_order: number
  subject: string
  body_html: string
  body_text: string | null
  delay_minutes: number
}

type DripEnrollmentRow = {
  id: string
  contact_id: string
  email: string
  name: string | null
  current_step_order: number
}

export interface ProcessCampaignDripInput {
  supabase: SupabaseClient
  founderId: string
  campaignId: string
  /** Business key the campaign belongs to — drives the from-address. */
  businessKey: string
  /** true (default upstream) never touches the provider. */
  dryRun: boolean
  now?: Date
}

export interface DripProcessSummary {
  processed: number
  skipped: number
  failed: number
  dryRun: boolean
  providerSend: 'not_attempted' | 'attempted'
  /**
   * Set when a live run was refused before any send (UNI-2291 gates). Nothing
   * was sent and no enrollment was touched.
   */
  blockedReason?:
    | 'sender_not_configured'
    | 'unsubscribe_not_configured'
    | 'allowlist_empty'
    | 'suppression_lookup_failed'
  /** true when a live run was refused because DRIP_LIVE_SEND_ENABLED is not 'true'. */
  liveSendDisabled?: boolean
}

/**
 * Live-send master switch (UNI-2918). Drip email reaches a real inbox only when
 * DRIP_LIVE_SEND_ENABLED is exactly 'true' on the server. It stays off until
 * the UNI-2291 consent, unsubscribe and suppression gates are on main and the
 * founder sets it; until then every live request is refused before any read,
 * write or provider call, so no enrollment is advanced or marked failed.
 */
export function isDripLiveSendEnabled(): boolean {
  return process.env.DRIP_LIVE_SEND_ENABLED === 'true'
}

function isSafeDryRunRecipient(email: string): boolean {
  return email.endsWith('@unite-hub.test') || email.includes('__PW_TEST__')
}

/**
 * Sender identity for a business's drip emails: SENDGRID_FROM_EMAIL only.
 * Returns null when it is unset — live drip never invents or defaults a
 * sender (UNI-2291); an unset sender blocks the send.
 */
export function resolveDripFromAddress(businessKey: string): EmailRecipient | null {
  const email = process.env.SENDGRID_FROM_EMAIL?.trim()
  if (!email) return null
  return { email, name: businessKey.toUpperCase() }
}

type LiveSendGates = {
  from: EmailRecipient
  unsubscribeUrlFor: (email: string) => string
  /** null when DRIP_ALLOWLIST_DISABLED=true. */
  allowlist: Set<string> | null
}

type BlockedReason = NonNullable<DripProcessSummary['blockedReason']>

/**
 * Campaign-level live-send gates (UNI-2291), all fail closed: no explicit
 * sender, no unsubscribe link, or an empty allowlist (unless explicitly
 * disabled) refuses the whole run before any read, write or provider call.
 */
function resolveLiveSendGates(
  founderId: string,
  businessKey: string
): LiveSendGates | { blockedReason: BlockedReason } {
  const from = resolveDripFromAddress(businessKey)
  if (!from) return { blockedReason: 'sender_not_configured' }
  const unsubscribeUrlFor = unsubscribeUrlBuilder(founderId)
  if (!unsubscribeUrlFor) return { blockedReason: 'unsubscribe_not_configured' }
  if (isAllowlistDisabled()) return { from, unsubscribeUrlFor, allowlist: null }
  const allowlist = parseRecipientAllowlist()
  if (allowlist.size === 0) return { blockedReason: 'allowlist_empty' }
  return { from, unsubscribeUrlFor, allowlist }
}

function blockedSummary(blockedReason: BlockedReason): DripProcessSummary {
  return {
    processed: 0,
    skipped: 0,
    failed: 0,
    dryRun: false,
    providerSend: 'not_attempted',
    blockedReason,
  }
}

function withUnsubscribeFooter(html: string, text: string | null, url: string) {
  return {
    html: `${html}\n<p style="font-size:12px;color:#666">Don't want these emails? <a href="${url}">Unsubscribe</a>.</p>`,
    text: `${text ?? ''}\n\nDon't want these emails? Unsubscribe: ${url}`.trimStart(),
  }
}

/**
 * Record a gate skip honestly: the enrollment moves to `status` with the
 * reason in metadata, and a `skipped` event says the provider was never
 * called. Returns false when the bookkeeping itself failed.
 */
async function recordGateSkip(
  supabase: SupabaseClient,
  founderId: string,
  campaignId: string,
  enrollment: DripEnrollmentRow,
  stepId: string,
  status: 'paused' | 'cancelled',
  reason: 'not_allowlisted' | 'suppressed',
  now: Date
): Promise<boolean> {
  const { error: updateError } = await supabase
    .from('drip_enrollments')
    .update({
      status,
      metadata: { blockedReason: reason, blockedAt: now.toISOString() } satisfies JsonObject,
    })
    .eq('id', enrollment.id)
    .eq('founder_id', founderId)

  const { error: eventError } = await supabase.from('drip_events').insert({
    founder_id: founderId,
    campaign_id: campaignId,
    enrollment_id: enrollment.id,
    contact_id: enrollment.contact_id,
    step_id: stepId,
    event_type: 'skipped',
    provider_send: 'not_attempted',
    metadata: { dryRun: false, reason } satisfies JsonObject,
  })

  if (updateError || eventError) {
    console.error(
      `[drip-processor] ${reason} bookkeeping failed:`,
      updateError?.message ?? eventError?.message
    )
    return false
  }
  return true
}

/**
 * Process every due active enrollment of one campaign.
 *
 * Live runs pass the UNI-2291 gates first (sender, unsubscribe link,
 * allowlist, suppression — see resolveLiveSendGates); every live email carries
 * an unsubscribe link in html + text and RFC 8058 List-Unsubscribe headers.
 *
 * dryRun=true keeps the pre-UNI-2356 semantics exactly: safe test recipients
 * are advanced with a `dry_run_processed` event, everything else is blocked
 * and marked failed. dryRun=false is the new live lane: each due step is sent
 * via SendGrid, recorded as a `sent` event (provider_send='sent',
 * metadata.messageId), and the enrollment advances or completes.
 */
export async function processCampaignDrip(
  input: ProcessCampaignDripInput
): Promise<DripProcessSummary> {
  const { supabase, founderId, campaignId, businessKey, dryRun } = input

  if (!dryRun && !isDripLiveSendEnabled()) {
    return {
      processed: 0,
      skipped: 0,
      failed: 0,
      dryRun: false,
      providerSend: 'not_attempted',
      liveSendDisabled: true,
    }
  }

  const now = input.now ?? new Date()
  let processed = 0
  let skipped = 0
  let failed = 0

  const gates = dryRun ? null : resolveLiveSendGates(founderId, businessKey)
  if (gates && 'blockedReason' in gates) return blockedSummary(gates.blockedReason)
  const live = gates

  const { data: stepsData, error: stepsError } = await supabase
    .from('drip_steps')
    .select('*')
    .eq('campaign_id', campaignId)
    .eq('founder_id', founderId)
    .order('step_order', { ascending: true })

  if (stepsError) throw stepsError
  const steps = (stepsData ?? []) as DripStepRow[]
  const stepsByOrder = new Map(steps.map((step) => [step.step_order, step]))

  const { data: enrollments, error: enrollmentsError } = await supabase
    .from('drip_enrollments')
    .select('*')
    .eq('campaign_id', campaignId)
    .eq('founder_id', founderId)
    .eq('status', 'active')
    .lte('next_run_at', now.toISOString())
    .order('next_run_at', { ascending: true })

  if (enrollmentsError) throw enrollmentsError
  const due = (enrollments ?? []) as DripEnrollmentRow[]

  // Suppression lookup (UNI-2291): one read for every due recipient. A failed
  // read refuses the whole live run — never send without knowing.
  let suppressed = new Set<string>()
  if (live && due.length > 0) {
    const { data: suppressionRows, error: suppressionError } = await supabase
      .from(DRIP_SUPPRESSIONS_TABLE)
      .select('email')
      .eq('founder_id', founderId)
      .in('email', [...new Set(due.map((e) => normaliseEmail(e.email)))])
    if (suppressionError) {
      console.error('[drip-processor] suppression lookup failed:', suppressionError.message)
      return blockedSummary('suppression_lookup_failed')
    }
    suppressed = new Set(
      ((suppressionRows ?? []) as Array<{ email: string }>).map((r) => normaliseEmail(r.email))
    )
  }

  for (const enrollment of due) {
    const step = stepsByOrder.get(enrollment.current_step_order)
    if (!step) {
      const { error } = await supabase
        .from('drip_enrollments')
        .update({ status: 'completed', completed_at: now.toISOString() })
        .eq('id', enrollment.id)
        .eq('founder_id', founderId)
      if (error) failed++
      else skipped++
      continue
    }

    if (dryRun && !isSafeDryRunRecipient(enrollment.email)) {
      const { error: updateError } = await supabase
        .from('drip_enrollments')
        .update({
          status: 'failed',
          metadata: {
            blockedReason: 'unsafe_or_live_send_blocked',
            blockedAt: now.toISOString(),
            dryRun,
          } satisfies JsonObject,
        })
        .eq('id', enrollment.id)
        .eq('founder_id', founderId)

      if (updateError) {
        console.error('[drip-processor] unsafe send block failed:', updateError.message)
        failed++
        continue
      }

      const { error: eventError } = await supabase.from('drip_events').insert({
        founder_id: founderId,
        campaign_id: campaignId,
        enrollment_id: enrollment.id,
        contact_id: enrollment.contact_id,
        step_id: step.id,
        event_type: 'failed',
        provider_send: 'not_attempted',
        metadata: { dryRun, reason: 'unsafe_or_live_send_blocked' } satisfies JsonObject,
      })

      if (eventError) {
        console.error('[drip-processor] unsafe send event failed:', eventError?.message)
      }
      failed++
      continue
    }

    let eventType: 'dry_run_processed' | 'sent' = 'dry_run_processed'
    let providerSend = 'not_attempted'
    let eventMetadata: JsonObject = { dryRun: true }

    if (live) {
      const recipient = normaliseEmail(enrollment.email)
      // Suppressed → cancelled (permanent). Outside the testing allowlist →
      // paused (reversible), not failed, so the enrollment stays intact for
      // when the allowlist lifts.
      const gateSkip = suppressed.has(recipient)
        ? ({ status: 'cancelled', reason: 'suppressed' } as const)
        : live.allowlist && !live.allowlist.has(recipient)
          ? ({ status: 'paused', reason: 'not_allowlisted' } as const)
          : null
      if (gateSkip) {
        const ok = await recordGateSkip(
          supabase,
          founderId,
          campaignId,
          enrollment,
          step.id,
          gateSkip.status,
          gateSkip.reason,
          now
        )
        if (ok) skipped++
        else failed++
        continue
      }

      const unsubscribeUrl = live.unsubscribeUrlFor(recipient)
      try {
        const messageId = await sendEmail({
          to: { email: enrollment.email, name: enrollment.name ?? undefined },
          from: live.from,
          subject: step.subject,
          ...withUnsubscribeFooter(step.body_html, step.body_text, unsubscribeUrl),
          headers: {
            'List-Unsubscribe': `<${unsubscribeUrl}>`,
            'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
          },
          categories: ['drip'],
          customArgs: { drip_enrollment_id: enrollment.id, drip_step_id: step.id },
        })
        eventType = 'sent'
        providerSend = 'sent'
        eventMetadata = { dryRun: false, messageId }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err)
        console.error('[drip-processor] send failed:', message)

        const { error: updateError } = await supabase
          .from('drip_enrollments')
          .update({
            status: 'failed',
            metadata: {
              blockedReason: 'provider_send_failed',
              blockedAt: now.toISOString(),
              error: message,
            } satisfies JsonObject,
          })
          .eq('id', enrollment.id)
          .eq('founder_id', founderId)

        const { error: eventError } = await supabase.from('drip_events').insert({
          founder_id: founderId,
          campaign_id: campaignId,
          enrollment_id: enrollment.id,
          contact_id: enrollment.contact_id,
          step_id: step.id,
          event_type: 'failed',
          provider_send: 'error',
          metadata: { dryRun: false, error: message } satisfies JsonObject,
        })

        if (updateError || eventError) {
          console.error(
            '[drip-processor] send-failure bookkeeping failed:',
            updateError?.message ?? eventError?.message
          )
        }
        failed++
        continue
      }
    }

    const nextOrder = enrollment.current_step_order + 1
    const nextStep = stepsByOrder.get(nextOrder)
    const update = nextStep
      ? {
          current_step_order: nextOrder,
          next_run_at: new Date(now.getTime() + nextStep.delay_minutes * 60_000).toISOString(),
        }
      : {
          current_step_order: nextOrder,
          status: 'completed',
          completed_at: now.toISOString(),
        }

    const { error: eventError } = await supabase.from('drip_events').insert({
      founder_id: founderId,
      campaign_id: campaignId,
      enrollment_id: enrollment.id,
      contact_id: enrollment.contact_id,
      step_id: step.id,
      event_type: eventType,
      provider_send: providerSend,
      metadata: eventMetadata,
    })

    const { error: updateError } = await supabase
      .from('drip_enrollments')
      .update(update)
      .eq('id', enrollment.id)
      .eq('founder_id', founderId)

    if (eventError || updateError) failed++
    else processed++
  }

  if (failed > 0) {
    await supabase
      .from('drip_campaigns')
      .update({ status: 'partial' })
      .eq('id', campaignId)
      .eq('founder_id', founderId)
  }

  return {
    processed,
    skipped,
    failed,
    dryRun,
    providerSend: dryRun ? 'not_attempted' : 'attempted',
  }
}
