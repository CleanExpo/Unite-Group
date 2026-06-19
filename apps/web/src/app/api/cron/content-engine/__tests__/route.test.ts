import { describe, it, expect, vi, beforeEach } from 'vitest'

let brandsResolve: any = { data: [], error: null }

function makeChain() {
  const b: Record<string, any> = {
    select: vi.fn(), eq: vi.fn(),
    then(onFulfilled: any, onRejected: any) {
      return Promise.resolve(brandsResolve).then(onFulfilled, onRejected)
    },
  }
  b.select.mockReturnValue(b); b.eq.mockReturnValue(b)
  return b
}

const mockFrom = vi.fn()
vi.mock('@/lib/supabase/service', () => ({ createServiceClient: vi.fn() }))
vi.mock('@/lib/content/generator', () => ({ generateContent: vi.fn() }))
vi.mock('@/lib/content/calendar', () => ({
  getContentGapsForWeek: vi.fn().mockResolvedValue([]),
  getNextScheduledSlot: vi.fn().mockResolvedValue(null),
}))
vi.mock('@/lib/notifications', () => ({ notify: vi.fn().mockResolvedValue(undefined) }))

import { createServiceClient } from '@/lib/supabase/service'
import { GET } from '../route'

vi.stubEnv('CRON_SECRET', 'test-secret')
vi.stubEnv('FOUNDER_USER_ID', 'founder-1')

function req(auth = 'Bearer test-secret') {
  return new Request('https://app.test', { headers: { authorization: auth } })
}

describe('GET /api/cron/content-engine', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    brandsResolve = { data: [], error: null }
    mockFrom.mockReturnValue(makeChain())
    vi.mocked(createServiceClient).mockReturnValue({ from: mockFrom } as any)
  })

  it('returns 401 when unauthorized', async () => {
    const res = await GET(req('bad'))
    expect(res.status).toBe(401)
  })

  it('returns 200 with no content when no brands', async () => {
    brandsResolve = { data: [], error: null }
    const res = await GET(req())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.generated).toBe(0)
  })

  it('returns 500 on DB error', async () => {
    brandsResolve = { data: null, error: { message: 'DB error' } }
    const res = await GET(req())
    expect(res.status).toBe(500)
  })
})
