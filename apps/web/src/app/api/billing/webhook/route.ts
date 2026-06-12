// POST /api/billing/webhook — Stripe subscription/invoice webhook (raw HMAC).
//
// Ported from apps/authority-legacy/src/app/api/billing/webhook/route.ts (P1 —
// docs/convergence/migration-map.md).
//
// Verifies the Stripe signature manually (HMAC-SHA256 over `${t}.${body}`) and
// keeps `businesses` subscription state in sync.
//
// ADAPTATION (apps/web):
//   - getAdminClient() → createServiceClient().
//   - The `businesses` table in apps/web does NOT carry the subscription_* /
//     stripe_subscription_id columns this handler updates. We do NOT invent
//     them. The signature is still verified and the event acknowledged; when an
//     update touches a missing column (Postgres 42703) or relation (42P01) the
//     handler records it as `not_connected` in the response rather than
//     pretending sync occurred.
//   TODO(convergence): add businesses.{stripe_subscription_id, subscription_status,
//   subscription_current_period_end}. See docs/convergence/migration-map.md.

import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import { createServiceClient } from '@/lib/supabase/service';

export const dynamic = 'force-dynamic';

interface StripeEvent {
  id: string;
  type: string;
  data: { object: Record<string, unknown> };
}

interface SubscriptionPayload {
  id: string;
  customer: string;
  status: string;
  current_period_end?: number;
}

interface InvoicePayload {
  id: string;
  customer: string;
  subscription?: string;
  status: string;
  amount_paid?: number;
}

function verifyStripeSignature(
  rawBody: string,
  signatureHeader: string,
  secret: string,
  toleranceSeconds = 300,
): boolean {
  const parts = Object.fromEntries(
    signatureHeader.split(',').map((p) => {
      const [k, v] = p.split('=');
      return [k, v];
    }),
  );
  const timestamp = parts['t'];
  const v1 = parts['v1'];
  if (!timestamp || !v1) return false;

  const ageSec = Math.floor(Date.now() / 1000) - Number(timestamp);
  if (ageSec > toleranceSeconds || ageSec < -toleranceSeconds) return false;

  const expected = createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex');

  const a = Buffer.from(v1, 'hex');
  const b = Buffer.from(expected, 'hex');
  if (a.length !== b.length) return false;
  return timingSafeEqual(new Uint8Array(a), new Uint8Array(b));
}

// Surfaces the "schema not migrated" condition honestly.
function isMissingSchema(err: { code?: string } | null): boolean {
  return err?.code === '42703' || err?.code === '42P01';
}

export async function POST(request: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: 'not_connected', reason: 'STRIPE_WEBHOOK_SECRET not configured' },
      { status: 503 },
    );
  }

  const sig = request.headers.get('stripe-signature');
  if (!sig) {
    return NextResponse.json({ error: 'Missing stripe-signature' }, { status: 400 });
  }

  const rawBody = await request.text();
  if (!verifyStripeSignature(rawBody, sig, secret)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let event: StripeEvent;
  try {
    event = JSON.parse(rawBody) as StripeEvent;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const supabase = createServiceClient();
  let syncError: string | null = null;

  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const sub = event.data.object as unknown as SubscriptionPayload;
      const periodEnd = sub.current_period_end
        ? new Date(sub.current_period_end * 1000).toISOString()
        : null;
      const { error } = await supabase
        .from('businesses')
        .update({
          subscription_status: sub.status,
          subscription_current_period_end: periodEnd,
        })
        .eq('stripe_subscription_id', sub.id);
      if (error && isMissingSchema(error)) {
        syncError = 'businesses subscription columns not migrated in apps/web';
      } else if (error) {
        syncError = error.message;
      }
      break;
    }
    case 'invoice.paid': {
      const inv = event.data.object as unknown as InvoicePayload;
      if (inv.subscription) {
        const { error } = await supabase
          .from('businesses')
          .update({ subscription_status: 'active' })
          .eq('stripe_subscription_id', inv.subscription);
        if (error && isMissingSchema(error)) {
          syncError = 'businesses subscription columns not migrated in apps/web';
        } else if (error) {
          syncError = error.message;
        }
      }
      break;
    }
    case 'invoice.payment_failed': {
      const inv = event.data.object as unknown as InvoicePayload;
      if (inv.subscription) {
        const { error } = await supabase
          .from('businesses')
          .update({ subscription_status: 'past_due' })
          .eq('stripe_subscription_id', inv.subscription);
        if (error && isMissingSchema(error)) {
          syncError = 'businesses subscription columns not migrated in apps/web';
        } else if (error) {
          syncError = error.message;
        }
      }
      break;
    }
    default:
      // Acknowledge unhandled events so Stripe doesn't retry.
      break;
  }

  return NextResponse.json({
    received: true,
    event_id: event.id,
    type: event.type,
    ...(syncError ? { sync: 'not_connected', reason: syncError } : {}),
  });
}
