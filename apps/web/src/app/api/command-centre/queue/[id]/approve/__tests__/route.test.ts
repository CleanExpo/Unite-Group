import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('@/lib/command-centre/tasks', () => ({ getTaskById: vi.fn() }))
vi.mock('@/lib/command-centre/approvals', () => ({
  applyApproval: vi.fn().mockResolvedValue({ taskId: 'task-1', decision: 'approve' }),
  // Real decision→status mapping (pure); the route uses it to gate the approval.
  decisionToStatus: (d: string) =>
    d === 'approve' ? 'queued' : d === 'reject' ? 'failed' : d === 'defer' ? 'blocked' : null,
}))

import { getUser } from '@/lib/supabase/server'
import { getTaskById } from '@/lib/command-centre/tasks'
import { applyApproval } from '@/lib/command-centre/approvals'
import { POST } from '../route'

const params = { params: Promise.resolve({ id: 'task-1' }) }

function req(body: object) {
  return new Request('https://app.test/api/command-centre/queue/task-1/approve', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  })
}

describe('POST /api/command-centre/queue/[id]/approve', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when unauthorized', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await POST(req({ decision: 'approve' }), params)
    expect(res.status).toBe(401)
  })

  it('returns 400 when decision is invalid', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const res = await POST(req({ decision: 'invalid' }), params)
    expect(res.status).toBe(400)
  })

  it('returns 404 when task not found', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    vi.mocked(getTaskById).mockResolvedValue(null)
    const res = await POST(req({ decision: 'approve' }), params)
    expect(res.status).toBe(404)
  })

  it('returns 201 on success', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    vi.mocked(getTaskById).mockResolvedValue({ id: 'task-1', status: 'awaiting_approval' } as any)
    const res = await POST(req({ decision: 'approve' }), params)
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.decision).toBe('approve')
  })

  it('approves a proposed task (matrix-legal proposed → queued)', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    vi.mocked(getTaskById).mockResolvedValue({ id: 'task-1', status: 'proposed' } as any)
    const res = await POST(req({ decision: 'approve' }), params)
    expect(res.status).toBe(201)
    expect(applyApproval).toHaveBeenCalled()
  })

  it.each(['done', 'failed', 'running', 'blocked'])(
    'REJECTS approving a %s task back to queued (UNI-2417 resurrection guard)',
    async (status) => {
      vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
      vi.mocked(getTaskById).mockResolvedValue({ id: 'task-1', status } as any)
      const res = await POST(req({ decision: 'approve' }), params)
      expect(res.status).toBe(409)
      const body = await res.json()
      expect(body.from).toBe(status)
      expect(body.to).toBe('queued')
      // The illegal promotion must never reach the write path.
      expect(applyApproval).not.toHaveBeenCalled()
    },
  )

  it('allows an edit decision on any status (no status change)', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    vi.mocked(getTaskById).mockResolvedValue({ id: 'task-1', status: 'done' } as any)
    const res = await POST(req({ decision: 'edit' }), params)
    expect(res.status).toBe(201)
    expect(applyApproval).toHaveBeenCalled()
  })

  it('returns 409 when the task status changed under a concurrent write (UNI-2436 TOCTOU)', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    vi.mocked(getTaskById).mockResolvedValue({ id: 'task-1', status: 'awaiting_approval' } as any)
    // The guarded write lost the race: applyApproval reports a conflict.
    vi.mocked(applyApproval).mockResolvedValueOnce({ conflict: true, approval: {}, task: null } as any)
    const res = await POST(req({ decision: 'approve' }), params)
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.from).toBe('awaiting_approval')
    expect(body.to).toBe('queued')
  })
})
