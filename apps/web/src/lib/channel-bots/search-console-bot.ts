import { type ChannelBot, SEARCH_CONSOLE_PROPERTY } from './types'

/** UNI-3229 — read-only Search Console bot (Bing to follow). */
export const searchConsoleBot: ChannelBot = {
  id: 'search-console',
  async run(ctx) {
    const f = ctx.fetchImpl ?? fetch
    let token: string
    try {
      token = await ctx.getGoogleToken()
    } catch {
      return { bot: 'search-console', status: 'not_connected', actions: [], error: `Google not connected for ${ctx.accountEmail}` }
    }
    const end = new Date()
    const start = new Date(end.getTime() - 28 * 86400000)
    const iso = (d: Date) => d.toISOString().slice(0, 10)
    const res = await f(
      `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(SEARCH_CONSOLE_PROPERTY)}/searchAnalytics/query`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ startDate: iso(start), endDate: iso(end), dimensions: [], rowLimit: 1 }),
      },
    )
    if (!res.ok) return { bot: 'search-console', status: 'error', actions: [], error: `Search Console API ${res.status}` }
    const data = (await res.json()) as { rows?: Array<{ clicks: number; impressions: number; position: number }> }
    const row = data.rows?.[0] ?? { clicks: 0, impressions: 0, position: 0 }
    const metrics = { clicks28d: row.clicks, impressions28d: row.impressions, avgPosition: Math.round(row.position * 10) / 10 }
    return {
      bot: 'search-console',
      status: 'ok',
      metrics,
      actions: [{ bot: 'search-console', kind: 'report', summary: `Search: ${metrics.clicks28d} clicks, ${metrics.impressions28d} impressions (28d)` }],
    }
  },
}
