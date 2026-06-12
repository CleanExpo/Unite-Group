// src/lib/integrations/stripe/sync.ts
//
// Ported from apps/authority-legacy/src/lib/integrations/stripe/sync.ts (P1 —
// docs/convergence/migration-map.md).
//
// ADAPTATION:
//  - Swapped getAdminClient() → createServiceClient() (apps/web convention).
//  - The destination tables `integration_stripe_subscriptions` and
//    `integration_stripe_invoices_mtd` are NOT present in the apps/web schema
//    (they are integration-dashboard tables, NOT stripe_events-adjacent, so per
//    the convergence rules they are deferred, not invented here). When an upsert
//    targets a missing relation Postgres returns code 42P01; we surface that as
//    an honest `not_connected` failure rather than pretending the sync ran.
//    TODO(convergence): migrate integration_stripe_* tables, then this degrades
//    away automatically. See docs/convergence/migration-map.md.

import Stripe from 'stripe';
import { createServiceClient } from '@/lib/supabase/service';

// Lazy init: constructing Stripe at module load with an empty apiKey throws
// in the 2026 SDK, which breaks `next build` (page-data collection touches
// every API route module). Building stays green when STRIPE_SECRET_KEY is
// unset; the runtime branches that need Stripe surface the missing key.
function getStripeClient(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY missing');
  return new Stripe(key, { apiVersion: '2026-04-22.dahlia' as Stripe.LatestApiVersion });
}

// Postgres "undefined_table" — the integration_stripe_* tables aren't migrated.
function isMissingRelation(err: { code?: string } | null): boolean {
  return err?.code === '42P01';
}

export async function syncStripe(): Promise<{
  rowsUpserted: number;
  succeeded: string[];
  failed: Array<{ entity: string; error: string }>;
}> {
  const sb = createServiceClient();
  let total = 0;
  const succeeded: string[] = [];
  const failed: Array<{ entity: string; error: string }> = [];

  // Section 1 — subscriptions list (paginated).
  try {
    const stripe = getStripeClient();
    for await (const sub of stripe.subscriptions.list({
      status: 'all',
      limit: 100,
    })) {
      const item = sub.items.data[0];
      const product = item?.price.product;
      const productName =
        typeof product === 'string' || product == null
          ? null
          : 'deleted' in product && product.deleted
            ? null
            : (product as Stripe.Product).name;

      const { error } = await sb.from('integration_stripe_subscriptions').upsert(
        {
          id: sub.id,
          customer_id:
            typeof sub.customer === 'string' ? sub.customer : sub.customer.id,
          status: sub.status,
          current_period_end: item?.current_period_end
            ? new Date(item.current_period_end * 1000).toISOString()
            : null,
          monthly_amount_aud:
            ((item?.price.unit_amount ?? 0) * (item?.quantity ?? 1)) / 100,
          product_name: productName,
          created_at: new Date(sub.created * 1000).toISOString(),
          fetched_at: new Date().toISOString(),
        },
        { onConflict: 'id' },
      );
      if (error) {
        if (isMissingRelation(error)) {
          throw new Error(
            'not_connected: integration_stripe_subscriptions table not migrated in apps/web',
          );
        }
        throw new Error(error.message);
      }
      total++;
    }
    succeeded.push('subscriptions');
  } catch (e: unknown) {
    const err = e as { message?: string };
    failed.push({
      entity: 'subscriptions',
      error: `${err.message ?? String(e)}`,
    });
  }

  // Section 2 — month-to-date invoice roll-up (single row keyed on yyyymm).
  try {
    const stripe = getStripeClient();
    const now = new Date();
    const yyyymm = `${now.getUTCFullYear()}${String(
      now.getUTCMonth() + 1,
    ).padStart(2, '0')}`;
    const monthStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0),
    );
    let totalAmount = 0;
    let paid = 0;
    for await (const inv of stripe.invoices.list({
      created: { gte: Math.floor(monthStart.getTime() / 1000) },
      limit: 100,
    })) {
      totalAmount += inv.total;
      if (inv.status === 'paid') paid += inv.total;
    }
    const { error } = await sb.from('integration_stripe_invoices_mtd').upsert(
      {
        yyyymm,
        total_aud: totalAmount / 100,
        paid_aud: paid / 100,
        outstanding_aud: (totalAmount - paid) / 100,
        fetched_at: new Date().toISOString(),
      },
      { onConflict: 'yyyymm' },
    );
    if (error) {
      if (isMissingRelation(error)) {
        throw new Error(
          'not_connected: integration_stripe_invoices_mtd table not migrated in apps/web',
        );
      }
      throw new Error(error.message);
    }
    total++;
    succeeded.push('invoices_mtd');
  } catch (e: unknown) {
    const err = e as { message?: string };
    failed.push({
      entity: 'invoices_mtd',
      error: `${err.message ?? String(e)}`,
    });
  }

  return { rowsUpserted: total, succeeded, failed };
}
