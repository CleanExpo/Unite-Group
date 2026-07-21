/**
 * Founder agents page — real activity aggregation over operator/command-centre
 * event timestamps.
 *
 * Honesty contract (No-Invaders):
 *  - operator_jobs / operator_events carry NO agent_id column (see
 *    supabase/migrations/_proposed/20260606000000_operator_gateway_jobs_events.sql
 *    and src/types/database.ts) — runs and events are founder-scoped, not
 *    per-agent attributable. Callers must label run stats as founder-scope.
 *  - All reads are founder-scoped (.eq('founder_id', …)) and fail closed to
 *    empty data — a missing table or query error renders an honest empty state,
 *    never fabricated metrics.
 */

import type { OperatorJob } from './jobs'

export const ACTIVITY_TIMEZONE = 'Australia/Brisbane'
export const ACTIVITY_WINDOW_DAYS = 7
const EVENT_FETCH_LIMIT = 5000

/** Weekday row order for the heatmap (Mon-first, en-AU convention). */
export const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const

// ---------------------------------------------------------------------------
// Narrow structural read client — the founder-scoped Supabase server client
// satisfies this. Both activity tables expose a timestamp column we can range.
// ---------------------------------------------------------------------------

type TimestampQueryResult = Promise<{
  data: Record<string, string>[] | null
  error: { message?: string } | null
}>

export interface ActivityTimestampReadClient {
  from(table: 'operator_events' | 'cc_task_events'): {
    select(columns: string): {
      eq(
        column: 'founder_id',
        value: string,
      ): {
        gte(
          column: 'at',
          value: string,
        ): {
          limit(count: number): TimestampQueryResult
        }
      }
    }
  }
}

export interface ActivityTimestamps {
  /** ISO timestamps of every founder event inside the window. */
  timestamps: string[]
  /** Per-source row counts, for honest source labelling. */
  sourceCounts: { operator_events: number; cc_task_events: number }
}

/**
 * Founder-scoped event timestamps from operator_events + cc_task_events for the
 * last `ACTIVITY_WINDOW_DAYS`. Never throws — a failed source contributes 0 rows.
 */
export async function fetchActivityTimestamps(
  client: ActivityTimestampReadClient,
  founderId: string,
  now: number = Date.now(),
): Promise<ActivityTimestamps> {
  const since = new Date(now - ACTIVITY_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString()

  async function readTable(table: 'operator_events' | 'cc_task_events'): Promise<string[]> {
    try {
      const { data, error } = await client
        .from(table)
        .select('at')
        .eq('founder_id', founderId)
        .gte('at', since)
        .limit(EVENT_FETCH_LIMIT)
      if (error || !data) return []
      return data.map((row) => row.at).filter((at): at is string => typeof at === 'string')
    } catch {
      return []
    }
  }

  const [operatorEvents, ccTaskEvents] = await Promise.all([
    readTable('operator_events'),
    readTable('cc_task_events'),
  ])

  return {
    timestamps: [...operatorEvents, ...ccTaskEvents],
    sourceCounts: {
      operator_events: operatorEvents.length,
      cc_task_events: ccTaskEvents.length,
    },
  }
}

// ---------------------------------------------------------------------------
// Weekday × hour bucketing (pure).
// ---------------------------------------------------------------------------

export interface ActivityHeatmap {
  /** grid[weekdayIndex][hour] — weekdayIndex follows WEEKDAY_LABELS (Mon=0). */
  grid: number[][]
  total: number
  max: number
}

const WEEKDAY_INDEX: Record<string, number> = {
  Mon: 0,
  Tue: 1,
  Wed: 2,
  Thu: 3,
  Fri: 4,
  Sat: 5,
  Sun: 6,
}

/** Bucket ISO timestamps into a 7×24 weekday/hour grid in the given timezone. */
export function bucketWeekdayHour(
  timestamps: string[],
  timeZone: string = ACTIVITY_TIMEZONE,
): ActivityHeatmap {
  const grid: number[][] = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => 0))
  const formatter = new Intl.DateTimeFormat('en-AU', {
    timeZone,
    weekday: 'short',
    hour: '2-digit',
    hourCycle: 'h23',
  })

  let total = 0
  let max = 0
  for (const iso of timestamps) {
    const ms = Date.parse(iso)
    if (!Number.isFinite(ms)) continue
    const parts = formatter.formatToParts(new Date(ms))
    const weekday = parts.find((p) => p.type === 'weekday')?.value ?? ''
    const hourPart = parts.find((p) => p.type === 'hour')?.value ?? ''
    const day = WEEKDAY_INDEX[weekday]
    const hour = Number.parseInt(hourPart, 10)
    if (day === undefined || !Number.isInteger(hour) || hour < 0 || hour > 23) continue
    grid[day][hour] += 1
    total += 1
    if (grid[day][hour] > max) max = grid[day][hour]
  }

  return { grid, total, max }
}

// ---------------------------------------------------------------------------
// Job outcome summary (pure) — founder-scope, NOT per-agent (no agent_id in schema).
// ---------------------------------------------------------------------------

export interface JobOutcomeSummary {
  total: number
  done: number
  failed: number
  cancelled: number
  inFlight: number
  /** done / (done + failed), or null when there are no terminal outcomes yet. */
  successRatio: number | null
}

export function summariseJobOutcomes(jobs: OperatorJob[]): JobOutcomeSummary {
  let done = 0
  let failed = 0
  let cancelled = 0
  for (const job of jobs) {
    if (job.status === 'done') done += 1
    else if (job.status === 'failed') failed += 1
    else if (job.status === 'cancelled') cancelled += 1
  }
  const terminal = done + failed
  return {
    total: jobs.length,
    done,
    failed,
    cancelled,
    inFlight: jobs.length - done - failed - cancelled,
    successRatio: terminal > 0 ? done / terminal : null,
  }
}

// ---------------------------------------------------------------------------
// Relative time (pure) — "42s ago" / "3m ago" / "5h ago" / "2d ago".
// ---------------------------------------------------------------------------

export function relativeTime(iso: string, now: number = Date.now()): string {
  const ms = Date.parse(iso)
  if (!Number.isFinite(ms)) return 'unknown'
  const seconds = Math.max(0, Math.round((now - ms) / 1000))
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 48) return `${hours}h ago`
  return `${Math.round(hours / 24)}d ago`
}
