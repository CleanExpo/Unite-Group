import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('@/lib/command-centre/tasks', () => ({ getTaskById: vi.fn() }))
vi.mock('@/lib/command-centre/approvals', () => ({
  applyApproval: vi.fn().mockResolvedValue({ taskId: 'task-1', decision: 'approve' }),
}))

import { getUser } from '@/lib/supabase/server'
import { getTaskById } from '@/lib/command-centre/tasks'
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
})
