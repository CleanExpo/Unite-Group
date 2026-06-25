import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createLaneOrchestrator } from './lane-orchestrator'
import type { WorktreeManager } from './worktree-manager'
import type { CreateLaneInput } from './types'

let tempRoot = ''

beforeEach(async () => {
  tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'lanes-'))
})

afterEach(async () => {
  await fs.rm(tempRoot, { recursive: true, force: true })
})

function fakeWorktrees() {
  const removed: Array<string> = []
  const manager: WorktreeManager = {
    async create(_repo, laneId) {
      return {
        worktree: path.join(tempRoot, 'wt', laneId),
        branch: `lane/${laneId}`,
      }
    },
    async remove(_repo, handle) {
      removed.push(handle.worktree)
    },
  }
  return { manager, removed }
}

const input: CreateLaneInput = {
  kind: 'gateway',
  backend: { kind: 'gateway', provider: 'minimax', model: 'abab' },
  role: 'builder',
  repo: '/tmp/repo',
}

describe('LaneOrchestrator', () => {
  it('creates an idle lane with an isolated worktree and persists it', async () => {
    let n = 0
    const wt = fakeWorktrees()
    const orch = createLaneOrchestrator({
      registryPath: path.join(tempRoot, 'lanes.jsonl'),
      worktrees: wt.manager,
      idgen: () => `lane_${++n}`,
      now: () => 1000,
    })

    const lane = await orch.create(input)
    expect(lane.id).toBe('lane_1')
    expect(lane.status).toBe('idle')
    expect(lane.branch).toBe('lane/lane_1')
    expect(lane.role).toBe('builder')

    const list = await orch.list()
    expect(list).toHaveLength(1)
    expect(await orch.get('lane_1')).not.toBeNull()
  })

  it('blocks creation when the backend is not available', async () => {
    const wt = fakeWorktrees()
    const orch = createLaneOrchestrator({
      registryPath: path.join(tempRoot, 'lanes.jsonl'),
      worktrees: wt.manager,
      isBackendAvailable: () => false,
    })
    await expect(orch.create(input)).rejects.toThrow(/not configured/)
    // no worktree should have been created
    expect(await orch.list()).toHaveLength(0)
  })

  it('stop removes the worktree and excludes the lane from the active list', async () => {
    const wt = fakeWorktrees()
    const orch = createLaneOrchestrator({
      registryPath: path.join(tempRoot, 'lanes.jsonl'),
      worktrees: wt.manager,
      idgen: () => 'lane_x',
    })
    await orch.create(input)
    const stopped = await orch.stop('lane_x')
    expect(stopped.status).toBe('stopped')
    expect(wt.removed).toHaveLength(1)
    expect(await orch.list()).toHaveLength(0)
    // get still returns the (stopped) record
    expect((await orch.get('lane_x'))?.status).toBe('stopped')
  })

  it('persists across orchestrator instances via the jsonl ledger', async () => {
    const registryPath = path.join(tempRoot, 'lanes.jsonl')
    const wtA = fakeWorktrees()
    const a = createLaneOrchestrator({
      registryPath,
      worktrees: wtA.manager,
      idgen: () => 'lane_p',
    })
    await a.create(input)

    const wtB = fakeWorktrees()
    const b = createLaneOrchestrator({ registryPath, worktrees: wtB.manager })
    expect(await b.get('lane_p')).not.toBeNull()
    expect(await b.list()).toHaveLength(1)
  })

  it('throws a clear error when stopping an unknown lane', async () => {
    const wt = fakeWorktrees()
    const orch = createLaneOrchestrator({
      registryPath: path.join(tempRoot, 'lanes.jsonl'),
      worktrees: wt.manager,
    })
    await expect(orch.stop('nope')).rejects.toThrow(/not found/)
  })
})
