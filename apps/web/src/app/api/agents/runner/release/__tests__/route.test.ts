import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/lib/supabase/service', () => ({ createServiceClient: vi.fn() }))
vi.mock('@/lib/command-centre/runner-claim', async (orig) => {
  const actual = await orig<typeof import('@/lib/command-centre/runner-claim')>()
  return { ...actual, releaseClaimedTask: vi.fn() }
})
vi.mock('@/lib/command-centre/tasks', async (orig) => {
  const actual = await orig<typeof import('@/lib/command-centre/tasks')>()
  return { ...actual, appendTaskEvent: vi.fn(), getTaskById: vi.fn() }
})
vi.mock('@/lib/mission-authority/continuation', async (orig) => {
  const actual = await orig<typeof import('@/lib/mission-authority/continuation')>()
  return { ...actual, resolveMissionAuthority: vi.fn() }
})

import policy from '../../../../../../../../../scripts/nexus-runner/mission-authority.json'
import { createServiceClient } from '@/lib/supabase/service'
import { releaseClaimedTask } from '@/lib/command-centre/runner-claim'
import { appendTaskEvent, getTaskById } from '@/lib/command-centre/tasks'
import { resolveMissionAuthority } from '@/lib/mission-authority/continuation'
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

/** A legacy (non-mission) row: the release contract it had before UNI-2779 is unchanged. */
const legacyRow = { id: TASK_ID, status: 'running', claimed_by: 'mac-mini-runner', risk_level: 'low', external_ref: null, metadata: {} }
/** A delivery mission row the runner holds. */
const missionRow = { ...legacyRow, external_ref: 'delivery:request-1', metadata: { delivery: { kind: 'software_delivery' } } }
const AUTHORITY = {
  missionId: TASK_ID, intentHash: 'b'.repeat(64), intentVersion: 1, admissionReceipt: 'approval-1',
  authorityVersion: policy.schema, allowedActions: Object.keys(policy.build),
  releaseMandate: { classes: [], maxRisk: 'low' as const }, expiresAt: null, revokedAt: null,
}

const savedSecret = process.env.AGENT_EVENTS_SECRET
const savedFounder = process.env.FOUNDER_USER_ID

describe('POST /api/agents/runner/release', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.AGENT_EVENTS_SECRET = SECRET
    process.env.FOUNDER_USER_ID = 'founder-1'
    vi.mocked(createServiceClient).mockReturnValue({} as never)
    vi.mocked(getTaskById).mockResolvedValue(legacyRow as never)
    vi.mocked(resolveMissionAuthority).mockResolvedValue(AUTHORITY)
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

  it('401s on an equal-length wrong bearer secret without starting work', async () => {
    const res = await POST(req(doneBody, 'Bearer test-secreu'))
    expect(res.status).toBe(401)
    expect(createServiceClient).not.toHaveBeenCalled()
    expect(releaseClaimedTask).not.toHaveBeenCalled()
    expect(appendTaskEvent).not.toHaveBeenCalled()
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

  it('audits a software draft PR as review handoff, never completed', async () => {
    vi.mocked(releaseClaimedTask).mockResolvedValue({
      task: { id: TASK_ID, status: 'awaiting_approval', claimed_by: null },
      effectiveOutcome: 'done',
    } as never)
    const res = await POST(req(doneBody, `Bearer ${SECRET}`))
    expect(res.status).toBe(200)
    expect(appendTaskEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'status_changed',
        payload: expect.objectContaining({ outcome: 'draft_pr_opened', status: 'awaiting_approval' }),
      }),
      expect.anything(),
    )
    expect(appendTaskEvent).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: 'completed' }), expect.anything(),
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

  it('404s before any judgement when another runner holds the row', async () => {
    vi.mocked(getTaskById).mockResolvedValue({ ...legacyRow, claimed_by: 'someone-else' } as never)
    expect((await POST(req(doneBody, `Bearer ${SECRET}`))).status).toBe(404)
    expect(releaseClaimedTask).not.toHaveBeenCalled()
  })

  // UNI-2779 — the service boundary. Each of these is a report a runner with
  // bypassed PATH shims could send; the route refuses it before the row moves.
  describe('mission authority boundary', () => {
    it.each([
      ['a protected action claimed as done', { ...doneBody, action: 'merge' }],
      ['production promotion', { ...doneBody, action: 'promote_production' }],
      ['an action the policy does not map', { ...doneBody, action: 'rewrite_history' }],
      ['a bare requeue-to-ask', { taskId: TASK_ID, runnerId: 'mac-mini-runner', outcome: 'requeue', code: 'ask_founder' }],
    ])('403s %s on a mission and never releases', async (_label, body) => {
      vi.mocked(getTaskById).mockResolvedValue(missionRow as never)
      const res = await POST(req(body, `Bearer ${SECRET}`))
      expect(res.status).toBe(403)
      expect(releaseClaimedTask).not.toHaveBeenCalled()
      expect(appendTaskEvent).not.toHaveBeenCalled()
    })

    it('403s a mission done report once its authority no longer resolves', async () => {
      vi.mocked(getTaskById).mockResolvedValue(missionRow as never)
      vi.mocked(resolveMissionAuthority).mockResolvedValue(null)
      expect((await POST(req(doneBody, `Bearer ${SECRET}`))).status).toBe(403)
      expect(releaseClaimedTask).not.toHaveBeenCalled()
    })

    it('403s an explicit action on a legacy row, which holds no mission authority', async () => {
      expect((await POST(req({ ...doneBody, action: 'draft_pr' }, `Bearer ${SECRET}`))).status).toBe(403)
      expect(releaseClaimedTask).not.toHaveBeenCalled()
    })

    it('releases a mission draft PR that may() continues', async () => {
      vi.mocked(getTaskById).mockResolvedValue(missionRow as never)
      vi.mocked(releaseClaimedTask).mockResolvedValue({ task: { id: TASK_ID, status: 'awaiting_approval' }, effectiveOutcome: 'done' } as never)
      expect((await POST(req({ ...doneBody, action: 'draft_pr' }, `Bearer ${SECRET}`))).status).toBe(200)
      expect(releaseClaimedTask).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ outcome: 'done' }))
    })

    it('accepts RUNNER_BLOCKED at a legitimate boundary: records the interruption and blocks for the founder', async () => {
      vi.mocked(getTaskById).mockResolvedValue(missionRow as never)
      vi.mocked(releaseClaimedTask).mockResolvedValue({ task: { id: TASK_ID, status: 'blocked' }, effectiveOutcome: 'blocked' } as never)
      const res = await POST(req({
        taskId: TASK_ID, runnerId: 'mac-mini-runner', outcome: 'blocked',
        interruptionClass: 'LEGITIMATE_PROTECTED_BOUNDARY', reason: 'next step is merge',
      }, `Bearer ${SECRET}`))
      expect(res.status).toBe(200)
      expect(appendTaskEvent).toHaveBeenCalledWith(expect.objectContaining({
        type: 'comment',
        payload: { kind: 'interruption', class: 'LEGITIMATE_PROTECTED_BOUNDARY', source: 'mac-mini-runner', reason: 'next step is merge' },
      }), expect.anything())
      expect(releaseClaimedTask).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ outcome: 'blocked' }))
    })

    it('records a non-founder interruption class and sends the mission back to the queue, not to the founder', async () => {
      vi.mocked(getTaskById).mockResolvedValue(missionRow as never)
      vi.mocked(releaseClaimedTask).mockResolvedValue({ task: { id: TASK_ID, status: 'queued' }, effectiveOutcome: 'requeue' } as never)
      const res = await POST(req({
        taskId: TASK_ID, runnerId: 'mac-mini-runner', outcome: 'blocked', interruptionClass: 'MODEL_UNCERTAINTY', reason: 'unsure',
      }, `Bearer ${SECRET}`))
      expect(res.status).toBe(200)
      expect(releaseClaimedTask).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ outcome: 'requeue' }))
    })

    it('400s a blocked report whose class is not in the policy', async () => {
      const res = await POST(req({
        taskId: TASK_ID, runnerId: 'mac-mini-runner', outcome: 'blocked', interruptionClass: 'ASK_THE_FOUNDER', reason: 'x',
      }, `Bearer ${SECRET}`))
      expect(res.status).toBe(400)
      expect(appendTaskEvent).not.toHaveBeenCalled()
    })
  })

  it('500s (sanitised) when the release throws', async () => {
    vi.mocked(releaseClaimedTask).mockRejectedValue(new Error('db exploded'))
    const res = await POST(req(doneBody, `Bearer ${SECRET}`))
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).not.toContain('db exploded')
  })
})
