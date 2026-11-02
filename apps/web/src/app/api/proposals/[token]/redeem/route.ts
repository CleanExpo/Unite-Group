// POST /api/proposals/[token]/redeem: accept a proposal with a comp code (UNI-3173).
// Every refused code gets the same answer, so the route cannot be used to learn whether a code exists, has expired or
// was bound to another email. The checks and the order write are one transaction in redeem_website_comp_code.

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { closeBeforeComp, closeCheckout, testModeStripe } from '@/lib/proposals/checkout'
import { lookupProposal } from '@/lib/proposals/store'
import { hashCompCode } from '@/lib/proposals/tokens'
import { createServiceClient } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const bodySchema = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.string().trim().email().max(254),
  code: z.string().trim().min(1).max(64),
  acceptedTerms: z.literal(true),
})

export async function POST(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'invalid_request' }, { status: 400 })

  const admin = createServiceClient()
  const found = await lookupProposal(admin, token)
  if (found.state === 'unavailable') return NextResponse.json({ error: 'unavailable' }, { status: 503 })
  if (found.state === 'not_found') return NextResponse.json({ error: 'not_found' }, { status: 404 })
  if (found.state === 'ordered') return NextResponse.json({ error: 'already_ordered' }, { status: 409 })
  if (found.state !== 'open') return NextResponse.json({ error: 'closed' }, { status: 410 })

  // A code must not overtake a payment, or the client has paid for nothing. So the saved Checkout is made unpayable first;
  // if the code then turns out to be wrong, accepting by card simply opens a new one.
  const sessionId = found.proposal.stripe_session_id
  if (sessionId) {
    const stripe = testModeStripe()
    if (!stripe) return NextResponse.json({ error: 'unavailable' }, { status: 503 })
    try {
      if ((await closeBeforeComp(stripe, sessionId)) === 'complete') {
        return NextResponse.json({ error: 'payment_pending' }, { status: 409 })
      }
    } catch (err) {
      console.error('[proposals] could not close the Checkout before redeeming:', err instanceof Error ? err.message : err)
      return NextResponse.json({ error: 'unavailable' }, { status: 503 })
    }
  }

  const { data, error } = await admin.rpc('redeem_website_comp_code', {
    p_proposal_id: found.proposal.id,
    p_code_hash: hashCompCode(parsed.data.code),
    p_email: parsed.data.email,
    p_name: parsed.data.name,
  })
  if (error) {
    console.error('[proposals] redeem failed:', error.message)
    return NextResponse.json({ error: 'unavailable' }, { status: 503 })
  }

  if (data === 'redeemed') {
    // A Checkout opened while this was running is saved before its URL is released, so a read now finds it. If this read
    // or the close fails, the webhook still flags any payment on it for a refund.
    const { data: latest, error: latestError } = await admin
      .from('website_proposals')
      .select('stripe_session_id')
      .eq('founder_id', found.proposal.founder_id)
      .eq('id', found.proposal.id)
      .maybeSingle<{ stripe_session_id: string | null }>()
    if (latestError) console.error('[proposals] could not re-read the Checkout after redeeming:', latestError.message)
    const latestSession = latest?.stripe_session_id ?? null
    if (latestSession !== sessionId) await closeCheckout(latestSession)
    return NextResponse.json({ redeemed: true })
  }
  if (data === 'already_ordered') return NextResponse.json({ error: 'already_ordered' }, { status: 409 })
  return NextResponse.json({ error: 'invalid_code' }, { status: 400 })
}
