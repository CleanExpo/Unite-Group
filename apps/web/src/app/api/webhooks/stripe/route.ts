// POST /api/webhooks/stripe — Stripe webhook receiver (consolidated)
//
// Single endpoint for ALL Stripe events. Replaces the former split between
// this route (payments) and /api/billing/webhook (subscriptions).
// Register one Stripe webhook endpoint → one STRIPE_WEBHOOK_SECRET.
//
// Verifies the signature via stripe.webhooks.constructEvent then dispatches:
//   - checkout.session.completed          → first payment / payment-link deposit
//   - payment_intent.succeeded            → card capture success
//   - invoice.paid                        → milestone cleared + subscription sync
//   - invoice.payment_failed              → milestone failed + subscription sync
//   - invoice.payment_succeeded           → branded receipt email generation
//   - customer.subscription.created/
//     updated/deleted                     → businesses subscription state sync
//
// Every event is persisted to public.stripe_events (idempotent insert against a
// UNIQUE constraint) for replay/forensics.
//
// ADAPTATION (apps/web):
//   - getAdminClient() → createServiceClient() (@/lib/supabase/service).
//   - safeError() inlined (the legacy @/lib/safeError helper was not ported).
//   - The legacy "activate nexus_clients + enqueue provisioning" side effect
//     depends on the `nexus_clients` table, which is NOT migrated in apps/web.
//     That side effect degrades honestly: the event is still recorded, but the
//     client-activation join is skipped with a TODO.
//   - The businesses.{stripe_subscription_id, subscription_status,
//     subscription_current_period_end} columns are not yet migrated — subscription
//     sync degrades to not_connected (42703/42P01) without throwing.
//     See docs/convergence/migration-map.md.
//
// Webhook secret lives in STRIPE_WEBHOOK_SECRET (shown ONCE when the endpoint is
// registered via /v1/webhook_endpoints).

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createServiceClient } from '@/lib/supabase/service';
import { handleInvoicePaymentSucceeded } from './receipt-handler';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';            // crypto verify needs Node runtime
export const maxDuration = 30;

const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY;
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

if (!STRIPE_SECRET) {
  console.warn('STRIPE_SECRET_KEY not set; webhook will reject events');
}

const stripe = STRIPE_SECRET
  ? new Stripe(STRIPE_SECRET, { apiVersion: '2026-05-27.dahlia' })
  : null;

// Inlined honest error shape (legacy @/lib/safeError not ported into apps/web).
function safeError(code: string, err: unknown): { error: string; detail?: string } {
  const detail =
    err instanceof Error ? err.message : typeof err === 'string' ? err : undefined;
  return detail ? { error: code, detail } : { error: code };
}

// 42703 = column does not exist, 42P01 = relation does not exist.
// Used to detect subscription columns not yet migrated in apps/web.
function isMissingSchema(err: { code?: string } | null): boolean {
  return err?.code === '42703' || err?.code === '42P01';
}

type ServiceClient = ReturnType<typeof createServiceClient>;

export async function POST(request: NextRequest) {
  if (!stripe || !WEBHOOK_SECRET) {
    return NextResponse.json(
      { error: 'not_connected', reason: 'webhook not configured' },
      { status: 503 },
    );
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

  // 2. Idempotency — atomic insert against UNIQUE constraint.
  //    23505 == unique-violation == duplicate; Postgres adjudicates the race.
  const admin = createServiceClient();
  const { error: insertErr } = await admin.from('stripe_events').insert({
    stripe_event_id: event.id,
    type: event.type,
    api_version: event.api_version,
    livemode: event.livemode,
    payload: event as unknown as Record<string, unknown>,
  });

  if (insertErr) {
    if ((insertErr as { code?: string }).code === '23505') {
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
        await Promise.all([
          handleSubscriptionInvoicePaid(event.data.object as Stripe.Invoice, admin),
          handleInvoicePaid(event.data.object as Stripe.Invoice, admin),
        ]);
        break;
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent, admin);
        break;
      case 'invoice.payment_failed':
        await Promise.all([
          handleSubscriptionPaymentFailed(event.data.object as Stripe.Invoice, admin),
          handleInvoiceFailed(event.data.object as Stripe.Invoice, admin),
        ]);
        break;
      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice, admin);
        break;
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await handleSubscriptionChanged(event.data.object as Stripe.Subscription, admin);
        break;
      default:
        break;
    }
  } catch (err) {
    await admin
      .from('stripe_events')
      .update({ processing_error: String(err instanceof Error ? err.message : err) })
      .eq('stripe_event_id', event.id);
    return NextResponse.json(safeError('dispatch_failed', err), { status: 500 });
  }

  return NextResponse.json({ received: true }, { status: 200 });
}

// ── Handlers ─────────────────────────────────────────────────────────────────

async function handleCheckoutCompleted(session: Stripe.Checkout.Session, admin: ServiceClient) {
  const customerId =
    typeof session.customer === 'string' ? session.customer : session.customer?.id;
  if (!customerId) return;
  await activateClientByStripeCustomer(customerId, admin, {
    trigger: 'checkout.session.completed',
    amount_total: session.amount_total,
    currency: session.currency,
    session_id: session.id,
  });
}

async function handleInvoicePaid(invoice: Stripe.Invoice, admin: ServiceClient) {
  const customerId =
    typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
  if (!customerId) return;
  await activateClientByStripeCustomer(customerId, admin, {
    trigger: 'invoice.paid',
    amount_paid: invoice.amount_paid,
    currency: invoice.currency,
    invoice_id: invoice.id,
    invoice_number: invoice.number,
  });
}

async function handlePaymentIntentSucceeded(pi: Stripe.PaymentIntent, admin: ServiceClient) {
  const customerId = typeof pi.customer === 'string' ? pi.customer : pi.customer?.id;
  if (!customerId) return;
  await activateClientByStripeCustomer(customerId, admin, {
    trigger: 'payment_intent.succeeded',
    amount: pi.amount,
    currency: pi.currency,
    payment_intent_id: pi.id,
  });
}

async function handleInvoiceFailed(invoice: Stripe.Invoice, _admin: ServiceClient) {
  // TODO(convergence): nexus_clients not migrated in apps/web — cannot mark the
  // client 'payment-failed'. Event is recorded in stripe_events for forensics.
  // See docs/convergence/migration-map.md.
  void _admin;
  console.warn(
    `[stripe webhook] invoice.payment_failed for ${invoice.id}: nexus_clients absent, ` +
      'status update skipped (not_connected).',
  );
}

// ── Subscription sync handlers (merged from /api/billing/webhook) ─────────────
// These update businesses.{subscription_status, subscription_current_period_end}
// when Stripe subscription state changes. The columns are not yet migrated in
// apps/web — failures with code 42703/42P01 are noted honestly, not thrown.
//
// Cast via SubscriptionRaw / InvoiceRaw because Stripe's 2026-05-27.dahlia
// API typedefs moved current_period_end and subscription off the top-level
// objects. The wire payload still has them.

interface SubscriptionRaw { id: string; status: string; current_period_end?: number }
interface InvoiceRaw { subscription?: string | { id: string } }

async function handleSubscriptionChanged(sub: Stripe.Subscription, admin: ServiceClient) {
  const raw = sub as unknown as SubscriptionRaw;
  const periodEnd = raw.current_period_end
    ? new Date(raw.current_period_end * 1000).toISOString()
    : null;
  const { error } = await admin
    .from('businesses')
    .update({
      subscription_status: raw.status,
      subscription_current_period_end: periodEnd,
    })
    .eq('stripe_subscription_id', raw.id);
  if (error && isMissingSchema(error)) {
    console.warn('[stripe webhook] subscription sync skipped — businesses subscription columns not migrated in apps/web');
  } else if (error) {
    throw new Error(`subscription sync failed: ${error.message}`);
  }
}

async function handleSubscriptionInvoicePaid(invoice: Stripe.Invoice, admin: ServiceClient) {
  const raw = invoice as unknown as InvoiceRaw;
  const subId = typeof raw.subscription === 'string' ? raw.subscription : raw.subscription?.id;
  if (!subId) return;
  const { error } = await admin
    .from('businesses')
    .update({ subscription_status: 'active' })
    .eq('stripe_subscription_id', subId);
  if (error && isMissingSchema(error)) {
    console.warn('[stripe webhook] subscription sync (invoice.paid) skipped — businesses subscription columns not migrated');
  } else if (error) {
    throw new Error(`subscription active sync failed: ${error.message}`);
  }
}

async function handleSubscriptionPaymentFailed(invoice: Stripe.Invoice, admin: ServiceClient) {
  const raw = invoice as unknown as InvoiceRaw;
  const subId = typeof raw.subscription === 'string' ? raw.subscription : raw.subscription?.id;
  if (!subId) return;
  const { error } = await admin
    .from('businesses')
    .update({ subscription_status: 'past_due' })
    .eq('stripe_subscription_id', subId);
  if (error && isMissingSchema(error)) {
    console.warn('[stripe webhook] subscription sync (invoice.payment_failed) skipped — businesses subscription columns not migrated');
  } else if (error) {
    throw new Error(`subscription past_due sync failed: ${error.message}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────

async function activateClientByStripeCustomer(
  customerId: string,
  admin: ServiceClient,
  triggerInfo: Record<string, unknown>,
) {
  // ADAPTATION: the legacy flow conditionally transitioned a nexus_clients row
  // (onboarding → active) then enqueued Hour-1 provisioning keyed on its slug.
  // apps/web has no nexus_clients table yet, so we cannot resolve the slug.
  // We DO NOT invent schema and we DO NOT enqueue with a fabricated slug.
  // The event is already persisted in stripe_events; provisioning is deferred.
  // TODO(convergence): once nexus_clients is migrated, restore the conditional
  // update + stripe_provisioning_queue insert. See docs/convergence/migration-map.md.
  void admin;
  console.warn(
    `[stripe webhook] first-payment for customer ${customerId} (${String(triggerInfo.trigger)}): ` +
      'nexus_clients absent in apps/web — client activation + provisioning deferred (not_connected).',
  );
}
