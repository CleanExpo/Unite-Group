import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('@/lib/integrations/xero', () => ({ fetchRevenueMTD: vi.fn() }))
vi.mock('@/lib/integrations/linear', () => ({ fetchIssueCountByBusiness: vi.fn() }))

import { getUser } from '@/lib/supabase/server'
import { fetchRevenueMTD } from '@/lib/integrations/xero'
import { fetchIssueCountByBusiness } from '@/lib/integrations/linear'
import { GET } from '../route'

describe('GET /api/dashboard/kpi', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await GET()
    expect(res.status).toBe(401)
  })

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
  })

  it('returns partial results when xero throws', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    vi.mocked(fetchRevenueMTD).mockRejectedValue(new Error('Xero error'))
    vi.mocked(fetchIssueCountByBusiness).mockResolvedValue({ dr: 3 })

    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    // Xero entries are rejected — revenueCents absent
    expect(body.kpis.dr.revenueCents).toBeUndefined()
    // Linear still populates
    expect(body.kpis.dr.activeIssues).toBe(3)
  })

  it('still returns 200 when linear throws', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    vi.mocked(fetchRevenueMTD).mockResolvedValue({
      data: { revenueCents: 1000, growth: 0, invoiceCount: 1 },
      source: 'xero',
    } as any)
    vi.mocked(fetchIssueCountByBusiness).mockRejectedValue(new Error('Linear down'))

    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.kpis.dr.activeIssues).toBeUndefined()
    expect(body.kpis.dr.revenueCents).toBe(1000)
  })
})
