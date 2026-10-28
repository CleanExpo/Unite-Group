import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('@/lib/kanban/store', () => ({ listTasks: vi.fn(), createTask: vi.fn() }))

import { getUser } from '@/lib/supabase/server'
import { listTasks, createTask } from '@/lib/kanban/store'
import { GET, POST } from '../route'

function req(body: unknown) {
  return new Request('http://localhost/api/kanban/cards', {
    method: 'POST',
    body: typeof body === 'string' ? body : JSON.stringify(body),
  }) as never
}

describe('POST /api/kanban/cards', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getUser).mockResolvedValue({ id: 'user-123' } as never)
  })

  it('refuses unauthenticated requests and does not create', async () => {
    vi.mocked(getUser).mockResolvedValue(null as never)
    const res = await POST(req({ title: 'x' }))
    expect(res.status).toBe(401)
    expect(createTask).not.toHaveBeenCalled()
  })

  it('rejects a missing/blank title', async () => {
    const res = await POST(req({ title: '   ' }))
    expect(res.status).toBe(400)
    expect(createTask).not.toHaveBeenCalled()
  })

  it('rejects an invalid status', async () => {
    const res = await POST(req({ title: 'x', status: 'bogus' }))
    expect(res.status).toBe(400)
    expect(createTask).not.toHaveBeenCalled()
  })

  it('creates a founder-scoped card', async () => {
    vi.mocked(createTask).mockResolvedValue('new-id' as never)
    const res = await POST(req({ title: '  Do it  ', status: 'blocked', priority: 'high' }))
    expect(res.status).toBe(201)
    expect(createTask).toHaveBeenCalledWith(
      'user-123',
      expect.objectContaining({ title: 'Do it', status: 'blocked', priority: 'high' }),
    )
    expect(await res.json()).toEqual({ id: 'new-id', status: 'blocked' })
  })
})

describe('GET /api/kanban/cards', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getUser).mockResolvedValue({ id: 'user-123' } as never)
  })

  it('refuses unauthenticated requests and does not list', async () => {
    vi.mocked(getUser).mockResolvedValue(null as never)
    const res = await GET()
    expect(res.status).toBe(401)
    expect(listTasks).not.toHaveBeenCalled()
  })

  it('groups the founder tasks by column', async () => {
    vi.mocked(listTasks).mockResolvedValue([{ id: 't1', status: 'done' }] as never)
    const res = await GET()
    expect(res.status).toBe(200)
    expect(listTasks).toHaveBeenCalledWith('user-123')
    const json = (await res.json()) as { columns: { id: string; tasks: unknown[] }[] }
    expect(json.columns.find(c => c.id === 'done')?.tasks).toHaveLength(1)
    expect(json.columns.find(c => c.id === 'todo')?.tasks).toHaveLength(0)
  })
})
