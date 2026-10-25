import { describe, expect, it } from 'vitest'
import { loadSiteReport } from '../site-events-report'

describe('loadSiteReport window', () => {
  it('starts every query at Brisbane midnight of the first displayed day, so totals and breakdowns share one window', async () => {
    const seen: Array<{ fn: string; p_from: string }> = []
    const client = {
      rpc: (fn: 'site_events_daily' | 'site_events_breakdown', args: { p_from: string; p_to: string }) => {
        seen.push({ fn, p_from: args.p_from })
        return Promise.resolve({ data: [], error: null })
      },
    }
    // 12:00 Brisbane on 25 Oct 2026; 7 displayed days start 19 Oct, i.e. 14:00Z on 18 Oct
    await loadSiteReport(client, 7, new Date('2026-10-25T02:00:00Z'))
    expect(seen.map((s) => s.fn).sort()).toEqual(['site_events_breakdown', 'site_events_daily'])
    expect(seen.map((s) => s.p_from)).toEqual(['2026-10-18T14:00:00.000Z', '2026-10-18T14:00:00.000Z'])
  })

  // UNI-3005: p_to was now + 1 minute, so in the last minute of a Brisbane day the breakdowns could
  // count events from the first minute of tomorrow while the chart ended today. p_to is exclusive in SQL.
  it.each([
    ['midday', '2026-10-25T02:00:00Z'],
    ['the last minute of the day', '2026-10-25T13:59:30Z'],
    ['just after midnight', '2026-10-24T14:00:05Z'],
  ])('UNI-3005 ends every query at the exclusive next Brisbane midnight at %s', async (_label, iso) => {
    const seen: Array<{ fn: string; p_to: string }> = []
    const client = {
      rpc: (fn: 'site_events_daily' | 'site_events_breakdown', args: { p_from: string; p_to: string }) => {
        seen.push({ fn, p_to: args.p_to })
        return Promise.resolve({ data: [], error: null })
      },
    }
    await loadSiteReport(client, 7, new Date(iso))
    // Every case is Brisbane 25 Oct 2026, so the window ends at 00:00 Brisbane 26 Oct = 14:00Z 25 Oct.
    expect(seen.map((s) => s.p_to)).toEqual(['2026-10-25T14:00:00.000Z', '2026-10-25T14:00:00.000Z'])
  })
})
