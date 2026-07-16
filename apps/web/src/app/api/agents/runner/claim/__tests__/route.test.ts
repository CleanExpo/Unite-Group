import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/lib/supabase/service', () => ({ createServiceClient: vi.fn() }))
vi.mock('@/lib/command-centre/runner-claim', async (orig) => {
  const actual = await orig<typeof import('@/lib/command-centre/runner-claim')>()
  return { ...actual, claimNextQueuedTask: vi.fn() }
})
vi.mock('@/lib/command-centre/tasks', async (orig) => {
  const actual = await orig<typeof import('@/lib/command-centre/tasks')>()
  return { ...actual, appendTaskEvent: vi.fn() }
})

import { createServiceClient } from '@/lib/supabase/service'
import { claimNextQueuedTask } from '@/lib/command-centre/runner-claim'
import { appendTaskEvent } from '@/lib/command-centre/tasks'
import { POST } from '../route'

const SECRET = 'test-secret'

function req(body: unknown, auth?: string) {
  return new Request('https://app.test/api/agents/runner/claim', {
    method: 'POST',
    headers: auth
      ? { authorization: auth, 'content-type': 'application/json' }
      : { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const validBody = { runnerId: 'mac-mini-runner' }

const savedSecret = process.env.AGENT_EVENTS_SECRET
const savedFounder = process.env.FOUNDER_USER_ID

describe('POST /api/agents/runner/claim', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.AGENT_EVENTS_SECRET = SECRET
    process.env.FOUNDER_USER_ID = 'founder-1'
    vi.mocked(createServiceClient).mockReturnValue({} as never)
  })
  afterEach(() => {
    if (savedSecret === undefined) delete process.env.AGENT_EVENTS_SECRET
    else process.env.AGENT_EVENTS_SECRET = savedSecret
    if (savedFounder === undefined) delete process.env.FOUNDER_USER_ID
    else process.env.FOUNDER_USER_ID = savedFounder
  })

  it('401s when the secret is unset (dormant by default)', async () => {
    delete process.env.AGENT_EVENTS_SECRET
    const res = await POST(req(validBody, `Bearer ${SECRET}`))
    expect(res.status).toBe(401)
    expect(claimNextQueuedTask).not.toHaveBeenCalled()
  })

  it('401s on a missing or wrong bearer token', async () => {
    expect((await POST(req(validBody))).status).toBe(401)
    expect((await POST(req(validBody, 'Bearer wrong'))).status).toBe(401)
  })

  it('503s when FOUNDER_USER_ID is not configured', async () => {
    delete process.env.FOUNDER_USER_ID
    const res = await POST(req(validBody, `Bearer ${SECRET}`))
    expect(res.status).toBe(503)
  })

  it('400s on a missing runnerId', async () => {
    const res = await POST(req({}, `Bearer ${SECRET}`))
    expect(res.status).toBe(400)
  })

  it('returns the claimed task bound to the founder and audits started (200)', async () => {
    const task = { id: 'task-1', status: 'running', claimed_by: 'mac-mini-runner' }
    vi.mocked(claimNextQueuedTask).mockResolvedValue(task as never)
    const res = await POST(req(validBody, `Bearer ${SECRET}`))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.task.id).toBe('task-1')
    expect(claimNextQueuedTask).toHaveBeenCalledWith(expect.anything(), {
      founderId: 'founder-1',
      runnerId: 'mac-mini-runner',
    })
    expect(appendTaskEvent).toHaveBeenCalledWith(
      expect.objectContaining({ taskId: 'task-1', type: 'started', actor: 'mac-mini-runner' }),
      expect.anything(),
    )
  })

  it('returns task: null on an empty queue without an audit event (200)', async () => {
    vi.mocked(claimNextQueuedTask).mockResolvedValue(null)
    const res = await POST(req(validBody, `Bearer ${SECRET}`))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.task).toBeNull()
    expect(appendTaskEvent).not.toHaveBeenCalled()
  })

  it('500s (sanitised) when the claim throws', async () => {
    vi.mocked(claimNextQueuedTask).mockRejectedValue(new Error('db exploded'))
    const res = await POST(req(validBody, `Bearer ${SECRET}`))
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).not.toContain('db exploded')
  })
})
