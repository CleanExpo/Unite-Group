import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('@/lib/integrations/xero', () => ({ fetchRevenueMTD: vi.fn() }))
vi.mock('@/lib/integrations/linear', () => ({ fetchIssueCountByBusiness: vi.fn() }))

import { getUser } from '@/lib/supabase/server'
import { fetchRevenueMTD } from '@/lib/integrations/xero'
import { fetchIssueCountByBusiness } from '@/lib/integrations/linear'
import { GET } from '../route'

describe('GET /api/dashboard/kpi', () => {
  // resetAllMocks, not clearAllMocks: clearing wipes call history but LEAVES an
  // implementation set by mockRejectedValue/mockResolvedValue in place, so a
  // failure state configured in one test leaks into the next.
  beforeEach(() => vi.resetAllMocks())

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await GET()
    expect(res.status).toBe(401)
  })

  // NEGATIVE CONTROL for the Linear-failure test below: without this, a route
  // that failed on everything would satisfy the failure control while leaving
  // the dashboard permanently broken.
  it('returns merged xero + linear kpis', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    vi.mocked(fetchRevenueMTD).mockResolvedValue({
      data: { revenueCents: 5000, growth: 0.1, invoiceCount: 3 },
      source: 'xero',
    } as any)
    vi.mocked(fetchIssueCountByBusiness).mockResolvedValue({ dr: 5, synthex: 2 })

    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.kpis).toBeDefined()
    expect(body.kpis.dr.revenueCents).toBe(5000)
    expect(body.kpis.dr.activeIssues).toBe(5)
    expect(body.kpis.synthex.activeIssues).toBe(2)
    // A business ABSENT from the sparse map after a SUCCESSFUL read has a known
    // count of zero. Omitting it made a real zero indistinguishable from an
    // unread one, and the card fell through to a permanent "Loading…". [UNI-2490]
    expect(body.kpis.carsi.activeIssues).toBe(0)
    // A healthy read carries no failure signal — of either kind. Without these
    // two, a route that marked everything degraded would satisfy the failure
    // control above while lying on every healthy dashboard.
    expect(body.error).toBeUndefined()
    expect(body.linearDegraded).toBeUndefined()
    expect(body.xeroDegradedKeys).toBeUndefined()
    expect(body.kpis.dr.xeroDegraded).toBeUndefined()
  })

  // CONTROL. This replaces `returns partial results when xero throws`, which
  // asserted a 200 with `revenueCents` absent and nothing else — pinning as
  // correct the exact shape that makes a REJECTED Xero read indistinguishable
  // from a business with no Xero connection. The card reads that entry as
  // truthy, skips its individual fallback, and renders placeholder revenue
  // beside a "Demo" badge. The 200 is not the defect and stays; the missing
  // marker was.
  it('marks a rejected xero read as degraded — never an entry that reads as "no data"', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    vi.mocked(fetchRevenueMTD).mockRejectedValue(new Error('Xero error'))
    vi.mocked(fetchIssueCountByBusiness).mockResolvedValue({ dr: 3 })

    const res = await GET()
    // Deliberate: one failed revenue read must not blank the whole dashboard.
    expect(res.status).toBe(200)
    const body = await res.json()

    // The entry must SAY it is degraded, per business.
    expect(body.kpis.dr.xeroDegraded).toBe(true)
    expect(body.kpis.dr.revenueCents).toBeUndefined()
    // ...and the response must name every business whose Xero read rejected.
    expect(body.xeroDegradedKeys).toEqual(['dr', 'nrpg', 'carsi', 'restore', 'synthex', 'ccw'])
    // `ato` has no Xero connection at all, so it is NOT marked: the flag tracks
    // the Xero read specifically, not "something failed somewhere".
    expect(body.kpis.ato?.xeroDegraded).toBeUndefined()
    // Whatever WAS readable still survives alongside the degradation.
    expect(body.kpis.dr.activeIssues).toBe(3)
  })

  // CONTROL. This replaces a test that asserted `expect(res.status).toBe(200)`
  // when Linear throws — it pinned the defect as correct behaviour. Since
  // fetchIssueCountByBusiness throws on an unconfigured LINEAR_API_KEY, that
  // 200 reported a failed read as a successful empty one.
  it('reports an observable failure when linear is unconfigured — never a 200 that looks healthy-but-empty', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    vi.mocked(fetchRevenueMTD).mockResolvedValue({
      data: { revenueCents: 1000, growth: 0, invoiceCount: 1 },
      source: 'xero',
    } as any)
    vi.mocked(fetchIssueCountByBusiness).mockRejectedValue(
      new Error('LINEAR_API_KEY is not configured — issue counts are unavailable, not zero'),
    )

    const res = await GET()

    // The status line must carry the verdict — `res.ok` is what the browser,
    // KPIGrid and any uptime monitor actually branch on.
    expect(res.status).toBe(500)
    expect(res.ok).toBe(false)

    const body = await res.json()
    // ...and the body must name the failure rather than present empty entries.
    expect(body.linearDegraded).toBe(true)
    expect(body.error).toBe('Failed to load dashboard KPIs')
    // Sanitised: the raw upstream message never reaches the client.
    expect(body.error).not.toMatch(/LINEAR_API_KEY/)
    // Whatever WAS readable still survives alongside the diagnostics.
    expect(body.kpis.dr.revenueCents).toBe(1000)
    expect(body.kpis.dr.activeIssues).toBeUndefined()
    expect(errorSpy).toHaveBeenCalled()
    errorSpy.mockRestore()
  })
})
