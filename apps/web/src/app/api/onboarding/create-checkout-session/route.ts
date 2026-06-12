// POST /api/onboarding/create-checkout-session — Stripe Checkout for onboarding.
//
// Ported from apps/authority-legacy/src/app/api/onboarding/create-checkout-session/route.ts
// (P1 — docs/convergence/migration-map.md).
//
// Creates a Stripe Checkout Session for a Unite-Group client to approve their
// proposal and pay the setup fee + start the monthly retainer.
//
// Body: { slug: string }   — nexus_clients.slug
//
// Public route (clients hit it without a logged-in session) — rate-limited.
//
// ADAPTATION (apps/web):
//   - getAdminClient() → createServiceClient().
//   - The legacy @/lib/ratelimit helper was not ported; a minimal in-process
//     fixed-window limiter is inlined here (5 req/min/IP, same budget as the
//     source). NOTE: in-process state does not survive across serverless
//     instances — adequate as a spam guard but not a hard global limit.
//   - The `nexus_clients` table is NOT migrated in apps/web. We do NOT invent
//     it: when the lookup hits a missing relation (42P01) the route returns an
//     honest 501 not_connected.
//   TODO(convergence): migrate nexus_clients (id, slug, company_name,
//   contact_name, contact_email, stripe_customer_id, brand_config) and, ideally,
//   port a shared rate-limit helper. See docs/convergence/migration-map.md.

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createServiceClient } from '@/lib/supabase/service';

export const dynamic = 'force-dynamic';

const DEFAULT_PRICING = {
  setup_fee_aud_cents: 440000, // $4,400 inc GST
  monthly_aud_cents: 275000, // $2,750 inc GST
  min_term_months: 12,
};

// ── Minimal in-process fixed-window rate limiter (legacy @/lib/ratelimit not ported) ──
const RATE_LIMIT = { limit: 5, windowMs: 60_000 };
const rateBuckets = new Map<string, { count: number; resetAt: number }>();

function rateLimit(ip: string): { ok: boolean; retryAfterMs: number } {
  const now = Date.now();
  const bucket = rateBuckets.get(ip);
  if (!bucket || now >= bucket.resetAt) {
    rateBuckets.set(ip, { count: 1, resetAt: now + RATE_LIMIT.windowMs });
    return { ok: true, retryAfterMs: 0 };
  }
  if (bucket.count >= RATE_LIMIT.limit) {
    return { ok: false, retryAfterMs: bucket.resetAt - now };
  }
  bucket.count += 1;
  return { ok: true, retryAfterMs: 0 };
}

function clientIp(request: NextRequest): string {
  const fwd = request.headers.get('x-forwarded-for');
  return fwd ? fwd.split(',')[0].trim() : 'unknown';
}

export async function POST(request: NextRequest) {
  const rate = rateLimit(clientIp(request));
  if (!rate.ok) {
    return NextResponse.json(
      { error: 'rate_limited', retry_after_ms: rate.retryAfterMs },
      { status: 429 },
    );
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return NextResponse.json(
      {
        error: 'not_connected',
        reason: 'Stripe not configured',
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

  const supabase = createServiceClient();
  const { data: client, error: clientErr } = await supabase
    .from('nexus_clients')
    .select('id, slug, company_name, contact_name, contact_email, stripe_customer_id, brand_config')
    .eq('slug', slug)
    .single();

  if (clientErr && (clientErr as { code?: string }).code === '42P01') {
    return NextResponse.json(
      { error: 'not_connected', reason: 'nexus_clients table not migrated in apps/web' },
      { status: 501 },
    );
  }
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

  const stripe = new Stripe(stripeKey, { apiVersion: '2026-05-27.dahlia' });
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
        price_data: {
          currency: 'aud',
          tax_behavior: 'inclusive',
          product_data: {
            name: `${client.company_name} — Setup Fee`,
            description:
              'One-time engagement setup. Architecture review, brand & button-name lock-in, ATO partner application kickoff.',
          },
          unit_amount: pricing.setup_fee_aud_cents,
        },
        quantity: 1,
      },
      {
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

  return NextResponse.json({ checkout_url: session.url, session_id: session.id });
}
