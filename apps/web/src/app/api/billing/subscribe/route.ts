// POST /api/billing/subscribe — Change subscription plan.
//
// Ported from apps/authority-legacy/src/app/api/billing/subscribe/route.ts (P1 —
// docs/convergence/migration-map.md).
//
// Validates the user session, then updates the Stripe subscription to the
// requested price (plan) with proration.
//
// Body: { priceId: string }
//
// ADAPTATION (apps/web): getUser() + 401, createServiceClient(), safeError()
// inlined. Reads `profiles.stripe_subscription_id`, which is NOT migrated in
// apps/web → honest 503 not_connected on missing relation.
// TODO(convergence): migrate profiles billing columns. See docs/convergence/migration-map.md.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import Stripe from 'stripe';
import { getUser } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY;
const stripe = STRIPE_KEY
  ? new Stripe(STRIPE_KEY, { apiVersion: '2026-04-22.dahlia' as Stripe.LatestApiVersion })
  : null;

const subscribeSchema = z.object({
  priceId: z.string().min(1, 'Plan price ID is required'),
});

function safeError(code: string, err: unknown): { error: string; detail?: string } {
  const detail =
    err instanceof Error ? err.message : typeof err === 'string' ? err : undefined;
  return detail ? { error: code, detail } : { error: code };
}

export async function POST(request: NextRequest) {
  if (!stripe) {
    return NextResponse.json({ error: 'not_connected', reason: 'Stripe not configured' }, { status: 503 });
  }

  // 1. Validate user session.
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Parse and validate body.
  const body = await request.json().catch(() => ({}));
  const parsed = subscribeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? 'Invalid input' },
      { status: 400 },
    );
  }

  const { priceId } = parsed.data;

  try {
    const admin = createServiceClient();

    // 3. Look up the user's Stripe subscription.
    const { data: profile, error: profileErr } = await admin
      .from('profiles')
      .select('stripe_customer_id, stripe_subscription_id')
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

    if (!profile.stripe_subscription_id) {
      return NextResponse.json({ error: 'No active subscription found' }, { status: 404 });
    }

    // 4. Update the subscription item to the new price.
    const subscription = await stripe.subscriptions.retrieve(profile.stripe_subscription_id);
    const subscriptionItemId = subscription.items.data[0]?.id;
    if (!subscriptionItemId) {
      return NextResponse.json({ error: 'Subscription item not found' }, { status: 500 });
    }

    const updated = await stripe.subscriptions.update(profile.stripe_subscription_id, {
      items: [{ id: subscriptionItemId, price: priceId }],
      proration_behavior: 'create_prorations',
    });

    // 5. Update the profile with the new plan info.
    await admin
      .from('profiles')
      .update({ plan_updated_at: new Date().toISOString() })
      .eq('id', user.id);

    return NextResponse.json({
      success: true,
      subscription: { id: updated.id, status: updated.status },
    });
  } catch (err) {
    return NextResponse.json(safeError('plan_change_failed', err), { status: 500 });
  }
}
