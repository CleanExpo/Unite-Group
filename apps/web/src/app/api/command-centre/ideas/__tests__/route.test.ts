import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('@/lib/command-centre/tasks', () => ({
  createTask: vi.fn(),
  listTasks: vi.fn(),
  appendTaskEvent: vi.fn(),
  addEvidenceRecord: vi.fn(),
}))
vi.mock('@/lib/command-centre/registry', () => ({ getProjects: vi.fn() }))
vi.mock('@/lib/obsidian/evidence', () => ({ writeEvidence: vi.fn() }))

import { getUser } from '@/lib/supabase/server'
import { createTask, listTasks, appendTaskEvent } from '@/lib/command-centre/tasks'
import { writeEvidence } from '@/lib/obsidian/evidence'
import { POST } from '../route'

function postReq(body: object) {
  return new Request('https://app.test/api/command-centre/ideas', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

describe('POST /api/command-centre/ideas', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: an empty Proposed lane — dedup finds nothing.
    vi.mocked(listTasks).mockResolvedValue([])
  })

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await POST(postReq({ idea: 'Build a new feature' }))
    expect(res.status).toBe(401)
  })

  it('returns 400 when idea is missing', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const res = await POST(postReq({ idea: '  ' }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/idea/)
  })

  it('creates task and returns 201', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const task = { id: 'task-1', title: 'Build a new feature', status: 'proposed' }
    vi.mocked(createTask).mockResolvedValue(task as any)
    vi.mocked(writeEvidence).mockResolvedValue({ relativePath: 'vault/brief.md' } as any)
    vi.mocked(appendTaskEvent).mockResolvedValue(undefined as any)

    const res = await POST(postReq({ idea: 'Build a new feature' }))
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.task.id).toBe('task-1')
    expect(body.evidencePath).toBe('vault/brief.md')
  })

  it('returns 500 when createTask throws', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    vi.mocked(createTask).mockRejectedValue(new Error('DB error'))

    const res = await POST(postReq({ idea: 'Some idea' }))
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBe('Failed to create idea task') // sanitised — raw error not leaked
    expect(body.error).not.toContain('DB error')
  })

  // UNI-2378 E2E finding 4 — resubmitting the same idea must not mint a second
  // proposed task.
  it('returns the existing proposed task (200, deduplicated) for a resubmitted idea', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const existing = {
      id: 'task-1',
      origin: 'idea',
      status: 'proposed',
      objective: 'Set up the  MacBook \n as a build agent',
      evidence_path: 'vault/brief.md',
    }
    vi.mocked(listTasks).mockResolvedValue([existing] as any)

    const res = await POST(postReq({ idea: 'set up the MacBook as a build agent' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.task.id).toBe('task-1')
    expect(body.deduplicated).toBe(true)
    expect(createTask).not.toHaveBeenCalled()
    // Dedup is scoped to the Proposed lane only.
    expect(listTasks).toHaveBeenCalledWith(
      expect.objectContaining({ founderId: 'user-1', status: 'proposed' }),
    )
  })

  it('does not dedup against proposed tasks with a different objective', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    vi.mocked(listTasks).mockResolvedValue([
      { id: 'task-1', origin: 'idea', status: 'proposed', objective: 'A different idea entirely' },
    ] as any)
    const task = { id: 'task-2', title: 'Build a new feature', status: 'proposed' }
    vi.mocked(createTask).mockResolvedValue(task as any)

    const res = await POST(postReq({ idea: 'Build a new feature' }))
    expect(res.status).toBe(201)
    expect(createTask).toHaveBeenCalled()
  })

  it('still creates the task when the dedup read fails (best-effort)', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    vi.mocked(listTasks).mockRejectedValue(new Error('read failed'))
    const task = { id: 'task-3', title: 'Some idea', status: 'proposed' }
    vi.mocked(createTask).mockResolvedValue(task as any)

    const res = await POST(postReq({ idea: 'Some idea' }))
    expect(res.status).toBe(201)
    expect(createTask).toHaveBeenCalled()
  })
})
