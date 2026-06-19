import { describe, it, expect, vi, beforeEach } from 'vitest'

let channelsResolve: any = { data: [], error: null }

function makeChain() {
  const b: Record<string, any> = {
    select: vi.fn(), eq: vi.fn(),
    then(onFulfilled: any, onRejected: any) {
      return Promise.resolve(channelsResolve).then(onFulfilled, onRejected)
    },
  }
  b.select.mockReturnValue(b); b.eq.mockReturnValue(b)
  return b
}

const mockFrom = vi.fn()
vi.mock('@/lib/supabase/service', () => ({ createServiceClient: vi.fn() }))
vi.mock('@/lib/integrations/social/engagement', () => ({ fetchNewComments: vi.fn(), replyToFacebookComment: vi.fn(), replyToInstagramComment: vi.fn() }))
vi.mock('@/lib/integrations/social/channels', () => ({ decodeToken: vi.fn() }))
vi.mock('@/lib/content/reply-generator', () => ({ generateReply: vi.fn() }))
vi.mock('@/lib/notifications', () => ({ notify: vi.fn().mockResolvedValue(undefined) }))

import { createServiceClient } from '@/lib/supabase/service'
import { GET } from '../route'

vi.stubEnv('CRON_SECRET', 'test-secret')
vi.stubEnv('FOUNDER_USER_ID', 'founder-1')

function req(auth = 'Bearer test-secret') {
  return new Request('https://app.test', { headers: { authorization: auth } })
}

describe('GET /api/cron/engagement-monitor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    channelsResolve = { data: [], error: null }
    mockFrom.mockReturnValue(makeChain())
    vi.mocked(createServiceClient).mockReturnValue({ from: mockFrom } as any)
  })

  it('returns 401 when unauthorized', async () => {
    const res = await GET(req('bad'))
    expect(res.status).toBe(401)
  })

  it('returns 200 with 0 comments when no channels', async () => {
    channelsResolve = { data: [], error: null }
    const res = await GET(req())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.processed).toBe(0)
  })

  it('returns 500 on DB error', async () => {
    channelsResolve = { data: null, error: { message: 'DB error' } }
    const res = await GET(req())
    expect(res.status).toBe(500)
  })
})
