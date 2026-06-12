// @ts-nocheck
// POST /api/billing/portal — Create Stripe Customer Portal session
//
// Creates a Stripe Billing Portal session so the user can update their
// payment method, view invoices, and manage billing details directly.
//
// Returns: { url: string } — redirect URL for the Stripe portal

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

  try {
    const admin = getAdminClient();

    // 2. Get the user's Stripe customer ID
    const { data: profile, error: profileErr } = await admin
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single();

    if (profileErr || !profile) {
      return NextResponse.json(
        safeError("profile_not_found", profileErr),
        { status: 404 },
      );
    }

    if (!profile.stripe_customer_id) {
      return NextResponse.json(
        { error: "No billing account found. Please subscribe to a plan first." },
        { status: 404 },
      );
    }

    // 3. Create a Stripe Billing Portal session
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://unite-group.in";
    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${appUrl}/account/billing`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    return NextResponse.json(
      safeError("portal_session_failed", err),
      { status: 500 },
    );
  }
}
