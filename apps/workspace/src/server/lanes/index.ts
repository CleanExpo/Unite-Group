/**
 * Lane Orchestrator singleton — wires the real WorktreeManager + jsonl registry
 * for the API routes. Slice 1 assumes backends are authed; real availability
 * checks arrive with the adapters (Slices 2-3).
 */
import os from 'node:os'
import path from 'node:path'
import {
  createLaneOrchestrator,
  type LaneOrchestrator,
} from './lane-orchestrator'
import { createWorktreeManager } from './worktree-manager'

let singleton: LaneOrchestrator | null = null

export function getLaneOrchestrator(): LaneOrchestrator {
  if (!singleton) {
    const base = path.join(os.homedir(), '.hermes', 'lanes')
    singleton = createLaneOrchestrator({
      registryPath: path.join(base, 'lanes.jsonl'),
      worktrees: createWorktreeManager({ baseDir: base }),
      isBackendAvailable: () => true,
    })
  }
  return singleton
}

export type { LaneOrchestrator } from './lane-orchestrator'
export * from './types'
