import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('@/lib/command-centre/tasks', () => ({
  getTaskById: vi.fn(),
  updateTaskStatus: vi.fn(),
  appendTaskEvent: vi.fn(),
}))
vi.mock('@/lib/command-centre/approvals', () => ({ listApprovalsForTask: vi.fn() }))
vi.mock('@/lib/command-centre/validation', () => ({ getValidationSummary: vi.fn() }))

import { getUser } from '@/lib/supabase/server'
import { getTaskById, updateTaskStatus } from '@/lib/command-centre/tasks'
import { listApprovalsForTask } from '@/lib/command-centre/approvals'
import { getValidationSummary } from '@/lib/command-centre/validation'
import { GET, PATCH } from '../route'

const params = Promise.resolve({ id: 'task-1' })

function patchReq(body: object) {
  return new Request('https://app.test/api/command-centre/queue/task-1', {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

describe('GET /api/command-centre/queue/[id]', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await GET(new Request('https://app.test'), { params })
    expect(res.status).toBe(401)
  })

  it('returns 404 when task not found', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    vi.mocked(getTaskById).mockResolvedValue(null)

    const res = await GET(new Request('https://app.test'), { params })
    expect(res.status).toBe(404)
  })

  it('returns task with approvals', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    vi.mocked(getTaskById).mockResolvedValue({ id: 'task-1', status: 'queued' } as any)
    vi.mocked(listApprovalsForTask).mockResolvedValue([{ id: 'appr-1' }] as any)

    const res = await GET(new Request('https://app.test'), { params })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.task.id).toBe('task-1')
    expect(body.approvals).toHaveLength(1)
  })
})

describe('PATCH /api/command-centre/queue/[id]', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await PATCH(patchReq({ status: 'done' }), { params })
    expect(res.status).toBe(401)
  })

  it('returns 400 for invalid status', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const res = await PATCH(patchReq({ status: 'invalid' }), { params })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/status/)
  })

  it('returns 422 when done but validation gates failing', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    vi.mocked(getValidationSummary).mockResolvedValue({
      canComplete: false,
      failed: ['type-check'],
      pending: [],
      byGate: {},
    } as any)

    const res = await PATCH(patchReq({ status: 'done' }), { params })
    expect(res.status).toBe(422)
    const body = await res.json()
    expect(body.failed).toContain('type-check')
  })

  it('returns 404 when task not found', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    vi.mocked(updateTaskStatus).mockResolvedValue(null)

    const res = await PATCH(patchReq({ status: 'queued' }), { params })
    expect(res.status).toBe(404)
  })

  it('updates status and returns task', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    vi.mocked(updateTaskStatus).mockResolvedValue({ id: 'task-1', status: 'running' } as any)

    const res = await PATCH(patchReq({ status: 'running' }), { params })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.task.status).toBe('running')
  })
})
