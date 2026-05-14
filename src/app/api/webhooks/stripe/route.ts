// @ts-nocheck
// POST /api/webhooks/stripe — Stripe webhook receiver
//
// Verifies the signature via stripe.webhooks.constructEvent then dispatches:
//   - checkout.session.completed     → first payment / payment-link deposit
//   - payment_intent.succeeded       → card capture success
//   - invoice.paid                   → milestone invoice payment cleared
//   - charge.succeeded               → general charge success (fallback)
//   - invoice.payment_failed         → milestone payment failed
//
// On a successful Duncan deposit → updates nexus_clients.status to 'active'
// and enqueues the Hour-1 portal provisioning task in stripe_events.
//
// Webhook secret lives in STRIPE_WEBHOOK_SECRET (set when the endpoint is
// registered via /v1/webhook_endpoints — the secret is shown ONCE).

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';            // crypto verify needs Node runtime
export const maxDuration = 30;

const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY;
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

if (!STRIPE_SECRET) {
  // Module-load throw is OK — Next.js will surface this as a build/deploy error.
  console.warn('STRIPE_SECRET_KEY not set; webhook will reject events');
}

const stripe = STRIPE_SECRET ? new Stripe(STRIPE_SECRET, {
  apiVersion: '2026-04-22.dahlia' as any,
}) : null;

export async function POST(request: NextRequest) {
  if (!stripe || !WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'webhook not configured' }, { status: 503 });
  }

  // 1. Verify signature
  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'missing signature' }, { status: 400 });
  }
  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, WEBHOOK_SECRET);
  } catch (err: any) {
    console.error('Stripe webhook signature verify failed:', err.message);
    return NextResponse.json({ error: 'invalid signature' }, { status: 400 });
  }

  // 2. Idempotency — log the event id so reprocessing is safe
  const admin = getAdminClient();
  const { data: existing } = await admin
    .from('stripe_events')
    .select('id')
    .eq('stripe_event_id', event.id)
    .maybeSingle();
  if (existing) {
    return NextResponse.json({ received: true, idempotent: true }, { status: 200 });
  }

  // Insert the raw event for audit and downstream replay.
  await admin.from('stripe_events').insert({
    stripe_event_id: event.id,
    type: event.type,
    api_version: event.api_version,
    livemode: event.livemode,
    payload: event as any,
  });

  // 3. Dispatch
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session, admin);
        break;
      case 'invoice.paid':
        await handleInvoicePaid(event.data.object as Stripe.Invoice, admin);
        break;
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent, admin);
        break;
      case 'invoice.payment_failed':
        await handleInvoiceFailed(event.data.object as Stripe.Invoice, admin);
        break;
      default:
        // Other event types are persisted but not actively dispatched.
        break;
    }
  } catch (err: any) {
    console.error('Webhook dispatch error:', err);
    // Stripe will retry 4xx/5xx; mark error so we can inspect.
    await admin
      .from('stripe_events')
      .update({ processing_error: err.message })
      .eq('stripe_event_id', event.id);
    return NextResponse.json({ error: 'dispatch failed', detail: err.message }, { status: 500 });
  }

  return NextResponse.json({ received: true }, { status: 200 });
}

// ── Handlers ─────────────────────────────────────────────────────────────────

async function handleCheckoutCompleted(session: Stripe.Checkout.Session, admin: any) {
  const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;
  if (!customerId) return;
  await activateClientByStripeCustomer(customerId, admin, {
    trigger: 'checkout.session.completed',
    amount_total: session.amount_total,
    currency: session.currency,
    session_id: session.id,
  });
}

async function handleInvoicePaid(invoice: Stripe.Invoice, admin: any) {
  const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
  if (!customerId) return;
  await activateClientByStripeCustomer(customerId, admin, {
    trigger: 'invoice.paid',
    amount_paid: invoice.amount_paid,
    currency: invoice.currency,
    invoice_id: invoice.id,
    invoice_number: invoice.number,
  });
}

async function handlePaymentIntentSucceeded(pi: Stripe.PaymentIntent, admin: any) {
  const customerId = typeof pi.customer === 'string' ? pi.customer : pi.customer?.id;
  if (!customerId) return;
  // For deposit Payment Links the checkout.session.completed event is the
  // canonical trigger; payment_intent.succeeded is a backup for direct charges.
  await activateClientByStripeCustomer(customerId, admin, {
    trigger: 'payment_intent.succeeded',
    amount: pi.amount,
    currency: pi.currency,
    payment_intent_id: pi.id,
  });
}

async function handleInvoiceFailed(invoice: Stripe.Invoice, admin: any) {
  const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
  if (!customerId) return;
  await admin
    .from('nexus_clients')
    .update({ status: 'payment-failed' })
    .eq('stripe_customer_id', customerId);
}

async function activateClientByStripeCustomer(
  customerId: string,
  admin: any,
  triggerInfo: Record<string, any>,
) {
  // Look up the client by stripe_customer_id
  const { data: client } = await admin
    .from('nexus_clients')
    .select('slug, status')
    .eq('stripe_customer_id', customerId)
    .maybeSingle();

  if (!client) {
    console.warn(`No nexus_client found for stripe_customer_id=${customerId}`);
    return;
  }

  // Only activate from onboarding state — prevents repeated "first deposit"
  // activations on milestone payments later.
  const isFirstPayment = client.status === 'onboarding';

  await admin
    .from('nexus_clients')
    .update({
      status: 'active',
      // Add an activation note in metadata via a separate column update
      // when we have one; for now we rely on stripe_events as the audit.
    })
    .eq('stripe_customer_id', customerId);

  if (isFirstPayment) {
    // Enqueue Hour-1 portal provisioning: the swarm worker will pick this up.
    await admin.from('stripe_provisioning_queue').insert({
      stripe_customer_id: customerId,
      nexus_slug: client.slug,
      trigger: 'first-payment',
      trigger_payload: triggerInfo,
      status: 'pending',
    });
  }
}
