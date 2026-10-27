// Card follow-up emails (UNI-3057): a details reminder and a review request for paid living-card orders.
//
// Sent once each per order by /api/cron/card-follow-up through the existing Mailtrap client. Held (sends and
// writes nothing) unless CARD_FOLLOWUP_EMAILS_ENABLED is exactly 'true' AND MAILTRAP_API_KEY is set.
//   intake_reminder  tier orders (ready/custom) with no intake row, 3+ days after payment.
//   review_request   tier orders 21+ days after payment, only when CARD_REVIEW_URL is set (fails closed).
// Orders older than 60 days are never emailed. Test-mode orders are skipped unless
// CARD_FOLLOWUP_INCLUDE_TEST_ORDERS is 'true'. Dedupe is UNIQUE(order_id, kind) in card_order_emails: the row is
// claimed before the send. The claim is removed only when Mailtrap definitely rejected the request (non-2xx), so a
// later run can retry. A 2xx without a message id keeps the claim (marked 'accepted-no-id'); a timeout or network
// error keeps it too (marked 'unknown-check-mailtrap') for a human to check, because the email may have gone out.

import { mailtrapFromEmail, sendEmail } from '@/lib/integrations/mailtrap'
import type { createServiceClient } from '@/lib/supabase/service'

type Admin = ReturnType<typeof createServiceClient>

export type FollowUpKind = 'intake_reminder' | 'review_request'

export const DAY_MS = 24 * 60 * 60 * 1000
export const INTAKE_REMINDER_AFTER_DAYS = 3
export const REVIEW_REQUEST_AFTER_DAYS = 21
export const MAX_ORDER_AGE_DAYS = 60

const TIER_NAMES: Record<string, string> = { ready: 'Ready-made', custom: 'Made for you' }

export interface FollowUpOrder {
  id: string
  created_at: string
  tier: string
  customer_name: string | null
  customer_email: string | null
  livemode: boolean
}

export function isFollowUpSendEnabled(): boolean {
  return process.env.CARD_FOLLOWUP_EMAILS_ENABLED?.trim() === 'true' && Boolean(process.env.MAILTRAP_API_KEY?.trim())
}

/** https review page from CARD_REVIEW_URL, else null (no review requests are sent). */
export function reviewUrl(): string | null {
  const raw = process.env.CARD_REVIEW_URL?.trim()
  if (!raw) return null
  try {
    const u = new URL(raw)
    return u.protocol === 'https:' ? u.toString() : null
  } catch {
    return null
  }
}

/** Which follow-ups an order is due, given what was already sent and whether its intake arrived. Pure. */
export function dueFollowUps(
  order: FollowUpOrder,
  opts: { now: number; hasIntake: boolean; alreadySent: ReadonlySet<FollowUpKind>; reviewUrl: string | null; includeTest: boolean },
): FollowUpKind[] {
  if (!TIER_NAMES[order.tier] || !order.customer_email) return []
  if (!order.livemode && !opts.includeTest) return []
  const ageDays = (opts.now - Date.parse(order.created_at)) / DAY_MS
  if (!Number.isFinite(ageDays) || ageDays > MAX_ORDER_AGE_DAYS) return []
  const due: FollowUpKind[] = []
  if (!opts.hasIntake && ageDays >= INTAKE_REMINDER_AFTER_DAYS && !opts.alreadySent.has('intake_reminder')) {
    due.push('intake_reminder')
  }
  if (opts.reviewUrl && ageDays >= REVIEW_REQUEST_AFTER_DAYS && !opts.alreadySent.has('review_request')) {
    due.push('review_request')
  }
  return due
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export function buildFollowUpEmail(
  kind: FollowUpKind,
  order: Pick<FollowUpOrder, 'customer_name' | 'tier'>,
  review: string | null,
): { subject: string; text: string; html: string } {
  const first = order.customer_name?.trim().split(/\s+/)[0]
  const greeting = first ? `Dear ${first},` : 'Hello,'
  const tierName = TIER_NAMES[order.tier] ?? 'living'
  const lines =
    kind === 'intake_reminder'
      ? [
          greeting,
          `Thank you again for ordering the ${tierName} living business card. We have not yet received your details, so we have not been able to start your card.`,
          'When you have a moment, please reply to this email with:',
          '1. Your logo (PNG, SVG or JPEG).',
          '2. Your name, title and business name as they should appear.',
          '3. The phone, email, website and social links you would like on the card.',
          'If you have already sent these, thank you, and please ignore this note.',
          'Kind regards,',
          'Margot',
          'Unite-Group',
        ]
      : [
          greeting,
          `Thank you for choosing a ${tierName} living business card from Unite-Group.`,
          'If you have received your card, we would be grateful for a short review. It takes about a minute and helps other business owners decide:',
          review ?? '',
          'If anything about your card is not right yet, simply reply to this email and we will help.',
          'Kind regards,',
          'Margot',
          'Unite-Group',
        ]
  const subject =
    kind === 'intake_reminder' ? `Your ${tierName} living card: we still need your details` : 'How is your living card going?'
  const html =
    '<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.5;color:#111">' +
    lines.map((l) => `<p style="margin:0 0 12px">${escapeHtml(l)}</p>`).join('') +
    '</div>'
  return { subject, text: lines.join('\n\n'), html }
}

export interface FollowUpSummary {
  checked: number
  sent: number
  skipped: number
  failed: number
}

/** Find due follow-ups and send each once. Throws only when the orders cannot be read. */
export async function processCardFollowUps(admin: Admin, founderId: string, now = Date.now()): Promise<FollowUpSummary> {
  const since = new Date(now - MAX_ORDER_AGE_DAYS * DAY_MS).toISOString()
  const { data: orders, error } = await admin
    .from('card_orders')
    .select('id, created_at, tier, customer_name, customer_email, livemode')
    .eq('founder_id', founderId)
    .gte('created_at', since)
  if (error) throw new Error(`card_orders read failed: ${error.message}`)
  const rows = (orders ?? []) as FollowUpOrder[]
  const summary: FollowUpSummary = { checked: rows.length, sent: 0, skipped: 0, failed: 0 }
  if (rows.length === 0) return summary
  // No key means sendEmail would no-op; claim nothing so the held state writes nothing.
  if (!process.env.MAILTRAP_API_KEY?.trim()) {
    summary.skipped = rows.length
    return summary
  }

  const ids = rows.map((o) => o.id)
  const [intakes, sentRows] = await Promise.all([
    admin.from('card_order_intakes').select('order_id').in('order_id', ids),
    admin.from('card_order_emails').select('order_id, kind').in('order_id', ids),
  ])
  if (intakes.error) throw new Error(`card_order_intakes read failed: ${intakes.error.message}`)
  if (sentRows.error) throw new Error(`card_order_emails read failed: ${sentRows.error.message}`)
  const withIntake = new Set(((intakes.data ?? []) as { order_id: string }[]).map((r) => r.order_id))
  const sentBy = new Map<string, Set<FollowUpKind>>()
  for (const r of (sentRows.data ?? []) as { order_id: string; kind: FollowUpKind }[]) {
    if (!sentBy.has(r.order_id)) sentBy.set(r.order_id, new Set())
    sentBy.get(r.order_id)!.add(r.kind)
  }

  const review = reviewUrl()
  const includeTest = process.env.CARD_FOLLOWUP_INCLUDE_TEST_ORDERS?.trim() === 'true'
  const from = process.env.CARD_WELCOME_FROM_EMAIL?.trim() || mailtrapFromEmail()

  for (const order of rows) {
    const due = dueFollowUps(order, {
      now,
      hasIntake: withIntake.has(order.id),
      alreadySent: sentBy.get(order.id) ?? new Set(),
      reviewUrl: review,
      includeTest,
    })
    if (due.length === 0) {
      summary.skipped++
      continue
    }
    for (const kind of due) {
      const claim = await admin
        .from('card_order_emails')
        .insert({ order_id: order.id, founder_id: founderId, kind })
        .select('id')
        .single()
      if (claim.error) {
        if ((claim.error as { code?: string }).code === '23505') summary.skipped++
        else summary.failed++
        continue
      }
      const claimId = (claim.data as { id: string }).id
      const msg = buildFollowUpEmail(kind, order, review)
      try {
        const messageId = await sendEmail({
          to: { email: order.customer_email!, ...(order.customer_name ? { name: order.customer_name } : {}) },
          from: { email: from, name: 'Margot at Unite-Group' },
          replyTo: { email: from },
          subject: `${order.livemode ? '' : '[TEST] '}${msg.subject}`,
          text: msg.text,
          html: msg.html,
          categories: [kind === 'intake_reminder' ? 'card-intake-reminder' : 'card-review-request'],
        })
        await admin
          .from('card_order_emails')
          .update({ message_id: messageId ?? 'accepted-no-id' })
          .eq('id', claimId)
        summary.sent++
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        console.error('[cards] follow-up send failed:', message)
        if (/send failed: HTTP \d+/.test(message)) {
          await admin.from('card_order_emails').delete().eq('id', claimId)
        } else {
          await admin.from('card_order_emails').update({ message_id: 'unknown-check-mailtrap' }).eq('id', claimId)
        }
        summary.failed++
      }
    }
  }
  return summary
}
