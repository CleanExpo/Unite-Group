import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockSingle = vi.fn()
let chainResolve: any = { data: [], error: null }

function makeChain() {
  const b: Record<string, any> = {
    select: vi.fn(), eq: vi.fn(), order: vi.fn(), insert: vi.fn(),
    then(onFulfilled: any, onRejected: any) {
      return Promise.resolve(chainResolve).then(onFulfilled, onRejected)
    },
  }
  b.select.mockReturnValue(b); b.eq.mockReturnValue(b)
  b.order.mockReturnValue(b); b.insert.mockReturnValue(b)
  b.single = mockSingle
  return b
}

const mockFrom = vi.fn()
vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('@/lib/supabase/service', () => ({ createServiceClient: vi.fn() }))

import { getUser } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { GET, POST } from '../route'

const params = { params: Promise.resolve({ id: 'exp-1' }) }

function getReq() {
  return new NextRequest('https://app.test/api/experiments/exp-1/variants')
}
function postReq(body: object) {
  return new NextRequest('https://app.test/api/experiments/exp-1/variants', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  })
}

describe('/api/experiments/[id]/variants', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    chainResolve = { data: [], error: null }
    mockSingle.mockResolvedValue({ data: { id: 'exp-1' }, error: null })
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

  it('GET returns variant list', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    chainResolve = { data: [{ id: 'v1', variant_key: 'control' }], error: null }
    const res = await GET(getReq(), params)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.variants).toHaveLength(1)
  })

  it('POST returns 401 when unauthorized', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await POST(postReq({ variantKey: 'v1', label: 'Variant A', isControl: false, weight: 0.5 }), params)
    expect(res.status).toBe(401)
  })

  it('POST returns 400 when variantKey missing', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const res = await POST(postReq({ label: 'Variant A', isControl: false, weight: 0.5 }), params)
    expect(res.status).toBe(400)
  })
})
