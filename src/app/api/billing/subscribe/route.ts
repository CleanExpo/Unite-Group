export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { StripeApiClient } from '@/lib/api/stripe/client';
import { getAdminClient } from '@/lib/supabase/admin';
import { resolvePriceId } from '@/lib/billing/tiers';
import { applyRateLimit, UNKNOWN_IP } from '@/lib/rate-limit';
import { checkAdminToken } from '@/lib/auth/check-admin-token';

const subscribeSchema = z.object({
  business_id: z.string().uuid(),
  tier: z.enum(['base', 'professional', 'master']),
});

// RA-3013 — even though this route is admin-token-gated, a leaked or
// log-exposed PI_CEO_API_KEY would let an attacker create unlimited
// Stripe subscriptions. Rate-limit IS a defense layer here, not a
// substitute for auth. 30 req/min/IP is generous for legitimate
// operator use and a hard stop for credential-stuffing replay.
const ADMIN_LIMIT = 30;
const ADMIN_WINDOW_MS = 60 * 1000;

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    UNKNOWN_IP
  );
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rl = applyRateLimit(`admin-subscribe:${ip}`, ADMIN_LIMIT, ADMIN_WINDOW_MS);
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Too many requests' },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)),
        },
      },
    );
  }

  const adminToken = request.headers.get('x-admin-token');
  const auth = await checkAdminToken(adminToken);
  if (!auth.ok) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return NextResponse.json({ error: 'STRIPE_SECRET_KEY not configured' }, { status: 500 });
  }

  const body = await request.json();
  const parsed = subscribeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request', details: parsed.error.format() }, { status: 400 });
  }
  const { business_id, tier } = parsed.data;

  let priceId: string;
  try {
    priceId = resolvePriceId(tier);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }

  const supabase = getAdminClient();
  const { data: business, error: bizErr } = await supabase
    .from('businesses')
    .select('id, name, slug, domain, stripe_customer_id, stripe_subscription_id, subscription_status')
    .eq('id', business_id)
    .single();

  if (bizErr || !business) {
    return NextResponse.json({ error: 'Business not found' }, { status: 404 });
  }

  if (business.stripe_subscription_id && business.subscription_status === 'active') {
    return NextResponse.json(
      { error: 'Active subscription already exists', subscription_id: business.stripe_subscription_id },
      { status: 409 },
    );
  }

  const stripe = new StripeApiClient({ apiKey: stripeKey });

  let customerId = business.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe.createCustomer({
      name: business.name,
      description: `Unite-Group portfolio business: ${business.slug}`,
      metadata: {
        business_id: business.id,
        slug: business.slug,
        domain: business.domain ?? '',
      },
    });
    customerId = customer.id;
  }

  const subscription = await stripe.createSubscription({
    customer: customerId,
    items: [{ price: priceId }],
    paymentBehavior: 'default_incomplete',
    paymentSettings: {
      save_default_payment_method: 'on_subscription',
    },
    metadata: {
      business_id: business.id,
      tier,
    },
  });

  await supabase
    .from('businesses')
    .update({
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
      subscription_tier: tier,
      subscription_status: subscription.status,
      subscription_current_period_end: subscription.current_period_end
        ? new Date(subscription.current_period_end * 1000).toISOString()
        : null,
    })
    .eq('id', business.id);

  const latestInvoice = (subscription as unknown as { latest_invoice?: { payment_intent?: { client_secret?: string } } })
    .latest_invoice;

  return NextResponse.json({
    subscription_id: subscription.id,
    customer_id: customerId,
    status: subscription.status,
    client_secret: latestInvoice?.payment_intent?.client_secret ?? null,
  });
}
