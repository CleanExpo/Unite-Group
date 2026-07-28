import { describe, expect, it, vi } from 'vitest'
import { createNexusDispatcher } from './dispatcher'
import type { LaneOrchestrator } from './lane-orchestrator'
import type { NexusTask, NexusTaskQueue } from './task-queue'
import type { Lane } from './types'

function task(overrides: Partial<NexusTask> = {}): NexusTask {
  return {
    id: 'task-1',
    laneId: 'lane-1',
    workerId: 'codex-cli',
    mission: 'build',
    status: 'running',
    createdAt: 1,
    updatedAt: 2,
    ...overrides,
  }
}

function queue(claimed: NexusTask | null) {
  const settle = vi.fn((id, input) =>
    Promise.resolve({
      ...task({ id }),
      ...input,
      mission: undefined,
    }),
  )
  return {
    value: {
      claimNext: vi.fn(() => Promise.resolve(claimed)),
      settle,
    } as unknown as NexusTaskQueue,
    settle,
  }
}

function lane(overrides: Partial<Lane> = {}): Lane {
  return {
    id: 'lane-1',
    kind: 'cli',
    backend: { kind: 'cli', tool: 'codex', account: 'openai-pro' },
    role: 'builder',
    repo: '/repo',
    worktree: '/worktree',
    branch: 'lane/lane-1',
    status: 'idle',
    ...overrides,
  }
}

function lanes(overrides: Partial<LaneOrchestrator> = {}): LaneOrchestrator {
  return {
    create: vi.fn(),
    list: vi.fn(),
    get: vi.fn(() => Promise.resolve(lane())),
    stop: vi.fn(),
    runMission: vi.fn(() => Promise.resolve(lane({ lastRunId: 'run-1' }))),
    getRun: vi.fn(),
    listRunEvents: vi.fn(),
    ...overrides,
  }
}

describe('Nexus single-worker dispatcher', () => {
  it('returns idle without invoking a lane when no task is pending', async () => {
    const q = queue(null)
    const laneOrchestrator = lanes()
    const dispatcher = createNexusDispatcher({
      queue: q.value,
      lanes: laneOrchestrator,
    })

    await expect(dispatcher.dispatchNext('codex-cli')).resolves.toEqual({
      outcome: 'idle',
      task: null,
    })
    expect(laneOrchestrator.runMission).not.toHaveBeenCalled()
  })

  it('dispatches one claimed task through the existing lane orchestrator', async () => {
    const q = queue(task())
    const laneOrchestrator = lanes()
    const dispatcher = createNexusDispatcher({
      queue: q.value,
      lanes: laneOrchestrator,
      resolveCommitSha: () => Promise.resolve('a'.repeat(40)),
    })

    await expect(dispatcher.dispatchNext('codex-cli')).resolves.toMatchObject({
      outcome: 'completed',
      task: {
        status: 'completed',
        runId: 'run-1',
        evidence: {
          runUri: 'lane-run:run-1',
          eventsUri: 'lane-events:run-1',
          commitSha: 'a'.repeat(40),
        },
      },
    })
    expect(laneOrchestrator.runMission).toHaveBeenCalledWith('lane-1', 'build')
    expect(q.settle).toHaveBeenCalledTimes(1)
  })

  it('blocks a task whose durable lane is missing', async () => {
    const q = queue(task())
    const dispatcher = createNexusDispatcher({
      queue: q.value,
      lanes: lanes({ get: vi.fn(() => Promise.resolve(null)) }),
    })

    await expect(dispatcher.dispatchNext('codex-cli')).resolves.toMatchObject({
      outcome: 'blocked',
    })
    expect(q.settle).toHaveBeenCalledWith(
      'task-1',
      expect.objectContaining({ status: 'blocked' }),
    )
  })

  it('blocks a durable task whose worker no longer matches its lane', async () => {
    const q = queue(task({ workerId: 'claude-cli' }))
    const dispatcher = createNexusDispatcher({
      queue: q.value,
      lanes: lanes(),
    })

    await expect(dispatcher.dispatchNext('claude-cli')).resolves.toMatchObject({
      outcome: 'blocked',
      task: {
        blockedReason: expect.stringMatching(/no longer matches/i),
      },
    })
  })

  it('settles a task when lane lookup fails instead of leaving it running', async () => {
    const q = queue(task())
    const dispatcher = createNexusDispatcher({
      queue: q.value,
      lanes: lanes({
        get: vi.fn(() => Promise.reject(new Error('synthetic lookup failure'))),
      }),
    })

    await expect(dispatcher.dispatchNext('codex-cli')).resolves.toMatchObject({
      outcome: 'failed',
      task: { status: 'failed' },
    })
    expect(q.settle).toHaveBeenCalledTimes(1)
  })

  it('records a bounded failure without returning secret-shaped detail', async () => {
    const q = queue(task())
    const dispatcher = createNexusDispatcher({
      queue: q.value,
      lanes: lanes({
        runMission: vi.fn(() =>
          Promise.reject(new Error('OPENAI_API_KEY=synthetic-secret-value')),
        ),
      }),
    })

    await expect(dispatcher.dispatchNext('codex-cli')).resolves.toMatchObject({
      outcome: 'failed',
      task: { blockedReason: 'OPENAI_API_KEY=[REDACTED]' },
    })
  })
})
