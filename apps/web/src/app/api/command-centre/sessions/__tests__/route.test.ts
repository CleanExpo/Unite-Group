import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('@/lib/command-centre/tasks', () => ({ getTaskById: vi.fn() }))
vi.mock('@/lib/command-centre/sessions', () => ({
  listSessionsForTask: vi.fn(),
  startSession: vi.fn(),
  SESSION_SURFACES: ['local', 'vercel', 'codex'],
}))

import { getUser } from '@/lib/supabase/server'
import { getTaskById } from '@/lib/command-centre/tasks'
import { listSessionsForTask, startSession } from '@/lib/command-centre/sessions'
import { GET, POST } from '../route'

function postReq(body: object) {
  return new Request('https://app.test/api/command-centre/sessions', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

describe('GET /api/command-centre/sessions', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await GET(new Request('https://app.test/api/command-centre/sessions'))
    expect(res.status).toBe(401)
  })

  it('returns 400 when taskId is missing', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const res = await GET(new Request('https://app.test/api/command-centre/sessions'))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/taskId/)
  })

  it('returns sessions for the task', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    vi.mocked(listSessionsForTask).mockResolvedValue([{ id: 'sess-1' }] as any)

    const res = await GET(new Request('https://app.test/api/command-centre/sessions?taskId=task-1'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.sessions).toHaveLength(1)
    expect(listSessionsForTask).toHaveBeenCalledWith(expect.objectContaining({ taskId: 'task-1' }))
  })
})

describe('POST /api/command-centre/sessions', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await POST(postReq({ taskId: 'task-1' }))
    expect(res.status).toBe(401)
  })

  it('returns 400 when taskId is missing', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const res = await POST(postReq({}))
    expect(res.status).toBe(400)
  })

  it('returns 404 when task not found', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    vi.mocked(getTaskById).mockResolvedValue(null)

    const res = await POST(postReq({ taskId: 'task-1' }))
    expect(res.status).toBe(404)
  })

  it('returns 409 when task is not queued', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    vi.mocked(getTaskById).mockResolvedValue({ id: 'task-1', status: 'proposed' } as any)

    const res = await POST(postReq({ taskId: 'task-1' }))
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error).toMatch(/proposed/)
  })

  it('starts session and returns 201', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    vi.mocked(getTaskById).mockResolvedValue({ id: 'task-1', status: 'queued' } as any)
    vi.mocked(startSession).mockResolvedValue({ id: 'sess-1', status: 'running' } as any)

    const res = await POST(postReq({ taskId: 'task-1', surface: 'local' }))
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.session.id).toBe('sess-1')
  })
})
