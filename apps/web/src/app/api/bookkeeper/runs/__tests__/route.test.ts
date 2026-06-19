import { describe, it, expect, vi, beforeEach } from 'vitest'

// Two separate chains — count query and data query
const mockCountChain = {
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockResolvedValue({ count: 3, error: null }),
}

function makeDataChain() {
  const b: Record<string, ReturnType<typeof vi.fn>> = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    range: vi.fn(),
  }
  b.select.mockReturnValue(b)
  b.eq.mockReturnValue(b)
  b.order.mockReturnValue(b)
  b.range.mockReturnValue(b)
  return b
}

let dataChain: ReturnType<typeof makeDataChain>
let fromCallCount = 0
const mockFrom = vi.fn()
const mockClient = { from: mockFrom }

vi.mock('@/lib/supabase/server', () => ({
  getUser: vi.fn(),
  createClient: vi.fn(),
}))

import { getUser, createClient } from '@/lib/supabase/server'
import { GET } from '../route'

describe('GET /api/bookkeeper/runs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fromCallCount = 0
    dataChain = makeDataChain()

    // First call = count query, second call = data query
    mockFrom.mockImplementation(() => {
      fromCallCount++
      if (fromCallCount === 1) return mockCountChain
      return dataChain
    })
    vi.mocked(createClient).mockResolvedValue(mockClient as any)
  })

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await GET(new Request('https://app.test/api/bookkeeper/runs'))
    expect(res.status).toBe(401)
  })

  it('returns paginated runs list', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    dataChain.range.mockResolvedValue({
      data: [{
        id: 'run-1',
        status: 'completed',
        started_at: '2026-06-01T00:00:00Z',
        completed_at: '2026-06-01T00:05:00Z',
        businesses_processed: ['dr'],
        total_transactions: 50,
        auto_reconciled: 45,
        flagged_for_review: 5,
        failed_count: 0,
        gst_collected_cents: 5000,
        gst_paid_cents: 2000,
        net_gst_cents: 3000,
        error_log: null,
      }],
      error: null,
    })

    const res = await GET(new Request('https://app.test/api/bookkeeper/runs'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.runs).toHaveLength(1)
    expect(body.runs[0].status).toBe('completed')
    expect(body.runs[0].totalTransactions).toBe(50)
    expect(body.total).toBe(3)
  })

  it('returns 500 on DB error', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    dataChain.range.mockResolvedValue({ data: null, error: { message: 'DB error' } })

    const res = await GET(new Request('https://app.test/api/bookkeeper/runs'))
    expect(res.status).toBe(500)
  })
})
