import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockSingle = vi.fn()

function makeChain() {
  const b: Record<string, ReturnType<typeof vi.fn>> = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
  }
  b.select.mockReturnValue(b)
  b.eq.mockReturnValue(b)
  b.order.mockReturnValue(b)
  ;(b as any).single = mockSingle
  return b
}

const mockFromImpl = vi.fn()
const mockClient = { from: mockFromImpl }

vi.mock('@/lib/supabase/server', () => ({
  getUser: vi.fn(),
  createClient: vi.fn(),
}))

import { getUser, createClient } from '@/lib/supabase/server'
import { GET } from '../route'

const params = Promise.resolve({ id: 'case-1' })

describe('GET /api/advisory/cases/[id]/scores', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(createClient).mockResolvedValue(mockClient as any)
  })

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await GET(new Request('https://app.test') as any, { params })
    expect(res.status).toBe(401)
  })

  it('returns scores and winner', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)

    const scoresChain = makeChain()
    const caseChain = makeChain()

    // scores: .select.eq.eq.order → resolves
    scoresChain.order.mockResolvedValue({ data: [{ id: 's-1', weighted_total: 85 }], error: null })

    // case: .select.eq.eq.single → resolves
    mockSingle.mockResolvedValue({ data: { winning_firm: 'pwc' }, error: null })

    mockFromImpl.mockImplementation((table: string) => {
      if (table === 'advisory_judge_scores') return scoresChain
      if (table === 'advisory_cases') return caseChain
      return scoresChain
    })

    const res = await GET(new Request('https://app.test') as any, { params })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.scores).toHaveLength(1)
    expect(body.winner).toBe('pwc')
  })

  it('returns 500 on scores DB error', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)

    const scoresChain = makeChain()
    const caseChain = makeChain()
    scoresChain.order.mockResolvedValue({ data: null, error: { message: 'DB error' } })
    mockSingle.mockResolvedValue({ data: null, error: null })

    mockFromImpl.mockImplementation((table: string) => {
      if (table === 'advisory_judge_scores') return scoresChain
      return caseChain
    })

    const res = await GET(new Request('https://app.test') as any, { params })
    expect(res.status).toBe(500)
  })
})
