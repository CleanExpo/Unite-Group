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

/**
 * The hosted Checkout URL for this proposal. A session still open is reused. The idempotency key is built from the
 * session it replaces, so a double click or two tabs share one session, and an expired one can still be replaced.
 */
export async function openCheckoutUrl(
  stripe: Stripe,
  proposal: ProposalRow,
  urls: { success: string; cancel: string },
): Promise<{ url: string; sessionId: string }> {
  if (proposal.stripe_session_id) {
    const existing = await stripe.checkout.sessions.retrieve(proposal.stripe_session_id)
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
