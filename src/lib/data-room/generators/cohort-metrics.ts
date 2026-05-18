// Cohort metrics generator (UNI-1984, DataRoom 2/7).
//
// Pure function: takes a list of pi_ceo_health_snapshots rows + an "as-of"
// timestamp and produces the cohort_metrics JSON payload that goes into
// public.data_room_documents.payload. No I/O — the route handler does the
// Supabase read and the data_room_documents insert; this file is the
// classifier so it can be tested in isolation.
//
// Window math: for each window (90 / 180 / 365 days) we compute:
//   - avg_health   — mean of overall_health over the window
//   - trend        — comparison of recent half vs older half of the window
//                    ('improving' | 'flat' | 'declining' | 'insufficient_data')
//   - avg_security_score, security_findings_total (sum), dependency_count
//     (max — dependency count is monotonic-ish per project)
// Rows older than the largest window are ignored.

export type CohortWindow = 90 | 180 | 365;

export const COHORT_WINDOWS: readonly CohortWindow[] = [90, 180, 365] as const;

export interface HealthSnapshotRow {
  project_id: string;
  overall_health: number | null;
  security_score: number | null;
  security_findings: unknown;
  dependencies: unknown;
  snapshot_at: string;
}

export type CohortTrend = 'improving' | 'flat' | 'declining' | 'insufficient_data';

export interface CohortWindowMetrics {
  window_days: CohortWindow;
  sample_count: number;
  avg_health: number | null;
  avg_security_score: number | null;
  security_findings_total: number;
  dependency_count: number;
  trend: CohortTrend;
}

export interface CohortPerBusiness {
  project_id: string;
  windows: Record<CohortWindow, CohortWindowMetrics>;
  latest_snapshot_at: string | null;
}

export interface CohortMetricsPayload {
  generated_at: string;
  as_of: string;
  business_count: number;
  per_business: CohortPerBusiness[];
}

/**
 * Build the payload. `asOf` is the upper bound of every window so the function
 * is deterministic — callers should pass `new Date().toISOString()` in
 * production and a fixed timestamp in tests.
 */
export function buildCohortMetrics(
  snapshots: HealthSnapshotRow[],
  asOf: string,
): CohortMetricsPayload {
  const byProject = new Map<string, HealthSnapshotRow[]>();
  for (const s of snapshots) {
    const list = byProject.get(s.project_id) ?? [];
    list.push(s);
    byProject.set(s.project_id, list);
  }

  const per_business: CohortPerBusiness[] = [];
  for (const [project_id, rows] of byProject) {
    const sorted = [...rows].sort((a, b) =>
      a.snapshot_at < b.snapshot_at ? -1 : a.snapshot_at > b.snapshot_at ? 1 : 0,
    );
    const windows = Object.fromEntries(
      COHORT_WINDOWS.map((w) => [w, windowMetrics(sorted, asOf, w)]),
    ) as Record<CohortWindow, CohortWindowMetrics>;
    per_business.push({
      project_id,
      windows,
      latest_snapshot_at: sorted.at(-1)?.snapshot_at ?? null,
    });
  }

  return {
    generated_at: asOf,
    as_of: asOf,
    business_count: per_business.length,
    per_business,
  };
}

function windowMetrics(
  sorted: HealthSnapshotRow[],
  asOf: string,
  windowDays: CohortWindow,
): CohortWindowMetrics {
  const asOfMs = Date.parse(asOf);
  const cutoffMs = asOfMs - windowDays * 86_400_000;
  const inWindow = sorted.filter((r) => {
    const ts = Date.parse(r.snapshot_at);
    return ts >= cutoffMs && ts <= asOfMs;
  });

  if (inWindow.length === 0) {
    return {
      window_days: windowDays,
      sample_count: 0,
      avg_health: null,
      avg_security_score: null,
      security_findings_total: 0,
      dependency_count: 0,
      trend: 'insufficient_data',
    };
  }

  const healthValues = inWindow
    .map((r) => r.overall_health)
    .filter((v): v is number => typeof v === 'number');
  const securityValues = inWindow
    .map((r) => r.security_score)
    .filter((v): v is number => typeof v === 'number');

  return {
    window_days: windowDays,
    sample_count: inWindow.length,
    avg_health: mean(healthValues),
    avg_security_score: mean(securityValues),
    security_findings_total: inWindow.reduce(
      (acc, r) => acc + countLike(r.security_findings),
      0,
    ),
    dependency_count: inWindow.reduce(
      (acc, r) => Math.max(acc, countLike(r.dependencies)),
      0,
    ),
    trend: classifyTrend(healthValues),
  };
}

function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  const sum = values.reduce((a, b) => a + b, 0);
  return Math.round((sum / values.length) * 100) / 100;
}

/**
 * security_findings and dependencies in pi_ceo_health_snapshots are stored as
 * JSONB and can be: a number, an array (length is the count), or an object
 * with a `count` field. Anything else is treated as 0.
 */
function countLike(value: unknown): number {
  if (typeof value === 'number') return value;
  if (Array.isArray(value)) return value.length;
  if (value && typeof value === 'object' && 'count' in value) {
    const c = (value as { count: unknown }).count;
    return typeof c === 'number' ? c : 0;
  }
  return 0;
}

/**
 * Compare mean(first half) vs mean(second half). A difference greater than
 * ±1 point on the 0-100 health scale is the trend signal. Below that
 * threshold the cohort is "flat".
 */
function classifyTrend(healthValues: number[]): CohortTrend {
  if (healthValues.length < 2) return 'insufficient_data';
  const mid = Math.floor(healthValues.length / 2);
  const firstHalf = healthValues.slice(0, mid);
  const secondHalf = healthValues.slice(mid);
  if (firstHalf.length === 0 || secondHalf.length === 0) return 'insufficient_data';
  const a = firstHalf.reduce((x, y) => x + y, 0) / firstHalf.length;
  const b = secondHalf.reduce((x, y) => x + y, 0) / secondHalf.length;
  const delta = b - a;
  if (delta > 1) return 'improving';
  if (delta < -1) return 'declining';
  return 'flat';
}
