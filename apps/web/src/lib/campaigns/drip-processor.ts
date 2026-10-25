// src/lib/campaigns/drip-processor.ts
// Shared drip-step processor (UNI-2356): advances due enrollments for a
// campaign — live SendGrid sends when dryRun is false, a read-only preview
// otherwise (UNI-2931: a dry run performs no writes at all). Used by
// POST /api/campaigns/drip (process_pending) and the
// /api/cron/drip-process cron so both paths share one send/advance semantics.

import type { SupabaseClient } from '@supabase/supabase-js'
import { sendEmail, type EmailRecipient } from '@/lib/integrations/sendgrid'

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
  /** true (default upstream) is a read-only preview: no provider call, no DB writes. */
  dryRun: boolean
  now?: Date
}

export interface DripProcessSummary {
  processed: number
  skipped: number
  failed: number
  /**
   * Dry run only: due non-test recipients the preview does not simulate (a live
   * run would attempt them). Absent on live runs.
   */
  blocked?: number
  dryRun: boolean
  providerSend: 'not_attempted' | 'attempted'
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
 * Sender identity for a business's drip emails. Same resolution order as the
 * email_campaigns blast side (UNI-2332): explicit env sender first, then the
 * business's conventional noreply address.
 */
export function resolveDripFromAddress(businessKey: string): EmailRecipient {
  return {
    email:
      process.env.SENDGRID_FROM_EMAIL?.trim() ||
      process.env.DEFAULT_FROM?.trim() ||
      `noreply@${businessKey}.com.au`,
    name: businessKey.toUpperCase(),
  }
}

/**
 * Process every due active enrollment of one campaign.
 *
 * dryRun=true is a read-only preview (UNI-2931): it reads steps and due
 * enrollments and writes NOTHING (no enrollment, event or campaign update) and
 * never sends. `processed` counts due safe-test-recipient enrollments that
 * would advance, `skipped` counts due enrollments with no matching step (would
 * complete), `blocked` counts due non-test recipients the preview does not
 * simulate, and `failed` is always 0.
 * dryRun=false is the live lane: each due step is sent via SendGrid, recorded
 * as a `sent` event (provider_send='sent', metadata.messageId), and the
 * enrollment advances or completes.
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
  let blocked = 0

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

  for (const enrollment of (enrollments ?? []) as DripEnrollmentRow[]) {
    const step = stepsByOrder.get(enrollment.current_step_order)
    if (dryRun) {
      // Read-only preview: classify, never write.
      if (!step) skipped++
      else if (isSafeDryRunRecipient(enrollment.email)) processed++
      else blocked++
      continue
    }

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

    let messageId: string
    try {
      messageId = await sendEmail({
        to: { email: enrollment.email, name: enrollment.name ?? undefined },
        from: resolveDripFromAddress(businessKey),
        subject: step.subject,
        html: step.body_html,
        text: step.body_text ?? undefined,
        categories: ['drip'],
        customArgs: { drip_enrollment_id: enrollment.id, drip_step_id: step.id },
      })
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
      event_type: 'sent',
      provider_send: 'sent',
      metadata: { dryRun: false, messageId } satisfies JsonObject,
    })

    const { error: updateError } = await supabase
      .from('drip_enrollments')
      .update(update)
      .eq('id', enrollment.id)
      .eq('founder_id', founderId)

    if (eventError || updateError) failed++
    else processed++
  }

  if (!dryRun && failed > 0) {
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
    ...(dryRun ? { blocked } : {}),
    dryRun,
    providerSend: dryRun ? 'not_attempted' : 'attempted',
  }
}
