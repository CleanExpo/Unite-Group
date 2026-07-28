import { describe, expect, it, vi } from 'vitest'
import { createNexusDispatcher } from './dispatcher'
import { createBoundedTaskAuthority } from './task-queue'
import type { LaneOrchestrator } from './lane-orchestrator'
import type { NexusTask, NexusTaskQueue } from './task-queue'
import type { Lane, LaneRun, LaneRunEvent } from './types'

function task(overrides: Partial<NexusTask> = {}): NexusTask {
  return {
    id: 'task-1',
    laneId: 'lane-1',
    workerId: 'codex-cli',
    mission: 'build',
    status: 'running',
    createdAt: 1,
    updatedAt: 2,
    authority: createBoundedTaskAuthority(1),
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
    getRun: vi.fn(() =>
      Promise.resolve({
        id: 'run-1',
        laneId: 'lane-1',
        machineId: 'test-machine',
        status: 'succeeded',
        attempt: 1,
        startedAt: 3,
        finishedAt: 4,
      } satisfies LaneRun),
    ),
    listRunEvents: vi.fn(() =>
      Promise.resolve([
        {
          runId: 'run-1',
          laneId: 'lane-1',
          sequence: 1,
          occurredAt: 3,
          type: 'lifecycle',
          message: 'Run started',
        },
        {
          runId: 'run-1',
          laneId: 'lane-1',
          sequence: 2,
          occurredAt: 4,
          type: 'lifecycle',
          message: 'Run succeeded',
        },
      ] satisfies Array<LaneRunEvent>),
    ),
    ...overrides,
  }
}

function verifiedChangedWorktree() {
  return vi
    .fn()
    .mockResolvedValueOnce({ commitSha: 'a'.repeat(40), clean: true })
    .mockResolvedValueOnce({ commitSha: 'b'.repeat(40), clean: true })
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
      resolveWorktreeState: verifiedChangedWorktree(),
    })

    await expect(dispatcher.dispatchNext('codex-cli')).resolves.toMatchObject({
      outcome: 'completed',
      task: {
        status: 'completed',
        runId: 'run-1',
        evidence: {
          runUri: 'lane-run:run-1',
          eventsUri: 'lane-events:run-1',
          commitSha: 'b'.repeat(40),
        },
      },
    })
    expect(laneOrchestrator.runMission).toHaveBeenCalledWith(
      'lane-1',
      expect.stringMatching(
        /NEXUS BOUNDED NON-PRODUCTION EXECUTION[\s\S]*Prohibited actions:[\s\S]*\[PRIVATE TASK\]\nbuild/,
      ),
    )
    expect(laneOrchestrator.getRun).toHaveBeenCalledWith('run-1')
    expect(laneOrchestrator.listRunEvents).toHaveBeenCalledWith('run-1')
    expect(q.settle).toHaveBeenCalledTimes(1)
  })

  it('blocks a claimed task without valid bounded authority', async () => {
    const q = queue(
      task({
        authority: {
          ...createBoundedTaskAuthority(1),
          prohibitedActions: [],
        },
      }),
    )
    const laneOrchestrator = lanes()
    const dispatcher = createNexusDispatcher({
      queue: q.value,
      lanes: laneOrchestrator,
    })

    await expect(dispatcher.dispatchNext('codex-cli')).resolves.toMatchObject({
      outcome: 'blocked',
      task: {
        blockedReason: expect.stringMatching(/bounded execution authority/i),
      },
    })
    expect(laneOrchestrator.get).not.toHaveBeenCalled()
    expect(laneOrchestrator.runMission).not.toHaveBeenCalled()
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
      resolveWorktreeState: () =>
        Promise.resolve({ commitSha: 'a'.repeat(40), clean: true }),
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

  it('blocks dispatch when the assigned worktree is not a verified clean baseline', async () => {
    const q = queue(task())
    const laneOrchestrator = lanes()
    const dispatcher = createNexusDispatcher({
      queue: q.value,
      lanes: laneOrchestrator,
      resolveWorktreeState: () =>
        Promise.resolve({ commitSha: 'a'.repeat(40), clean: false }),
    })

    await expect(dispatcher.dispatchNext('codex-cli')).resolves.toMatchObject({
      outcome: 'blocked',
      task: { blockedReason: expect.stringMatching(/clean baseline/i) },
    })
    expect(laneOrchestrator.runMission).not.toHaveBeenCalled()
  })

  it('blocks completion when the run does not create a new clean commit', async () => {
    const q = queue(task())
    const dispatcher = createNexusDispatcher({
      queue: q.value,
      lanes: lanes(),
      resolveWorktreeState: vi
        .fn()
        .mockResolvedValue({ commitSha: 'a'.repeat(40), clean: true }),
    })

    await expect(dispatcher.dispatchNext('codex-cli')).resolves.toMatchObject({
      outcome: 'blocked',
      task: {
        status: 'blocked',
        runId: 'run-1',
        blockedReason: expect.stringMatching(/completion evidence/i),
      },
    })
  })

  it('completes a Hermes gateway run with clean unchanged worktree evidence', async () => {
    const gatewayLane = lane({
      kind: 'gateway',
      backend: {
        kind: 'gateway',
        provider: 'openrouter',
        model: 'bounded-model',
      },
    })
    const q = queue(task({ workerId: 'hermes-gateway' }))
    const dispatcher = createNexusDispatcher({
      queue: q.value,
      lanes: lanes({
        get: vi.fn(() => Promise.resolve(gatewayLane)),
        runMission: vi.fn(() =>
          Promise.resolve({ ...gatewayLane, lastRunId: 'run-1' }),
        ),
      }),
      resolveWorktreeState: vi
        .fn()
        .mockResolvedValue({ commitSha: 'a'.repeat(40), clean: true }),
    })

    await expect(
      dispatcher.dispatchNext('hermes-gateway'),
    ).resolves.toMatchObject({
      outcome: 'completed',
      task: {
        status: 'completed',
        runId: 'run-1',
        evidence: {
          runUri: 'lane-run:run-1',
          eventsUri: 'lane-events:run-1',
        },
      },
    })
    const settledEvidence = q.settle.mock.calls[0]?.[1]?.evidence
    expect(settledEvidence).not.toHaveProperty('commitSha')
  })

  it('blocks a Hermes gateway run when the final worktree is dirty', async () => {
    const gatewayLane = lane({
      kind: 'gateway',
      backend: {
        kind: 'gateway',
        provider: 'openrouter',
        model: 'bounded-model',
      },
    })
    const q = queue(task({ workerId: 'hermes-gateway' }))
    const dispatcher = createNexusDispatcher({
      queue: q.value,
      lanes: lanes({
        get: vi.fn(() => Promise.resolve(gatewayLane)),
        runMission: vi.fn(() =>
          Promise.resolve({ ...gatewayLane, lastRunId: 'run-1' }),
        ),
      }),
      resolveWorktreeState: vi
        .fn()
        .mockResolvedValueOnce({ commitSha: 'a'.repeat(40), clean: true })
        .mockResolvedValueOnce({ commitSha: 'a'.repeat(40), clean: false }),
    })

    await expect(
      dispatcher.dispatchNext('hermes-gateway'),
    ).resolves.toMatchObject({
      outcome: 'blocked',
      task: {
        status: 'blocked',
        blockedReason: expect.stringMatching(/completion evidence/i),
      },
    })
  })

  it('blocks completion when the durable run and lifecycle evidence disagree', async () => {
    const q = queue(task())
    const dispatcher = createNexusDispatcher({
      queue: q.value,
      lanes: lanes({
        getRun: vi.fn(() => Promise.resolve(null)),
        listRunEvents: vi.fn(() => Promise.resolve([])),
      }),
      resolveWorktreeState: verifiedChangedWorktree(),
    })

    await expect(dispatcher.dispatchNext('codex-cli')).resolves.toMatchObject({
      outcome: 'blocked',
      task: {
        status: 'blocked',
        blockedReason: expect.stringMatching(/completion evidence/i),
      },
    })
  })

  it('records mission-blind failures even when a worker echoes the private mission', async () => {
    const privateMission = 'private-customer-plan-9274'
    const q = queue(task({ mission: privateMission }))
    const dispatcher = createNexusDispatcher({
      queue: q.value,
      lanes: lanes({
        runMission: vi.fn(() =>
          Promise.reject(new Error(`Worker rejected ${privateMission}`)),
        ),
      }),
      resolveWorktreeState: () =>
        Promise.resolve({ commitSha: 'a'.repeat(40), clean: true }),
    })

    const result = await dispatcher.dispatchNext('codex-cli')
    expect(result).toMatchObject({
      outcome: 'failed',
      task: {
        blockedReason:
          'Worker execution failed; inspect the redacted lane run evidence',
      },
    })
    expect(JSON.stringify(result)).not.toContain(privateMission)
  })
})
