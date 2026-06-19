import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

let jobsResolve: any = { data: [], error: null, count: 0 }

function makeChain() {
  const b: Record<string, any> = {
    select: vi.fn(), eq: vi.fn(), order: vi.fn(), range: vi.fn(),
    then(onFulfilled: any, onRejected: any) {
      return Promise.resolve(jobsResolve).then(onFulfilled, onRejected)
    },
  }
  b.select.mockReturnValue(b); b.eq.mockReturnValue(b)
  b.order.mockReturnValue(b); b.range.mockReturnValue(b)
  return b
}

const mockFrom = vi.fn()
vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn(), createClient: vi.fn() }))

import { getUser, createClient } from '@/lib/supabase/server'
import { GET } from '../route'

function req(qs = '') {
  return new NextRequest(`https://app.test/api/video/jobs${qs}`)
}

describe('GET /api/video/jobs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    jobsResolve = { data: [], error: null, count: 0 }
    mockFrom.mockReturnValue(makeChain())
    vi.mocked(createClient).mockResolvedValue({ from: mockFrom } as any)
  })

  it('returns 401 when unauthorized', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await GET(req())
    expect(res.status).toBe(401)
  })

  it('returns job list', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    jobsResolve = { data: [{ id: 'j1', status: 'pending' }], error: null, count: 1 }
    const res = await GET(req())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.jobs).toHaveLength(1)
    expect(body.count).toBe(1)
  })

  it('returns 500 on DB error', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    jobsResolve = { data: null, error: { message: 'DB error' }, count: null }
    const res = await GET(req())
    expect(res.status).toBe(500)
  })
})
