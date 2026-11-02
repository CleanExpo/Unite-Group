// Stripe Checkout for an accepted proposal (UNI-3173). Test mode only: the ticket allows no live charge, so this
// refuses to run on anything but a test key. The price comes from the proposal row, never from the browser.

import type Stripe from 'stripe'

import { getStripe } from '@/lib/integrations/stripe/client'
import type { ProposalRow } from './store'

/** The Stripe client, or null unless the configured key is a test key. Unset and live keys both fail closed. */
export function testModeStripe(env: NodeJS.ProcessEnv = process.env): Stripe | null {
  const key = env.STRIPE_SECRET_KEY?.trim() ?? ''
  if (!key.startsWith('sk_test_') && !key.startsWith('rk_test_')) return null
  return getStripe()
}

/** A saved session has been completed at Stripe, and its signed webhook has not yet written the order. */
export class CheckoutPendingError extends Error {
  constructor() {
    super('The saved Checkout session is complete; waiting for its webhook')
    this.name = 'CheckoutPendingError'
  }
}

/**
 * Makes a saved Checkout unpayable before a comp code commits, because a status check alone can be overtaken by the
 * payment. 'closed' means Stripe says it can no longer be paid; 'complete' means the client got there first. An unknown
 * answer throws, so the caller redeems nothing. Expiring is the atomic step: Stripe refuses it once the session is complete.
 */
export async function closeBeforeComp(stripe: Stripe, sessionId: string): Promise<'closed' | 'complete'> {
  const before = (await stripe.checkout.sessions.retrieve(sessionId)).status
  if (before === 'complete') return 'complete'
  if (before === 'expired') return 'closed'
  try {
    await stripe.checkout.sessions.expire(sessionId)
    return 'closed'
  } catch (err) {
    const after = (await stripe.checkout.sessions.retrieve(sessionId)).status
    if (after === 'complete') return 'complete'
    if (after === 'expired') return 'closed'
    throw err
  }
}

/**
 * Closes a Checkout that must no longer be payable. Returns false if it may still be open, so the caller can say so.
 * Payment after this point is still caught by the webhook, which flags it for a refund.
 */
export async function closeCheckout(sessionId: string | null): Promise<boolean> {
  if (!sessionId) return true
  try {
    const stripe = testModeStripe()
    if (!stripe) return false
    await stripe.checkout.sessions.expire(sessionId)
    return true
  } catch (err) {
    console.warn('[proposals] could not expire the open Checkout:', err instanceof Error ? err.message : err)
    return false
  }
}

/**
 * The hosted Checkout URL for this proposal. A session still open is reused, and a completed one is never replaced,
 * because that is how a client pays twice while the webhook is on its way. The idempotency key is built from the
 * session it replaces, so a double click or two tabs share one session, and an expired one can still be replaced.
 */
export async function openCheckoutUrl(
  stripe: Stripe,
  proposal: ProposalRow,
  urls: { success: string; cancel: string },
): Promise<{ url: string; sessionId: string }> {
  if (proposal.stripe_session_id) {
    const existing = await stripe.checkout.sessions.retrieve(proposal.stripe_session_id)
    if (existing.status === 'complete') throw new CheckoutPendingError()
    if (existing.status === 'open' && existing.url) return { url: existing.url, sessionId: existing.id }
  }

  const monthly = proposal.billing_interval === 'month'
  const session = await stripe.checkout.sessions.create(
    {
      mode: monthly ? 'subscription' : 'payment',
      client_reference_id: proposal.id,
      customer_email: proposal.client_email,
      metadata: { proposal_id: proposal.id },
      ...(monthly ? { subscription_data: { metadata: { proposal_id: proposal.id } } } : {}),
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: proposal.currency,
            unit_amount: proposal.amount_cents,
            product_data: { name: `${proposal.plan_name} plan` },
            ...(monthly ? { recurring: { interval: 'month' as const } } : {}),
          },
        },
      ],
      success_url: urls.success,
      cancel_url: urls.cancel,
    },
    { idempotencyKey: `proposal:${proposal.id}:${proposal.stripe_session_id ?? 'first'}` },
  )
  if (!session.url) throw new Error('Stripe returned a Checkout session with no URL')
  return { url: session.url, sessionId: session.id }
}
