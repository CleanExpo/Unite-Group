import { describe, it, expect, vi, beforeEach } from 'vitest'

let chainResolve: any = { data: [], error: null }

function makeChain() {
  const b: Record<string, any> = {
    select: vi.fn(),
    eq: vi.fn(),
    gte: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
    then(onFulfilled: any, onRejected: any) {
      return Promise.resolve(chainResolve).then(onFulfilled, onRejected)
    },
  }
  b.select.mockReturnValue(b)
  b.eq.mockReturnValue(b)
  b.gte.mockReturnValue(b)
  b.order.mockReturnValue(b)
  b.limit.mockReturnValue(b)
  return b
}

let chain: ReturnType<typeof makeChain>
const mockFrom = vi.fn()
const mockServiceClient = { from: mockFrom }

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('@/lib/supabase/service', () => ({ createServiceClient: vi.fn() }))

import { getUser } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { GET } from '../route'

describe('GET /api/analytics', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    chainResolve = { data: [], error: null }
    chain = makeChain()
    mockFrom.mockReturnValue(chain)
    vi.mocked(createServiceClient).mockReturnValue(mockServiceClient as any)
  })

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await GET(new Request('https://app.test/api/analytics') as any)
    expect(res.status).toBe(401)
  })

  it('returns mapped analytics rows', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    chainResolve = {
      data: [{
        id: 'r-1',
        business_key: 'dr',
        platform: 'instagram',
        post_external_id: 'post-1',
        metric_date: '2026-06-01',
        impressions: 1000,
        reach: 800,
        engagements: 50,
        likes: 40,
        comments: 5,
        shares: 3,
        saves: 2,
        clicks: 0,
        video_views: 0,
        engagement_rate: '5.00',
      }],
      error: null,
    }

    const res = await GET(new Request('https://app.test/api/analytics') as any)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toHaveLength(1)
    expect(body.data[0].businessKey).toBe('dr')
    expect(body.data[0].platform).toBe('instagram')
    expect(body.data[0].engagementRate).toBe(5)
  })

  it('filters by business and platform when provided', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    chainResolve = { data: [], error: null }

    const res = await GET(new Request('https://app.test/api/analytics?business=dr&platform=instagram') as any)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toHaveLength(0)
  })

  it('returns 500 on DB error', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    chainResolve = { data: null, error: { message: 'DB error' } }

    const res = await GET(new Request('https://app.test/api/analytics') as any)
    expect(res.status).toBe(500)
  })
})
