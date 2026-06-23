import { describe, it, expect, vi, beforeEach } from 'vitest'

let chainResolve: any = { data: [], error: null }
const mockAuthGetUser = vi.fn()

function makeChain() {
  const b: Record<string, any> = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    returns: vi.fn(),
    then(onFulfilled: any, onRejected: any) {
      return Promise.resolve(chainResolve).then(onFulfilled, onRejected)
    },
  }
  b.select.mockReturnValue(b)
  b.eq.mockReturnValue(b)
  b.order.mockReturnValue(b)
  b.returns.mockReturnValue(b)
  return b
}

const mockFrom = vi.fn()
const mockClient = {
  from: mockFrom,
  auth: { getUser: mockAuthGetUser },
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

import { createClient } from '@/lib/supabase/server'
import { GET } from '../route'

describe('GET /api/coaches/reports', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    chainResolve = { data: [], error: null }
    mockFrom.mockReturnValue(makeChain())
    vi.mocked(createClient).mockResolvedValue(mockClient as any)
  })

  it('returns 401 when unauthenticated', async () => {
    mockAuthGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'no session' } })

    const res = await GET(new Request('https://app.test/api/coaches/reports'))
    expect(res.status).toBe(401)
  })

  it('returns reports for today when no date param', async () => {
    mockAuthGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    chainResolve = {
      data: [{ id: 'rpt-1', coach_type: 'revenue', summary: 'Great MRR.' }],
      error: null,
    }

    const res = await GET(new Request('https://app.test/api/coaches/reports'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.reports).toHaveLength(1)
    expect(body.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(body.count).toBe(1)
  })

  it('uses specified date param', async () => {
    mockAuthGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    chainResolve = { data: [], error: null }

    const res = await GET(new Request('https://app.test/api/coaches/reports?date=2026-06-01'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.date).toBe('2026-06-01')
  })

  it('founder-scopes the coach_reports query', async () => {
    mockAuthGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    const chain = makeChain()
    mockFrom.mockReturnValue(chain)

    await GET(new Request('https://app.test/api/coaches/reports'))
    expect(chain.eq).toHaveBeenCalledWith('founder_id', 'user-1')
  })

  it('returns 500 on fetch error', async () => {
    mockAuthGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    chainResolve = { data: null, error: { message: 'DB error' } }

    const res = await GET(new Request('https://app.test/api/coaches/reports'))
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBe('Failed to fetch reports')
  })
})
