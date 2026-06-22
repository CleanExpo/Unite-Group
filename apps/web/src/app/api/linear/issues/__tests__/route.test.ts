import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
// Mock only the network-bound calls; keep the real mapping helpers
// (issueToBusiness, stateToColumn, BUSINESS_TO_TEAM, projectNameForBusiness) so
// the route's business-resolution wiring is genuinely exercised.
vi.mock('@/lib/integrations/linear', async (importActual) => {
  const actual = await importActual<typeof import('@/lib/integrations/linear')>()
  return {
    ...actual,
    fetchIssues: vi.fn(),
    fetchTeamStates: vi.fn(),
    createIssue: vi.fn(),
    updateIssueState: vi.fn(),
  }
})

import { getUser } from '@/lib/supabase/server'
import { fetchIssues, fetchTeamStates, createIssue, updateIssueState } from '@/lib/integrations/linear'
import { GET, POST, PATCH } from '../route'

function req(method: string, body?: object, qs = '') {
  return new Request(`https://app.test/api/linear/issues${qs}`, {
    method,
    ...(body ? { headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) } : {}),
  })
}

describe('/api/linear/issues', () => {
  beforeEach(() => vi.clearAllMocks())
  afterEach(() => vi.unstubAllEnvs())

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

  it('GET maps an ITR issue (UNI team, Dimitri ITR Platform project) to an itr card', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    vi.stubEnv('LINEAR_API_KEY', 'k')
    vi.mocked(fetchTeamStates).mockResolvedValue([])
    vi.mocked(fetchIssues).mockResolvedValue([
      {
        id: 'i-itr', identifier: 'UNI-1', title: 'ITR task', priority: 3,
        team: { id: 't-uni', key: 'UNI', name: 'Unite-Group' },
        project: { id: 'p-itr', name: 'Dimitri ITR Platform' },
        state: { id: 's1', name: 'In Progress', type: 'started' },
      },
    ] as any)

    const res = await GET(req('GET'))
    expect(res.status).toBe(200)
    const body = await res.json() as { columns: Record<string, Array<{ businessKey: string }>> }
    const cards = Object.values(body.columns).flat()
    expect(cards).toHaveLength(1)
    expect(cards[0].businessKey).toBe('itr')
  })

  it('POST files an ITR issue under its team and project derived from businessKey', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    vi.stubEnv('LINEAR_API_KEY', 'k')
    vi.mocked(createIssue).mockResolvedValue({ id: 'UNI-2', url: 'https://linear.app/x' })

    const res = await POST(req('POST', { businessKey: 'itr', title: 'New ITR task' }))
    expect(res.status).toBe(201)
    expect(createIssue).toHaveBeenCalledWith(
      expect.objectContaining({ teamKey: 'UNI', projectName: 'Dimitri ITR Platform', title: 'New ITR task' }),
    )
  })
})
