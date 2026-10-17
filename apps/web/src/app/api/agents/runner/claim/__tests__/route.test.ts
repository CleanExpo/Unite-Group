import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/lib/supabase/service', () => ({ createServiceClient: vi.fn() }))
vi.mock('@/lib/command-centre/runner-claim', async (orig) => {
  const actual = await orig<typeof import('@/lib/command-centre/runner-claim')>()
  return { ...actual, claimNextQueuedTask: vi.fn(), resumeOwnMission: vi.fn(), releaseClaimedTask: vi.fn() }
})
vi.mock('@/lib/command-centre/tasks', async (orig) => {
  const actual = await orig<typeof import('@/lib/command-centre/tasks')>()
  return { ...actual, appendTaskEvent: vi.fn() }
})

import { createServiceClient } from '@/lib/supabase/service'
import { claimNextQueuedTask, resumeOwnMission, releaseClaimedTask } from '@/lib/command-centre/runner-claim'
import { appendTaskEvent } from '@/lib/command-centre/tasks'
import { POST } from '../route'
import { runningCountClient } from './fixtures'

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

// A coherent attestation: armed mechanism 'job-object' requires platform win32.
const validBody = { runnerId: 'mac-mini-runner', platform: 'win32', containment: 'job-object' }

const savedSecret = process.env.AGENT_EVENTS_SECRET
const savedFounder = process.env.FOUNDER_USER_ID

describe('POST /api/agents/runner/claim', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.AGENT_EVENTS_SECRET = SECRET
    process.env.FOUNDER_USER_ID = 'founder-1'
    // A containment host must be named or the route claims nothing — see
    // route-lane-refusal.test.ts for the fail-closed case.
    process.env.MISSION_LANE_CONTAINMENT = 'job-object'
    // The runner must also be one the founder registered as contained.
    process.env.MISSION_LANE_CONTAINED_RUNNERS = 'mac-mini-runner:win32:job-object'
    // The route counts running missions to enforce maxConcurrent, so the client
    // has to answer that query. An empty result means nothing else is in flight.
    vi.mocked(createServiceClient).mockReturnValue(runningCountClient([]) as never)
    vi.mocked(resumeOwnMission).mockResolvedValue(null)
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

  it('401s on an equal-length wrong bearer secret without starting work', async () => {
    const res = await POST(req(validBody, 'Bearer test-secreu'))
    expect(res.status).toBe(401)
    expect(createServiceClient).not.toHaveBeenCalled()
    expect(claimNextQueuedTask).not.toHaveBeenCalled()
    expect(appendTaskEvent).not.toHaveBeenCalled()
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

  it('resumes its own orphaned mission ahead of the capacity check that the orphan itself fills', async () => {
    // One mission is running — the orphan. Counting it would refuse at_capacity forever.
    vi.mocked(createServiceClient).mockReturnValue(runningCountClient([{ id: 'task-1' }]) as never)
    vi.mocked(resumeOwnMission).mockResolvedValue({
      id: 'task-1', status: 'running', claimed_by: 'mac-mini-runner',
      mission: { continuation: { next_action: 'repair' }, nextStep: { execute: true, action: 'repair' } },
    } as never)
    const res = await POST(req(validBody, `Bearer ${SECRET}`))
    const body = await res.json()
    expect(body.task.mission.nextStep).toMatchObject({ execute: true, action: 'repair' })
    expect(resumeOwnMission).toHaveBeenCalledExactlyOnceWith(expect.anything(), {
      founderId: 'founder-1', runnerId: validBody.runnerId,
    })
    expect(claimNextQueuedTask).not.toHaveBeenCalled()
    expect(appendTaskEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'started', payload: expect.objectContaining({ resumed: true, next_action: 'repair' }) }),
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

  it.each([
    { taskId: 'invalid' }, { taskId: null }, { resumeOnly: true },
    { resumeOnly: 'true' }, { resumeOnly: 1 }, { resumeOnly: null },
    { taskId: 'invalid', resumeOnly: true },
  ])('rejects an invalid exact-claim selector/mode before any database access: %j', async fields => {
    const res = await POST(req({ ...validBody, ...fields }, `Bearer ${SECRET}`))
    expect(res.status).toBe(400)
    expect(createServiceClient).not.toHaveBeenCalled()
    expect(resumeOwnMission).not.toHaveBeenCalled()
    expect(claimNextQueuedTask).not.toHaveBeenCalled()
  })

  it.each([{ resumeOnly: false }, {}])('does not adopt an existing running claim for a fresh exact selector: %j', async mode => {
    const taskId = 'a0000000-0000-4000-8000-000000000001'
    const client = runningCountClient([{ id: taskId }])
    const count = vi.spyOn(client, 'from')
    vi.mocked(createServiceClient).mockReturnValue(client as never)
    vi.mocked(resumeOwnMission).mockResolvedValue({
      id: taskId, status: 'running', claimed_by: validBody.runnerId,
    } as never)

    const res = await POST(req({ ...validBody, taskId, ...mode }, `Bearer ${SECRET}`))

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ task: null, refused: 'at_capacity' })
    expect(count).toHaveBeenCalledWith('cc_tasks')
    expect(resumeOwnMission).not.toHaveBeenCalled()
    expect(claimNextQueuedTask).not.toHaveBeenCalled()
    expect(releaseClaimedTask).not.toHaveBeenCalled()
    expect(appendTaskEvent).not.toHaveBeenCalled()
  })

  it.each([{ resumeOnly: false }, {}])('returns null when a fresh exact selector cannot claim a queued task: %j', async mode => {
    const taskId = 'a0000000-0000-4000-8000-000000000001'
    // Even a stale capacity read cannot turn an existing attempt into a fresh claim.
    vi.mocked(resumeOwnMission).mockResolvedValue({
      id: taskId, status: 'running', claimed_by: validBody.runnerId,
    } as never)
    vi.mocked(claimNextQueuedTask).mockResolvedValue(null)

    const res = await POST(req({ ...validBody, taskId, ...mode, founderId: 'forged-founder' }, `Bearer ${SECRET}`))

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ task: null })
    expect(resumeOwnMission).not.toHaveBeenCalled()
    expect(claimNextQueuedTask).toHaveBeenCalledExactlyOnceWith(expect.anything(), {
      founderId: 'founder-1', runnerId: validBody.runnerId, taskId,
    })
    expect(releaseClaimedTask).not.toHaveBeenCalled()
    expect(appendTaskEvent).not.toHaveBeenCalled()
  })

  it.each([{ resumeOnly: false }, {}])('claims a fresh exact task and only resumes it with explicit read-only revalidation: %j', async mode => {
    const taskId = 'a0000000-0000-4000-8000-000000000001'
    const task = {
      id: taskId, status: 'running', claimed_by: validBody.runnerId,
      claimed_at: '2026-10-16T01:00:00.000Z',
      metadata: { delivery: { executionAssignment: { acceptedAt: '2026-10-16T01:00:00.001Z' } } },
    }
    vi.mocked(claimNextQueuedTask).mockResolvedValue(task as never)

    const initial = await POST(req({ ...validBody, taskId, ...mode }, `Bearer ${SECRET}`))

    expect(initial.status).toBe(200)
    expect(await initial.json()).toEqual({ task })
    expect(resumeOwnMission).not.toHaveBeenCalled()
    expect(claimNextQueuedTask).toHaveBeenCalledExactlyOnceWith(expect.anything(), {
      founderId: 'founder-1', runnerId: validBody.runnerId, taskId,
    })
    expect(appendTaskEvent).toHaveBeenCalledTimes(1)
    expect(appendTaskEvent).toHaveBeenCalledWith(expect.objectContaining({
      taskId, type: 'started', payload: expect.not.objectContaining({ resumed: true }),
    }), expect.anything())

    vi.mocked(resumeOwnMission).mockResolvedValue(task as never)
    const revalidated = await POST(req({ ...validBody, taskId, resumeOnly: true }, `Bearer ${SECRET}`))

    expect(revalidated.status).toBe(200)
    expect(await revalidated.json()).toEqual({ task })
    expect(resumeOwnMission).toHaveBeenCalledExactlyOnceWith(expect.anything(), {
      founderId: 'founder-1', runnerId: validBody.runnerId, taskId,
    })
    expect(claimNextQueuedTask).toHaveBeenCalledTimes(1)
    expect(appendTaskEvent).toHaveBeenCalledTimes(1)
    expect(releaseClaimedTask).not.toHaveBeenCalled()
  })

  it('does not select queued candidates when exact revalidation finds no owned running claim', async () => {
    const taskId = 'a0000000-0000-4000-8000-000000000001'
    // If the original claim was released/requeued, valid consent must not reclaim it.
    vi.mocked(claimNextQueuedTask).mockResolvedValue({ id: taskId, status: 'running' } as never)
    const res = await POST(req({ ...validBody, taskId, resumeOnly: true }, `Bearer ${SECRET}`))
    expect(await res.json()).toEqual({ task: null })
    expect(resumeOwnMission).toHaveBeenCalledWith(expect.anything(), { founderId: 'founder-1', runnerId: validBody.runnerId, taskId })
    expect(claimNextQueuedTask).not.toHaveBeenCalled()
    expect(appendTaskEvent).not.toHaveBeenCalled()
  })

  it('revalidates an existing claim without replacing its timestamps or appending another started event', async () => {
    const taskId = 'a0000000-0000-4000-8000-000000000001'
    const task = { id: taskId, status: 'running', claimed_by: validBody.runnerId, claimed_at: '2026-10-16T01:00:00.000Z', metadata: { delivery: { executionAssignment: { acceptedAt: '2026-10-16T01:00:00.001Z' } } } }
    vi.mocked(resumeOwnMission).mockResolvedValue(task as never)
    const res = await POST(req({ ...validBody, taskId, resumeOnly: true }, `Bearer ${SECRET}`))
    expect(await res.json()).toEqual({ task })
    expect(claimNextQueuedTask).not.toHaveBeenCalled()
    expect(appendTaskEvent).not.toHaveBeenCalled()
  })

  it('fails closed on an exact revalidation read error without capacity or candidate selection', async () => {
    vi.mocked(resumeOwnMission).mockRejectedValue(new Error('private read failure'))
    const client = { from: vi.fn() }
    vi.mocked(createServiceClient).mockReturnValue(client as never)
    const res = await POST(req({ ...validBody, taskId: 'a0000000-0000-4000-8000-000000000001', resumeOnly: true }, `Bearer ${SECRET}`))
    expect(res.status).toBe(500)
    expect(client.from).not.toHaveBeenCalled()
    expect(claimNextQueuedTask).not.toHaveBeenCalled()
    expect(appendTaskEvent).not.toHaveBeenCalled()
  })

  it('retains lane refusal during read-only revalidation without releasing or auditing the claim', async () => {
    const taskId = 'a0000000-0000-4000-8000-000000000001'
    vi.mocked(resumeOwnMission).mockResolvedValue({ id: taskId, status: 'running', claimed_by: validBody.runnerId, external_ref: 'voice:packet', metadata: {} } as never)
    const res = await POST(req({ ...validBody, taskId, resumeOnly: true }, `Bearer ${SECRET}`))
    expect(await res.json()).toEqual({ task: null, refused: 'risk_unclassified' })
    expect(releaseClaimedTask).not.toHaveBeenCalled()
    expect(appendTaskEvent).not.toHaveBeenCalled()
    expect(claimNextQueuedTask).not.toHaveBeenCalled()
  })

  it('500s (sanitised) when the claim throws', async () => {
    vi.mocked(claimNextQueuedTask).mockRejectedValue(new Error('db exploded'))
    const res = await POST(req(validBody, `Bearer ${SECRET}`))
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).not.toContain('db exploded')
  })
})
