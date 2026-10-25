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
})
