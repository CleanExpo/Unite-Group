// POST /api/proposals/[token]/checkout: accept a proposal and get its Stripe Checkout URL (UNI-3173).
// Public: the capability is the unguessable link token. Accepting here records agreement to the terms; the order only
// exists once the signed webhook confirms payment (lib/proposals/paid-order).

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { CheckoutPendingError, closeCheckout, openCheckoutUrl, testModeStripe } from '@/lib/proposals/checkout'
import { lookupProposal } from '@/lib/proposals/store'
import { createServiceClient } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const bodySchema = z.object({
  name: z.string().trim().min(1).max(200),
  acceptedTerms: z.literal(true),
})

const REFUSED: Record<string, { status: number; error: string }> = {
  not_found: { status: 404, error: 'not_found' },
  unavailable: { status: 503, error: 'unavailable' },
  withdrawn: { status: 410, error: 'closed' },
  expired: { status: 410, error: 'closed' },
  ordered: { status: 409, error: 'already_ordered' },
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'invalid_request' }, { status: 400 })

  const stripe = testModeStripe()
  if (!stripe) return NextResponse.json({ error: 'payment_off' }, { status: 503 })

  const admin = createServiceClient()
  const found = await lookupProposal(admin, token)
  if (found.state !== 'open') {
    const refused = REFUSED[found.state]
    return NextResponse.json({ error: refused.error }, { status: refused.status })
  }
  const { proposal } = found

  const { error: acceptError } = await admin
    .from('website_proposals')
    .update({ accepted_at: new Date().toISOString(), accepted_name: parsed.data.name })
    .eq('founder_id', proposal.founder_id)
    .eq('id', proposal.id)
  if (acceptError) {
    console.error('[proposals] accept write failed:', acceptError.message)
    return NextResponse.json({ error: 'unavailable' }, { status: 503 })
  }

  // The return page carries no proposal token: the link is a bearer credential and must never be handed to Stripe.
  const returnPage = `${request.nextUrl.origin}/proposal/return`
  let checkout: { url: string; sessionId: string }
  try {
    checkout = await openCheckoutUrl(stripe, proposal, {
      success: `${returnPage}?session_id={CHECKOUT_SESSION_ID}`,
      cancel: returnPage,
    })
  } catch (err) {
    if (err instanceof CheckoutPendingError) return NextResponse.json({ error: 'payment_pending' }, { status: 409 })
    console.error('[proposals] checkout failed:', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'checkout_failed' }, { status: 502 })
  }

  // No URL leaves here until the session is saved on a proposal that is still open, so withdrawing or redeeming can always
  // find and close it. The write and withdrawal's write take turns on the row: whichever runs second sees the other.
  const { data: saved, error: saveError } = await admin
    .from('website_proposals')
    .update({ stripe_session_id: checkout.sessionId })
    .eq('founder_id', proposal.founder_id)
    .eq('id', proposal.id)
    .is('withdrawn_at', null)
    .select('id')
    .maybeSingle<{ id: string }>()
  if (saveError) {
    console.error('[proposals] session id save failed:', saveError.message)
    await closeCheckout(checkout.sessionId)
    return NextResponse.json({ error: 'unavailable' }, { status: 503 })
  }
  if (!saved) {
    await closeCheckout(checkout.sessionId)
    return NextResponse.json({ error: 'closed' }, { status: 410 })
  }

  // Read after the save: a redeem that commits later re-reads the row and closes this session, one committed earlier shows here.
  const { data: order, error: orderError } = await admin
    .from('website_orders')
    .select('id')
    .eq('founder_id', proposal.founder_id)
    .eq('proposal_id', proposal.id)
    .maybeSingle<{ id: string }>()
  if (orderError || order) {
    if (orderError) console.error('[proposals] order check failed:', orderError.message)
    await closeCheckout(checkout.sessionId)
    return orderError
      ? NextResponse.json({ error: 'unavailable' }, { status: 503 })
      : NextResponse.json({ error: 'already_ordered' }, { status: 409 })
  }

  return NextResponse.json({ url: checkout.url })
}
