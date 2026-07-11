// POST /api/webhooks/stripe — Stripe webhook receiver (UNI-2328).
//
// Verifies the Stripe signature, then idempotently persists the event to the
// `stripe_events` ledger. This is the audited baseline: NO domain dispatch yet
// — specific event handlers (checkout, invoice, etc.) are added when a concrete
// Nexus billing flow is defined, so nothing speculative ships. Register this
// endpoint in the Stripe dashboard to obtain STRIPE_WEBHOOK_SECRET.

import { NextRequest, NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { getStripe } from '@/lib/integrations/stripe/client'
import { createServiceClient } from '@/lib/supabase/service'

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

  if (error) {
    if ((error as { code?: string }).code === '23505') {
      return NextResponse.json({ received: true, idempotent: true }, { status: 200 })
    }
    console.error('[webhooks/stripe] persist failed:', error.message)
    return NextResponse.json({ error: 'event_persist_failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true }, { status: 200 })
}
