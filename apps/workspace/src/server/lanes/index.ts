/**
 * Lane Orchestrator singleton — wires the real WorktreeManager + jsonl registry
 * for the API routes. Slice 1 assumes backends are authed; real availability
 * checks arrive with the adapters (Slices 2-3).
 */
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { BEARER_TOKEN, CLAUDE_API } from '../gateway-capabilities'
import { buildAutonomySettings } from './autonomy-settings'
import { createCliAdapter } from './cli-adapter'
import { createNexusDispatcher } from './dispatcher'
import { createGatewayAdapter } from './gateway-adapter'
import { cliAccountAvailable, probeGatewayBackend } from './lane-availability'
import { createLaneOrchestrator } from './lane-orchestrator'
import { createNexusTaskQueue } from './task-queue'
import { createWorktreeManager } from './worktree-manager'
import { probeWorkerRegistry } from './worker-registry'
import type { LaneGateWiring } from './adapter'
import type { LaneOrchestrator } from './lane-orchestrator'
import type { NexusTaskQueue } from './task-queue'

let singleton: LaneOrchestrator | null = null
let taskQueueSingleton: NexusTaskQueue | null = null
let taskQueueRecovery: Promise<number> | null = null

/**
 * Per-run autonomy gate wiring (UNI-2409).
 *
 * The settings file is written fresh for every run and the approvals path is
 * scoped to that run, so an approval granted for one run can never be picked up
 * by another. A failure to write it throws, which aborts the run: a lane that
 * quietly proceeds ungated because setup failed is exactly the fail-open this
 * ticket exists to prevent.
 */
/** Base directory holding per-run gate state. */
function laneBase(): string {
  return path.join(os.homedir(), '.hermes', 'lanes')
}

/**
 * Where the hook records its decisions for a run.
 *
 * Derived from the same layout `prepareLaneGate` writes, so the reader and the
 * writer cannot drift to different paths — the failure that would make the
 * panel permanently, silently empty.
 */
export function gateDecisionsPath(runId: string, base: string = laneBase()): string {
  return path.join(base, 'gate', runId, 'decisions.jsonl')
}

export async function prepareLaneGate(
  base: string,
  input: { runId: string; laneId: string },
): Promise<LaneGateWiring> {
  const dir = path.join(base, 'gate', input.runId)
  await fs.mkdir(dir, { recursive: true, mode: 0o700 })
  const settingsPath = path.join(dir, 'settings.json')
  await fs.writeFile(
    settingsPath,
    JSON.stringify(buildAutonomySettings(), null, 2),
    { encoding: 'utf8', mode: 0o600 },
  )
  return {
    requestId: input.runId,
    settingsPath,
    approvalsPath: path.join(dir, 'approvals.json'),
    // Derived from the same helper the reader uses, so the two cannot drift to
    // different paths — the failure that would make the panel permanently and
    // silently empty while the gate was working perfectly.
    auditPath: gateDecisionsPath(input.runId, base),
  }
}

export function getLaneOrchestrator(): LaneOrchestrator {
  if (!singleton) {
    const base = path.join(os.homedir(), '.hermes', 'lanes')
    singleton = createLaneOrchestrator({
      registryPath: path.join(base, 'lanes.jsonl'),
      worktrees: createWorktreeManager({ baseDir: base }),
      prepareGate: (input) => prepareLaneGate(base, input),
      isBackendAvailable: async (backend) =>
        backend.kind === 'gateway'
          ? probeGatewayBackend(CLAUDE_API, backend, BEARER_TOKEN)
          : cliAccountAvailable(backend.account, backend.tool),
      adapters: {
        gateway: createGatewayAdapter({
          baseUrl: CLAUDE_API,
          bearerToken: BEARER_TOKEN,
        }),
        cli: createCliAdapter(),
      },
    })
  }
  return singleton
}

export function getNexusTaskQueue(): NexusTaskQueue {
  if (!taskQueueSingleton) {
    const base = path.join(os.homedir(), '.hermes', 'lanes')
    taskQueueSingleton = createNexusTaskQueue({
      queuePath: path.join(base, 'tasks.jsonl'),
    })
    taskQueueRecovery = taskQueueSingleton.reconcileInterrupted()
  }
  return taskQueueSingleton
}

export async function ensureNexusTaskQueueRecovered(): Promise<void> {
  getNexusTaskQueue()
  await taskQueueRecovery
}

export function getNexusDispatcher() {
  return createNexusDispatcher({
    queue: getNexusTaskQueue(),
    lanes: getLaneOrchestrator(),
    ensureRecovered: ensureNexusTaskQueueRecovered,
  })
}

export async function getNexusWorkers() {
  return probeWorkerRegistry(CLAUDE_API)
}

export type { LaneOrchestrator } from './lane-orchestrator'
export type { NexusTaskQueue, PublicNexusTask } from './task-queue'
export * from './types'
