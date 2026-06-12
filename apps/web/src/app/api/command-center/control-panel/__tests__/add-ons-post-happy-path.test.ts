// End-to-end contract test for POST /api/command-center/control-panel/add-ons.
//
// Exercises the actual POST handler against the founder-scoped cc_tasks model.
// getUser + the cc_tasks accessors (listTasks/createTask) are mocked at the
// module boundary. Pins:
//   1. The route's success-response contract (`ok:true`, `cc_task_id`, …).
//   2. The createTask payload — status='awaiting_approval',
//      human_approval_required=true, external_ref='cc-addon:<id>',
//      founder-scoped (founderId present, no workspace_id anywhere).
//   3. Auth + validation guards (401, 400, idempotent 'existing').

import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  getUser: vi.fn(),
}))

vi.mock('@/lib/command-centre/tasks', () => ({
  listTasks: vi.fn(),
  createTask: vi.fn(),
}))

import { getUser } from '@/lib/supabase/server'
import { listTasks, createTask } from '@/lib/command-centre/tasks'
import { POST } from '../add-ons/route'

const mockGetUser = vi.mocked(getUser)
const mockListTasks = vi.mocked(listTasks)
const mockCreateTask = vi.mocked(createTask)

function makeReq(body: unknown): Request {
  return new Request('http://localhost/api/command-center/control-panel/add-ons', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/command-center/control-panel/add-ons — happy path', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ id: 'founder-1', email: 'phill@unite-group.com' } as never)
    mockListTasks.mockResolvedValue([])
    mockCreateTask.mockImplementation(
      async (input) =>
        ({
          id: 'cc-task-uuid',
          founder_id: input.founderId,
          external_ref: input.externalRef ?? null,
          title: input.title,
          status: input.status ?? 'proposed',
          created_at: '2026-06-12T01:00:00.000Z',
        }) as never,
    )
  })

  it('returns the canonical success outcome and creates an awaiting_approval task', async () => {
    const res = await POST(makeReq({ addOnId: 'voice' }))
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body).toMatchObject({
      ok: true,
      existing: false,
      cc_task_id: 'cc-task-uuid',
      task_status: 'awaiting_approval',
    })
    expect(typeof body.task_title).toBe('string')
    expect(body.task_title).toMatch(/Approve add-on:/)

    // Founder-scoped, gated insert — no workspace_id, status awaiting_approval.
    expect(mockCreateTask).toHaveBeenCalledTimes(1)
    const input = mockCreateTask.mock.calls[0][0]
    expect(input.founderId).toBe('founder-1')
    expect(input.status).toBe('awaiting_approval')
    expect(input.humanApprovalRequired).toBe(true)
    expect(input.externalRef).toBe('cc-addon:voice')
    expect(input.priority).toBe('P1')
    expect(JSON.stringify(input)).not.toContain('workspace_id')
  })

  it('returns 401 unauthorized when there is no session', async () => {
    mockGetUser.mockResolvedValue(null as never)
    const res = await POST(makeReq({ addOnId: 'voice' }))
    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: 'unauthorized' })
    expect(mockCreateTask).not.toHaveBeenCalled()
  })

  it('returns 400 invalid_add_on for an unknown addOnId', async () => {
    const res = await POST(makeReq({ addOnId: 'does-not-exist' }))
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'invalid_add_on' })
    expect(mockCreateTask).not.toHaveBeenCalled()
  })

  it('is idempotent — returns the open task without creating a duplicate', async () => {
    mockListTasks.mockResolvedValue([
      {
        id: 'existing-task',
        external_ref: 'cc-addon:voice',
        title: 'Approve add-on: ElevenLabs voice UX',
        status: 'awaiting_approval',
        created_at: '2026-06-11T00:00:00.000Z',
      } as never,
    ])

    const res = await POST(makeReq({ addOnId: 'voice' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toMatchObject({
      ok: true,
      existing: true,
      cc_task_id: 'existing-task',
      task_status: 'awaiting_approval',
    })
    expect(mockCreateTask).not.toHaveBeenCalled()
  })
})
