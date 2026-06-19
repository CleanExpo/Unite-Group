import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

function makeChain() {
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
  return new NextRequest(`https://app.test/api/advisory/cases/case-1/evidence${qs}`)
}

describe('GET /api/advisory/cases/[id]/evidence', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    chain = makeChain()
    mockFrom.mockReturnValue(chain)
    vi.mocked(createClient).mockResolvedValue(mockClient as any)
  })

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await GET(req(), { params })
    expect(res.status).toBe(401)
  })

  it('returns paginated evidence', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    chain.range.mockResolvedValue({ data: [{ id: 'ev-1', content: 'doc' }], count: 1, error: null })

    const res = await GET(req(), { params })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.evidence).toHaveLength(1)
    expect(body.total).toBe(1)
  })

  it('returns 500 on DB error', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    chain.range.mockResolvedValue({ data: null, count: null, error: { message: 'DB error' } })

    const res = await GET(req(), { params })
    expect(res.status).toBe(500)
  })
})
