import { describe, it, expect, vi, beforeEach } from 'vitest'

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
vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn(), createClient: vi.fn() }))

import { getUser, createClient } from '@/lib/supabase/server'
import { GET, POST } from '../route'

const params = { params: Promise.resolve({ id: 'ins-1' }) }

function getReq() { return new Request('https://app.test/api/strategy/insights/ins-1/comments') }
function postReq(body: object) {
  return new Request('https://app.test/api/strategy/insights/ins-1/comments', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  })
}

describe('/api/strategy/insights/[id]/comments', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    chainResolve = { data: [], error: null }
    mockSingle.mockResolvedValue({ data: { id: 'c1' }, error: null })
    mockFrom.mockReturnValue(makeChain())
    vi.mocked(createClient).mockResolvedValue({ from: mockFrom } as any)
  })

  it('GET returns 401 when unauthorized', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await GET(getReq(), params)
    expect(res.status).toBe(401)
  })

  it('GET returns comments list', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    chainResolve = { data: [{ id: 'c1', content: 'Great insight' }], error: null }
    const res = await GET(getReq(), params)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.comments).toHaveLength(1)
  })

  it('POST returns 401 when unauthorized', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await POST(postReq({ content: 'A comment' }), params)
    expect(res.status).toBe(401)
  })

  it('POST creates comment and returns 201', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const res = await POST(postReq({ content: 'Interesting point!' }), params)
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.comment).toBeDefined()
  })
})
