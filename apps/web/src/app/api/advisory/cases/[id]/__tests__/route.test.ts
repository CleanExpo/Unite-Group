import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockSingle = vi.fn()

// Each table gets its own thenable chain with its own resolve value
function makeThenableChain(resolveWith: any) {
  const b: Record<string, any> = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    then(onFulfilled: any, onRejected: any) {
      return Promise.resolve(resolveWith).then(onFulfilled, onRejected)
    },
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

describe('GET /api/advisory/cases/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(createClient).mockResolvedValue(mockClient as any)
  })

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await GET(new Request('https://app.test') as any, { params })
    expect(res.status).toBe(401)
  })

  it('returns 404 when case is not found', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)

    mockSingle.mockResolvedValue({ data: null, error: { message: 'not found' } })
    const caseChain = makeThenableChain({ data: null, error: null })
    mockFromImpl.mockReturnValue(caseChain)

    const res = await GET(new Request('https://app.test') as any, { params })
    expect(res.status).toBe(404)
  })

  it('returns case detail with proposals, scores, evidence count', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)

    // Case lookup via .single()
    mockSingle.mockResolvedValue({ data: { id: 'case-1', title: 'Tax Opt' }, error: null })

    const caseChain = makeThenableChain({ data: null, error: null })
    const proposalsChain = makeThenableChain({ data: [{ id: 'p-1' }], error: null })
    const scoresChain = makeThenableChain({ data: [{ id: 's-1' }], error: null })
    const evidenceChain = makeThenableChain({ count: 3, error: null })

    mockFromImpl.mockImplementation((table: string) => {
      if (table === 'advisory_cases') return caseChain
      if (table === 'advisory_proposals') return proposalsChain
      if (table === 'advisory_judge_scores') return scoresChain
      if (table === 'advisory_evidence') return evidenceChain
      return caseChain
    })

    const res = await GET(new Request('https://app.test') as any, { params })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.case.id).toBe('case-1')
    expect(body.proposals).toHaveLength(1)
    expect(body.scores).toHaveLength(1)
    expect(body.evidenceCount).toBe(3)
  })
})
