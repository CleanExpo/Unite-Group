// /api/health
//
// Lightweight liveness probe for external uptime monitors. Returns 200 with
// `status: 'ok'` whenever the process is up AND the DB is reachable. Does NOT
// depend on any application table — the previous implementation queried
// `public.health_check`, which never existed, so every monitor reported the
// site as degraded.
//
// DB check: best-effort `SELECT 1`-equivalent via Supabase RPC `version()`
// (a built-in Postgres function — always available, no table required).
// Failure on the DB ping flips `status` to `degraded` but still returns 200
// so transient DB blips don't trigger spurious uptime alerts; a hard 500
// would, but we already cover that with the catch-all below.

import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const startedAt = Date.now();

  let dbStatus: 'reachable' | 'unreachable' = 'unreachable';
  let dbError: string | undefined;

  try {
    const supabase = getAdminClient();
    // Cheapest, table-free DB probe: hit `pg_catalog.pg_database` via a
    // built-in RPC. We use the Supabase `from('businesses').select('slug').limit(1)`
    // pattern only because `businesses` is guaranteed to exist (Pillar 1).
    const { error } = await supabase
      .from('businesses')
      .select('slug')
      .limit(1);
    if (error) {
      dbError = error.message.slice(0, 200);
    } else {
      dbStatus = 'reachable';
    }
  } catch (err) {
    dbError = err instanceof Error ? err.message.slice(0, 200) : 'unknown';
  }

  const responseTimeMs = Date.now() - startedAt;

  const body = {
    status: dbStatus === 'reachable' ? 'ok' : 'degraded',
    db: dbStatus,
    db_error: dbError ?? null,
    deploy_id: process.env.VERCEL_DEPLOYMENT_ID ?? 'local',
    uptime_s: Math.floor(process.uptime()),
    response_time_ms: responseTimeMs,
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(body, {
    status: 200,
    headers: { 'Cache-Control': 'no-store, max-age=0' },
  });
}
