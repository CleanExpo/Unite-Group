import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockSelect = vi.fn()
const mockInsert = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  getUser: vi.fn(),
}))
vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: vi.fn(() => ({
    from: vi.fn(() => ({ select: mockSelect, insert: mockInsert })),
  })),
}))

import { GET, POST } from '../route'
import { getUser } from '@/lib/supabase/server'

const AUTHED_USER = { id: 'user-123' }
const makePostReq = (body: object) =>
  new Request('https://app.test/api/social/posts', {
    method: 'POST',
    body: JSON.stringify(body),
  })
const makeGetReq = (qs = '') =>
  new Request(`https://app.test/api/social/posts${qs}`)

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getUser).mockResolvedValue(AUTHED_USER as never)
  // GET chain: select('*').eq('founder_id', id).order(...) → [, optionally .eq('business_key').eq('status')]
  const orderResult = vi.fn().mockResolvedValue({ data: [], error: null })
  const afterOrder: Record<string, unknown> = {}
  afterOrder.eq = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: [], error: null }) })
  const orderFn = vi.fn().mockReturnValue({ ...afterOrder, then: orderResult })
  // make the order fn itself awaitable when no extra .eq chains are appended
  orderResult.mockImplementation((...args: Parameters<typeof orderResult>) => Promise.resolve({ data: [], error: null }).then(...args))
  mockSelect.mockReturnValue({
    eq: vi.fn().mockReturnValue({
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    }),
  })
  void orderFn
  // Default: insert chain returns a draft post
  mockInsert.mockReturnValue({
    select: vi.fn().mockReturnValue({
      single: vi.fn().mockResolvedValue({ data: { id: '1', status: 'draft' }, error: null }),
    }),
  })
})

describe('GET /api/social/posts', () => {
  it('unauthenticated -> 401', async () => {
    vi.mocked(getUser).mockResolvedValue(null as never)
    const res = await GET(makeGetReq())
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBe('Unauthorised')
  })

  it('authenticated -> 200 with posts array', async () => {
    const res = await GET(makeGetReq())
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(Array.isArray(json.posts)).toBe(true)
  })
})

describe('POST /api/social/posts', () => {
  it('unauthenticated -> 401', async () => {
    vi.mocked(getUser).mockResolvedValue(null as never)
    const res = await POST(makePostReq({ businessKey: 'dr', content: 'Hello', platforms: ['facebook'] }))
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBe('Unauthorised')
  })

  it('creates a draft post', async () => {
    const res = await POST(makePostReq({ businessKey: 'dr', content: 'Hello', platforms: ['facebook'] }))
    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json.post).toBeDefined()
  })

  it('returns 400 if content missing', async () => {
    const res = await POST(makePostReq({ businessKey: 'dr', platforms: ['facebook'] }))
    expect(res.status).toBe(400)
  })

  it('returns 400 if platforms missing', async () => {
    const res = await POST(makePostReq({ businessKey: 'dr', content: 'Hello' }))
    expect(res.status).toBe(400)
  })
})
