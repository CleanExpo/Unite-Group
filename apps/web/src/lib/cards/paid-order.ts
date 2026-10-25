// Paid living-card orders (UNI-2996 B5).
//
// A checkout.session.completed whose price is one of CARD_TIERS, or a session from the extra-business
// Payment Link (STRIPE_CARD_EXTRA_BUSINESS_PAYMENT_LINK_ID) paying 1..5 x its price, becomes one
// card_orders row, then one alert email with the buyer's name and what they bought. The add-on is its
// own Payment Link with adjustable quantity (a link URL cannot carry one), so its quantity is recovered
// from the amount and stored only on add-on rows. No card data ever reaches this code: Stripe's session
// carries none. Idempotency is the UNIQUE(stripe_session_id) constraint, not a timer: a redelivered
// event inserts nothing and so sends nothing. Tier orders count only from the listed card Payment Links
// (STRIPE_CARD_PAYMENT_LINK_IDS); the price match alone never creates an order.

import type Stripe from 'stripe'

import { CARD_EXTRA_BUSINESS, CARD_TIERS } from '@/app/cards/order/order-view'
import { mailtrapFromEmail, sendEmail } from '@/lib/integrations/mailtrap'
import type { createServiceClient } from '@/lib/supabase/service'

type CardTier = (typeof CARD_TIERS)[number]
type Admin = ReturnType<typeof createServiceClient>

/** The tier a session paid for, matched on AUD cents (a Payment Link's session carries no price id). */
export function matchCardTier(session: Pick<Stripe.Checkout.Session, 'amount_total' | 'currency'>): CardTier | null {
  if (session.currency?.toLowerCase() !== 'aud' || typeof session.amount_total !== 'number') return null
  return CARD_TIERS.find((t) => t.priceAud * 100 === session.amount_total) ?? null
}

export type CardPurchase =
  | { kind: 'tier'; tier: CardTier }
  | { kind: 'extra_business'; quantity: number }

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

/**
 * True when the session came from the extra-business Payment Link, whose plink_ id (not secret) is
 * STRIPE_CARD_EXTRA_BUSINESS_PAYMENT_LINK_ID. Unset or empty fails closed: no add-on is ever recorded.
 */
function isExtraBusinessLink(session: Pick<Stripe.Checkout.Session, 'payment_link'>): boolean {
  const id = paymentLinkId(session)
  const configured = process.env.STRIPE_CARD_EXTRA_BUSINESS_PAYMENT_LINK_ID?.trim()
  return Boolean(id && configured && id === configured)
}

/**
 * The page shows the add-on button when STRIPE_PAYMENT_LINK_CARD_EXTRA_BUSINESS is set, but the webhook can only
 * record it when STRIPE_CARD_EXTRA_BUSINESS_PAYMENT_LINK_ID is set too. With only the first, buyers can pay and
 * nothing is recorded, so say so loudly instead of dropping the payment silently.
 */
function warnIfAddOnHalfConfigured(): void {
  const pageLink = process.env[CARD_EXTRA_BUSINESS.paymentLinkEnv]?.trim()
  const linkId = process.env.STRIPE_CARD_EXTRA_BUSINESS_PAYMENT_LINK_ID?.trim()
  if (pageLink && !linkId) {
    console.warn(
      `[cards] ${CARD_EXTRA_BUSINESS.paymentLinkEnv} is set but STRIPE_CARD_EXTRA_BUSINESS_PAYMENT_LINK_ID is not: extra-business payments are being taken but NOT recorded. Set both together.`,
    )
  }
}

/** How many add-ons an AUD amount buys: a whole multiple of the unit price, 1..maxQuantity, else null. */
function extraBusinessQuantity(session: Pick<Stripe.Checkout.Session, 'amount_total' | 'currency'>): number | null {
  const amount = session.amount_total
  if (session.currency?.toLowerCase() !== 'aud' || typeof amount !== 'number') return null
  const quantity = amount / (CARD_EXTRA_BUSINESS.priceAud * 100)
  return Number.isInteger(quantity) && quantity >= 1 && quantity <= CARD_EXTRA_BUSINESS.maxQuantity ? quantity : null
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
  // Classify by Payment Link first: the add-on link is add-on only, every other link is tier only.
  let purchase: CardPurchase
  if (isExtraBusinessLink(session)) {
    const quantity = extraBusinessQuantity(session)
    if (!quantity) {
      console.warn('[cards] paid session on the extra-business link did not match 1 to 5 x A$199: not recorded')
      return 'ignored'
    }
    purchase = { kind: 'extra_business', quantity }
  } else {
    warnIfAddOnHalfConfigured()
    const tier = matchCardTier(session)
    if (!tier) return 'ignored'
    if (!isCardPaymentLink(session)) {
      console.warn('[cards] paid session at a card price ignored: payment link not in STRIPE_CARD_PAYMENT_LINK_IDS')
      return 'ignored'
    }
    purchase = { kind: 'tier', tier }
  }

  const founderId = process.env.FOUNDER_USER_ID?.trim()
  if (!founderId) throw new Error('FOUNDER_USER_ID not configured')

  const name = session.customer_details?.name?.trim() || null
  const { error } = await admin.from('card_orders').insert({
    founder_id: founderId,
    reference: cardOrderReference(session),
    stripe_session_id: session.id,
    stripe_event_id: event.id,
    tier: purchase.kind === 'tier' ? purchase.tier.id : CARD_EXTRA_BUSINESS.id,
    customer_name: name,
    customer_email: session.customer_details?.email?.trim() || null,
    amount_total: session.amount_total,
    currency: 'aud',
    livemode: event.livemode,
    // Only add-on rows carry quantity, so tier orders still insert before the quantity migration is applied.
    ...(purchase.kind === 'extra_business' ? { quantity: purchase.quantity } : {}),
  })
  if (error) {
    if ((error as { code?: string }).code === '23505') return 'duplicate'
    throw new Error(`card_orders insert failed: ${(error as { message?: string }).message ?? 'unknown'}`)
  }

  await sendOrderAlert(name, purchase, session.amount_total ?? 0, event.livemode)
  if (purchase.kind === 'tier') {
    await sendBuyerWelcome(session.customer_details?.email?.trim() || null, name, purchase.tier, event.livemode)
  }
  return 'created'
}

/** One email, name and purchase only. Never throws. */
async function sendOrderAlert(
  name: string | null,
  purchase: CardPurchase,
  amountCents: number,
  livemode: boolean,
): Promise<void> {
  const to = process.env.LEAD_ALERT_EMAIL_TO?.trim()
  const from = mailtrapFromEmail()
  if (!to) {
    console.warn('[cards] order alert skipped: LEAD_ALERT_EMAIL_TO not set')
    return
  }
  const who = name ?? 'A buyer'
  const label = purchase.kind === 'tier' ? purchase.tier.name : `${CARD_EXTRA_BUSINESS.name}${purchase.quantity > 1 ? ` x${purchase.quantity}` : ''}`
  const line =
    purchase.kind === 'tier'
      ? `${who} paid for the ${purchase.tier.name} living card (A$${purchase.tier.priceAud}).`
      : `${who} paid for ${purchase.quantity} extra business${purchase.quantity > 1 ? 'es' : ''} on the Made for you living card (A$${amountCents / 100}).`
  try {
    await sendEmail({
      to: { email: to },
      from: { email: from, name: 'Unite-Group orders' },
      subject: `${livemode ? '' : '[TEST] '}New paid card order: ${label}`,
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

/** The buyer's welcome email, sent once per new tier order. Never throws. */
export function buildBuyerWelcome(name: string | null, tier: { name: string; priceAud: number }): { subject: string; text: string; html: string } {
  const greeting = name ? `Dear ${name.split(/\s+/)[0]},` : 'Hello,'
  const lines = [
    greeting,
    `Thank you for ordering the ${tier.name} living business card (A$${tier.priceAud}, GST included). Your payment has been received.`,
    'To start your card, please reply to this email with:',
    '1. Your logo (PNG, SVG or JPEG).',
    '2. Your name, title and business name as they should appear.',
    '3. The phone, email, website and social links you would like on the card.',
    'If you have not yet completed the short form on our thank-you page, you are welcome to send these details by reply instead.',
    'We will send your first preview once we have everything. You can read the order terms at https://unite-group.in/cards/terms.',
    'Kind regards,',
    'Margot',
    'Unite-Group',
  ]
  const subject = `Your ${tier.name} living card: next steps`
  const html =
    '<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.5;color:#111">' +
    lines.map((l) => `<p style="margin:0 0 12px">${escapeHtml(l)}</p>`).join('') +
    '</div>'
  return { subject, text: lines.join('\n\n'), html }
}

async function sendBuyerWelcome(
  email: string | null,
  name: string | null,
  tier: { name: string; priceAud: number },
  livemode: boolean,
): Promise<void> {
  const from = process.env.CARD_WELCOME_FROM_EMAIL?.trim() || mailtrapFromEmail()
  if (!email) {
    console.warn('[cards] welcome email skipped: no buyer email')
    return
  }
  const msg = buildBuyerWelcome(name, tier)
  try {
    await sendEmail({
      to: { email },
      from: { email: from, name: 'Margot at Unite-Group' },
      subject: `${livemode ? '' : '[TEST] '}${msg.subject}`,
      text: msg.text,
      html: msg.html,
      categories: ['card-order-welcome'],
    })
  } catch (err) {
    console.error('[cards] welcome email failed:', err instanceof Error ? err.message : err)
  }
}
