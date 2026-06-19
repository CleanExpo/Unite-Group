import { describe, it, expect, vi, beforeEach } from 'vitest'

let listResolve: any = { data: [], error: null }

function makeChain() {
  const b: Record<string, any> = {
    select: vi.fn(),
    eq: vi.fn(),
    not: vi.fn(),
    then(onFulfilled: any, onRejected: any) {
      return Promise.resolve(listResolve).then(onFulfilled, onRejected)
    },
  }
  b.select.mockReturnValue(b)
  b.eq.mockReturnValue(b)
  b.not.mockReturnValue(b)
  return b
}

const mockFrom = vi.fn()
const mockServiceClient = { from: mockFrom }

vi.mock('@/lib/supabase/service', () => ({ createServiceClient: vi.fn() }))
vi.mock('@/lib/integrations/heygen', () => ({ getVideoStatus: vi.fn() }))

import { createServiceClient } from '@/lib/supabase/service'
import { GET } from '../route'

vi.stubEnv('CRON_SECRET', 'test-secret')

function req(auth = 'Bearer test-secret') {
  return new Request('https://app.test', { headers: { authorization: auth } })
}

describe('GET /api/cron/video-status', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    listResolve = { data: [], error: null }
    mockFrom.mockReturnValue(makeChain())
    vi.mocked(createServiceClient).mockReturnValue(mockServiceClient as any)
  })

  it('returns 401 when unauthorized', async () => {
    const res = await GET(req('bad'))
    expect(res.status).toBe(401)
  })

  it('returns checked=0 when no pending videos', async () => {
    listResolve = { data: [], error: null }
    const res = await GET(req())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.checked).toBe(0)
  })

  it('returns 500 on DB query error', async () => {
    listResolve = { data: null, error: { message: 'DB error' } }
    const res = await GET(req())
    expect(res.status).toBe(500)
  })
})
