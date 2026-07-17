import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createLaneOrchestrator } from './lane-orchestrator'
import { StopNotAcknowledgedError } from './adapter'
import type { LaneAdapter } from './adapter'
import type { WorktreeManager } from './worktree-manager'
import type { CreateLaneInput, Lane } from './types'

let tempRoot = ''

beforeEach(async () => {
  tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'lanes-run-'))
})
afterEach(async () => {
  await fs.rm(tempRoot, { recursive: true, force: true })
})

const noopWorktrees: WorktreeManager = {
  async create(_repo, laneId) {
    return { worktree: `/wt/${laneId}`, branch: `lane/${laneId}` }
  },
  async remove() {},
}

const gatewayInput: CreateLaneInput = {
  kind: 'gateway',
  backend: { kind: 'gateway', provider: 'minimax', model: 'm' },
  role: 'builder',
  repo: '/r',
}
const cliInput: CreateLaneInput = {
  kind: 'cli',
  backend: { kind: 'cli', tool: 'claude-code', account: 'max-1' },
  role: 'builder',
  repo: '/r',
}

function orch(
  adapters: { gateway?: LaneAdapter; cli?: LaneAdapter } = {},
  idgen?: () => string,
) {
  return createLaneOrchestrator({
    registryPath: path.join(tempRoot, 'lanes.jsonl'),
    worktrees: noopWorktrees,
    adapters,
    idgen,
    // These tests exercise run-mission, not availability gating. Inject an
    // always-available check so they don't depend on real ~/.hermes/accounts
    // (the default check now fs-probes per #590 / the shared-token fix).
    isBackendAvailable: () => true,
  })
}

describe('LaneOrchestrator.runMission', () => {
  it('runs a gateway lane and records output, returning to idle', async () => {
    const gateway: LaneAdapter = {
      async run(_lane, mission) {
        return { output: `done:${mission}` }
      },
    }
    const o = orch({ gateway }, () => 'l1')
    await o.create(gatewayInput)
    const lane = await o.runMission('l1', 'build x')
    expect(lane.status).toBe('idle')
    expect(lane.lastOutput).toBe('done:build x')
    expect(lane.mission).toBe('build x')
  })

  it.each([{}, 42, '   ', 'x'.repeat(16_001)])(
    'rejects malformed missions before writing the lane ledger: %o',
    async (mission) => {
      const gateway = {
        run: vi.fn().mockResolvedValue({ output: 'should not run' }),
      }
      const o = orch({ gateway }, () => 'mission-boundary-lane')
      await o.create(gatewayInput)

      await expect(
        o.runMission('mission-boundary-lane', mission as string),
      ).rejects.toThrow(/valid mission/i)
      expect(gateway.run).not.toHaveBeenCalled()
      const [persisted] = await o.list()
      expect(persisted).toMatchObject({
        id: 'mission-boundary-lane',
        status: 'idle',
      })
      expect(persisted).not.toHaveProperty('mission')
    },
  )

  it('runs a cli lane through the cli adapter', async () => {
    const cli: LaneAdapter = {
      async run() {
        return { output: 'cli-done' }
      },
    }
    const o = orch({ cli }, () => 'l4')
    await o.create(cliInput)
    const lane = await o.runMission('l4', 'x')
    expect(lane.status).toBe('idle')
    expect(lane.lastOutput).toBe('cli-done')
  })

  it('persists completed run identity and monotonic lifecycle events', async () => {
    const cli: LaneAdapter = {
      async run() {
        return { output: 'done' }
      },
    }
    const o = createLaneOrchestrator({
      registryPath: path.join(tempRoot, 'lanes.jsonl'),
      worktrees: noopWorktrees,
      adapters: { cli },
      idgen: () => 'durable-lane',
      runIdgen: () => 'run-durable-1',
      now: () => 1_000,
      isBackendAvailable: () => true,
    })
    await o.create(cliInput)

    const lane = await o.runMission('durable-lane', 'build')
    const run = await o.getRun('run-durable-1')
    const events = await o.listRunEvents('run-durable-1')

    expect(lane.lastRunId).toBe('run-durable-1')
    expect(run).toMatchObject({
      id: 'run-durable-1',
      laneId: 'durable-lane',
      status: 'succeeded',
      attempt: 1,
      startedAt: 1_000,
      finishedAt: 1_000,
    })
    expect(run?.machineId).toBeTruthy()
    expect(events.map((event) => event.sequence)).toEqual([1, 2])
    expect(events.map((event) => event.type)).toEqual([
      'lifecycle',
      'lifecycle',
    ])
  })

  it('fails closed when run or event ledgers are malformed', async () => {
    const runsPath = path.join(tempRoot, 'runs.jsonl')
    const eventsPath = path.join(tempRoot, 'events.jsonl')
    const o = createLaneOrchestrator({
      registryPath: path.join(tempRoot, 'lanes.jsonl'),
      runsPath,
      eventsPath,
      worktrees: noopWorktrees,
    })
    await fs.writeFile(runsPath, '{not-json}\n')
    await fs.writeFile(eventsPath, '{not-json}\n')

    await expect(o.getRun('run-1')).rejects.toThrow(/malformed JSONL/i)
    await expect(o.listRunEvents('run-1')).rejects.toThrow(/malformed JSONL/i)
  })

  it('fails closed when run or event records are structurally invalid', async () => {
    const runsPath = path.join(tempRoot, 'runs-structural.jsonl')
    const eventsPath = path.join(tempRoot, 'events-structural.jsonl')
    const o = createLaneOrchestrator({
      registryPath: path.join(tempRoot, 'lanes.jsonl'),
      runsPath,
      eventsPath,
      worktrees: noopWorktrees,
    })
    await fs.writeFile(runsPath, '{"id":"r-only"}\n')
    await fs.writeFile(eventsPath, '{"runId":"r-only"}\n')

    await expect(o.getRun('r-only')).rejects.toThrow(/malformed JSONL/i)
    await expect(o.listRunEvents('r-only')).rejects.toThrow(/malformed JSONL/i)
  })

  it('does not strand a lane running when the run ledger claim fails', async () => {
    const runsPath = path.join(tempRoot, 'runs-is-a-directory')
    await fs.mkdir(runsPath)
    let adapterCalls = 0
    const o = createLaneOrchestrator({
      registryPath: path.join(tempRoot, 'lanes.jsonl'),
      runsPath,
      worktrees: noopWorktrees,
      adapters: {
        cli: {
          async run() {
            adapterCalls += 1
            return { output: 'must not run' }
          },
        },
      },
      idgen: () => 'run-ledger-failure-lane',
      runIdgen: () => 'run-ledger-failure-run',
      isBackendAvailable: () => true,
    })
    await o.create(cliInput)

    await expect(
      o.runMission('run-ledger-failure-lane', 'build'),
    ).rejects.toThrow(/admission persistence failed/i)

    expect(adapterCalls).toBe(0)
    const failedLane = await o.get('run-ledger-failure-lane')
    expect(failedLane).toMatchObject({
      status: 'error',
      blockedReason: expect.stringMatching(/admission persistence failed/i),
    })
    expect(failedLane).not.toHaveProperty('activeRunId')
    expect(failedLane?.blockedReason).not.toContain(tempRoot)
    await expect(o.stop('run-ledger-failure-lane')).resolves.toMatchObject({
      status: 'stopped',
    })
  })

  it('terminalises the run when start-event persistence fails', async () => {
    const eventsPath = path.join(tempRoot, 'events-is-a-directory')
    await fs.mkdir(eventsPath)
    let adapterCalls = 0
    const o = createLaneOrchestrator({
      registryPath: path.join(tempRoot, 'lanes.jsonl'),
      runsPath: path.join(tempRoot, 'runs.jsonl'),
      eventsPath,
      worktrees: noopWorktrees,
      adapters: {
        cli: {
          async run() {
            adapterCalls += 1
            return { output: 'must not run' }
          },
        },
      },
      idgen: () => 'event-ledger-failure-lane',
      runIdgen: () => 'event-ledger-failure-run',
      isBackendAvailable: () => true,
    })
    await o.create(cliInput)

    await expect(
      o.runMission('event-ledger-failure-lane', 'build'),
    ).rejects.toThrow(/admission persistence failed/i)

    expect(adapterCalls).toBe(0)
    const failedLane = await o.get('event-ledger-failure-lane')
    expect(failedLane).toMatchObject({
      status: 'error',
    })
    expect(failedLane).not.toHaveProperty('activeRunId')
    expect(failedLane?.blockedReason).not.toContain(tempRoot)
    expect(await o.getRun('event-ledger-failure-run')).toMatchObject({
      status: 'failed',
      finishedAt: expect.any(Number),
    })
  })

  it('does not strand a lane when success settlement persistence fails', async () => {
    const runsPath = path.join(tempRoot, 'runs.jsonl')
    const o = createLaneOrchestrator({
      registryPath: path.join(tempRoot, 'lanes.jsonl'),
      runsPath,
      worktrees: noopWorktrees,
      adapters: {
        cli: {
          async run() {
            await fs.rm(runsPath, { force: true })
            await fs.mkdir(runsPath)
            return { output: 'executed' }
          },
        },
      },
      idgen: () => 'success-settlement-failure-lane',
      runIdgen: () => 'success-settlement-failure-run',
      isBackendAvailable: () => true,
    })
    await o.create(cliInput)

    const lane = await o.runMission(
      'success-settlement-failure-lane',
      'build',
    )

    expect(lane).toMatchObject({
      status: 'error',
      blockedReason: expect.stringMatching(/settlement persistence failed/i),
    })
    expect(lane.activeRunId).toBeUndefined()
    expect(
      await o.get('success-settlement-failure-lane'),
    ).not.toHaveProperty('activeRunId')
    expect(lane.blockedReason).not.toContain(tempRoot)
  })

  it('retains active ownership until fallback settlement persistence completes', async () => {
    const registryPath = path.join(tempRoot, 'lanes.jsonl')
    const runsPath = path.join(tempRoot, 'runs.jsonl')
    let announceFallback!: () => void
    let releaseFallback!: () => void
    const fallbackStarted = new Promise<void>((resolve) => {
      announceFallback = resolve
    })
    const fallbackReleased = new Promise<void>((resolve) => {
      releaseFallback = resolve
    })
    const appendLaneRecord = async (target: string, lane: Lane) => {
      if (
        lane.status === 'error' &&
        lane.blockedReason?.includes('settlement persistence failed')
      ) {
        announceFallback()
        await fallbackReleased
      }
      await fs.appendFile(target, `${JSON.stringify(lane)}\n`, 'utf8')
    }
    const o = createLaneOrchestrator({
      registryPath,
      runsPath,
      worktrees: noopWorktrees,
      adapters: {
        cli: {
          async run() {
            await fs.rm(runsPath, { force: true })
            await fs.mkdir(runsPath)
            return { output: 'executed' }
          },
        },
      },
      appendLaneRecord,
      idgen: () => 'settlement-race-lane',
      runIdgen: () => 'settlement-race-run',
      isBackendAvailable: () => true,
    })
    await o.create(cliInput)

    const running = o.runMission('settlement-race-lane', 'build')
    await fallbackStarted
    const stopping = o.stop('settlement-race-lane')
    const earlyOutcome = await Promise.race([
      stopping.then(
        () => 'settled',
        () => 'settled',
      ),
      new Promise<'pending'>((resolve) => setTimeout(() => resolve('pending'), 20)),
    ])

    expect(earlyOutcome).toBe('pending')
    releaseFallback()
    await expect(running).resolves.toMatchObject({ status: 'error' })
    await expect(stopping).resolves.toMatchObject({ status: 'stopped' })
  })

  it('does not strand a lane when failure settlement persistence fails', async () => {
    const eventsPath = path.join(tempRoot, 'events.jsonl')
    const o = createLaneOrchestrator({
      registryPath: path.join(tempRoot, 'lanes.jsonl'),
      eventsPath,
      worktrees: noopWorktrees,
      adapters: {
        cli: {
          async run() {
            await fs.rm(eventsPath, { force: true })
            await fs.mkdir(eventsPath)
            throw new Error('synthetic adapter failure')
          },
        },
      },
      idgen: () => 'failure-settlement-failure-lane',
      runIdgen: () => 'failure-settlement-failure-run',
      isBackendAvailable: () => true,
    })
    await o.create(cliInput)

    const lane = await o.runMission(
      'failure-settlement-failure-lane',
      'build',
    )

    expect(lane).toMatchObject({
      status: 'error',
      blockedReason: expect.stringMatching(/settlement persistence failed/i),
    })
    expect(lane.activeRunId).toBeUndefined()
    expect(
      await o.get('failure-settlement-failure-lane'),
    ).not.toHaveProperty('activeRunId')
    expect(lane.blockedReason).not.toContain(tempRoot)
  })

  it('marks the lane error when the adapter throws', async () => {
    const gateway: LaneAdapter = {
      async run() {
        throw new Error('gateway down')
      },
    }
    const o = orch({ gateway }, () => 'l2')
    await o.create(gatewayInput)
    const lane = await o.runMission('l2', 'x')
    expect(lane.status).toBe('error')
    expect(lane.blockedReason).toBe('gateway down')
  })

  it('blocks when no adapter is configured for the lane kind', async () => {
    const o = orch({}, () => 'l3')
    await o.create(cliInput)
    const lane = await o.runMission('l3', 'x')
    expect(lane.status).toBe('blocked')
    expect(lane.blockedReason).toMatch(/No adapter configured for cli/)
  })

  it('fails closed when backend availability is lost before dispatch', async () => {
    let available = true
    let runCalls = 0
    const cli: LaneAdapter = {
      async run() {
        runCalls += 1
        return { output: 'must not run' }
      },
    }
    const o = createLaneOrchestrator({
      registryPath: path.join(tempRoot, 'lanes.jsonl'),
      worktrees: noopWorktrees,
      adapters: { cli },
      idgen: () => 'availability-lane',
      isBackendAvailable: () => available,
    })
    await o.create(cliInput)
    available = false

    const lane = await o.runMission('availability-lane', 'must be blocked')

    expect(lane.status).toBe('blocked')
    expect(lane.blockedReason).toMatch(/unavailable|not available/i)
    expect(runCalls).toBe(0)
  })

  it('throws for an unknown lane', async () => {
    const o = orch()
    await expect(o.runMission('nope', 'x')).rejects.toThrow(/not found/)
  })

  it('rejects a duplicate run while the lane already owns an active run', async () => {
    let finish!: () => void
    let announceStart!: () => void
    const started = new Promise<void>((resolve) => {
      announceStart = resolve
    })
    const cli: LaneAdapter = {
      async run() {
        announceStart()
        await new Promise<void>((resolve) => {
          finish = resolve
        })
        return { output: 'done' }
      },
    }
    const o = orch({ cli }, () => 'duplicate-lane')
    await o.create(cliInput)

    const first = o.runMission('duplicate-lane', 'first')
    await started
    await expect(o.runMission('duplicate-lane', 'second')).rejects.toThrow(
      /already running/i,
    )

    finish()
    await expect(first).resolves.toMatchObject({ status: 'idle' })
  })

  it('atomically rejects duplicate claims from separate orchestrator instances', async () => {
    const registryPath = path.join(tempRoot, 'lanes.jsonl')
    const runsPath = path.join(tempRoot, 'runs.jsonl')
    const creator = createLaneOrchestrator({
      registryPath,
      runsPath,
      worktrees: noopWorktrees,
      idgen: () => 'cross-instance-lane',
      isBackendAvailable: () => true,
    })
    await creator.create(cliInput)

    let checks = 0
    let releaseChecks!: () => void
    const checksReady = new Promise<void>((resolve) => {
      releaseChecks = resolve
    })
    const isBackendAvailable = async () => {
      checks += 1
      if (checks === 2) releaseChecks()
      await checksReady
      return true
    }
    let finish!: () => void
    const runFinished = new Promise<void>((resolve) => {
      finish = resolve
    })
    let announceRunStarted!: () => void
    const runStarted = new Promise<void>((resolve) => {
      announceRunStarted = resolve
    })
    let runCalls = 0
    const adapter: LaneAdapter = {
      async run() {
        runCalls += 1
        announceRunStarted()
        await runFinished
        return { output: 'done' }
      },
    }
    const make = () =>
      createLaneOrchestrator({
        registryPath,
        runsPath,
        worktrees: noopWorktrees,
        isBackendAvailable,
        adapters: { cli: adapter },
      })

    const attempts = [
      make().runMission('cross-instance-lane', 'first'),
      make().runMission('cross-instance-lane', 'second'),
    ].map((attempt) =>
      attempt.then(
        (value) => ({ status: 'fulfilled' as const, value }),
        (reason: unknown) => ({ status: 'rejected' as const, reason }),
      ),
    )
    await checksReady
    await runStarted

    const competingOutcome = await Promise.race(attempts)
    expect(competingOutcome.status).toBe('rejected')
    expect(runCalls).toBe(1)
    finish()
    const outcomes = await Promise.all(attempts)
    expect(outcomes.filter((outcome) => outcome.status === 'fulfilled')).toHaveLength(1)
    expect(outcomes.filter((outcome) => outcome.status === 'rejected')).toHaveLength(1)
  })

  it('does not let a delayed unavailable transition overwrite another process run', async () => {
    let announceAvailability!: () => void
    let releaseAvailability!: (available: boolean) => void
    const availabilityStarted = new Promise<void>((resolve) => {
      announceAvailability = resolve
    })
    const delayedAvailability = new Promise<boolean>((resolve) => {
      releaseAvailability = resolve
    })
    let announceCompetingRun!: () => void
    let finishCompetingRun!: () => void
    const competingRunStarted = new Promise<void>((resolve) => {
      announceCompetingRun = resolve
    })
    const competingRunFinished = new Promise<void>((resolve) => {
      finishCompetingRun = resolve
    })
    const registryPath = path.join(tempRoot, 'lanes.jsonl')
    const setup = createLaneOrchestrator({
      registryPath,
      worktrees: noopWorktrees,
      idgen: () => 'availability-race-lane',
      isBackendAvailable: () => true,
    })
    await setup.create(cliInput)
    const delayed = createLaneOrchestrator({
      registryPath,
      worktrees: noopWorktrees,
      adapters: {
        cli: {
          async run() {
            return { output: 'delayed' }
          },
        },
      },
      runIdgen: () => 'delayed-run',
      isBackendAvailable: async () => {
        announceAvailability()
        return delayedAvailability
      },
    })
    const competing = createLaneOrchestrator({
      registryPath,
      worktrees: noopWorktrees,
      adapters: {
        cli: {
          async run() {
            announceCompetingRun()
            await competingRunFinished
            return { output: 'competing' }
          },
        },
      },
      runIdgen: () => 'competing-run',
      isBackendAvailable: () => true,
    })

    const staleAttempt = delayed.runMission('availability-race-lane', 'delayed')
    await availabilityStarted
    const activeRun = competing.runMission('availability-race-lane', 'competing')
    await competingRunStarted
    releaseAvailability(false)

    await expect(staleAttempt).rejects.toThrow(/already running/i)
    expect(await competing.get('availability-race-lane')).toMatchObject({
      status: 'running',
      activeRunId: 'competing-run',
    })
    finishCompetingRun()
    await expect(activeRun).resolves.toMatchObject({
      status: 'idle',
      lastRunId: 'competing-run',
    })
  })

  it('acknowledges process abort before cleaning up the worktree', async () => {
    const order: Array<string> = []
    let announceStarted!: () => void
    const started = new Promise<void>((resolve) => {
      announceStarted = resolve
    })
    const worktrees: WorktreeManager = {
      async create(_repo, laneId) {
        return { worktree: `/wt/${laneId}`, branch: `lane/${laneId}` }
      },
      async remove() {
        order.push('cleanup')
      },
    }
    const cli: LaneAdapter = {
      async run(_lane, _mission, options) {
        announceStarted()
        await new Promise<void>((resolve, reject) => {
          const timer = setTimeout(resolve, 100)
          options?.signal?.addEventListener(
            'abort',
            () => {
              clearTimeout(timer)
              order.push('terminated')
              reject(new Error('run aborted'))
            },
            { once: true },
          )
        })
        return { output: 'unexpected' }
      },
    }
    const o = createLaneOrchestrator({
      registryPath: path.join(tempRoot, 'lanes.jsonl'),
      worktrees,
      adapters: { cli },
      idgen: () => 'controlled-lane',
      runIdgen: () => 'controlled-run',
      isBackendAvailable: () => true,
    })
    await o.create(cliInput)

    const running = o.runMission('controlled-lane', 'long task')
    await started
    const stopped = await o.stop('controlled-lane')
    await running

    expect(order).toEqual(['terminated', 'cleanup'])
    expect(stopped.status).toBe('stopped')
    expect((await o.get('controlled-lane'))?.status).toBe('stopped')
    expect(await o.getRun('controlled-run')).toMatchObject({
      status: 'stopped',
      finishedAt: expect.any(Number),
    })
    const events = await o.listRunEvents('controlled-run')
    expect(events.map((event) => event.sequence)).toEqual([1, 2])
    expect(events.map((event) => event.type)).toEqual([
      'lifecycle',
      'control',
    ])
  })

  it('does not clean up when process termination is unacknowledged', async () => {
    let announceStarted!: () => void
    const started = new Promise<void>((resolve) => {
      announceStarted = resolve
    })
    let cleanupCalls = 0
    const worktrees: WorktreeManager = {
      async create(_repo, laneId) {
        return { worktree: `/wt/${laneId}`, branch: `lane/${laneId}` }
      },
      async remove() {
        cleanupCalls += 1
      },
    }
    const cli: LaneAdapter = {
      async run(_lane, _mission, options) {
        announceStarted()
        return new Promise((_resolve, reject) => {
          options?.signal?.addEventListener(
            'abort',
            () =>
              reject(
                new StopNotAcknowledgedError(
                  'Process tree termination was not acknowledged',
                ),
              ),
            { once: true },
          )
        })
      },
    }
    const o = createLaneOrchestrator({
      registryPath: path.join(tempRoot, 'lanes.jsonl'),
      worktrees,
      adapters: { cli },
      idgen: () => 'unacknowledged-lane',
      runIdgen: () => 'unacknowledged-run',
      isBackendAvailable: () => true,
    })
    await o.create(cliInput)

    const running = o
      .runMission('unacknowledged-lane', 'long task')
      .catch((error: unknown) => error)
    await started
    await expect(o.stop('unacknowledged-lane')).rejects.toThrow(
      StopNotAcknowledgedError,
    )
    expect(await running).toBeInstanceOf(StopNotAcknowledgedError)
    await expect(o.stop('unacknowledged-lane')).rejects.toThrow(
      StopNotAcknowledgedError,
    )

    expect(cleanupCalls).toBe(0)
    expect(await o.get('unacknowledged-lane')).toMatchObject({
      status: 'error',
      blockedReason: expect.stringMatching(/not acknowledged/i),
    })
  })

  it('rejects run admission while stop owns worktree cleanup', async () => {
    let announceCleanup!: () => void
    let releaseCleanup!: () => void
    const cleanupStarted = new Promise<void>((resolve) => {
      announceCleanup = resolve
    })
    const cleanupReleased = new Promise<void>((resolve) => {
      releaseCleanup = resolve
    })
    let runCalls = 0
    const worktrees: WorktreeManager = {
      async create(_repo, laneId) {
        return { worktree: `/wt/${laneId}`, branch: `lane/${laneId}` }
      },
      async remove() {
        announceCleanup()
        await cleanupReleased
      },
    }
    const cli: LaneAdapter = {
      async run() {
        runCalls += 1
        return { output: 'must not run' }
      },
    }
    const o = createLaneOrchestrator({
      registryPath: path.join(tempRoot, 'lanes.jsonl'),
      worktrees,
      adapters: { cli },
      idgen: () => 'stop-race-lane',
      isBackendAvailable: () => true,
    })
    await o.create(cliInput)

    const stopping = o.stop('stop-race-lane')
    await cleanupStarted
    const running = o.runMission('stop-race-lane', 'must be rejected')
    releaseCleanup()

    await expect(running).rejects.toThrow(/stopping|stopped/i)
    await expect(stopping).resolves.toMatchObject({ status: 'stopped' })
    expect(runCalls).toBe(0)
    expect((await o.get('stop-race-lane'))?.status).toBe('stopped')
  })

  it('does not acknowledge stop when settlement persistence fails', async () => {
    const eventsPath = path.join(tempRoot, 'events.jsonl')
    let announceStarted!: () => void
    const started = new Promise<void>((resolve) => {
      announceStarted = resolve
    })
    let cleanupCalls = 0
    const worktrees: WorktreeManager = {
      async create(_repo, laneId) {
        return { worktree: `/wt/${laneId}`, branch: `lane/${laneId}` }
      },
      async remove() {
        cleanupCalls += 1
      },
    }
    const cli: LaneAdapter = {
      async run(_lane, _mission, options) {
        announceStarted()
        return new Promise((resolve) => {
          options?.signal?.addEventListener(
            'abort',
            () => {
              void (async () => {
                await fs.rm(eventsPath, { force: true })
                await fs.mkdir(eventsPath)
                resolve({ output: 'aborted after event ledger failure' })
              })()
            },
            { once: true },
          )
        })
      },
    }
    const o = createLaneOrchestrator({
      registryPath: path.join(tempRoot, 'lanes.jsonl'),
      eventsPath,
      worktrees,
      adapters: { cli },
      idgen: () => 'settlement-stop-lane',
      runIdgen: () => 'settlement-stop-run',
      isBackendAvailable: () => true,
    })
    await o.create(cliInput)

    const running = o
      .runMission('settlement-stop-lane', 'fail settlement during stop')
      .catch((error: unknown) => error)
    await started

    await expect(o.stop('settlement-stop-lane')).rejects.toThrow(
      StopNotAcknowledgedError,
    )
    expect(await running).toBeInstanceOf(StopNotAcknowledgedError)
    expect(cleanupCalls).toBe(0)
    expect(await o.get('settlement-stop-lane')).toMatchObject({
      status: 'error',
      blockedReason: expect.stringMatching(/settlement persistence failed/i),
    })
  })

  it('does not clean up or resurrect a lane after stop acknowledgement times out', async () => {
    let announceStarted!: () => void
    let releaseRun!: () => void
    const started = new Promise<void>((resolve) => {
      announceStarted = resolve
    })
    const heldRun = new Promise<void>((resolve) => {
      releaseRun = resolve
    })
    let cleanupCalls = 0
    const worktrees: WorktreeManager = {
      async create(_repo, laneId) {
        return { worktree: `/wt/${laneId}`, branch: `lane/${laneId}` }
      },
      async remove() {
        cleanupCalls += 1
      },
    }
    const cli: LaneAdapter = {
      async run() {
        announceStarted()
        await heldRun
        return { output: 'late success' }
      },
    }
    const o = createLaneOrchestrator({
      registryPath: path.join(tempRoot, 'lanes.jsonl'),
      worktrees,
      adapters: { cli },
      idgen: () => 'timeout-lane',
      stopAckTimeoutMs: 10,
      isBackendAvailable: () => true,
    })
    await o.create(cliInput)
    const running = o.runMission('timeout-lane', 'ignore stop')
    await started

    await expect(o.stop('timeout-lane')).rejects.toThrow(/not acknowledged/i)
    expect(cleanupCalls).toBe(0)
    expect(await o.get('timeout-lane')).toMatchObject({ status: 'error' })

    releaseRun()
    await running
    const erroredLane = await o.get('timeout-lane')
    expect(erroredLane).toMatchObject({ status: 'error' })
    expect(erroredLane?.lastRunId).toEqual(expect.any(String))
    expect(await o.getRun(erroredLane!.lastRunId!)).toMatchObject({
      status: 'stopped',
      finishedAt: expect.any(Number),
    })
    expect(
      (await o.listRunEvents(erroredLane!.lastRunId!)).map(
        (event) => event.type,
      ),
    ).toEqual(['lifecycle', 'control'])
    expect(cleanupCalls).toBe(0)
  })

  it('releases the active claim when the running ledger write fails', async () => {
    const registryPath = path.join(tempRoot, 'lanes.jsonl')
    let failRunningWrite = true
    const cli: LaneAdapter = {
      async run() {
        return { output: 'ok' }
      },
    }
    const o = createLaneOrchestrator({
      registryPath,
      worktrees: noopWorktrees,
      adapters: { cli },
      idgen: () => 'ledger-failure-lane',
      isBackendAvailable: () => true,
      appendLaneRecord: async (ledgerPath, lane) => {
        if (lane.status === 'running' && failRunningWrite) {
          failRunningWrite = false
          throw Object.assign(new Error('synthetic append failure'), {
            code: 'EIO',
          })
        }
        await fs.mkdir(path.dirname(ledgerPath), { recursive: true })
        await fs.appendFile(ledgerPath, `${JSON.stringify(lane)}\n`, 'utf8')
      },
    })
    await o.create(cliInput)

    await expect(
      o.runMission('ledger-failure-lane', 'first'),
    ).rejects.toThrow()

    await expect(
      o.runMission('ledger-failure-lane', 'second'),
    ).resolves.toMatchObject({ status: 'idle' })
  })
})
