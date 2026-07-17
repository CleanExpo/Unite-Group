/**
 * LaneOrchestrator — create / list / get / stop lanes. Pure coordination:
 * it resolves + checks the backend, asks the WorktreeManager for an isolated
 * worktree, and persists the lane registry to a jsonl ledger (latest record
 * per id wins). Execution (running missions) lands with the adapters in later
 * slices — here a created lane is 'idle'.
 */
import { randomUUID } from 'node:crypto'
import fs from 'node:fs/promises'
import { hostname } from 'node:os'
import path from 'node:path'
import { assertBackendAvailable } from './backend-registry'
import { cliAccountAvailable } from './lane-availability'
import { StopNotAcknowledgedError, sanitiseLaneOutput } from './adapter'
import {
  isLane,
  isLaneRun,
  isLaneRunEvent,
  parseLaneMissionInput,
} from './types'
import type { LaneAdapter } from './adapter'
import type { WorktreeManager } from './worktree-manager'
import type {
  CreateLaneInput,
  Lane,
  LaneBackend,
  LaneRun,
  LaneRunEvent,
} from './types'

type OrchestratorAvailabilityCheck = (
  backend: LaneBackend,
) => boolean | Promise<boolean>

export interface OrchestratorDeps {
  registryPath: string
  worktrees: WorktreeManager
  /** Defaults to "everything authed" so Slice 1 is usable before adapter wiring. */
  isBackendAvailable?: OrchestratorAvailabilityCheck
  /** Lane execution adapters, keyed by lane kind. */
  adapters?: { gateway?: LaneAdapter; cli?: LaneAdapter }
  /** Injectable for deterministic tests. */
  idgen?: () => string
  now?: () => number
  runIdgen?: () => string
  stopAckTimeoutMs?: number
  runsPath?: string
  eventsPath?: string
  machineId?: string
  /** Injectable lane writer for deterministic persistence-failure drills. */
  appendLaneRecord?: (registryPath: string, lane: Lane) => Promise<void>
}

export interface LaneOrchestrator {
  create: (input: CreateLaneInput) => Promise<Lane>
  list: () => Promise<Array<Lane>>
  get: (id: string) => Promise<Lane | null>
  stop: (id: string) => Promise<Lane>
  runMission: (id: string, mission: string) => Promise<Lane>
  getRun: (id: string) => Promise<LaneRun | null>
  listRunEvents: (runId: string) => Promise<Array<LaneRunEvent>>
}

export class LaneConflictError extends Error {
  override name = 'LaneConflictError'
}

async function readLedger(registryPath: string): Promise<Map<string, Lane>> {
  const lanes = new Map<string, Lane>()
  let raw = ''
  try {
    raw = await fs.readFile(registryPath, 'utf8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return lanes
    throw error
  }
  for (const line of raw.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue
    try {
      const lane: unknown = JSON.parse(trimmed)
      if (!isLane(lane)) throw new Error('invalid lane record')
      const { mission: _legacyMission, ...durableLane } = lane
      lanes.set(lane.id, durableLane) // latest record per id wins
    } catch {
      throw new Error('Lane registry contains a malformed JSONL record')
    }
  }
  return lanes
}

async function appendLaneRecord(
  registryPath: string,
  lane: Lane,
): Promise<void> {
  await fs.mkdir(path.dirname(registryPath), { recursive: true })
  await fs.appendFile(registryPath, `${JSON.stringify(lane)}\n`, 'utf8')
}

async function appendRecord<T>(ledgerPath: string, record: T): Promise<void> {
  await fs.mkdir(path.dirname(ledgerPath), { recursive: true })
  await fs.appendFile(ledgerPath, `${JSON.stringify(record)}\n`, 'utf8')
}

const REGISTRY_LOCK_TIMEOUT_MS = 5_000
const REGISTRY_LOCK_RETRY_MS = 10

function errorCode(error: unknown): string {
  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof error.code === 'string'
  ) {
    return error.code
  }
  return 'UNKNOWN'
}

function sanitiseMissionDerivedText(
  value: string,
  mission: string,
  limit?: number,
): string {
  const withoutMission = value.split(mission).join('[mission redacted]')
  return sanitiseLaneOutput(withoutMission, limit)
}

/**
 * Local-process-safe and cross-process-safe registry transition lock.
 * Multi-host admission remains the responsibility of the later durable lease slice.
 */
async function withExclusiveFileLock<T>(
  lockPath: string,
  timeoutMessage: string,
  operation: () => Promise<T>,
): Promise<T> {
  await fs.mkdir(path.dirname(lockPath), { recursive: true })
  const startedAt = Date.now()
  let handle: Awaited<ReturnType<typeof fs.open>> | null = null

  while (!handle) {
    try {
      handle = await fs.open(lockPath, 'wx')
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error
      if (Date.now() - startedAt >= REGISTRY_LOCK_TIMEOUT_MS) {
        throw new LaneConflictError(timeoutMessage)
      }
      await new Promise((resolve) =>
        setTimeout(resolve, REGISTRY_LOCK_RETRY_MS),
      )
    }
  }

  try {
    return await operation()
  } finally {
    await handle.close().catch(() => {})
    await fs.unlink(lockPath).catch((error) => {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    })
  }
}

async function withRegistryLock<T>(
  registryPath: string,
  operation: () => Promise<T>,
): Promise<T> {
  return withExclusiveFileLock(
    `${registryPath}.lock`,
    'Lane registry transition lock timed out; explicit stale-lock recovery is required',
    operation,
  )
}

async function readRuns(runsPath: string): Promise<Map<string, LaneRun>> {
  const runs = new Map<string, LaneRun>()
  let raw = ''
  try {
    raw = await fs.readFile(runsPath, 'utf8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return runs
    throw error
  }
  for (const line of raw.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue
    try {
      const run: unknown = JSON.parse(trimmed)
      if (!isLaneRun(run)) throw new Error('invalid run record')
      runs.set(run.id, run)
    } catch {
      throw new Error('Lane run ledger contains a malformed JSONL record')
    }
  }
  return runs
}

async function readRunEvents(
  eventsPath: string,
  runId: string,
): Promise<Array<LaneRunEvent>> {
  let raw = ''
  try {
    raw = await fs.readFile(eventsPath, 'utf8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []
    throw error
  }
  const events: Array<LaneRunEvent> = []
  for (const line of raw.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue
    try {
      const event: unknown = JSON.parse(trimmed)
      if (!isLaneRunEvent(event)) throw new Error('invalid event record')
      if (event.runId === runId) events.push(event)
    } catch {
      throw new Error('Lane event ledger contains a malformed JSONL record')
    }
  }
  return events.sort((left, right) => left.sequence - right.sequence)
}

export function createLaneOrchestrator(
  deps: OrchestratorDeps,
): LaneOrchestrator {
  // Default check (spec R9): verify CLI accounts locally and fail closed for
  // gateway providers unless the composition root injects a catalogue probe.
  const isAvailable: OrchestratorAvailabilityCheck =
    deps.isBackendAvailable ||
    ((backend) =>
      backend.kind === 'cli'
        ? cliAccountAvailable(backend.account, backend.tool)
        : false)
  const idgen = deps.idgen || (() => `lane_${randomUUID().slice(0, 8)}`)
  const runIdgen =
    deps.runIdgen || (() => `run_${randomUUID().slice(0, 12)}`)
  const now = deps.now || (() => Date.now())
  const stopAckTimeoutMs = deps.stopAckTimeoutMs ?? 5_000
  const baseDir = path.dirname(deps.registryPath)
  const runsPath = deps.runsPath ?? path.join(baseDir, 'runs.jsonl')
  const eventsPath = deps.eventsPath ?? path.join(baseDir, 'events.jsonl')
  const machineId = deps.machineId ?? hostname()
  const appendLedger = deps.appendLaneRecord ?? appendLaneRecord
  type StopOutcome =
    | { acknowledged: true }
    | { acknowledged: false; error: StopNotAcknowledgedError }
  const activeRuns = new Map<
    string,
    { runId: string; controller: AbortController; done: Promise<StopOutcome> }
  >()
  const stoppingLanes = new Set<string>()
  const laneTransitions = new Map<string, Promise<void>>()

  async function withLaneTransition<T>(
    id: string,
    operation: () => Promise<T>,
  ): Promise<T> {
    const previous = laneTransitions.get(id) ?? Promise.resolve()
    let release!: () => void
    const current = new Promise<void>((resolve) => {
      release = resolve
    })
    laneTransitions.set(id, current)
    await previous
    try {
      return await operation()
    } finally {
      release()
      if (laneTransitions.get(id) === current) laneTransitions.delete(id)
    }
  }

  return {
    async create(input) {
      const available = await isAvailable(input.backend)
      assertBackendAvailable(input.backend, () => available)
      const id = idgen()
      const handle = await deps.worktrees.create(input.repo, id)
      const lane: Lane = {
        id,
        kind: input.kind,
        backend: input.backend,
        role: input.role,
        repo: input.repo,
        worktree: handle.worktree,
        branch: handle.branch,
        status: 'idle',
        startedAt: now(),
      }
      try {
        await appendLedger(deps.registryPath, lane)
      } catch (error) {
        const persistenceCode = errorCode(error)
        try {
          await deps.worktrees.remove(input.repo, handle, { force: true })
        } catch (cleanupError) {
          throw new Error(
            `Lane creation persistence failed (${persistenceCode}); worktree cleanup failed (${errorCode(cleanupError)})`,
          )
        }
        throw new Error(`Lane creation persistence failed (${persistenceCode})`)
      }
      return lane
    },

    async list() {
      const lanes = await readLedger(deps.registryPath)
      return [...lanes.values()]
        .filter((lane) => lane.status !== 'stopped')
        .sort((a, b) => (b.startedAt ?? 0) - (a.startedAt ?? 0))
    },

    async get(id) {
      const lanes = await readLedger(deps.registryPath)
      return lanes.get(id) ?? null
    },

    async getRun(id) {
      const runs = await readRuns(runsPath)
      return runs.get(id) ?? null
    },

    async listRunEvents(runId) {
      return readRunEvents(eventsPath, runId)
    },

    async stop(id) {
      return withLaneTransition(id, async () => {
        const stopLockPath = `${deps.registryPath}.stop.${encodeURIComponent(id)}.lock`
        return withExclusiveFileLock(
          stopLockPath,
          `Lane "${id}" stop operation lock timed out`,
          async () => {
            try {
              const claim = await withRegistryLock(
                deps.registryPath,
                async () => {
                  const lanes = await readLedger(deps.registryPath)
                  const lane = lanes.get(id)
                  if (!lane) throw new Error(`Lane "${id}" not found`)
                  if (lane.status === 'stopped') {
                    return { kind: 'terminal' as const, lane }
                  }
                  const active = activeRuns.get(id)
                  if (active && active.runId !== lane.activeRunId) {
                    throw new StopNotAcknowledgedError(
                      `Lane "${id}" local termination handle does not own durable run "${lane.activeRunId ?? 'none'}"`,
                    )
                  }
                  const hasAcknowledgedStop =
                    lane.status !== 'running' &&
                    lane.stopAcknowledgedAt !== undefined &&
                    (lane.activeRunId
                      ? lane.stopAcknowledgedRunId === lane.activeRunId
                      : lane.stopAcknowledgedRunId === undefined)
                  if (
                    lane.status === 'stopping' &&
                    !hasAcknowledgedStop
                  ) {
                    throw new StopNotAcknowledgedError(
                      `Lane "${id}" has an interrupted unacknowledged stop; Slice B reconciliation is required`,
                    )
                  }
                  if (
                    (lane.status === 'running' || lane.activeRunId) &&
                    !active &&
                    !hasAcknowledgedStop
                  ) {
                    throw new StopNotAcknowledgedError(
                      `Lane "${id}" has an active run without a local termination handle; durable reconciliation is required`,
                    )
                  }
                  const stopping: Lane =
                    lane.status === 'stopping'
                      ? lane
                      : {
                          ...lane,
                          status: 'stopping',
                          stopAcknowledgedAt: undefined,
                          stopAcknowledgedRunId: undefined,
                        }
                  stoppingLanes.add(id)
                  if (lane.status !== 'stopping') {
                    await appendLedger(deps.registryPath, stopping)
                  }
                  return { kind: 'owned' as const, lane: stopping, active }
                },
              )

              if (claim.kind === 'terminal') return claim.lane

              let lane = claim.lane
              const claimedRunId = claim.lane.activeRunId
              const active = claim.active
              if (active) {
                active.controller.abort()
                let rejectTimeout!: (reason: Error) => void
                const timeout = new Promise<never>((_, reject) => {
                  rejectTimeout = reject
                })
                const timer = setTimeout(
                  () =>
                    rejectTimeout(
                      new StopNotAcknowledgedError(
                        'CLI stop was not acknowledged',
                      ),
                    ),
                  stopAckTimeoutMs,
                )
                try {
                  const outcome = await Promise.race([active.done, timeout])
                  if (!outcome.acknowledged) throw outcome.error
                } catch (error) {
                  const message = 'CLI stop was not acknowledged'
                  await withRegistryLock(deps.registryPath, async () => {
                    const current = (await readLedger(deps.registryPath)).get(id)
                    if (
                      !current ||
                      current.status !== 'stopping' ||
                      current.activeRunId !== claimedRunId
                    ) {
                      throw new StopNotAcknowledgedError(
                        `Lane "${id}" ownership changed while recording stop failure`,
                      )
                    }
                    await appendLedger(deps.registryPath, {
                      ...current,
                      status: 'error',
                      blockedReason: message,
                    })
                  })
                  if (error instanceof StopNotAcknowledgedError) {
                    throw new StopNotAcknowledgedError(message)
                  }
                  throw new Error(message)
                } finally {
                  clearTimeout(timer)
                }
              }

              return withRegistryLock(deps.registryPath, async () => {
                const latestLanes = await readLedger(deps.registryPath)
                const latest = latestLanes.get(id)
                if (!latest) throw new Error(`Lane "${id}" not found`)
                if (
                  latest.status !== 'stopping' ||
                  latest.activeRunId !== claimedRunId
                ) {
                  throw new StopNotAcknowledgedError(
                    `Lane "${id}" ownership changed before stop cleanup`,
                  )
                }

                const hasBoundAcknowledgement =
                  latest.stopAcknowledgedAt !== undefined &&
                  (claimedRunId
                    ? latest.stopAcknowledgedRunId === claimedRunId
                    : latest.stopAcknowledgedRunId === undefined)
                lane = latest
                if (!hasBoundAcknowledgement) {
                  lane = {
                    ...latest,
                    stopAcknowledgedAt: now(),
                    stopAcknowledgedRunId: claimedRunId,
                  }
                  await appendLedger(deps.registryPath, lane)
                }

                try {
                  await deps.worktrees.remove(
                    lane.repo,
                    { worktree: lane.worktree, branch: lane.branch },
                    { force: true },
                  )
                } catch (error) {
                  const message = sanitiseLaneOutput(
                    error instanceof Error
                      ? error.message
                      : 'Unknown cleanup error',
                    400,
                  )
                  const failed: Lane = {
                    ...lane,
                    status: 'error',
                    blockedReason: `Worktree cleanup failed: ${message}`,
                  }
                  await appendLedger(deps.registryPath, failed)
                  throw new Error(failed.blockedReason)
                }
                const stopped: Lane = {
                  ...lane,
                  status: 'stopped',
                  activeRunId: undefined,
                }
                await appendLedger(deps.registryPath, stopped)
                return stopped
              })
            } finally {
              stoppingLanes.delete(id)
            }
          },
        )
      })
    },

    async runMission(id, mission) {
      const input = parseLaneMissionInput({ id, mission })
      if (!input) throw new Error('A valid mission and lane id are required')
      id = input.id
      mission = input.mission
      const admission = await withLaneTransition(id, async () => {
        const lanes = await readLedger(deps.registryPath)
        const lane = lanes.get(id)
        if (!lane) throw new Error(`Lane "${id}" not found`)
        if (
          stoppingLanes.has(id) ||
          lane.status === 'stopping' ||
          lane.status === 'stopped'
        ) {
          throw new LaneConflictError(`Lane "${id}" is ${lane.status}`)
        }

        const backendAvailable = await isAvailable(lane.backend)
        const adapter =
          lane.kind === 'gateway' ? deps.adapters?.gateway : deps.adapters?.cli

        return withRegistryLock(deps.registryPath, async () => {
          const claimedLanes = await readLedger(deps.registryPath)
          const claimLane = claimedLanes.get(id)
          if (!claimLane) throw new Error(`Lane "${id}" not found`)
          if (
            stoppingLanes.has(id) ||
            claimLane.status === 'stopping' ||
            claimLane.status === 'stopped'
          ) {
            throw new LaneConflictError(`Lane "${id}" is ${claimLane.status}`)
          }
          if (
            claimLane.status === 'running' ||
            claimLane.activeRunId ||
            activeRuns.has(id)
          ) {
            throw new LaneConflictError(`Lane "${id}" is already running`)
          }
          if (!backendAvailable) {
            const blocked: Lane = {
              ...claimLane,
              status: 'blocked',
              blockedReason: `${claimLane.backend.kind} backend is unavailable at dispatch.`,
            }
            await appendLedger(deps.registryPath, blocked)
            return { kind: 'blocked' as const, lane: blocked }
          }
          if (!adapter) {
            const blocked: Lane = {
              ...claimLane,
              status: 'blocked',
              blockedReason: `No adapter configured for ${claimLane.kind} lanes.`,
            }
            await appendLedger(deps.registryPath, blocked)
            return { kind: 'blocked' as const, lane: blocked }
          }

          const runId = runIdgen()
          const runStartedAt = now()
          const controller = new AbortController()
          let acknowledge!: (outcome: StopOutcome) => void
          const done = new Promise<StopOutcome>((resolve) => {
            acknowledge = resolve
          })
          const { mission: _legacyMission, ...missionlessClaim } = claimLane
          const running: Lane = {
            ...missionlessClaim,
            status: 'running',
            activeRunId: runId,
            lastRunId: runId,
            stopAcknowledgedAt: undefined,
            stopAcknowledgedRunId: undefined,
            attempt: (claimLane.attempt ?? 0) + 1,
          }
          const run: LaneRun = {
            id: runId,
            laneId: id,
            machineId,
            status: 'running',
            attempt: running.attempt ?? 1,
            startedAt: runStartedAt,
          }
          const startedEvent: LaneRunEvent = {
            runId,
            laneId: id,
            sequence: 1,
            occurredAt: runStartedAt,
            type: 'lifecycle',
            message: 'Run started',
          }
          activeRuns.set(id, { runId, controller, done })
          let laneClaimPersisted = false
          let runClaimPersisted = false
          try {
            await appendLedger(deps.registryPath, running)
            laneClaimPersisted = true
            await appendRecord(runsPath, run)
            runClaimPersisted = true
            await appendRecord(eventsPath, startedEvent)
          } catch (error) {
            const failedAt = now()
            const failureCode = errorCode(error)
            let rollbackError: unknown
            try {
              if (runClaimPersisted) {
                await appendRecord(runsPath, {
                  ...run,
                  status: 'failed',
                  finishedAt: failedAt,
                } satisfies LaneRun)
              }
              if (laneClaimPersisted) {
                await appendLedger(deps.registryPath, {
                  ...running,
                  status: 'error',
                  activeRunId: undefined,
                  lastRunId: runId,
                  lastFinishedAt: failedAt,
                  blockedReason: `Run admission persistence failed (${failureCode})`,
                })
              }
            } catch (rollbackFailure) {
              rollbackError = rollbackFailure
            }
            activeRuns.delete(id)
            acknowledge({ acknowledged: true })
            if (rollbackError) {
              throw new StopNotAcknowledgedError(
                `Run admission rollback failed (${errorCode(rollbackError)})`,
              )
            }
            throw new Error(`Run admission persistence failed (${failureCode})`)
          }
          return {
            kind: 'running' as const,
            adapter,
            running,
            run,
            runId,
            controller,
            acknowledge,
          }
        })
      })
      if (admission.kind === 'blocked') return admission.lane
      const { adapter, running, run, runId, controller, acknowledge } = admission
      let unacknowledgedStop: StopNotAcknowledgedError | undefined
      const persistSettlementFailure = async (error: unknown): Promise<Lane> => {
        const code = errorCode(error)
        return withRegistryLock(deps.registryPath, async () => {
          const current = (await readLedger(deps.registryPath)).get(id)
          if (!current || current.activeRunId !== runId) {
            unacknowledgedStop = new StopNotAcknowledgedError(
              `Run settlement ownership changed before failure recovery (${code})`,
            )
            throw unacknowledgedStop
          }
          if (current.status === 'stopping' || stoppingLanes.has(id)) {
            unacknowledgedStop = new StopNotAcknowledgedError(
              `Run settlement persistence failed (${code}) while stop was in progress`,
            )
            throw unacknowledgedStop
          }
          const failedAt = now()
          const failed: Lane = {
            ...current,
            status: 'error',
            activeRunId: undefined,
            lastRunId: runId,
            lastFinishedAt: failedAt,
            blockedReason: `Run settlement persistence failed (${code})`,
          }
          try {
            await appendLedger(deps.registryPath, failed)
          } catch (rollbackError) {
            unacknowledgedStop = new StopNotAcknowledgedError(
              `Run settlement rollback failed (${errorCode(rollbackError)})`,
            )
            throw unacknowledgedStop
          }
          return failed
        })
      }
      try {
        let result
        try {
          result = await adapter.run(running, mission, {
            signal: controller.signal,
          })
        } catch (error) {
          if (error instanceof StopNotAcknowledgedError) {
            unacknowledgedStop = error
          }
          throw error
        }
        if (controller.signal.aborted) throw new Error('CLI run aborted')
        const finishedAt = now()
        const completedLane: Lane = {
          ...running,
          status: 'idle',
          activeRunId: undefined,
          lastRunId: runId,
          lastFinishedAt: finishedAt,
          lastOutput: sanitiseMissionDerivedText(result.output, mission),
          blockedReason: undefined,
        }
        try {
          return await withRegistryLock(deps.registryPath, async () => {
            const current = (await readLedger(deps.registryPath)).get(id)
            if (!current || current.activeRunId !== runId) {
              throw new StopNotAcknowledgedError(
                `Run "${runId}" lost ownership before success settlement`,
              )
            }
            await appendRecord(runsPath, {
              ...run,
              status: 'succeeded',
              finishedAt,
            } satisfies LaneRun)
            await appendRecord(eventsPath, {
              runId,
              laneId: id,
              sequence: 2,
              occurredAt: finishedAt,
              type: 'lifecycle',
              message: 'Run succeeded',
            } satisfies LaneRunEvent)
            if (current.status === 'stopping' || stoppingLanes.has(id)) {
              return current
            }
            await appendLedger(deps.registryPath, completedLane)
            return completedLane
          })
        } catch (persistenceError) {
          if (persistenceError instanceof StopNotAcknowledgedError) {
            unacknowledgedStop = persistenceError
            throw persistenceError
          }
          return await persistSettlementFailure(persistenceError)
        }
      } catch (error) {
        if (error instanceof StopNotAcknowledgedError) {
          unacknowledgedStop = error
          throw error
        }
        const finishedAt = now()
        const stopped = controller.signal.aborted
        const failed: Lane = {
          ...running,
          status: stopped ? 'blocked' : 'error',
          activeRunId: undefined,
          lastRunId: runId,
          lastFinishedAt: finishedAt,
          blockedReason: sanitiseMissionDerivedText(
            error instanceof Error ? error.message : 'Mission failed',
            mission,
            400,
          ),
        }
        try {
          return await withRegistryLock(deps.registryPath, async () => {
            const current = (await readLedger(deps.registryPath)).get(id)
            if (!current || current.activeRunId !== runId) {
              throw new StopNotAcknowledgedError(
                `Run "${runId}" lost ownership before failure settlement`,
              )
            }
            await appendRecord(runsPath, {
              ...run,
              status: stopped ? 'stopped' : 'failed',
              finishedAt,
            } satisfies LaneRun)
            await appendRecord(eventsPath, {
              runId,
              laneId: id,
              sequence: 2,
              occurredAt: finishedAt,
              type: stopped ? 'control' : 'error',
              message: stopped ? 'Run stopped' : 'Run failed',
            } satisfies LaneRunEvent)
            if (current.status !== 'stopping' && !stoppingLanes.has(id)) {
              const terminalLane: Lane =
                stopped && current.status === 'error'
                  ? {
                      ...failed,
                      status: 'error',
                      blockedReason: current.blockedReason,
                    }
                  : failed
              await appendLedger(deps.registryPath, terminalLane)
              return terminalLane
            }
            return current
          })
        } catch (persistenceError) {
          if (persistenceError instanceof StopNotAcknowledgedError) {
            unacknowledgedStop = persistenceError
            throw persistenceError
          }
          return await persistSettlementFailure(persistenceError)
        }
      } finally {
        const active = activeRuns.get(id)
        if (active?.runId === runId) activeRuns.delete(id)
        acknowledge(
          unacknowledgedStop
            ? { acknowledged: false, error: unacknowledgedStop }
            : { acknowledged: true },
        )
      }
    },
  }
}
