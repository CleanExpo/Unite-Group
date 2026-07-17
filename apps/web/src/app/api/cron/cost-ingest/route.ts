// GET /api/cron/cost-ingest
// WS1 per-project cost ingest. DORMANT by default: does nothing unless
// COST_METERING_ENABLED=true AND fetchers are registered (registry.ts). Even
// then it is READ-ONLY against sources — it only inserts into the metering
// tables (raw_cost_event / cost_record / data_quality_flag / unattributed_cost),
// never writes to any source billing system.
//
// Pipeline per source: fetch (read-only) → adapter → planIngest → persist.
// Requires the 20260714000000_project_cost_metering migration to be applied.

import { NextResponse } from 'next/server';

import { assertCronAuth } from '@/lib/cron-auth';
import { COST_FETCHERS, type Period } from '@/lib/metering/fetchers/registry';
import { planIngest } from '@/lib/metering/ingest';
import { persistPlan } from '@/lib/metering/persist';
import { toAud, type FxRates } from '@/lib/metering/fx';
import {
  createSupabaseMeteringStore,
  loadBusinessSlugToId,
} from '@/lib/metering/supabase-store';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

function currentMonthPeriod(now: Date): Period {
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const start = new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 10);
  const end = new Date(Date.UTC(y, m + 1, 0)).toISOString().slice(0, 10);
  return { start, end };
}

export async function GET(request: Request) {
  const denied = assertCronAuth(request);
  if (denied) return denied;

  // Dormant switch — off until the founder flips it on post-migration.
  if (process.env.COST_METERING_ENABLED !== 'true') {
    return NextResponse.json({
      dormant: true,
      message: 'COST_METERING_ENABLED is not true — ingest is dormant',
    });
  }

  // FX → AUD. Injected real rate (no hard-coded/guessed rates in the ledger).
  const usdAud = Number(process.env.METERING_FX_USD_AUD);
  if (!usdAud || Number.isNaN(usdAud)) {
    return NextResponse.json(
      { error: 'METERING_FX_USD_AUD not set — refusing to guess an FX rate' },
      { status: 500 }
    );
  }
  const rates: FxRates = { USD: usdAud };

  if (COST_FETCHERS.length === 0) {
    return NextResponse.json({
      enabled: true,
      wired: 0,
      message: 'no cost fetchers registered yet',
    });
  }

  const store = createSupabaseMeteringStore();
  const resolveBusinessId = await loadBusinessSlugToId();
  const period = currentMonthPeriod(new Date());

  const results: Array<Record<string, unknown>> = [];
  for (const fetcher of COST_FETCHERS) {
    try {
      const input = await fetcher.fetch(period);
      const events = fetcher.adapter.toEvents(input);
      const plan = planIngest(events, {
        toAud: (amount, currency) => toAud(amount, currency, rates),
        resolveBusinessId,
      });
      const persisted = await persistPlan(store, plan);
      results.push({ source: fetcher.adapter.id, ...persisted });
    } catch (e) {
      results.push({
        source: fetcher.adapter.id,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  return NextResponse.json({ enabled: true, period, results });
}
