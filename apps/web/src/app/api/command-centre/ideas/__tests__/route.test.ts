import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('@/lib/command-centre/tasks', () => ({
  createTask: vi.fn(),
  appendTaskEvent: vi.fn(),
  addEvidenceRecord: vi.fn(),
}))
vi.mock('@/lib/command-centre/registry', () => ({ getProjects: vi.fn() }))
vi.mock('@/lib/obsidian/evidence', () => ({ writeEvidence: vi.fn() }))

import { getUser } from '@/lib/supabase/server'
import { createTask, appendTaskEvent } from '@/lib/command-centre/tasks'
import { writeEvidence } from '@/lib/obsidian/evidence'
import { POST } from '../route'

function postReq(body: object) {
  return new Request('https://app.test/api/command-centre/ideas', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

describe('POST /api/command-centre/ideas', () => {
  beforeEach(() => vi.clearAllMocks())

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
    expect(body.error).toBe('DB error')
  })
})
