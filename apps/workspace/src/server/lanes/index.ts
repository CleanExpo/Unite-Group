/**
 * Lane Orchestrator singleton — wires the real WorktreeManager + jsonl registry
 * for the API routes. Slice 1 assumes backends are authed; real availability
 * checks arrive with the adapters (Slices 2-3).
 */
import os from 'node:os'
import path from 'node:path'
import { BEARER_TOKEN, CLAUDE_API } from '../gateway-capabilities'
import { createCliAdapter } from './cli-adapter'
import { createNexusDispatcher } from './dispatcher'
import { createGatewayAdapter } from './gateway-adapter'
import { cliAccountAvailable, probeGatewayBackend } from './lane-availability'
import { createLaneOrchestrator } from './lane-orchestrator'
import { createNexusTaskQueue } from './task-queue'
import { createWorktreeManager } from './worktree-manager'
import { probeWorkerRegistry } from './worker-registry'
import type { LaneOrchestrator } from './lane-orchestrator'
import type { NexusTaskQueue } from './task-queue'

let singleton: LaneOrchestrator | null = null
let taskQueueSingleton: NexusTaskQueue | null = null
let taskQueueRecovery: Promise<number> | null = null

export function getLaneOrchestrator(): LaneOrchestrator {
  if (!singleton) {
    const base = path.join(os.homedir(), '.hermes', 'lanes')
    singleton = createLaneOrchestrator({
      registryPath: path.join(base, 'lanes.jsonl'),
      worktrees: createWorktreeManager({ baseDir: base }),
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
