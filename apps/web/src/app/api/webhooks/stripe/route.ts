// POST /api/webhooks/stripe — Stripe webhook receiver (UNI-2328).
//
// Verifies the Stripe signature, then idempotently persists the event to the
// `stripe_events` ledger. The one domain dispatch is a paid living-card checkout
// (lib/cards/paid-order), which writes a card_orders row and sends one alert.
// Register this endpoint in the Stripe dashboard to obtain STRIPE_WEBHOOK_SECRET.

import { NextRequest, NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { getStripe } from '@/lib/integrations/stripe/client'
import { createServiceClient } from '@/lib/supabase/service'
import { recordPaidCardOrder } from '@/lib/cards/paid-order'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs' // signature verification needs the Node crypto runtime
export const maxDuration = 30

export async function POST(request: NextRequest) {
  const stripe = getStripe()
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim()
  if (!stripe || !webhookSecret) {
    return NextResponse.json({ error: 'webhook not configured' }, { status: 503 })
  }

  const signature = request.headers.get('stripe-signature')
  if (!signature) {
    return NextResponse.json({ error: 'missing signature' }, { status: 400 })
  }

  const rawBody = await request.text()

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
  } catch {
    return NextResponse.json({ error: 'invalid_signature' }, { status: 400 })
  }

  // Idempotency: UNIQUE(stripe_event_id) lets Postgres adjudicate Stripe's
  // at-least-once retries (23505 == duplicate == already accepted).
  const admin = createServiceClient()
  const { error } = await admin.from('stripe_events').insert({
    stripe_event_id: event.id,
    type: event.type,
    api_version: event.api_version,
    livemode: event.livemode,
    payload: event,
  })

  const duplicate = !!error && (error as { code?: string }).code === '23505'
  if (error && !duplicate) {
    console.error('[webhooks/stripe] persist failed:', error.message)
    return NextResponse.json({ error: 'event_persist_failed' }, { status: 500 })
  }

  // Runs on a redelivery too: if the first attempt saved the event but failed to write the order,
  // the retry must still record it. UNIQUE(stripe_session_id) keeps a true repeat to one row, one email.
  try {
    await recordPaidCardOrder(admin, event)
  } catch (err) {
    console.error('[webhooks/stripe] card order failed:', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'order_record_failed' }, { status: 500 })
  }

  return NextResponse.json(duplicate ? { received: true, idempotent: true } : { received: true }, { status: 200 })
}
