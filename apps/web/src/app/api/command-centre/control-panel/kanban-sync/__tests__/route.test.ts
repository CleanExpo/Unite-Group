import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockUpdate = vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ error: null }) }) }) }) })
const mockFrom = vi.fn().mockReturnValue({ update: mockUpdate })

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn(), createClient: vi.fn() }))
vi.mock('@/lib/command-centre/tasks', () => ({
  listTasks: vi.fn().mockResolvedValue([]),
  CC_TASKS_TABLE: 'cc_tasks',
}))

import { getUser, createClient } from '@/lib/supabase/server'
import { listTasks } from '@/lib/command-centre/tasks'
import { GET, POST } from '../route'

function postReq(body: object) {
  return new Request('https://app.test/api/command-centre/control-panel/kanban-sync', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  })
}

describe('/api/command-centre/control-panel/kanban-sync', () => {
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

  it('GET redacts sensitive task free text while preserving sync routing metadata', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const rawEmail = ['ops', '@', 'example.test'].join('')
    const rawBoardRef = ['BOARD', '-2026-', 'REF'].join('')
    const rawBearer = ['eyJheader', '.', 'eyJpayload', '.', 'signature'].join('')
    const rawApiAssignment = ['LINEAR_API', '_KEY=', 'lin_value_123'].join('')
    const rawPhone = ['+61 ', '412 345 678'].join('')
    const rawCard = ['card ending ', '4242'].join('')

    vi.mocked(listTasks).mockResolvedValue([
      {
        id: 'task-sensitive',
        founder_id: 'user-1',
        external_ref: null,
        queue_id: null,
        project_id: null,
        project_key: 'crm',
        title: `Follow up ${rawEmail} ${rawBoardRef}`,
        objective: `Use ${rawApiAssignment}; call ${rawPhone}; bearer ${rawBearer}; ${rawCard}`,
        priority: 'P1',
        status: 'queued',
        agent_owner: 'Margot',
        risk_level: 'high',
        execution_mode: 'advisory',
        origin: 'idea',
        dependencies: [],
        human_approval_required: true,
        evidence_path: null,
        validation_required: [],
        linear_id: null,
        preview_url: null,
        metadata: { tags: ['margot-voice'] },
        created_at: '2026-06-22T00:00:00.000Z',
        updated_at: '2026-06-22T00:01:00.000Z',
      },
    ] as any)

    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.tasks[0]).toMatchObject({
      ccTaskId: 'task-sensitive',
      idempotencyKey: 'cc-task-task-sensitive',
      lane: 'voice-intake',
      status: 'queued',
      priority: 'P1',
      assignee: 'Margot',
      tags: ['margot-voice'],
    })

    const serialized = JSON.stringify(body.tasks[0])
    expect(serialized).not.toContain(rawEmail)
    expect(serialized).not.toContain(rawBoardRef)
    expect(serialized).not.toContain(rawBearer)
    expect(serialized).not.toContain(rawApiAssignment)
    expect(serialized).not.toContain(rawPhone)
    expect(serialized).not.toContain(rawCard)
    expect(serialized).toContain('[REDACTED]')
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
