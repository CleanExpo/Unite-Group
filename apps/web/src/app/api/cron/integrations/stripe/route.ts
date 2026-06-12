// GET /api/cron/integrations/stripe — Periodic Stripe → Supabase sync.
//
// Ported from apps/authority-legacy/src/app/api/cron/integrations/stripe/route.ts
// (P1 — docs/convergence/migration-map.md).
//
// ADAPTATION: the legacy route wrapped `withSyncLifecycle` from
// `@/lib/runtime/sync-lifecycle`, which is not present in apps/web. Replaced
// with apps/web's standard cron auth pattern: a `Bearer ${CRON_SECRET}`
// Authorization header (see src/app/api/cron/video-status/route.ts).

import { NextResponse } from 'next/server';
import { syncStripe } from '@/lib/integrations/stripe/sync';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(request: Request) {
  // 1. Verify CRON_SECRET from Authorization header
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET?.trim()}`) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  // 2. Honest dependency check — no Stripe key means nothing to sync.
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json(
      { ok: false, status: 'not_connected', reason: 'STRIPE_SECRET_KEY not configured' },
      { status: 503 },
    );
  }

  // 3. Run the sync. syncStripe degrades gracefully (per-entity failures) when
  //    the integration_stripe_* destination tables are absent.
  const result = await syncStripe();

  const allFailed = result.succeeded.length === 0 && result.failed.length > 0;
  return NextResponse.json(
    {
      ok: !allFailed,
      integration: 'stripe',
      rows_upserted: result.rowsUpserted,
      succeeded: result.succeeded,
      failed: result.failed,
      ran_at: new Date().toISOString(),
    },
    { status: allFailed ? 503 : 200 },
  );
}
