// src/lib/command-centre/dashboard-health-supabase.ts
//
// UNI-2229 / UNI-2340 — cloud read path for the founder OS Health tile.
//
// The local-filesystem reader (dashboard-summary.ts) is permanently empty on
// Vercel serverless. This module reads the same card shape from the Supabase
// `dashboard_health` table (one row per source, upserted by cron/mesh writers
// via service_role) and maps it into the tile's existing
// DashboardSummaryResult contract — so the tile renders identically whichever
// substrate fed it.
//
// Honesty rules (NorthStar): a row older than the staleness window carries a
// read_error ("stale — last report <ts>") and counts as an error card, never
// silently green. A query failure returns an empty result with the error in
// scanned state — the caller decides whether to fall back to the local reader.

import { createClient } from '@/lib/supabase/server'
import {
  countByBucket,
  humaniseId,
  normaliseSeverity,
  normaliseStatus,
  type DashboardSummary,
  type DashboardSummaryResult,
} from './dashboard-summary'

/** Default staleness window: daily writers + margin. Override via env (hours). */
const DEFAULT_STALE_HOURS = 26

export interface DashboardHealthRow {
  id: string
  title: string | null
  status: string | null
  severity: string | null
  reported_at: string | null
}

export function resolveStaleHours(env: Record<string, string | undefined> = process.env): number {
  const raw = env.UNITE_DASHBOARD_STALE_HOURS
  if (typeof raw !== 'string' || raw.length === 0) return DEFAULT_STALE_HOURS
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_STALE_HOURS
}

/** Pure mapper: dashboard_health rows → the tile's result contract. */
export function summariseDashboardHealthRows(
  rows: DashboardHealthRow[],
  now: () => Date = () => new Date(),
  staleHours: number = resolveStaleHours(),
): DashboardSummaryResult {
  const nowMs = now().getTime()
  const staleMs = staleHours * 3_600_000
  const entries: DashboardSummary[] = rows.map((row) => {
    const reportedAt = row.reported_at ? new Date(row.reported_at) : null
    const reportedMs = reportedAt?.getTime()
    const isStale =
      reportedMs === undefined || !Number.isFinite(reportedMs) || nowMs - reportedMs > staleMs
    return {
      id: row.id,
      title: row.title?.trim() || humaniseId(row.id),
      status: normaliseStatus(row.status),
      severity: normaliseSeverity(row.severity),
      updated_at: row.reported_at,
      source_path: `supabase://dashboard_health/${row.id}`,
      read_error: isStale
        ? `stale — last report ${row.reported_at ?? 'never'} (window ${staleHours}h)`
        : null,
    }
  })
  const counts = countByBucket(entries)
  return {
    dashboard_dir: 'supabase://dashboard_health',
    scanned_at: now().toISOString(),
    entries,
    red_count: counts.red,
    amber_count: counts.amber,
    green_count: counts.green,
    error_count: counts.error,
  }
}

interface HealthQueryClient {
  from(table: string): {
    select(cols: string): { order(col: string, opts: { ascending: boolean }): Promise<{ data: unknown; error: { message: string } | null }> }
  }
}

export type DashboardHealthLoad =
  | { ok: true; result: DashboardSummaryResult }
  | { ok: false; reason: string }

/**
 * Load the cloud OS Health summary. `ok:false` (table missing, RLS, network)
 * lets the caller fall back to the local-dir reader honestly — this function
 * never fabricates an empty-but-healthy result on failure.
 */
export async function loadDashboardHealthFromSupabase(
  client?: HealthQueryClient,
  now: () => Date = () => new Date(),
): Promise<DashboardHealthLoad> {
  try {
    // Structural cast per the approvals.ts pattern — dashboard_health is not in
    // the generated Database types yet; the interface pins exactly what we use.
    const db = client ?? ((await createClient()) as unknown as HealthQueryClient)
    const { data, error } = await db
      .from('dashboard_health')
      .select('id,title,status,severity,reported_at')
      .order('id', { ascending: true })
    if (error) return { ok: false, reason: error.message }
    if (!Array.isArray(data)) return { ok: false, reason: 'non-array response' }
    const rows = data.filter((r): r is DashboardHealthRow => !!r && typeof (r as DashboardHealthRow).id === 'string')
    return { ok: true, result: summariseDashboardHealthRows(rows, now) }
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : 'query failed' }
  }
}
