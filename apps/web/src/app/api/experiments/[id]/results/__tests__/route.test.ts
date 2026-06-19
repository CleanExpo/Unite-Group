import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockSingle = vi.fn()
let chainResolve: any = { data: [], error: null }

function makeChain() {
  const b: Record<string, any> = {
    select: vi.fn(), eq: vi.fn(), upsert: vi.fn(),
    then(onFulfilled: any, onRejected: any) {
      return Promise.resolve(chainResolve).then(onFulfilled, onRejected)
    },
  }
  b.select.mockReturnValue(b); b.eq.mockReturnValue(b); b.upsert.mockReturnValue(b)
  b.single = mockSingle
  return b
}

const mockFrom = vi.fn()
vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('@/lib/supabase/service', () => ({ createServiceClient: vi.fn() }))
vi.mock('@/lib/experiments/statistics', () => ({
  analyseExperimentResults: vi.fn().mockReturnValue({ winner: null, significant: false }),
}))

import { getUser } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { GET, POST } from '../route'

const params = { params: Promise.resolve({ id: 'exp-1' }) }

function getReq() {
  return new NextRequest('https://app.test/api/experiments/exp-1/results')
}
function postReq(body: object) {
  return new NextRequest('https://app.test/api/experiments/exp-1/results', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  })
}

describe('/api/experiments/[id]/results', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    chainResolve = { data: [], error: null }
    mockSingle.mockResolvedValue({ data: { id: 'exp-1', confidence_level: 0.95, started_at: null, metric_primary: 'engagement' }, error: null })
    mockFrom.mockReturnValue(makeChain())
    vi.mocked(createServiceClient).mockReturnValue({ from: mockFrom } as any)
  })

  it('GET returns 401 when unauthorized', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await GET(getReq(), params)
    expect(res.status).toBe(401)
  })

  it('GET returns 404 when experiment not found', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    mockSingle.mockResolvedValue({ data: null, error: { message: 'Not found' } })
    const res = await GET(getReq(), params)
    expect(res.status).toBe(404)
  })

  it('GET returns results and significance', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const res = await GET(getReq(), params)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body.results)).toBe(true)
    expect(body.significance).toBeDefined()
  })

  it('POST returns 401 when unauthorized', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await POST(postReq({ variantId: 'v1', periodDate: '2026-01-01', impressions: 100 }), params)
    expect(res.status).toBe(401)
  })

  it('POST returns 400 when variantId missing', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const res = await POST(postReq({ periodDate: '2026-01-01', impressions: 100 }), params)
    expect(res.status).toBe(400)
  })
})
