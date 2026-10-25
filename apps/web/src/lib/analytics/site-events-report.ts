// src/lib/analytics/site-events-report.ts
// Reads the founder's site-analytics summary. A failed read is reported as an error, never as
// "no events": the page must not show zero as if it were data when the query did not succeed.

export type DailyRow = { day: string; event_type: string; events: number | string }
export type BreakdownRow = { dimension: string; key: string; event_type: string; events: number | string }

type RpcResult = PromiseLike<{ data: unknown; error: { message: string } | null }>
export type ReportClient = {
  rpc(fn: 'site_events_daily' | 'site_events_breakdown', args: { p_from: string; p_to: string }): RpcResult
}

export type SiteReport = {
  days: number
  /** One entry per day in the window, oldest first, zero-filled. */
  pageViewsByDay: { day: string; views: number }[]
  totalPageViews: number
  topPages: { key: string; n: number }[]
  ctaClicks: { key: string; n: number }[]
  videos: { key: string; plays: number; completes: number; completionRate: number | null }[]
  videoPlays: number
  videoCompletes: number
  referrers: { key: string; n: number }[]
  devices: { key: string; n: number }[]
}

export type ReportResult =
  | { status: 'ok'; report: SiteReport }
  | { status: 'empty'; days: number }
  | { status: 'error'; days: number; message: string }

const BRISBANE_DAY = new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Brisbane', year: 'numeric', month: '2-digit', day: '2-digit' })

function brisbaneDay(date: Date): string {
  return BRISBANE_DAY.format(date) // YYYY-MM-DD
}

function num(value: number | string): number {
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : 0
}

/** Every Brisbane calendar day from (now - days + 1) to now, oldest first. */
export function dayWindow(days: number, now: Date): string[] {
  const out: string[] = []
  for (let i = days - 1; i >= 0; i--) out.push(brisbaneDay(new Date(now.getTime() - i * 86_400_000)))
  return out
}

export function summarise(daily: DailyRow[], breakdown: BreakdownRow[], days: number, now: Date): ReportResult {
  if (daily.length === 0 && breakdown.length === 0) return { status: 'empty', days }

  const views = new Map<string, number>()
  for (const row of daily) if (row.event_type === 'page_view') views.set(row.day, (views.get(row.day) ?? 0) + num(row.events))
  const pageViewsByDay = dayWindow(days, now).map((day) => ({ day, views: views.get(day) ?? 0 }))

  const ranked = (dimension: string) =>
    breakdown
      .filter((r) => r.dimension === dimension)
      .map((r) => ({ key: r.key, n: num(r.events) }))
      .sort((a, b) => b.n - a.n)

  const videoMap = new Map<string, { plays: number; completes: number }>()
  for (const r of breakdown.filter((x) => x.dimension === 'video')) {
    const entry = videoMap.get(r.key) ?? { plays: 0, completes: 0 }
    if (r.event_type === 'video_play') entry.plays += num(r.events)
    if (r.event_type === 'video_complete') entry.completes += num(r.events)
    videoMap.set(r.key, entry)
  }
  const videos = [...videoMap.entries()]
    .map(([key, v]) => ({ key, ...v, completionRate: v.plays > 0 ? Math.min(1, v.completes / v.plays) : null }))
    .sort((a, b) => b.plays - a.plays)
  const videoPlays = videos.reduce((s, v) => s + v.plays, 0)
  const videoCompletes = videos.reduce((s, v) => s + v.completes, 0)

  return {
    status: 'ok',
    report: {
      days,
      pageViewsByDay,
      totalPageViews: pageViewsByDay.reduce((s, d) => s + d.views, 0),
      topPages: ranked('page').slice(0, 10),
      ctaClicks: ranked('cta'),
      videos,
      videoPlays,
      videoCompletes,
      referrers: ranked('referrer').slice(0, 10),
      devices: ranked('device'),
    },
  }
}

export async function loadSiteReport(client: ReportClient, days: number, now: Date = new Date()): Promise<ReportResult> {
  // Brisbane has no daylight saving (UTC+10). The window is [first-day midnight, next midnight): p_to is
  // exclusive in the SQL, so it is the midnight after the last displayed day (today), never now + slack.
  // That keeps the chart, totals and every breakdown on exactly the same days (UNI-3005).
  const shown = dayWindow(days, now)
  const firstDay = shown[0]
  const lastDay = shown[shown.length - 1]
  const args = {
    p_from: new Date(`${firstDay}T00:00:00+10:00`).toISOString(),
    p_to: new Date(new Date(`${lastDay}T00:00:00+10:00`).getTime() + 86_400_000).toISOString(),
  }
  try {
    const [daily, breakdown] = await Promise.all([client.rpc('site_events_daily', args), client.rpc('site_events_breakdown', args)])
    if (daily.error) return { status: 'error', days, message: daily.error.message }
    if (breakdown.error) return { status: 'error', days, message: breakdown.error.message }
    if (!Array.isArray(daily.data) || !Array.isArray(breakdown.data)) {
      return { status: 'error', days, message: 'Unexpected response shape' }
    }
    return summarise(daily.data as DailyRow[], breakdown.data as BreakdownRow[], days, now)
  } catch (err) {
    return { status: 'error', days, message: err instanceof Error ? err.message : String(err) }
  }
}
