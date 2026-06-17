// POST /api/billing/portal — Create Stripe Customer Portal session.
//
// Ported from apps/authority-legacy/src/app/api/billing/portal/route.ts (P1 —
// docs/convergence/migration-map.md).
//
// Creates a Stripe Billing Portal session so the user can update their payment
// method, view invoices, and manage billing details directly.
//
// Returns: { url: string } — redirect URL for the Stripe portal.
//
// ADAPTATION (apps/web): getUser() + 401, createServiceClient(), safeError()
// inlined. Reads `profiles.stripe_customer_id`, which is NOT migrated in
// apps/web → honest 503 not_connected on missing relation.
// TODO(convergence): migrate profiles billing columns. See docs/convergence/migration-map.md.

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getUser } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY;
const stripe = STRIPE_KEY
  ? new Stripe(STRIPE_KEY, { apiVersion: '2026-05-27.dahlia' })
  : null;

function safeError(code: string, err: unknown): { error: string; detail?: string } {
  const detail =
    err instanceof Error ? err.message : typeof err === 'string' ? err : undefined;
  return detail ? { error: code, detail } : { error: code };
}

export async function POST(_request: NextRequest) {
  void _request;
  if (!stripe) {
    return NextResponse.json({ error: 'not_connected', reason: 'Stripe not configured' }, { status: 503 });
  }

  // 1. Validate user session.
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  try {
    const admin = createServiceClient();

    // 2. Get the user's Stripe customer ID.
    const { data: profile, error: profileErr } = await admin
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    if (profileErr && (profileErr as { code?: string }).code === '42P01') {
      return NextResponse.json(
        { error: 'not_connected', reason: 'profiles table not migrated in apps/web' },
        { status: 503 },
      );
    }
    if (profileErr || !profile) {
      return NextResponse.json(safeError('profile_not_found', profileErr), { status: 404 });
    }

    if (!profile.stripe_customer_id) {
      return NextResponse.json(
        { error: 'No billing account found. Please subscribe to a plan first.' },
        { status: 404 },
      );
    }

    // 3. Create a Stripe Billing Portal session.
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://unite-group.in';
    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${appUrl}/account/billing`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    return NextResponse.json(safeError('portal_session_failed', err), { status: 500 });
  }
}
