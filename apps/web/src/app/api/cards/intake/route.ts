// POST /api/cards/intake — the thank-you page's intake form (UNI-2996 B5).
//
// PUBLIC route (exact path allow-listed in src/proxy.ts, rate-limited there before auth). It stores
// what a paid buyer tells us against their order. The order is found by the reference the payment
// carried (client_reference_id, or the checkout session id) and the founder comes from that order,
// so the caller never names a founder. One intake per order (UNIQUE order_id): a second submission
// is a 409 and cannot overwrite the first. No file is accepted here; see TODO(logo-upload) in the form.

import { NextRequest, NextResponse } from 'next/server'

import { createServiceClient } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'

const REF = /^[A-Za-z0-9_-]{1,200}$/ // Stripe's client_reference_id alphabet; also keeps the .or() filter below injection-free
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

function text(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null
  const t = value.trim()
  return t && t.length <= max ? t : null
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const ref = typeof body.ref === 'string' && REF.test(body.ref) ? body.ref : null
  const name = text(body.name, 120)
  const email = text(body.email, 254)
  const business = body.business == null || body.business === '' ? null : text(body.business, 120)
  const whereMet = body.where_met == null || body.where_met === '' ? null : text(body.where_met, 500)
  if (!ref) return NextResponse.json({ error: 'A valid order reference is required' }, { status: 400 })
  if (!name) return NextResponse.json({ error: 'Your name is required (120 characters at most)' }, { status: 400 })
  if (!email || !EMAIL.test(email)) return NextResponse.json({ error: 'A valid email is required' }, { status: 400 })
  if (body.business && business === null) return NextResponse.json({ error: 'Business name is too long' }, { status: 400 })
  if (body.where_met && whereMet === null) return NextResponse.json({ error: 'Where we met is too long' }, { status: 400 })

  const admin = createServiceClient()
  const { data: orders, error: lookupError } = await admin
    .from('card_orders')
    .select('id, founder_id')
    .or(`reference.eq.${ref},stripe_session_id.eq.${ref}`)
    .limit(2)
  if (lookupError || !orders) {
    console.error('[cards/intake] order lookup failed:', lookupError?.message)
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
  if (orders.length === 0) return NextResponse.json({ error: 'We could not find that order' }, { status: 404 })
  if (orders.length > 1) return NextResponse.json({ error: 'That reference matches more than one order. Please contact us.' }, { status: 409 })

  const order = orders[0]
  const { error } = await admin.from('card_order_intakes').insert({
    order_id: order.id,
    founder_id: order.founder_id,
    name,
    business,
    email,
    where_met: whereMet,
  })
  if (error) {
    if ((error as { code?: string }).code === '23505') {
      return NextResponse.json({ error: 'We already have your details for this order' }, { status: 409 })
    }
    console.error('[cards/intake] insert failed:', (error as { message?: string }).message)
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
  return NextResponse.json({ received: true }, { status: 201 })
}
