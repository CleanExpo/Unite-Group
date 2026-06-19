import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockUpdate = vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ error: null }) }) }) }) })
const mockFrom = vi.fn().mockReturnValue({ update: mockUpdate })

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn(), createClient: vi.fn() }))
vi.mock('@/lib/command-centre/tasks', () => ({
  listTasks: vi.fn().mockResolvedValue([]),
  CC_TASKS_TABLE: 'cc_tasks',
}))

import { getUser, createClient } from '@/lib/supabase/server'
import { GET, POST } from '../route'

function postReq(body: object) {
  return new Request('https://app.test/api/command-center/control-panel/kanban-sync', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  })
}

describe('/api/command-center/control-panel/kanban-sync', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(createClient).mockResolvedValue({ from: mockFrom } as any)
  })

  it('GET returns 401 when unauthorized', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('GET returns sync packets', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.source).toBe('cc:kanban-sync')
    expect(body.tasks).toBeDefined()
  })

  it('POST returns 401 when unauthorized', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await POST(postReq({ taskIds: ['t1'] }))
    expect(res.status).toBe(401)
  })

  it('POST returns 400 when taskIds missing', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const res = await POST(postReq({}))
    expect(res.status).toBe(400)
  })

  it('POST marks tasks synced', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const res = await POST(postReq({ taskIds: ['t1'], syncedAt: '2026-01-01T00:00:00Z' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
  })
})
