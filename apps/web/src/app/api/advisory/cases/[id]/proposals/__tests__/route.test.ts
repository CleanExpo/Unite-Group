import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

let chainResolve: any = { data: [], error: null }

function makeChain() {
  const b: Record<string, any> = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    then(onFulfilled: any, onRejected: any) {
      return Promise.resolve(chainResolve).then(onFulfilled, onRejected)
    },
  }
  b.select.mockReturnValue(b)
  b.eq.mockReturnValue(b)
  b.order.mockReturnValue(b)
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

const params = Promise.resolve({ id: 'case-1' })

function req(qs = '') {
  return new NextRequest(`https://app.test/api/advisory/cases/case-1/proposals${qs}`)
}

describe('GET /api/advisory/cases/[id]/proposals', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    chainResolve = { data: [], error: null }
    chain = makeChain()
    mockFrom.mockReturnValue(chain)
    vi.mocked(createClient).mockResolvedValue(mockClient as any)
  })

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await GET(req(), { params })
    expect(res.status).toBe(401)
  })

  it('returns proposals for a case', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    chainResolve = { data: [{ id: 'p-1', firm_key: 'deloitte', round: 1 }], error: null }

    const res = await GET(req(), { params })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.proposals).toHaveLength(1)
  })

  it('filters by round when valid', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    chainResolve = { data: [], error: null }

    const res = await GET(req('?round=2'), { params })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.proposals).toHaveLength(0)
  })

  it('returns 500 on DB error', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    chainResolve = { data: null, error: { message: 'DB error' } }

    const res = await GET(req(), { params })
    expect(res.status).toBe(500)
  })
})
