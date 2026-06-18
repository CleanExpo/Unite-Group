import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('@/lib/integrations/xero', () => ({ fetchRevenueMTD: vi.fn() }))

import { getUser } from '@/lib/supabase/server'
import { fetchRevenueMTD } from '@/lib/integrations/xero'
import { GET } from '../route'

describe('GET /api/xero/revenue', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await GET(new Request('https://app.test/api/xero/revenue'))
    expect(res.status).toBe(401)
  })

  it('returns revenue data for the specified business', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const result = { data: { revenueCents: 12000, growth: 0.05, invoiceCount: 4 }, source: 'xero' }
    vi.mocked(fetchRevenueMTD).mockResolvedValue(result as any)

    const res = await GET(new Request('https://app.test/api/xero/revenue?business=synthex'))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual(result)
    expect(fetchRevenueMTD).toHaveBeenCalledWith('user-1', 'synthex')
  })

  it('defaults to business=dr when param omitted', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    vi.mocked(fetchRevenueMTD).mockResolvedValue({ data: {}, source: 'mock' } as any)

    await GET(new Request('https://app.test/api/xero/revenue'))
    expect(fetchRevenueMTD).toHaveBeenCalledWith('user-1', 'dr')
  })

  it('returns 500 when fetchRevenueMTD throws', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    vi.mocked(fetchRevenueMTD).mockRejectedValue(new Error('Xero timeout'))

    const res = await GET(new Request('https://app.test/api/xero/revenue'))
    expect(res.status).toBe(500)
  })
})
