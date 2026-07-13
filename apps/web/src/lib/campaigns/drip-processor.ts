// src/lib/campaigns/drip-processor.ts
// Shared drip-step processor (UNI-2356): advances due enrollments for a
// campaign — live SendGrid sends when dryRun is false, dry-run bookkeeping
// otherwise. Used by POST /api/campaigns/drip (process_pending) and the
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
  const now = input.now ?? new Date()
  let processed = 0
  let skipped = 0
  let failed = 0

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

    if (!dryRun) {
      try {
        const messageId = await sendEmail({
          to: { email: enrollment.email, name: enrollment.name ?? undefined },
          from: resolveDripFromAddress(businessKey),
          subject: step.subject,
          html: step.body_html,
          text: step.body_text ?? undefined,
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
