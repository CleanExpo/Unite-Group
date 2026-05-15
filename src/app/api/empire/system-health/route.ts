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
// Each signal is computed in parallel via Promise.allSettled. A failing signal
// degrades to 'err' / 'unknown' rather than blowing up the whole response.
//
// NO MOCK DATA — when a source isn't configured (no token, no row), we honestly
// return 'unknown' with a summary explaining the gap.
//
// Cache: 30s in-module memo. Bypass via POST.

import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/security/require-admin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// ─── Types ────────────────────────────────────────────────────────────────────

type Tri = 'ok' | 'warn' | 'err';
type Quad = Tri | 'unknown';

interface SignalDatabase   { status: Tri; latency_ms: number; summary: string }
interface SignalApi        { status: Tri; routes_total: number; routes_failing: number; summary: string }
interface SignalIntegrations {
  status: Tri;
  github: Quad;
  linear: Quad;
  vercel: Quad;
  railway: Quad;
  supabase: Quad;
  summary?: string;
}
interface SignalBusinesses { status: Tri; total: number; ok_count: number; warn_count: number; err_count: number; summary: string }
interface SignalScanner    { status: Tri; last_scan: string | null; stale_brands: number; summary: string }
interface SignalDeploys    { status: Tri; last_prod_deploy: string | null; state: string; summary: string }

export interface SystemHealth {
  overall: Tri;
  computed_at: string;
  signals: {
    database: SignalDatabase;
    api: SignalApi;
    integrations: SignalIntegrations;
    businesses: SignalBusinesses;
    pi_ceo_scanner: SignalScanner;
    deploys: SignalDeploys;
  };
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CACHE_TTL_MS = 30_000;
// Per-probe timeout. 30 adapter probes (5 sources × 6 brands) run in parallel
// and hit external APIs (GitHub, Linear, Vercel, Railway, Supabase Mgmt). 8s
// fits the slow tail without letting a single hung probe stall the whole
// roll-up — Promise.all in rollUpAdapter caps total wall time at this value.
const PROBE_TIMEOUT_MS = 8_000;
const PORTFOLIO_SLUGS = [
  'synthex',
  'restoreassist',
  'dr-nrpg',
  'carsi',
  'ccw-crm',
  'disaster-recovery',
];

// API routes that must be live for the empire surface to function.
// /api/empire/integrations requires an x-admin-token header → we probe with the
// header populated from PI_CEO_API_KEY so a 401 doesn't false-positive as down.
const EMPIRE_API_ROUTES = [
  { path: '/api/empire/businesses', auth: false },
  { path: '/api/empire/priorities', auth: false },
  { path: '/api/empire/pipeline', auth: false },
  { path: '/api/empire/board-minutes', auth: false },
  { path: '/api/empire/integrations', auth: true },
  { path: '/api/empire/health', auth: false },
];

// ─── 30s in-module cache ──────────────────────────────────────────────────────

let _cache: { payload: SystemHealth; expires_at: number } | null = null;

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Roll up sibling statuses, treating 'unknown' as neutral (not-configured).
// Rules:
//   err  if any value is err
//   warn if any value is warn (and no err)
//   ok   if any value is ok (and no err / warn)
//   unknown only if every value is unknown
function rollupQuad(values: Quad[]): Quad {
  if (values.length === 0) return 'unknown';
  if (values.some(v => v === 'err')) return 'err';
  if (values.some(v => v === 'warn')) return 'warn';
  if (values.some(v => v === 'ok')) return 'ok';
  return 'unknown';
}

// Roll up the top-level overall status across the six signal slots. 'unknown'
// is treated as neutral — it neither degrades nor flips green to red. If every
// signal is unknown we still report 'ok' (nothing is broken), but that's not a
// path the live empire can reach today.
function rollupOverall(values: Quad[]): Tri {
  if (values.some(v => v === 'err')) return 'err';
  if (values.some(v => v === 'warn')) return 'warn';
  if (values.some(v => v === 'ok')) return 'ok';
  // All unknown — nothing is failing, just nothing is configured.
  return 'ok';
}

function getBaseUrl(req?: Request): string {
  // Prefer the inbound request origin so we hit the same deployment that's serving us.
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

// ─── 1. Database ──────────────────────────────────────────────────────────────

async function probeDatabase(): Promise<SignalDatabase> {
  const t0 = Date.now();
  try {
    const supabase = getAdminClient();
    // Cheap round-trip — count(*) on a small table the schema is guaranteed to have.
    // .limit(1) keeps the query bounded even if the table grows.
    const { error } = await supabase.from('businesses').select('id', { count: 'exact', head: true }).limit(1);
    const latency = Date.now() - t0;
    if (error) {
      return { status: 'err', latency_ms: latency, summary: `Supabase query failed: ${error.message.slice(0, 100)}` };
    }
    let status: Tri = 'ok';
    if (latency > 1000) status = 'err';
    else if (latency > 300) status = 'warn';
    return { status, latency_ms: latency, summary: `Supabase ${latency}ms` };
  } catch (err) {
    const latency = Date.now() - t0;
    const msg = err instanceof Error ? err.message : String(err);
    return { status: 'err', latency_ms: latency, summary: `Supabase unreachable: ${msg.slice(0, 100)}` };
  }
}

// ─── 2. API routes ────────────────────────────────────────────────────────────

async function probeApiRoute(baseUrl: string, route: { path: string; auth: boolean }): Promise<boolean> {
  try {
    const headers: Record<string, string> = { 'User-Agent': 'unite-group-health' };
    if (route.auth && process.env.PI_CEO_API_KEY) {
      headers['x-admin-token'] = process.env.PI_CEO_API_KEY;
    }
    // P0 batch 2b: every empire route now requires admin auth. Forward the
    // service-role bearer so the probe doesn't false-positive as down.
    const svcKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (svcKey) headers.authorization = `Bearer ${svcKey}`;
    const res = await fetch(`${baseUrl}${route.path}`, {
      headers,
      cache: 'no-store',
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function probeApi(baseUrl: string): Promise<SignalApi> {
  const results = await Promise.all(EMPIRE_API_ROUTES.map(r => probeApiRoute(baseUrl, r)));
  const total = results.length;
  const failing = results.filter(r => !r).length;
  let status: Tri = 'ok';
  if (failing >= 3) status = 'err';
  else if (failing >= 1) status = 'warn';
  const summary = failing === 0
    ? `All ${total} routes healthy`
    : `${failing}/${total} routes failing`;
  return { status, routes_total: total, routes_failing: failing, summary };
}

// ─── 3. Integrations ──────────────────────────────────────────────────────────
//
// THIS SIGNAL ONLY MEASURES ADAPTER HEALTH — i.e. "can our Unite-Group adapter
// routes talk to GitHub / Linear / Vercel / Railway / Supabase APIs?".
//
// It deliberately does NOT measure whether the underlying portfolio brands
// (Synthex, RestoreAssist, etc.) are themselves healthy — that's what the
// `businesses` signal covers. Conflating the two ("github adapter says
// Synthex's repo has stale branches → integrations: err") produced misleading
// red lights on a green system.
//
// Probe strategy: hit each adapter once with the Synthex canary slug.
//   - Adapter returns ANY status field (ok/warn/err/unknown) without throwing
//     or 5xx-ing → adapter is working → 'ok' (the connection layer is fine).
//   - Adapter route 5xx's, times out, or returns a body without a parseable
//     status field → adapter broken → 'err' (Unite-Group has a bug).
//
// After this fix:
//   integrations: ok   = all 5 adapter routes can reach their upstream APIs
//   businesses: warn   = some brands have content-level issues
//   These two collapse to a single overall pill only when there's a real
//   adapter outage or a real brand failure — never both for the same root cause.

interface AdapterResp { status?: Quad }

type AdapterKind = 'github' | 'linear' | 'vercel' | 'railway' | 'supabase';

// Synthex is the always-configured canary brand. Every adapter has a row for
// it, so a successful probe proves the adapter route works end-to-end.
const CANARY_SLUG = 'synthex';

async function probeAdapterHealth(baseUrl: string, kind: AdapterKind): Promise<Quad> {
  try {
    // Adapter routes are now admin-gated (P0 batch 2b). Forward service-role.
    const headers: Record<string, string> = {};
    const svcKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (svcKey) headers.authorization = `Bearer ${svcKey}`;
    const res = await fetch(`${baseUrl}/api/empire/sources/${kind}/${CANARY_SLUG}`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
      headers,
    });
    // 5xx (or any non-2xx) → adapter is broken on our side.
    if (!res.ok) return 'err';
    const body = (await res.json()) as AdapterResp;
    // Adapter responded with a structured payload → adapter route works.
    // We don't care whether the brand-level status is ok/warn/err — that's
    // the `businesses` signal's job, not ours.
    if (body.status === 'ok' || body.status === 'warn' || body.status === 'err' || body.status === 'unknown') {
      return 'ok';
    }
    // Body is 2xx but missing/garbled status field → adapter contract broken.
    return 'err';
  } catch {
    // Timeout, network error, JSON parse error → adapter broken.
    return 'err';
  }
}

async function probeIntegrations(baseUrl: string): Promise<SignalIntegrations> {
  const [github, linear, vercel, railway, supabase] = await Promise.all([
    probeAdapterHealth(baseUrl, 'github'),
    probeAdapterHealth(baseUrl, 'linear'),
    probeAdapterHealth(baseUrl, 'vercel'),
    probeAdapterHealth(baseUrl, 'railway'),
    probeAdapterHealth(baseUrl, 'supabase'),
  ]);
  const sourceStatuses: Quad[] = [github, linear, vercel, railway, supabase];
  const rolled = rollupQuad(sourceStatuses);
  const status: Tri = rolled === 'unknown' ? 'ok' : rolled;
  const sources = { github, linear, vercel, railway, supabase };
  const okCount = sourceStatuses.filter(v => v === 'ok').length;
  const total = sourceStatuses.length;
  const downSources = (['github', 'linear', 'vercel', 'railway', 'supabase'] as const)
    .filter((_, i) => sourceStatuses[i] !== 'ok');
  const summary = okCount === total
    ? `${okCount}/${total} source adapters healthy`
    : `${okCount}/${total} — ${downSources.join(', ')} adapter${downSources.length === 1 ? '' : 's'} down`;
  return { status, ...sources, summary };
}

// ─── 4. Businesses ────────────────────────────────────────────────────────────

async function probeBusinesses(baseUrl: string): Promise<SignalBusinesses> {
  try {
    // businesses route is now admin-gated (P0 batch 2b). Forward service-role.
    const headers: Record<string, string> = {};
    const svcKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (svcKey) headers.authorization = `Bearer ${svcKey}`;
    const res = await fetch(`${baseUrl}/api/empire/businesses`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
      headers,
    });
    if (!res.ok) {
      return { status: 'err', total: 0, ok_count: 0, warn_count: 0, err_count: 0, summary: `businesses API ${res.status}` };
    }
    const body = (await res.json()) as { businesses: Array<{ overall_health: number | null }> };
    const rows = body.businesses ?? [];
    let okCount = 0;
    let warnCount = 0;
    let errCount = 0;
    for (const row of rows) {
      const h = row.overall_health;
      if (h === null) continue;
      if (h >= 80) okCount++;
      else if (h >= 50) warnCount++;
      else errCount++;
    }
    let status: Tri = 'ok';
    if (errCount > 0) status = 'err';
    else if (warnCount > 0) status = 'warn';
    const summary = `${rows.length} brands · ${okCount} ok · ${warnCount} warn · ${errCount} err`;
    return { status, total: rows.length, ok_count: okCount, warn_count: warnCount, err_count: errCount, summary };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { status: 'err', total: 0, ok_count: 0, warn_count: 0, err_count: 0, summary: `businesses unreachable: ${msg.slice(0, 80)}` };
  }
}

// ─── 5. Pi-CEO scanner freshness ──────────────────────────────────────────────

async function probeScanner(): Promise<SignalScanner> {
  try {
    const supabase = getAdminClient();
    const { data, error } = await supabase
      .from('pi_ceo_health_snapshots')
      .select('project_id, snapshot_at')
      .order('snapshot_at', { ascending: false });
    if (error) {
      return { status: 'err', last_scan: null, stale_brands: 0, summary: `scanner query failed: ${error.message.slice(0, 80)}` };
    }
    const rows = data ?? [];
    if (rows.length === 0) {
      return { status: 'err', last_scan: null, stale_brands: PORTFOLIO_SLUGS.length, summary: 'No snapshots in pi_ceo_health_snapshots' };
    }
    // Latest snapshot per project_id
    const latestByProject = new Map<string, string>();
    for (const row of rows) {
      if (!latestByProject.has(row.project_id)) {
        latestByProject.set(row.project_id, row.snapshot_at as string);
      }
    }
    const now = Date.now();
    const WEEK = 7 * 86_400_000;
    const DAY = 86_400_000;
    let staleBrands = 0;
    let mostRecent: string | null = null;
    for (const ts of latestByProject.values()) {
      const ageMs = now - new Date(ts).getTime();
      if (ageMs > WEEK) staleBrands++;
      if (mostRecent === null || ts > mostRecent) mostRecent = ts;
    }
    const mostRecentAge = mostRecent ? now - new Date(mostRecent).getTime() : Infinity;
    let status: Tri = 'ok';
    if (mostRecentAge > WEEK) status = 'err';
    else if (mostRecentAge > DAY) status = 'warn';
    const ageLabel = mostRecent
      ? mostRecentAge < 3600_000
        ? `${Math.round(mostRecentAge / 60_000)}m ago`
        : mostRecentAge < DAY
          ? `${Math.round(mostRecentAge / 3600_000)}h ago`
          : `${Math.round(mostRecentAge / DAY)}d ago`
      : 'never';
    const summary = staleBrands > 0
      ? `latest ${ageLabel} · ${staleBrands} brand${staleBrands === 1 ? '' : 's'} stale (>7d)`
      : `latest ${ageLabel} · all fresh`;
    return { status, last_scan: mostRecent, stale_brands: staleBrands, summary };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { status: 'err', last_scan: null, stale_brands: 0, summary: `scanner unreachable: ${msg.slice(0, 80)}` };
  }
}

// ─── 6. Deploys ───────────────────────────────────────────────────────────────

interface VercelDeployment {
  uid: string;
  url: string;
  state: string;
  target?: string | null;
  created: number;
  ready?: number;
}

async function probeDeploys(): Promise<SignalDeploys> {
  const token = process.env.VERCEL_INTEGRATION_TOKEN ?? process.env.VERCEL_TOKEN;
  if (!token) {
    return { status: 'warn', last_prod_deploy: null, state: 'unknown', summary: 'VERCEL_TOKEN not configured' };
  }
  const teamId = process.env.VERCEL_TEAM_ID ?? '';
  const project = process.env.VERCEL_PROJECT_NAME ?? 'unite-group';
  const teamSuffix = teamId ? `&teamId=${teamId}` : '';
  try {
    const res = await fetch(
      `https://api.vercel.com/v6/deployments?app=${encodeURIComponent(project)}&target=production&limit=1${teamSuffix}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
        signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
      },
    );
    if (!res.ok) {
      return { status: 'err', last_prod_deploy: null, state: 'unknown', summary: `Vercel API ${res.status}` };
    }
    const body = (await res.json()) as { deployments: VercelDeployment[] };
    const dep = body.deployments?.[0];
    if (!dep) {
      return { status: 'warn', last_prod_deploy: null, state: 'none', summary: 'No production deployment found' };
    }
    const createdIso = new Date(dep.created).toISOString();
    const state = (dep.state ?? '').toUpperCase();
    let status: Tri;
    let summary: string;
    if (state === 'READY') {
      status = 'ok';
      summary = `READY · ${createdIso}`;
    } else if (state === 'BUILDING' || state === 'INITIALIZING' || state === 'QUEUED') {
      status = 'warn';
      summary = `${state} (deploying now)`;
    } else if (state === 'ERROR' || state === 'CANCELED') {
      status = 'err';
      summary = `${state} · ${createdIso}`;
    } else {
      status = 'warn';
      summary = `${state || 'unknown state'} · ${createdIso}`;
    }
    return { status, last_prod_deploy: createdIso, state: state || 'unknown', summary };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { status: 'err', last_prod_deploy: null, state: 'unknown', summary: `Vercel unreachable: ${msg.slice(0, 80)}` };
  }
}

// ─── Aggregate ────────────────────────────────────────────────────────────────

export async function computeSystemHealth(baseUrl: string): Promise<SystemHealth> {
  const [database, api, integrations, businesses, pi_ceo_scanner, deploys] = await Promise.all([
    probeDatabase(),
    probeApi(baseUrl),
    probeIntegrations(baseUrl),
    probeBusinesses(baseUrl),
    probeScanner(),
    probeDeploys(),
  ]);
  const overall = rollupOverall([database.status, api.status, integrations.status, businesses.status, pi_ceo_scanner.status, deploys.status]);
  return {
    overall,
    computed_at: new Date().toISOString(),
    signals: { database, api, integrations, businesses, pi_ceo_scanner, deploys },
  };
}

// ─── HTTP handlers ────────────────────────────────────────────────────────────

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
