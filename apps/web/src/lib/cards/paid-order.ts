// Paid living-card orders (UNI-2996 B5).
//
// A checkout.session.completed whose price is one of CARD_TIERS becomes one card_orders row, then
// one alert email with the buyer's name and the tier only. No card data ever reaches this code:
// Stripe's session carries none. Idempotency is the UNIQUE(stripe_session_id) constraint, not a
// timer: a redelivered event inserts nothing and so sends nothing. Only sessions from the listed card
// Payment Links count (STRIPE_CARD_PAYMENT_LINK_IDS); the price match alone never creates an order.

import type Stripe from 'stripe'

import { CARD_TIERS } from '@/app/cards/order/order-view'
import { sendEmail } from '@/lib/integrations/sendgrid'
import type { createServiceClient } from '@/lib/supabase/service'

type CardTier = (typeof CARD_TIERS)[number]
type Admin = ReturnType<typeof createServiceClient>

/** The tier a session paid for, matched on AUD cents (a Payment Link's session carries no price id). */
export function matchCardTier(session: Pick<Stripe.Checkout.Session, 'amount_total' | 'currency'>): CardTier | null {
  if (session.currency?.toLowerCase() !== 'aud' || typeof session.amount_total !== 'number') return null
  return CARD_TIERS.find((t) => t.priceAud * 100 === session.amount_total) ?? null
}

/** The Payment Link a session came from: Stripe sends its id (plink_...) or, when expanded, the object. */
function paymentLinkId(session: Pick<Stripe.Checkout.Session, 'payment_link'>): string | null {
  const link = session.payment_link as string | { id?: string } | null | undefined
  return (typeof link === 'string' ? link : link?.id) || null
}

/**
 * True only when the session came from one of the card Payment Links listed in STRIPE_CARD_PAYMENT_LINK_IDS
 * (comma-separated plink_ ids, not secrets). The price alone is not enough: any other product at A$249 or A$449
 * would otherwise be recorded as a card order. Unset or empty fails closed.
 */
export function isCardPaymentLink(session: Pick<Stripe.Checkout.Session, 'payment_link'>): boolean {
  const id = paymentLinkId(session)
  if (!id) return false
  const allowed = (process.env.STRIPE_CARD_PAYMENT_LINK_IDS ?? '').split(',').map((v) => v.trim()).filter(Boolean)
  return allowed.includes(id)
}

/** client_reference_id when the payment link carried one, else the checkout session id. */
export function cardOrderReference(session: Pick<Stripe.Checkout.Session, 'id' | 'client_reference_id'>): string {
  return session.client_reference_id?.trim() || session.id
}

export type PaidOrderOutcome = 'created' | 'duplicate' | 'ignored'

/**
 * Record the order for a completed card checkout. Throws when the order cannot be written, so the
 * webhook answers 500 and Stripe retries. An email problem never throws.
 */
export async function recordPaidCardOrder(admin: Admin, event: Stripe.Event): Promise<PaidOrderOutcome> {
  if (event.type !== 'checkout.session.completed') return 'ignored'
  const session = event.data?.object as Stripe.Checkout.Session | undefined
  if (!session || session.payment_status !== 'paid') return 'ignored'
  const tier = matchCardTier(session)
  if (!tier) return 'ignored'
  if (!isCardPaymentLink(session)) {
    console.warn('[cards] paid session at a card price ignored: payment link not in STRIPE_CARD_PAYMENT_LINK_IDS')
    return 'ignored'
  }

  const founderId = process.env.FOUNDER_USER_ID?.trim()
  if (!founderId) throw new Error('FOUNDER_USER_ID not configured')

  const name = session.customer_details?.name?.trim() || null
  const { error } = await admin.from('card_orders').insert({
    founder_id: founderId,
    reference: cardOrderReference(session),
    stripe_session_id: session.id,
    stripe_event_id: event.id,
    tier: tier.id,
    customer_name: name,
    customer_email: session.customer_details?.email?.trim() || null,
    amount_total: session.amount_total,
    currency: 'aud',
    livemode: event.livemode,
  })
  if (error) {
    if ((error as { code?: string }).code === '23505') return 'duplicate'
    throw new Error(`card_orders insert failed: ${(error as { message?: string }).message ?? 'unknown'}`)
  }

  await sendOrderAlert(name, tier, event.livemode)
  return 'created'
}

/** One email, name and tier only. Never throws. */
async function sendOrderAlert(name: string | null, tier: CardTier, livemode: boolean): Promise<void> {
  const to = process.env.LEAD_ALERT_EMAIL_TO?.trim()
  const from = process.env.SENDGRID_FROM_EMAIL?.trim()
  if (!to || !from) {
    console.warn('[cards] order alert skipped: LEAD_ALERT_EMAIL_TO or SENDGRID_FROM_EMAIL not set')
    return
  }
  const who = name ?? 'A buyer'
  const line = `${who} paid for the ${tier.name} living card (A$${tier.priceAud}).`
  try {
    await sendEmail({
      to: { email: to },
      from: { email: from },
      subject: `${livemode ? '' : '[TEST] '}New paid card order: ${tier.name}`,
      text: line,
      html: `<p>${escapeHtml(line)}</p>`,
      categories: ['card-order-alert'],
    })
  } catch (err) {
    console.error('[cards] order alert failed:', err instanceof Error ? err.message : err)
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
