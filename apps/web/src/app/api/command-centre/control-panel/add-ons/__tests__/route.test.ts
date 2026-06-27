import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('@/lib/command-centre/tasks', () => ({
  createTask: vi.fn().mockResolvedValue({ id: 'task-1', title: 'Approve add-on: Test', status: 'awaiting_approval', created_at: '2026-01-01' }),
  listTasks: vi.fn().mockResolvedValue([]),
}))
vi.mock('@/components/command-center/control-panel/control-panel-data', () => ({
  ADD_ON_GATES: [
    { id: 'test-addon', label: 'Test Add-On', category: 'ai', state: 'inactive', approval: 'founder_only' },
  ],
}))
vi.mock('../_cc-task-shape', () => ({
  ADD_ON_APPROVAL_STATUS: 'awaiting_approval',
  addOnExternalRef: vi.fn().mockReturnValue('cc-addon:test-addon'),
}))

import { getUser } from '@/lib/supabase/server'
import { createTask } from '@/lib/command-centre/tasks'
import { POST } from '../route'

function req(body: object) {
  return new Request('https://app.test/api/command-centre/control-panel/add-ons', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  })
}

describe('POST /api/command-centre/control-panel/add-ons', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when unauthorized', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await POST(req({ addOnId: 'test-addon' }))
    expect(res.status).toBe(401)
  })

  it('returns 400 when addOnId is unknown', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1', email: 'f@test.com' } as any)
    const res = await POST(req({ addOnId: 'unknown-addon' }))
    expect(res.status).toBe(400)
  })

  it('creates task and returns ok', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1', email: 'f@test.com' } as any)
    const res = await POST(req({ addOnId: 'test-addon' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.existing).toBe(false)
    expect(body.cc_task_id).toBe('task-1')
  })

  it('does not store the requester email in the approval task objective', async () => {
    const requesterEmail = ['founder', '@', 'example.test'].join('')
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1', email: requesterEmail } as any)

    const res = await POST(req({ addOnId: 'test-addon' }))

    expect(res.status).toBe(200)
    const createInput = vi.mocked(createTask).mock.calls[0]?.[0]
    expect(createInput?.founderId).toBe('user-1')
    expect(createInput?.objective).toContain('Requested by: authenticated founder')
    expect(createInput?.objective).not.toContain(requesterEmail)
  })
})
