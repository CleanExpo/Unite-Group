// Empire System Health aggregator (UNI-1947 follow-up).
//
// Returns a single SystemHealth payload covering six signals:
//   1. database   - Supabase round-trip latency
//   2. api        - reachability of the 6 main empire API routes
//   3. integrations - per-source adapter status across all 6 portfolio brands
//                     for {github,linear,vercel,railway,supabase}
//   4. businesses - bucketed overall_health from /api/empire/businesses
//   5. pi_ceo_scanner - freshness of pi_ceo_health_snapshots
//   6. deploys    - Vercel latest production deployment state
//
// Each signal is computed in parallel via Promise.allSettled (see _helpers.ts).
// A failing signal degrades to 'err' / 'unknown' rather than blowing up the
// whole response.
//
// Cache: 30s in-module memo. Bypass via POST.

import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/security/require-admin';
import { computeSystemHealth, type SystemHealth } from './_helpers';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const CACHE_TTL_MS = 30_000;

let _cache: { payload: SystemHealth; expires_at: number } | null = null;

function getBaseUrl(req?: Request): string {
  if (req) {
    try {
      const u = new URL(req.url);
      return `${u.protocol}//${u.host}`;
    } catch {
      /* fall through */
    }
  }
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'http://localhost:3000';
}

export async function GET(req: Request) {
  const gate = await requireAdmin(req);
  if (gate instanceof NextResponse) return gate;
  if (_cache && _cache.expires_at > Date.now()) {
    return NextResponse.json(_cache.payload, {
      headers: { 'Cache-Control': 'no-store', 'X-Cache': 'HIT' },
    });
  }
  const payload = await computeSystemHealth(getBaseUrl(req));
  _cache = { payload, expires_at: Date.now() + CACHE_TTL_MS };
  return NextResponse.json(payload, {
    headers: { 'Cache-Control': 'no-store', 'X-Cache': 'MISS' },
  });
}

export async function POST(req: Request) {
  const gate = await requireAdmin(req);
  if (gate instanceof NextResponse) return gate;
  // Force refresh — bypasses cache.
  const payload = await computeSystemHealth(getBaseUrl(req));
  _cache = { payload, expires_at: Date.now() + CACHE_TTL_MS };
  return NextResponse.json(payload, {
    headers: { 'Cache-Control': 'no-store', 'X-Cache': 'BYPASS' },
  });
}
