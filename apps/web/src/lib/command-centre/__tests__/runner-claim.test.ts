import { describe, it, expect, vi } from 'vitest'
import {
  claimNextQueuedTask,
  releaseClaimedTask,
  buildRunnerStatusEvent,
  buildRunnerHeartbeat,
  RUNNER_AGENT_NAME,
  type RunnerClaimClientLike,
} from '../runner-claim'

// A programmable mock that records every update's values + filters and returns
// scripted results: first the candidate select, then one result per update.
function mockClient(candidates: Array<{ id: string }>, updateResults: unknown[][]) {
  const updates: Array<{ values: Record<string, unknown>; filters: Array<[string, unknown]> }> = []
  let updateCall = 0

  const client: RunnerClaimClientLike = {
    from: () => ({
      select: () => {
        const chain = {
          eq: () => chain,
          order: () => chain,
          limit: () => Promise.resolve({ data: candidates, error: null }),
        }
        return chain
      },
      update: (values: Record<string, unknown>) => {
        const filters: Array<[string, unknown]> = []
        const chain = {
          eq: (column: string, value: unknown) => {
            filters.push([column, value])
            return chain
          },
          select: () => {
            updates.push({ values, filters })
            const result = updateResults[updateCall] ?? []
            updateCall += 1
            return Promise.resolve({ data: result, error: null })
          },
        }
        return chain
      },
    }),
  }

  return { client, updates }
}

describe('claimNextQueuedTask', () => {
  it('claims the first candidate with a status-guarded conditional update', async () => {
    const row = { id: 't1', status: 'running', claimed_by: 'runner-a' }
    const { client, updates } = mockClient([{ id: 't1' }], [[row]])

    const claimed = await claimNextQueuedTask(client, { founderId: 'f1', runnerId: 'runner-a' })

    expect(claimed).toEqual(row)
    expect(updates).toHaveLength(1)
    expect(updates[0].values.status).toBe('running')
    expect(updates[0].values.claimed_by).toBe('runner-a')
    expect(updates[0].values.claimed_at).toEqual(expect.any(String))
    // the atomic guard: the update filters on status='queued'
    expect(updates[0].filters).toContainEqual(['status', 'queued'])
    expect(updates[0].filters).toContainEqual(['founder_id', 'f1'])
  })

  it('falls through to the next candidate when a race is lost (zero rows)', async () => {
    const row = { id: 't2', status: 'running', claimed_by: 'runner-a' }
    const { client, updates } = mockClient([{ id: 't1' }, { id: 't2' }], [[], [row]])

    const claimed = await claimNextQueuedTask(client, { founderId: 'f1', runnerId: 'runner-a' })

    expect(claimed).toEqual(row)
    expect(updates).toHaveLength(2)
  })

  it('returns null when the queue is empty', async () => {
    const { client, updates } = mockClient([], [])
    const claimed = await claimNextQueuedTask(client, { founderId: 'f1', runnerId: 'runner-a' })
    expect(claimed).toBeNull()
    expect(updates).toHaveLength(0)
  })

  it('returns null when every candidate is lost to races', async () => {
    const { client } = mockClient([{ id: 't1' }, { id: 't2' }], [[], []])
    const claimed = await claimNextQueuedTask(client, { founderId: 'f1', runnerId: 'runner-a' })
    expect(claimed).toBeNull()
  })

  it('throws on a candidate-query error', async () => {
    const client: RunnerClaimClientLike = {
      from: () => ({
        select: () => {
          const chain = {
            eq: () => chain,
            order: () => chain,
            limit: () => Promise.resolve({ data: null, error: { message: 'boom' } }),
          }
          return chain
        },
        update: vi.fn() as never,
      }),
    }
    await expect(
      claimNextQueuedTask(client, { founderId: 'f1', runnerId: 'runner-a' }),
    ).rejects.toThrow(/candidates failed/)
  })
})

describe('releaseClaimedTask', () => {
  it('releases done with the claimant guard and stores the PR ref', async () => {
    const row = { id: 't1', status: 'done' }
    const { client, updates } = mockClient([], [[row]])

    const released = await releaseClaimedTask(client, {
      founderId: 'f1',
      taskId: 't1',
      runnerId: 'runner-a',
      outcome: 'done',
      prRef: 'https://github.com/CleanExpo/Unite-Group/pull/900',
    })

    expect(released).toEqual(row)
    expect(updates[0].values.status).toBe('done')
    expect(updates[0].values.preview_url).toContain('/pull/900')
    // only the claimant can release, and only from running
    expect(updates[0].filters).toContainEqual(['claimed_by', 'runner-a'])
    expect(updates[0].filters).toContainEqual(['status', 'running'])
  })

  it('requeue clears the claim columns so the task is claimable again', async () => {
    const row = { id: 't1', status: 'queued' }
    const { client, updates } = mockClient([], [[row]])

    await releaseClaimedTask(client, {
      founderId: 'f1',
      taskId: 't1',
      runnerId: 'runner-a',
      outcome: 'requeue',
    })

    expect(updates[0].values.status).toBe('queued')
    expect(updates[0].values.claimed_by).toBeNull()
    expect(updates[0].values.claimed_at).toBeNull()
  })

  it('returns null when no matching running row is claimed by this runner', async () => {
    const { client } = mockClient([], [[]])
    const released = await releaseClaimedTask(client, {
      founderId: 'f1',
      taskId: 't1',
      runnerId: 'runner-b',
      outcome: 'failed',
    })
    expect(released).toBeNull()
  })
})

describe('runner event builders (UNI-2384 taxonomy)', () => {
  it('builds a status event with the verb in tool_name and a code in target', () => {
    const event = buildRunnerStatusEvent({
      verb: 'aborted',
      taskId: 'task-9',
      sessionId: 'run-1',
      target: 'scope_creep',
    })
    expect(event).toEqual({
      sessionId: 'run-1',
      agentName: RUNNER_AGENT_NAME,
      surface: 'claude-code',
      planKey: 'task-9',
      eventType: 'status',
      toolName: 'aborted',
      target: 'scope_creep',
    })
  })

  it('never carries prose fields — only the fixed redacted keys exist', () => {
    const event = buildRunnerStatusEvent({ verb: 'claimed', taskId: 'task-9' })
    expect(Object.keys(event).sort()).toEqual(
      ['agentName', 'eventType', 'planKey', 'sessionId', 'surface', 'target', 'toolName'].sort(),
    )
  })

  it('builds a heartbeat bound to the run session', () => {
    expect(buildRunnerHeartbeat('run-1')).toEqual({
      sessionId: 'run-1',
      agentName: RUNNER_AGENT_NAME,
      surface: 'claude-code',
      eventType: 'heartbeat',
    })
  })
})
