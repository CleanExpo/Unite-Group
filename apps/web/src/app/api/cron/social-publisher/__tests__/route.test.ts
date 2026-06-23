import { describe, it, expect, vi, beforeEach } from 'vitest'

let postsResolve: any = { data: [], error: null }

function makeChain() {
  const b: Record<string, any> = {
    select: vi.fn(), eq: vi.fn(), lte: vi.fn(), order: vi.fn(),
    then(onFulfilled: any, onRejected: any) {
      return Promise.resolve(postsResolve).then(onFulfilled, onRejected)
    },
  }
  b.select.mockReturnValue(b); b.eq.mockReturnValue(b); b.lte.mockReturnValue(b); b.order.mockReturnValue(b)
  return b
}

const mockFrom = vi.fn()
vi.mock('@/lib/supabase/service', () => ({ createServiceClient: vi.fn() }))
vi.mock('@/lib/integrations/social/channels', () => ({ decodeToken: vi.fn() }))
vi.mock('@/lib/integrations/social/publisher', () => ({ publishToPlatform: vi.fn() }))
vi.mock('@/lib/notifications', () => ({ notify: vi.fn().mockResolvedValue(undefined) }))

import { createServiceClient } from '@/lib/supabase/service'
import { GET } from '../route'

vi.stubEnv('CRON_SECRET', 'test-secret')

function req(auth = 'Bearer test-secret') {
  return new Request('https://app.test', { headers: { authorization: auth } })
}

describe('GET /api/cron/social-publisher', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    postsResolve = { data: [], error: null }
    mockFrom.mockReturnValue(makeChain())
    vi.mocked(createServiceClient).mockReturnValue({ from: mockFrom } as any)
  })

  it('returns 401 when unauthorized', async () => {
    const res = await GET(req('bad'))
    expect(res.status).toBe(401)
  })

  it('founder-scopes the social_posts query', async () => {
    vi.stubEnv('FOUNDER_USER_ID', 'founder-uuid')
    const chain = makeChain()
    mockFrom.mockReturnValue(chain)

    await GET(req())
    expect(chain.eq).toHaveBeenCalledWith('founder_id', 'founder-uuid')
  })

  it('returns published=0 when no scheduled posts', async () => {
    postsResolve = { data: [], error: null }
    const res = await GET(req())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.published).toBe(0)
  })

  it('returns 500 on DB error', async () => {
    postsResolve = { data: null, error: { message: 'DB error' } }
    const res = await GET(req())
    expect(res.status).toBe(500)
  })
})
