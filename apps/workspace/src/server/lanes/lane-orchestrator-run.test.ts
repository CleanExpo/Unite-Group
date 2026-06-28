import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createLaneOrchestrator } from './lane-orchestrator'
import type { LaneAdapter } from './adapter'
import type { WorktreeManager } from './worktree-manager'
import type { CreateLaneInput } from './types'

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

  it('throws for an unknown lane', async () => {
    const o = orch()
    await expect(o.runMission('nope', 'x')).rejects.toThrow(/not found/)
  })
})
