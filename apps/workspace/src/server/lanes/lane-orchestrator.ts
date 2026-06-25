/**
 * LaneOrchestrator — create / list / get / stop lanes. Pure coordination:
 * it resolves + checks the backend, asks the WorktreeManager for an isolated
 * worktree, and persists the lane registry to a jsonl ledger (latest record
 * per id wins). Execution (running missions) lands with the adapters in later
 * slices — here a created lane is 'idle'.
 */
import { randomUUID } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import {
  type AvailabilityCheck,
  assertBackendAvailable,
} from './backend-registry'
import type { WorktreeManager } from './worktree-manager'
import type { LaneAdapter } from './adapter'
import type { CreateLaneInput, Lane } from './types'

export interface OrchestratorDeps {
  registryPath: string
  worktrees: WorktreeManager
  /** Defaults to "everything authed" so Slice 1 is usable before adapter wiring. */
  isBackendAvailable?: AvailabilityCheck
  /** Lane execution adapters, keyed by lane kind. */
  adapters?: { gateway?: LaneAdapter }
  /** Injectable for deterministic tests. */
  idgen?: () => string
  now?: () => number
}

export interface LaneOrchestrator {
  create(input: CreateLaneInput): Promise<Lane>
  list(): Promise<Array<Lane>>
  get(id: string): Promise<Lane | null>
  stop(id: string): Promise<Lane>
  runMission(id: string, mission: string): Promise<Lane>
}

async function readLedger(registryPath: string): Promise<Map<string, Lane>> {
  const lanes = new Map<string, Lane>()
  let raw = ''
  try {
    raw = await fs.readFile(registryPath, 'utf8')
  } catch {
    return lanes // no ledger yet
  }
  for (const line of raw.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue
    try {
      const lane = JSON.parse(trimmed) as Lane
      lanes.set(lane.id, lane) // latest record per id wins
    } catch {
      // skip malformed line
    }
  }
  return lanes
}

async function appendLedger(registryPath: string, lane: Lane): Promise<void> {
  await fs.mkdir(path.dirname(registryPath), { recursive: true })
  await fs.appendFile(registryPath, `${JSON.stringify(lane)}\n`, 'utf8')
}

export function createLaneOrchestrator(
  deps: OrchestratorDeps,
): LaneOrchestrator {
  const isAvailable: AvailabilityCheck = deps.isBackendAvailable || (() => true)
  const idgen = deps.idgen || (() => `lane_${randomUUID().slice(0, 8)}`)
  const now = deps.now || (() => Date.now())

  return {
    async create(input) {
      assertBackendAvailable(input.backend, isAvailable)
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
      await appendLedger(deps.registryPath, lane)
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

    async stop(id) {
      const lanes = await readLedger(deps.registryPath)
      const lane = lanes.get(id)
      if (!lane) throw new Error(`Lane "${id}" not found`)
      if (lane.status !== 'stopped') {
        try {
          await deps.worktrees.remove(
            lane.repo,
            { worktree: lane.worktree, branch: lane.branch },
            { force: true },
          )
        } catch {
          // worktree may already be gone; still mark stopped
        }
      }
      const stopped: Lane = { ...lane, status: 'stopped' }
      await appendLedger(deps.registryPath, stopped)
      return stopped
    },

    async runMission(id, mission) {
      const lanes = await readLedger(deps.registryPath)
      const lane = lanes.get(id)
      if (!lane) throw new Error(`Lane "${id}" not found`)

      const adapter =
        lane.kind === 'gateway' ? deps.adapters?.gateway : undefined
      if (!adapter) {
        const why =
          lane.kind === 'cli'
            ? 'CLI lanes are not runnable yet (Slice 3).'
            : 'No adapter configured for this lane kind.'
        const blocked: Lane = { ...lane, status: 'blocked', blockedReason: why }
        await appendLedger(deps.registryPath, blocked)
        return blocked
      }

      const running: Lane = { ...lane, status: 'running', mission }
      await appendLedger(deps.registryPath, running)
      try {
        const result = await adapter.run(running, mission)
        const done: Lane = {
          ...running,
          status: 'idle',
          lastOutput: result.output,
          blockedReason: undefined,
        }
        await appendLedger(deps.registryPath, done)
        return done
      } catch (error) {
        const failed: Lane = {
          ...running,
          status: 'error',
          blockedReason:
            error instanceof Error ? error.message : 'Mission failed',
        }
        await appendLedger(deps.registryPath, failed)
        return failed
      }
    },
  }
}
