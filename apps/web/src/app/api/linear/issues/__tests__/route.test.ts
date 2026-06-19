import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('@/lib/integrations/linear', () => ({
  fetchIssues: vi.fn(),
  createIssue: vi.fn(),
  updateIssueState: vi.fn(),
  resolveStateId: vi.fn(),
  isLinearConfigured: vi.fn().mockReturnValue(false),
}))

import { getUser } from '@/lib/supabase/server'
import { fetchIssues, createIssue, resolveStateId, updateIssueState } from '@/lib/integrations/linear'
import { GET, POST, PATCH } from '../route'

function req(method: string, body?: object, qs = '') {
  return new Request(`https://app.test/api/linear/issues${qs}`, {
    method,
    ...(body ? { headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) } : {}),
  })
}

describe('/api/linear/issues', () => {
  beforeEach(() => vi.clearAllMocks())

  it('GET returns 401 when unauthorized', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await GET(req('GET'))
    expect(res.status).toBe(401)
  })

  it('GET returns configured=false when LINEAR_API_KEY not set', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const res = await GET(req('GET'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.configured).toBe(false)
  })

  it('POST returns 401 when unauthorized', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await POST(req('POST', { teamKey: 'UNI', title: 'Task' }))
    expect(res.status).toBe(401)
  })

  it('POST returns 503 when Linear not configured', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const res = await POST(req('POST', { teamKey: 'UNI', title: 'Task' }))
    expect(res.status).toBe(503)
  })

  it('PATCH returns 401 when unauthorized', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await PATCH(req('PATCH', { issueId: 'i1', teamKey: 'UNI', columnId: 'done' }))
    expect(res.status).toBe(401)
  })
})
