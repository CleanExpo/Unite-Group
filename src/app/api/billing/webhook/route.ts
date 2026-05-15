export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import { getAdminClient } from '@/lib/supabase/admin';

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
  items?: { data: Array<{ price: { id: string } }> };
  metadata?: Record<string, string>;
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

  const expected = createHmac('sha256', secret)
    .update(`${timestamp}.${rawBody}`)
    .digest('hex');

  const a = Buffer.from(v1, 'hex');
  const b = Buffer.from(expected, 'hex');
  if (a.length !== b.length) return false;
  return timingSafeEqual(new Uint8Array(a), new Uint8Array(b));
}

export async function POST(request: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'STRIPE_WEBHOOK_SECRET not configured' }, { status: 500 });
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

  const supabase = getAdminClient();

  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const sub = event.data.object as unknown as SubscriptionPayload;
      const periodEnd = sub.current_period_end
        ? new Date(sub.current_period_end * 1000).toISOString()
        : null;
      await supabase
        .from('businesses')
        .update({
          subscription_status: sub.status,
          subscription_current_period_end: periodEnd,
        })
        .eq('stripe_subscription_id', sub.id);
      break;
    }
    case 'invoice.paid': {
      const inv = event.data.object as unknown as InvoicePayload;
      if (inv.subscription) {
        await supabase
          .from('businesses')
          .update({ subscription_status: 'active' })
          .eq('stripe_subscription_id', inv.subscription);
      }
      break;
    }
    case 'invoice.payment_failed': {
      const inv = event.data.object as unknown as InvoicePayload;
      if (inv.subscription) {
        await supabase
          .from('businesses')
          .update({ subscription_status: 'past_due' })
          .eq('stripe_subscription_id', inv.subscription);
      }
      break;
    }
    default:
      // Acknowledge unhandled events so Stripe doesn't retry.
      break;
  }

  return NextResponse.json({ received: true, event_id: event.id, type: event.type });
}
