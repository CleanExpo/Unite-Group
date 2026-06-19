import { describe, it, expect, vi, beforeEach } from 'vitest'

let dispatchResolve: any = { data: [], error: null }
const mockSingle = vi.fn()

function makeChain() {
  const b: Record<string, any> = {
    select: vi.fn(), eq: vi.fn(), order: vi.fn(), limit: vi.fn(), insert: vi.fn(),
    then(onFulfilled: any, onRejected: any) {
      return Promise.resolve(dispatchResolve).then(onFulfilled, onRejected)
    },
  }
  b.select.mockReturnValue(b); b.eq.mockReturnValue(b)
  b.order.mockReturnValue(b); b.limit.mockReturnValue(b); b.insert.mockReturnValue(b)
  b.single = mockSingle
  return b
}

const mockFrom = vi.fn()
vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('@/lib/supabase/service', () => ({ createServiceClient: vi.fn() }))
vi.mock('@/lib/integrations/linear', () => ({ createIssue: vi.fn() }))

import { getUser } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { createIssue } from '@/lib/integrations/linear'
import { GET, POST } from '../route'

function postReq(body: object) {
  return new Request('https://app.test/api/satellites/dispatch', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  })
}
function getReq() {
  return new Request('https://app.test/api/satellites/dispatch')
}

describe('/api/satellites/dispatch', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    dispatchResolve = { data: [], error: null }
    mockSingle.mockResolvedValue({ data: { id: 'd1' }, error: null })
    mockFrom.mockReturnValue(makeChain())
    vi.mocked(createServiceClient).mockReturnValue({ from: mockFrom } as any)
  })

  it('POST returns 401 when unauthorized', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await POST(postReq({ businessKey: 'dr', title: 'Task' }))
    expect(res.status).toBe(401)
  })

  it('POST returns 400 when businessKey missing', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const res = await POST(postReq({ title: 'Task' }))
    expect(res.status).toBe(400)
  })

  it('POST returns 400 for unknown business', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const res = await POST(postReq({ businessKey: 'unknown', title: 'Task' }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/Unknown business/)
  })

  it('POST dispatches and returns 201', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    vi.mocked(createIssue).mockResolvedValue({ id: 'DR-42', url: 'https://linear.app/dr-42' } as any)
    const res = await POST(postReq({ businessKey: 'dr', title: 'Fix the thing' }))
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.linearIssueId).toBe('DR-42')
  })

  it('GET returns 401 when unauthorized', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await GET(getReq())
    expect(res.status).toBe(401)
  })

  it('GET returns dispatch list', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    dispatchResolve = { data: [{ id: 'd1' }], error: null }
    const res = await GET(getReq())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.dispatches).toHaveLength(1)
  })
})
