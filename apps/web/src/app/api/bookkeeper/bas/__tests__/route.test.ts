import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock generateBASPeriods to control loop iteration
vi.mock('@/lib/bookkeeper/bas-calculator', () => ({
  generateBASPeriods: vi.fn().mockReturnValue([
    {
      label: 'Q1 2026',
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-03-31'),
    },
  ]),
}))

function makeChain() {
  const b: Record<string, ReturnType<typeof vi.fn>> = {
    select: vi.fn(),
    eq: vi.fn(),
    gte: vi.fn(),
    lte: vi.fn(),
  }
  b.select.mockReturnValue(b)
  b.eq.mockReturnValue(b)
  b.gte.mockReturnValue(b)
  b.lte.mockReturnValue(b)
  return b
}

let chain: ReturnType<typeof makeChain>
const mockFrom = vi.fn()
const mockClient = { from: mockFrom }

vi.mock('@/lib/supabase/server', () => ({
  getUser: vi.fn(),
  createClient: vi.fn(),
}))

import { getUser, createClient } from '@/lib/supabase/server'
import { GET } from '../route'

describe('GET /api/bookkeeper/bas', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    chain = makeChain()
    mockFrom.mockReturnValue(chain)
    vi.mocked(createClient).mockResolvedValue(mockClient as any)
  })

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('returns BAS quarters summary', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    chain.lte.mockResolvedValue({
      data: [
        { amount_cents: 11000, gst_amount_cents: 1000, tax_code: 'OUTPUT' },
        { amount_cents: -5500, gst_amount_cents: -500, tax_code: 'INPUT' },
      ],
      error: null,
    })

    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.quarters).toHaveLength(1)
    expect(body.quarters[0].label).toBe('Q1 2026')
    expect(body.quarters[0].label1B_gstOnSalesCents).toBe(1000)
    expect(body.quarters[0].label9_gstOnPurchasesCents).toBe(500)
  })

  it('handles empty transaction list', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    chain.lte.mockResolvedValue({ data: [], error: null })

    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.quarters[0].transactionCount).toBe(0)
    expect(body.quarters[0].label11_gstPayableCents).toBe(0)
  })
})
