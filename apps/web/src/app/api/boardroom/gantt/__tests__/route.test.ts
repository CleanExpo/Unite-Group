import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  getUser: vi.fn(),
}))

vi.mock('@/lib/integrations/linear-board', () => ({
  fetchIssuesWithDueDates: vi.fn(),
}))

import { GET } from '../route'
import { getUser } from '@/lib/supabase/server'
import { fetchIssuesWithDueDates } from '@/lib/integrations/linear-board'

const ISSUE = {
  id: 'i1', identifier: 'UNI-1', title: 'Test issue', url: 'https://linear.app/i1',
  dueDate: '2026-12-31', createdAt: '2026-06-01T00:00:00Z', updatedAt: '2026-06-01T00:00:00Z',
  priority: 1,
  state: { name: 'In Progress', type: 'started' },
  team: { id: 't1', key: 'UNI', name: 'Unite' },
  assignee: null,
}

beforeEach(() => {
  vi.mocked(getUser).mockResolvedValue({ id: 'founder-1' } as never)
  delete process.env.LINEAR_API_KEY
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/boardroom/gantt', () => {
  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null as never)
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('returns source:not_connected when LINEAR_API_KEY is absent', async () => {
    const res = await GET()
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.source).toBe('not_connected')
    expect(json.items).toEqual([])
    expect(fetchIssuesWithDueDates).not.toHaveBeenCalled()
  })

  it('returns source:linear with mapped items when key is present', async () => {
    process.env.LINEAR_API_KEY = 'lin_test_key'
    vi.mocked(fetchIssuesWithDueDates).mockResolvedValue([ISSUE])
    const res = await GET()
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.source).toBe('linear')
    expect(json.items).toHaveLength(1)
    expect(json.items[0].identifier).toBe('UNI-1')
  })

  it('returns source:error when fetchIssuesWithDueDates throws', async () => {
    process.env.LINEAR_API_KEY = 'lin_test_key'
    vi.mocked(fetchIssuesWithDueDates).mockRejectedValue(new Error('rate limit'))
    const res = await GET()
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.source).toBe('error')
    expect(json.error).toContain('rate limit')
    expect(json.items).toEqual([])
  })
})
