import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('@/lib/command-centre/tasks', () => ({ listTasks: vi.fn() }))
vi.mock('@/lib/command-centre/sessions', () => ({ listRecentSessions: vi.fn() }))
vi.mock('@/lib/command-centre/live-agent-operations', () => ({
  buildLiveAgentOperations: vi.fn(),
}))

import { getUser } from '@/lib/supabase/server'
import { listTasks } from '@/lib/command-centre/tasks'
import { listRecentSessions } from '@/lib/command-centre/sessions'
import { buildLiveAgentOperations } from '@/lib/command-centre/live-agent-operations'
import { GET } from '../route'

describe('GET /api/command-center/live-agent-operations', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when unauthorized', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('returns 503 when operations unavailable', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    vi.mocked(listTasks).mockRejectedValue(new Error('db error'))
    const res = await GET()
    expect(res.status).toBe(503)
    const body = await res.json()
    expect(body.error).toBe('cc_operations_unavailable')
  })

  it('returns 200 with operations on success', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    vi.mocked(listTasks).mockResolvedValue([])
    vi.mocked(listRecentSessions).mockResolvedValue([])
    vi.mocked(buildLiveAgentOperations).mockReturnValue({ lanes: [], metrics: {} } as any)
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.lanes).toBeDefined()
  })
})
