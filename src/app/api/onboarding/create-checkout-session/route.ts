import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getAdminClient } from '@/lib/supabase/admin';
import { applyRateLimit, UNKNOWN_IP } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

// Public Stripe Checkout creation — clients hit this from their portal
// approval page without a logged-in session. No auth wrapper applies.
// Rate-limit is the right defense: legitimate flow is 1 click per
// approval (usually one per client engagement, ever). 5 req/min/IP is
// far above legit usage and prevents spam Checkout sessions that would
// pollute the Stripe Customer namespace.
const CHECKOUT_RATE_LIMIT = 5;
const CHECKOUT_RATE_WINDOW_MS = 60_000;

/**
 * POST /api/onboarding/create-checkout-session
 *
 * Creates a Stripe Checkout Session for a Unite-Group client to approve
 * their proposal and pay the setup fee + start the monthly retainer.
 *
 * Body: { slug: string }   — nexus_clients.slug
 *
 * Reads client identity from nexus_clients (contact_email, company_name).
 * Builds a subscription-mode Checkout Session with mixed line items:
 *   - One-time setup fee (priced inline)
 *   - Recurring monthly retainer (priced inline)
 *
 * Returns the hosted Checkout URL the client is redirected to.
 *
 * Pricing for dimitri-itr (Duncan Perkins) — pulled from nexus_clients.brand_config.pricing
 * or falls back to the hardcoded engagement values below. All amounts in cents AUD,
 * GST-inclusive (Stripe will display the line item exclusive of tax unless tax_behavior
 * is set on the price — we use 'inclusive' so the displayed amount matches the proposal).
 */

const DEFAULT_PRICING = {
  setup_fee_aud_cents: 440000,   // $4,400 inc GST
  monthly_aud_cents:    275000,  // $2,750 inc GST
  min_term_months:      12,
};

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    UNKNOWN_IP;
  const rate = applyRateLimit(ip, CHECKOUT_RATE_LIMIT, CHECKOUT_RATE_WINDOW_MS);
  if (!rate.ok) {
    return NextResponse.json(
      { error: 'rate_limited', resetAt: rate.resetAt },
      { status: 429 },
    );
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return NextResponse.json(
      {
        error: 'Stripe not configured',
        hint: 'Set STRIPE_SECRET_KEY in Vercel project env vars (Production + Preview).',
      },
      { status: 503 },
    );
  }

  const body = await request.json().catch(() => ({}));
  const slug = typeof body?.slug === 'string' ? body.slug : '';
  if (!slug) {
    return NextResponse.json({ error: 'slug required' }, { status: 400 });
  }

  const supabase = getAdminClient();
  const { data: client, error: clientErr } = await supabase
    .from('nexus_clients')
    .select('id, slug, company_name, contact_name, contact_email, stripe_customer_id, brand_config')
    .eq('slug', slug)
    .single();

  if (clientErr || !client) {
    return NextResponse.json({ error: 'Client not found', slug }, { status: 404 });
  }
  if (!client.contact_email) {
    return NextResponse.json({ error: 'Client has no contact_email on file' }, { status: 400 });
  }

  const pricing = {
    ...DEFAULT_PRICING,
    ...((client.brand_config as { pricing?: Record<string, number> } | null)?.pricing ?? {}),
  };

  // SDK 2026's LatestApiVersion narrowed to the literal '2026-04-22.dahlia'; this route
  // is pinned to 2024-06-20 for stability. `as never` silences the literal-mismatch cast
  // without changing runtime behaviour (Stripe accepts any version string at runtime).
  const stripe = new Stripe(stripeKey, { apiVersion: '2024-06-20' as never });
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://unite-group.in';

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer_email: client.stripe_customer_id ? undefined : client.contact_email,
    customer: client.stripe_customer_id ?? undefined,
    payment_method_collection: 'always',
    billing_address_collection: 'required',
    allow_promotion_codes: false,
    line_items: [
      {
        // One-time setup fee — added to first invoice
        price_data: {
          currency: 'aud',
          tax_behavior: 'inclusive',
          product_data: {
            name: `${client.company_name} — Setup Fee`,
            description: 'One-time engagement setup. Architecture review, brand & button-name lock-in, ATO partner application kickoff.',
          },
          unit_amount: pricing.setup_fee_aud_cents,
        },
        quantity: 1,
      },
      {
        // Recurring monthly retainer
        price_data: {
          currency: 'aud',
          tax_behavior: 'inclusive',
          product_data: {
            name: `${client.company_name} — Monthly Retainer`,
            description: `Flat monthly retainer. ${pricing.min_term_months}-month minimum term. Invoiced 1st of each month.`,
          },
          unit_amount: pricing.monthly_aud_cents,
          recurring: { interval: 'month' },
        },
        quantity: 1,
      },
    ],
    subscription_data: {
      description: `${client.company_name} — ${pricing.min_term_months}-month retainer (Unite-Group)`,
      metadata: {
        nexus_client_id: client.id,
        nexus_client_slug: client.slug,
        contact_email: client.contact_email,
        min_term_months: String(pricing.min_term_months),
      },
    },
    success_url: `${appUrl}/clients/${slug}?paid=1&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/clients/${slug}?paid=0`,
    metadata: {
      nexus_client_id: client.id,
      nexus_client_slug: client.slug,
      contact_email: client.contact_email,
      flow: 'onboarding_approval',
    },
  });

  return NextResponse.json({
    checkout_url: session.url,
    session_id: session.id,
  });
}
