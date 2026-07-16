/**
 * Lane Orchestrator singleton — wires the real WorktreeManager + jsonl registry
 * for the API routes. Slice 1 assumes backends are authed; real availability
 * checks arrive with the adapters (Slices 2-3).
 */
import os from 'node:os'
import path from 'node:path'
import { BEARER_TOKEN, CLAUDE_API } from '../gateway-capabilities'
import { createCliAdapter } from './cli-adapter'
import { createGatewayAdapter } from './gateway-adapter'
import {
  cliAccountAvailable,
  probeGatewayBackend,
} from './lane-availability'
import { createLaneOrchestrator } from './lane-orchestrator'
import { createWorktreeManager } from './worktree-manager'
import type { LaneOrchestrator } from './lane-orchestrator'

let singleton: LaneOrchestrator | null = null

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

export type { LaneOrchestrator } from './lane-orchestrator'
export * from './types'
