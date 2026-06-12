// POST /api/payment/create-intent — Create a Stripe Payment Intent.
//
// Ported from apps/authority-legacy/src/app/api/payment/create-intent/route.ts
// (P1 — docs/convergence/migration-map.md).
//
// Creates a Stripe payment intent and returns the client secret.
//
// ADAPTATION (apps/web):
//   - getUser() + 401 (apps/web auth helper).
//   - StripeApiClient is now backed by the official Stripe SDK (see
//     src/lib/api/stripe/client.ts) — no schema dependency, fully functional
//     once STRIPE_SECRET_KEY is set. When the key is absent the client
//     constructor throws and we surface an honest 503 not_connected.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { StripeApiClient } from '@/lib/api/stripe/client';
import { getUser } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const createIntentSchema = z.object({
  amount: z.number().positive(),
  currency: z.string().min(3).max(3).default('aud'),
  description: z.string().optional(),
  customer_id: z.string().optional(),
  metadata: z.record(z.string()).optional(),
  receipt_email: z.string().email().optional(),
  payment_method_types: z.array(z.string()).optional(),
});

export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json(
      { error: 'not_connected', reason: 'STRIPE_SECRET_KEY not configured' },
      { status: 503 },
    );
  }

  try {
    const body = await request.json();
    const validation = createIntentSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.format() },
        { status: 400 },
      );
    }

    const {
      amount,
      currency,
      description,
      customer_id,
      metadata,
      receipt_email,
      payment_method_types,
    } = validation.data;

    const stripeClient = new StripeApiClient({
      apiKey: process.env.STRIPE_SECRET_KEY,
    });

    const paymentIntent = await stripeClient.createPaymentIntent({
      amount,
      currency,
      description: description || 'UNITE Group payment',
      customer: customer_id,
      metadata,
      receiptEmail: receipt_email,
      paymentMethodTypes: payment_method_types || ['card'],
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    return NextResponse.json(
      {
        error: 'Failed to create payment intent',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      },
      { status: 500 },
    );
  }
}
