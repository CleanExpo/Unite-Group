// PATCH /api/founder/proposals/[id]: withdraw a proposal so its link stops accepting, and close any Checkout already
// opened from it (UNI-3173). An order already placed is untouched. Withdrawing twice keeps the first time.

import { NextResponse } from 'next/server'
import { z } from 'zod'

import { sanitiseError } from '@/lib/error-reporting'
import { closeCheckout } from '@/lib/proposals/checkout'
import { requireFounder } from '@/lib/proposals/founder-auth'
import { createServiceClient } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'

export async function PATCH(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireFounder()
  if ('denied' in auth) return auth.denied

  const { id } = await params
  if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const admin = createServiceClient()
  // The session id comes back from the withdrawing write itself. A read before it could miss a Checkout saved in between,
  // and a Checkout saved after it is refused and closed by the checkout route, which only saves on a row not yet withdrawn.
  const { data: withdrawn, error } = await admin
    .from('website_proposals')
    .update({ withdrawn_at: new Date().toISOString() })
    .eq('founder_id', auth.founderId)
    .eq('id', id)
    .is('withdrawn_at', null)
    .select('stripe_session_id')
    .maybeSingle<{ stripe_session_id: string | null }>()
  if (error) return NextResponse.json({ error: sanitiseError(error, 'Could not withdraw the proposal') }, { status: 500 })

  let sessionId = withdrawn?.stripe_session_id ?? null
  if (!withdrawn) {
    // Nothing changed: either it is not this founder's, or it was already withdrawn and its Checkout may need closing again.
    const { data: proposal, error: readError } = await admin
      .from('website_proposals')
      .select('stripe_session_id')
      .eq('founder_id', auth.founderId)
      .eq('id', id)
      .maybeSingle<{ stripe_session_id: string | null }>()
    if (readError) return NextResponse.json({ error: sanitiseError(readError, 'Could not read the proposal') }, { status: 500 })
    if (!proposal) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    sessionId = proposal.stripe_session_id
  }

  // From the write above, a late payment is flagged for a refund and never becomes an order.
  return NextResponse.json({ withdrawn: true, checkoutClosed: await closeCheckout(sessionId) })
}
