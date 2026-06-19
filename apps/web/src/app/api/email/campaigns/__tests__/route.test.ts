import { describe, it, expect, vi, beforeEach } from 'vitest'

// Flexible chain — covers both GET (.select.eq.order) and POST (.insert.select.single)
let chainResolve: any = { data: [], error: null }
const mockSingle = vi.fn()

function makeChain() {
  const b: Record<string, any> = {
    select: vi.fn(), eq: vi.fn(), order: vi.fn(), insert: vi.fn(),
  }
  b.select.mockReturnValue(b); b.eq.mockReturnValue(b); b.order.mockReturnValue(b)
  b.insert.mockReturnValue(b)
  b.single = mockSingle
  // Make the chain awaitable for GET queries
  Object.defineProperty(b, 'then', {
    value(onFulfilled: any, onRejected: any) {
      return Promise.resolve(chainResolve).then(onFulfilled, onRejected)
    },
  })
  return b
}

const mockFrom = vi.fn()
vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('@/lib/supabase/service', () => ({ createServiceClient: vi.fn() }))

import { getUser } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { GET, POST } from '../route'

const validBody = {
  businessKey: 'dr',
  name: 'Q3 Campaign',
  subject: 'Big news!',
  bodyHtml: '<p>Hello</p>',
}

function getReq(qs = '') {
  return new Request(`https://app.test/api/email/campaigns${qs}`)
}
function postReq(body: object) {
  return new Request('https://app.test/api/email/campaigns', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  })
}

describe('/api/email/campaigns', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    chainResolve = { data: [], error: null }
    mockSingle.mockResolvedValue({ data: { id: 'camp-1' }, error: null })
    mockFrom.mockReturnValue(makeChain())
    vi.mocked(createServiceClient).mockReturnValue({ from: mockFrom } as any)
  })

  it('GET returns 401 when unauthorized', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await GET(getReq())
    expect(res.status).toBe(401)
  })

  it('GET returns campaign list', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    chainResolve = { data: [{ id: 'c1', name: 'Campaign A' }], error: null }
    const res = await GET(getReq())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.campaigns).toHaveLength(1)
  })

  it('POST returns 401 when unauthorized', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await POST(postReq(validBody))
    expect(res.status).toBe(401)
  })

  it('POST returns 400 when businessKey missing', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const res = await POST(postReq({ ...validBody, businessKey: '' }))
    expect(res.status).toBe(400)
  })

  it('POST creates campaign and returns 201', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const res = await POST(postReq(validBody))
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.campaign.id).toBe('camp-1')
  })
})
