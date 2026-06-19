import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('@/lib/command-centre/tasks', () => ({ listTasks: vi.fn() }))

import { getUser } from '@/lib/supabase/server'
import { listTasks } from '@/lib/command-centre/tasks'
import { GET } from '../route'

describe('GET /api/command-centre/queue', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await GET(new Request('https://app.test/api/command-centre/queue'))
    expect(res.status).toBe(401)
  })

  it('returns tasks list', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    vi.mocked(listTasks).mockResolvedValue([{ id: 'task-1', status: 'queued' }] as any)

    const res = await GET(new Request('https://app.test/api/command-centre/queue'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.tasks).toHaveLength(1)
    expect(listTasks).toHaveBeenCalledWith(expect.objectContaining({ founderId: 'user-1' }))
  })

  it('passes status filter when valid', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    vi.mocked(listTasks).mockResolvedValue([] as any)

    await GET(new Request('https://app.test/api/command-centre/queue?status=proposed'))
    expect(listTasks).toHaveBeenCalledWith(expect.objectContaining({ status: 'proposed' }))
  })

  it('ignores invalid status filter', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    vi.mocked(listTasks).mockResolvedValue([] as any)

    await GET(new Request('https://app.test/api/command-centre/queue?status=garbage'))
    expect(listTasks).toHaveBeenCalledWith(expect.objectContaining({ status: undefined }))
  })

  it('returns 500 on list error', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    vi.mocked(listTasks).mockRejectedValue(new Error('DB down'))

    const res = await GET(new Request('https://app.test/api/command-centre/queue'))
    expect(res.status).toBe(500)
  })
})
