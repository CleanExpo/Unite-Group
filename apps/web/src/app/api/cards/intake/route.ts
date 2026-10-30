// POST /api/cards/intake — the thank-you page's intake form (UNI-2996 B5).
//
// PUBLIC route (exact path allow-listed in src/proxy.ts, rate-limited there before auth). It stores
// what a paid buyer tells us against their order. The order is found by the Stripe checkout session id
// ONLY (the unguessable cs_... value in the buyer's redirect URL). client_reference_id is never accepted:
// it is a readable label the founder may choose, so it cannot be a capability. When Stripe recorded the
// buyer's email it must match the submitted one. A wrong id, an unknown id and a wrong email all get the
// same 404, so the route does not reveal whether an order exists. The founder comes from the order,
// so the caller never names a founder. One intake per order (UNIQUE order_id): a second submission
// is a 409 and cannot overwrite the first. No file is accepted here: the buyer gives a link to their logo or
// replies to the receipt email with it.
//
// Delivery details (film choice, what to show at the end of the film, logo link, Made-for-you brief) are
// emailed to the lead-alert address (contact@unite-group.in) via Mailtrap, the same way paid-order alerts go.
// card_order_intakes has no columns for them, and adding some is a founder-gated migration (follow-up).
// The email goes BEFORE the insert and a failed send is a 502 with nothing stored, so the buyer can retry and
// the film choice can never be silently lost.

import { NextRequest, NextResponse } from 'next/server'

import { EDITIONS } from '@/app/cards/editions'
import { leadAlertEmailTo, mailtrapFromEmail, sendEmail } from '@/lib/integrations/mailtrap'
import { createServiceClient } from '@/lib/supabase/service'

/** The film values the thank-you form may send: any showroom edition, or Made for you (no film picked). */
export const MADE_FOR_YOU = 'made-for-you'
export const FILM_CHOICES: readonly string[] = [...EDITIONS.map((e) => e.name), MADE_FOR_YOU]

export const dynamic = 'force-dynamic'

export const SESSION_ID = /^cs_(test|live)_[A-Za-z0-9]{1,200}$/ // Stripe checkout session id shape
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

const LINK = /^https?:\/\/[^\s<>"]+$/i

function escapeHtml(v: string): string {
  return v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

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

  const sessionId = typeof body.session_id === 'string' && SESSION_ID.test(body.session_id) ? body.session_id : null
  const name = text(body.name, 120)
  const email = text(body.email, 254)
  const business = body.business == null || body.business === '' ? null : text(body.business, 120)
  const whereMet = body.where_met == null || body.where_met === '' ? null : text(body.where_met, 500)
  const film = typeof body.film === 'string' && FILM_CHOICES.includes(body.film) ? body.film : null
  const contactDetails = text(body.contact_details, 500)
  const logoLink = body.logo_link == null || body.logo_link === '' ? null : text(body.logo_link, 500)
  const brief = body.brief == null || body.brief === '' ? null : text(body.brief, 1500)
  if (!sessionId) return NextResponse.json({ error: 'A valid checkout session id is required' }, { status: 400 })
  if (!name) return NextResponse.json({ error: 'Your name is required (120 characters at most)' }, { status: 400 })
  if (!email || !EMAIL.test(email)) return NextResponse.json({ error: 'A valid email is required' }, { status: 400 })
  if (body.business && business === null) return NextResponse.json({ error: 'Business name is too long' }, { status: 400 })
  if (body.where_met && whereMet === null) return NextResponse.json({ error: 'Where we met is too long' }, { status: 400 })

  if (!film) return NextResponse.json({ error: 'Please choose a film' }, { status: 400 })
  if (!contactDetails) return NextResponse.json({ error: 'Please give the contact details to show at the end of your film (500 characters at most)' }, { status: 400 })
  if (body.logo_link && (logoLink === null || !LINK.test(logoLink))) return NextResponse.json({ error: 'The logo link must start with http:// or https://' }, { status: 400 })
  if (body.brief && brief === null) return NextResponse.json({ error: 'The brief is too long (1500 characters at most)' }, { status: 400 })

  const admin = createServiceClient()
  const { data: orders, error: lookupError } = await admin
    .from('card_orders')
    .select('id, founder_id, customer_email, tier')
    .eq('stripe_session_id', sessionId)
    .limit(1)
  if (lookupError || !orders) {
    console.error('[cards/intake] order lookup failed:', lookupError?.message)
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
  const order = orders[0]
  const notFound = () => NextResponse.json({ error: 'We could not find that order' }, { status: 404 })
  if (!order) return notFound()
  // Bind to the checkout email when Stripe recorded one. Same response as an unknown order.
  const paidEmail = typeof order.customer_email === 'string' ? order.customer_email.trim().toLowerCase() : ''
  if (paidEmail && paidEmail !== email.toLowerCase()) return notFound()

  const { data: existing, error: existingError } = await admin.from('card_order_intakes').select('id').eq('order_id', order.id).limit(1)
  if (existingError || !existing) {
    console.error('[cards/intake] existing intake lookup failed:', existingError?.message)
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
  if (existing.length > 0) return NextResponse.json({ error: 'We already have your details for this order' }, { status: 409 })

  const filmLabel = film === MADE_FOR_YOU ? 'Made for you (no film chosen)' : (EDITIONS.find((e) => e.name === film)?.label ?? film)
  const lines = [
    `Order reference: ${sessionId}`,
    `Tier: ${order.tier ?? 'unknown'}`,
    `Film: ${filmLabel}`,
    `Name: ${name}`,
    `Business: ${business ?? '(not given)'}`,
    `Email: ${email}`,
    `Show at the end of the film: ${contactDetails}`,
    `Logo link: ${logoLink ?? '(none; buyer will reply to the receipt email with the logo)'}`,
    `Brief: ${brief ?? '(none)'}`,
    `Where we met: ${whereMet ?? '(not given)'}`,
  ]
  try {
    const sent = await sendEmail({
      to: { email: leadAlertEmailTo() },
      from: { email: mailtrapFromEmail(), name: 'Unite-Group orders' },
      replyTo: { email },
      subject: `Card details: ${(business ?? name).replace(/[\r\n]+/g, ' ')} (${filmLabel})`,
      text: lines.join('\n'),
      html: lines.map((l) => `<p>${escapeHtml(l)}</p>`).join(''),
      categories: ['card-intake'],
    })
    if (sent === null) throw new Error('email not sent (no API key)')
  } catch (err) {
    console.error('[cards/intake] delivery email failed:', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'We could not send your details just now. Please try again, or reply to your payment receipt email.' }, { status: 502 })
  }

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
