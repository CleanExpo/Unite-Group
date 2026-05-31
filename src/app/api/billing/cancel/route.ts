// @ts-nocheck
// POST /api/billing/cancel — Cancel subscription at period end
//
// Validates the user session, cancels the Stripe subscription at period
// end (so the user keeps access until their billing cycle ends), and
// saves the cancellation reason on the user profile.
//
// Body: { reason?: string }

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { safeError } from "@/lib/safeError";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY;
const stripe = STRIPE_KEY
  ? new Stripe(STRIPE_KEY, { apiVersion: "2026-04-22.dahlia" as never })
  : null;

const VALID_REASONS = [
  "too_expensive",
  "missing_features",
  "switching_service",
  "not_using_enough",
  "technical_issues",
  "other",
];

export async function POST(request: NextRequest) {
  if (!stripe) {
    return NextResponse.json(
      { error: "Stripe not configured" },
      { status: 503 },
    );
  }

  // 1. Validate user session
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Parse body
  const body = await request.json().catch(() => ({}));
  const reason =
    typeof body.reason === "string" && VALID_REASONS.includes(body.reason)
      ? body.reason
      : "other";

  try {
    const admin = getAdminClient();

    // 3. Look up the user s Stripe subscription
    const { data: profile, error: profileErr } = await admin
      .from("profiles")
      .select("id, stripe_customer_id, stripe_subscription_id")
      .eq("id", user.id)
      .single();

    if (profileErr || !profile) {
      return NextResponse.json(
        safeError("profile_not_found", profileErr),
        { status: 404 },
      );
    }

    if (!profile.stripe_subscription_id) {
      return NextResponse.json(
        { error: "No active subscription found" },
        { status: 404 },
      );
    }

    // 4. Cancel at period end (user keeps access until billing cycle ends)
    const updated = await stripe.subscriptions.update(
      profile.stripe_subscription_id,
      {
        cancel_at_period_end: true,
        metadata: { cancellation_reason: reason },
      },
    );

    // 5. Update profile with cancellation info
    await admin
      .from("profiles")
      .update({
        cancellation_reason: reason,
        cancelled_at: new Date().toISOString(),
        plan: "free",
      })
      .eq("id", user.id);

    return NextResponse.json({
      success: true,
      subscription: {
        id: updated.id,
        status: updated.status,
        cancel_at_period_end: updated.cancel_at_period_end,
        current_period_end: updated.current_period_end,
      },
      message: "Your subscription will be cancelled at the end of your current billing period.",
    });
  } catch (err) {
    return NextResponse.json(
      safeError("cancel_subscription_failed", err),
      { status: 500 },
    );
  }
}
