import { type ChannelBot, SEARCH_CONSOLE_PROPERTY } from './types'
import { GOOGLE_REQUEST_TIMEOUT_MS, errorMessage, tokenFailureStatus, withDeadline } from './google-request'

/** UNI-3229 — read-only Search Console bot (Bing to follow). */
export const searchConsoleBot: ChannelBot = {
  id: 'search-console',
  async run(ctx) {
    const f = ctx.fetchImpl ?? fetch
    let token: string
    try {
      token = await withDeadline(ctx.getGoogleToken(), 'Google token request')
    } catch (e) {
      const status = tokenFailureStatus(e)
      return status === 'not_connected'
        ? { bot: 'search-console', status, actions: [], error: `Google not connected for ${ctx.accountEmail}` }
        : { bot: 'search-console', status, actions: [], error: `Google token unavailable: ${errorMessage(e)}` }
    }
    const end = new Date()
    // startDate and endDate are both inclusive: 27 days back gives exactly 28 dates.
    const start = new Date(end.getTime() - 27 * 86400000)
    const iso = (d: Date) => d.toISOString().slice(0, 10)
    let res: Response
    try {
      res = await f(
        `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(SEARCH_CONSOLE_PROPERTY)}/searchAnalytics/query`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ startDate: iso(start), endDate: iso(end), dimensions: [], rowLimit: 1 }),
          signal: AbortSignal.timeout(GOOGLE_REQUEST_TIMEOUT_MS),
        },
      )
    } catch (e) {
      return { bot: 'search-console', status: 'error', actions: [], error: `Search Console request failed: ${errorMessage(e)}` }
    }
    if (!res.ok) return { bot: 'search-console', status: 'error', actions: [], error: `Search Console API ${res.status}` }
    const data = (await res.json()) as { rows?: unknown }
    if (data.rows !== undefined && !Array.isArray(data.rows)) {
      return { bot: 'search-console', status: 'error', actions: [], error: 'Search Console returned malformed rows' }
    }
    const rows = data.rows as Array<{ clicks: number; impressions: number; position: number }> | undefined
    // Absent or empty rows means no data for the window; report that honestly, never as zeros.
    if (!rows || rows.length === 0) {
      return { bot: 'search-console', status: 'ok', metrics: { dataAvailable: 'no' }, actions: [{ bot: 'search-console', kind: 'report', summary: 'Search: no data returned for the last 28 days' }] }
    }
    const row = rows[0]
    // typeof alone accepts Infinity (e.g. a 1e400 literal), negatives and absurd values.
    // Clicks and impressions are counts: safe non-negative integers. Position is a finite
    // non-negative average, and its rounded report value must itself stay finite.
    const count = (v: unknown): v is number => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0
    const position = typeof row?.position === 'number' && Number.isFinite(row.position) && row.position >= 0
      ? Math.round(row.position * 10) / 10
      : NaN
    if (!row || !count(row.clicks) || !count(row.impressions) || !Number.isFinite(position)) {
      return { bot: 'search-console', status: 'error', actions: [], error: 'Search Console returned malformed metrics' }
    }
    const metrics = { clicks28d: row.clicks, impressions28d: row.impressions, avgPosition: position }
    return {
      bot: 'search-console',
      status: 'ok',
      metrics,
      actions: [{ bot: 'search-console', kind: 'report', summary: `Search: ${metrics.clicks28d} clicks, ${metrics.impressions28d} impressions (28d)` }],
    }
  },
}
