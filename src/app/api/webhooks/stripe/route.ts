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
import { safeError } from '@/lib/safeError';

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
  apiVersion: '2026-04-22.dahlia',
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
  } catch (err) {
    return NextResponse.json(safeError('invalid_signature', err), { status: 400 });
  }

  // 2. Idempotency — atomic insert against UNIQUE constraint (deepsec P0-1).
  //    The old "select then insert" pattern raced Stripe retries; the new
  //    pattern lets Postgres adjudicate. 23505 == unique-violation == duplicate.
  const admin = getAdminClient();
  const { error: insertErr } = await admin.from('stripe_events').insert({
    stripe_event_id: event.id,
    type: event.type,
    api_version: event.api_version,
    livemode: event.livemode,
    payload: event as any,
  });

  if (insertErr) {
    if ((insertErr as any).code === '23505') {
      // Duplicate event — another worker already accepted it. Idempotent OK.
      return NextResponse.json({ received: true, idempotent: true }, { status: 200 });
    }
    return NextResponse.json(safeError('event_persist_failed', insertErr), { status: 500 });
  }

  // 3. Dispatch (only the FIRST inserter reaches here, courtesy of UNIQUE).
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
    // Stripe will retry 5xx; mark error so we can inspect.
    await admin
      .from('stripe_events')
      .update({ processing_error: String(err?.message || err) })
      .eq('stripe_event_id', event.id);
    return NextResponse.json(safeError('dispatch_failed', err), { status: 500 });
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
  // Atomic "transition onboarding → active" (deepsec P1 race fix).
  // Two concurrent first-payment events both saw status=onboarding under the
  // old select-then-update pattern → both enqueued. The conditional update
  // collapses that race: only the row whose status was still 'onboarding' at
  // execution time is returned, so only one worker enqueues.
  const { data: activated } = await admin
    .from('nexus_clients')
    .update({ status: 'active' })
    .eq('stripe_customer_id', customerId)
    .eq('status', 'onboarding')
    .select('slug');

  if (!activated || activated.length === 0) {
    // Either no client found, or already active (concurrent payment beat us).
    // Either way, do NOT enqueue Hour-1 provisioning again.
    return;
  }

  await admin.from('stripe_provisioning_queue').insert({
    stripe_customer_id: customerId,
    nexus_slug: activated[0].slug,
    trigger: 'first-payment',
    trigger_payload: triggerInfo,
    status: 'pending',
  });
}
