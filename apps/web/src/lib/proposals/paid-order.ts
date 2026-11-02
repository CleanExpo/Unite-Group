// Turns a signed Stripe event into the one website_orders row for a proposal (UNI-3173). This is the only way a
// proposal becomes paid: the browser's return from Stripe proves nothing. UNIQUE(proposal_id) and
// UNIQUE(stripe_session_id) make a redelivered event a no-op. Sends no messages.
//
// A paid session that cannot become an order (wrong amount, live mode, unknown or withdrawn proposal, or a proposal that
// already has a different order) is not retried once recorded, because a retry cannot fix it. It is written to
// stripe_events.processing_error and logged as an error for the founder to resolve, since money may need refunding.

import type Stripe from 'stripe'

import { PROPOSAL_COLUMNS, type Admin, type ProposalRow } from './store'

const PAID_EVENT_TYPES = new Set(['checkout.session.completed', 'checkout.session.async_payment_succeeded'])
const UUID_SHAPE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** The proposal a Checkout event belongs to. Only this app's server writes that metadata, and the event is signed. */
export function proposalIdOf(event: Stripe.Event): string | null {
  if (!event.type.startsWith('checkout.session.')) return null
  const session = event.data?.object as Stripe.Checkout.Session | undefined
  return session?.metadata?.proposal_id?.trim() || null
}

export type ProposalOrderOutcome = 'created' | 'duplicate' | 'ignored' | 'flagged'

async function flag(admin: Admin, event: Stripe.Event, problem: string): Promise<'flagged'> {
  console.error(`[proposals] paid session needs the founder (event ${event.id}): ${problem}`)
  const { error } = await admin.from('stripe_events').update({ processing_error: problem }).eq('stripe_event_id', event.id)
  // The marker is the founder's only durable notice. Throw so the webhook answers 500 and Stripe retries.
  if (error) throw new Error(`could not record the problem on stripe_events: ${error.message}`)
  return 'flagged'
}

/** Throws on a database fault, so the webhook answers 500 and Stripe retries. */
export async function recordPaidProposalOrder(admin: Admin, event: Stripe.Event): Promise<ProposalOrderOutcome> {
  const proposalId = proposalIdOf(event)
  if (!proposalId || !PAID_EVENT_TYPES.has(event.type)) return 'ignored'
  const session = event.data.object as Stripe.Checkout.Session
  if (session.payment_status !== 'paid') return 'ignored'

  if (event.livemode) return flag(admin, event, 'live-mode payment on a proposal; proposals are test mode only')
  if (!UUID_SHAPE.test(proposalId)) return flag(admin, event, 'proposal_id metadata is not a uuid')

  const { data: proposal, error: readError } = await admin
    .from('website_proposals')
    .select(PROPOSAL_COLUMNS)
    .eq('id', proposalId)
    .maybeSingle<ProposalRow>()
  if (readError) throw new Error(`website_proposals read failed: ${readError.message}`)
  if (!proposal) return flag(admin, event, `no proposal ${proposalId}`)

  if (session.amount_total !== proposal.amount_cents || session.currency?.toLowerCase() !== proposal.currency) {
    return flag(admin, event, `paid ${session.amount_total} ${session.currency}, proposal ${proposal.id} asks ${proposal.amount_cents} ${proposal.currency}`)
  }

  // Withdrawal closes the open Checkout, but that can fail or lose a race. A withdrawn offer never becomes an order.
  if (proposal.withdrawn_at) {
    return flag(admin, event, `session ${session.id} paid after proposal ${proposal.id} was withdrawn; check for a refund`)
  }

  const { error } = await admin.from('website_orders').insert({
    founder_id: proposal.founder_id,
    proposal_id: proposal.id,
    source: 'paid',
    stripe_session_id: session.id,
    stripe_event_id: event.id,
    amount_cents: session.amount_total,
    currency: proposal.currency,
    livemode: event.livemode,
    customer_email: session.customer_details?.email?.trim() || proposal.client_email,
  })
  if (!error) return 'created'
  if ((error as { code?: string }).code !== '23505') throw new Error(`website_orders insert failed: ${error.message}`)

  // A unique clash: the same session again is a harmless repeat; anything else is a second payment or a paid-after-comp.
  const { data: existing, error: existingError } = await admin
    .from('website_orders')
    .select('stripe_session_id')
    .eq('founder_id', proposal.founder_id)
    .eq('proposal_id', proposal.id)
    .maybeSingle<{ stripe_session_id: string | null }>()
  if (existingError) throw new Error(`website_orders read failed: ${existingError.message}`)
  if (existing?.stripe_session_id === session.id) return 'duplicate'
  return flag(admin, event, `session ${session.id} paid but proposal ${proposal.id} already has an order; check for a refund`)
}
