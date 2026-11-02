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
  const { data: proposal, error: readError } = await admin
    .from('website_proposals')
    .select('id, stripe_session_id')
    .eq('founder_id', auth.founderId)
    .eq('id', id)
    .maybeSingle<{ id: string; stripe_session_id: string | null }>()
  if (readError) return NextResponse.json({ error: sanitiseError(readError, 'Could not read the proposal') }, { status: 500 })
  if (!proposal) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { error } = await admin
    .from('website_proposals')
    .update({ withdrawn_at: new Date().toISOString() })
    .eq('founder_id', auth.founderId)
    .eq('id', id)
    .is('withdrawn_at', null)
  if (error) return NextResponse.json({ error: sanitiseError(error, 'Could not withdraw the proposal') }, { status: 500 })

  // Withdrawn first, then closed: from here a late payment is flagged for a refund and never becomes an order.
  return NextResponse.json({ withdrawn: true, checkoutClosed: await closeCheckout(proposal.stripe_session_id) })
}
