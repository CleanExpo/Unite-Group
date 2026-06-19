import { describe, it, expect, vi, beforeEach } from 'vitest'

let triageResolve: any = { data: [], error: null }
const mockSingle = vi.fn()

function makeChain() {
  const b: Record<string, any> = {
    select: vi.fn(), eq: vi.fn(), gte: vi.fn(), order: vi.fn(), insert: vi.fn(), upsert: vi.fn(),
    then(onFulfilled: any, onRejected: any) {
      return Promise.resolve(triageResolve).then(onFulfilled, onRejected)
    },
  }
  b.select.mockReturnValue(b); b.eq.mockReturnValue(b); b.gte.mockReturnValue(b)
  b.order.mockReturnValue(b); b.insert.mockReturnValue(b); b.upsert.mockReturnValue(b)
  b.single = mockSingle
  return b
}

const mockFrom = vi.fn()
vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('@/lib/supabase/service', () => ({ createServiceClient: vi.fn() }))
vi.mock('@/lib/integrations/google', () => ({
  fetchThreadsPaginated: vi.fn().mockResolvedValue({ threads: [], nextPageToken: null }),
}))
vi.mock('@/lib/ai/capabilities/email-triage', () => ({
  triageThreadBatch: vi.fn().mockResolvedValue([]),
}))

import { getUser } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { GET, POST } from '../route'

function getReq(qs = '') {
  return new Request(`https://app.test/api/email/triage${qs}`)
}
function postReq(body: object) {
  return new Request('https://app.test/api/email/triage', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  })
}

describe('/api/email/triage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    triageResolve = { data: [], error: null }
    mockSingle.mockResolvedValue({ data: null, error: null })
    mockFrom.mockReturnValue(makeChain())
    vi.mocked(createServiceClient).mockReturnValue({ from: mockFrom } as any)
  })

  it('GET returns 401 when unauthorized', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await GET(getReq())
    expect(res.status).toBe(401)
  })

  it('GET returns 400 when account missing', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const res = await GET(getReq())
    expect(res.status).toBe(400)
  })

  it('GET returns triage results', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    triageResolve = { data: [{ thread_id: 't1', category: 'INBOX' }], error: null }
    const res = await GET(getReq('?account=test@test.com'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.results).toHaveLength(1)
  })

  it('POST returns 401 when unauthorized', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await POST(postReq({ account: 'test@test.com', threadIds: ['t1'] }))
    expect(res.status).toBe(401)
  })

  it('POST returns 400 when account missing', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const res = await POST(postReq({ threadIds: ['t1'] }))
    expect(res.status).toBe(400)
  })
})
