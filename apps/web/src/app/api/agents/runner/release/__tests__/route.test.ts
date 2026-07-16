import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/lib/supabase/service', () => ({ createServiceClient: vi.fn() }))
vi.mock('@/lib/command-centre/runner-claim', async (orig) => {
  const actual = await orig<typeof import('@/lib/command-centre/runner-claim')>()
  return { ...actual, releaseClaimedTask: vi.fn() }
})
vi.mock('@/lib/command-centre/tasks', async (orig) => {
  const actual = await orig<typeof import('@/lib/command-centre/tasks')>()
  return { ...actual, appendTaskEvent: vi.fn() }
})

import { createServiceClient } from '@/lib/supabase/service'
import { releaseClaimedTask } from '@/lib/command-centre/runner-claim'
import { appendTaskEvent } from '@/lib/command-centre/tasks'
import { POST } from '../route'

const SECRET = 'test-secret'
const TASK_ID = '4f8a2c1e-6f6d-4c3a-9a2b-1e5d7c9b0a3f'

function req(body: unknown, auth?: string) {
  return new Request('https://app.test/api/agents/runner/release', {
    method: 'POST',
    headers: auth
      ? { authorization: auth, 'content-type': 'application/json' }
      : { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const doneBody = {
  taskId: TASK_ID,
  runnerId: 'mac-mini-runner',
  outcome: 'done',
  prRef: 'https://github.com/CleanExpo/Unite-Group/pull/900',
}

const savedSecret = process.env.AGENT_EVENTS_SECRET
const savedFounder = process.env.FOUNDER_USER_ID

describe('POST /api/agents/runner/release', () => {
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
    const res = await POST(req(doneBody, `Bearer ${SECRET}`))
    expect(res.status).toBe(401)
    expect(releaseClaimedTask).not.toHaveBeenCalled()
  })

  it('401s on a missing or wrong bearer token', async () => {
    expect((await POST(req(doneBody))).status).toBe(401)
    expect((await POST(req(doneBody, 'Bearer wrong'))).status).toBe(401)
  })

  it('503s when FOUNDER_USER_ID is not configured', async () => {
    delete process.env.FOUNDER_USER_ID
    const res = await POST(req(doneBody, `Bearer ${SECRET}`))
    expect(res.status).toBe(503)
  })

  it('400s on a bad outcome or non-uuid task id', async () => {
    expect(
      (await POST(req({ ...doneBody, outcome: 'nope' }, `Bearer ${SECRET}`))).status,
    ).toBe(400)
    expect(
      (await POST(req({ ...doneBody, taskId: 'not-a-uuid' }, `Bearer ${SECRET}`))).status,
    ).toBe(400)
  })

  it('releases done, stores the PR ref, audits completed (200)', async () => {
    const task = { id: TASK_ID, status: 'done' }
    vi.mocked(releaseClaimedTask).mockResolvedValue({ task, effectiveOutcome: 'done' } as never)
    const res = await POST(req(doneBody, `Bearer ${SECRET}`))
    expect(res.status).toBe(200)
    expect(releaseClaimedTask).toHaveBeenCalledWith(expect.anything(), {
      founderId: 'founder-1',
      taskId: TASK_ID,
      runnerId: 'mac-mini-runner',
      outcome: 'done',
      prRef: doneBody.prRef,
    })
    expect(appendTaskEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        taskId: TASK_ID,
        type: 'completed',
        payload: expect.objectContaining({ outcome: 'done', pr_ref: doneBody.prRef }),
      }),
      expect.anything(),
    )
  })

  it('audits a requeue as status_changed with its code', async () => {
    vi.mocked(releaseClaimedTask).mockResolvedValue({
      task: { id: TASK_ID, status: 'queued' },
      effectiveOutcome: 'requeue',
    } as never)
    const res = await POST(
      req(
        { taskId: TASK_ID, runnerId: 'mac-mini-runner', outcome: 'requeue', code: 'scope_creep' },
        `Bearer ${SECRET}`,
      ),
    )
    expect(res.status).toBe(200)
    expect(appendTaskEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'status_changed',
        payload: expect.objectContaining({ outcome: 'requeue', code: 'scope_creep' }),
      }),
      expect.anything(),
    )
  })

  // UNI-2398 — a capped requeue is released as 'failed' (UNI-2396); the audit
  // event must carry the EFFECTIVE outcome, never a ghost 'requeue'.
  it('audits the effective outcome when a capped requeue is downgraded to failed', async () => {
    vi.mocked(releaseClaimedTask).mockResolvedValue({
      task: { id: TASK_ID, status: 'failed' },
      effectiveOutcome: 'failed',
    } as never)
    const res = await POST(
      req(
        { taskId: TASK_ID, runnerId: 'mac-mini-runner', outcome: 'requeue', code: 'scope_creep' },
        `Bearer ${SECRET}`,
      ),
    )
    expect(res.status).toBe(200)
    expect(appendTaskEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'failed',
        payload: expect.objectContaining({ outcome: 'failed', code: 'scope_creep' }),
      }),
      expect.anything(),
    )
    // no status_changed/'requeue' event may be written for a downgraded release
    expect(appendTaskEvent).not.toHaveBeenCalledWith(
      expect.objectContaining({ payload: expect.objectContaining({ outcome: 'requeue' }) }),
      expect.anything(),
    )
  })

  it('404s honestly when no matching claimed running task exists', async () => {
    vi.mocked(releaseClaimedTask).mockResolvedValue({ task: null, effectiveOutcome: 'done' } as never)
    const res = await POST(req(doneBody, `Bearer ${SECRET}`))
    expect(res.status).toBe(404)
    expect(appendTaskEvent).not.toHaveBeenCalled()
  })

  it('500s (sanitised) when the release throws', async () => {
    vi.mocked(releaseClaimedTask).mockRejectedValue(new Error('db exploded'))
    const res = await POST(req(doneBody, `Bearer ${SECRET}`))
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).not.toContain('db exploded')
  })
})
