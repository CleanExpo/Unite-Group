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

const gatewayAvailable = () => true

describe('LaneOrchestrator', () => {
  it('creates an idle lane with an isolated worktree and persists it', async () => {
    let n = 0
    const wt = fakeWorktrees()
    const orch = createLaneOrchestrator({
      registryPath: path.join(tempRoot, 'lanes.jsonl'),
      worktrees: wt.manager,
      idgen: () => `lane_${++n}`,
      now: () => 1000,
      isBackendAvailable: gatewayAvailable,
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

  it('cleans up the worktree when lane persistence fails', async () => {
    const registryPath = path.join(tempRoot, 'registry-is-a-directory')
    await fs.mkdir(registryPath)
    const wt = fakeWorktrees()
    const orch = createLaneOrchestrator({
      registryPath,
      worktrees: wt.manager,
      idgen: () => 'lane_create_failure',
      isBackendAvailable: gatewayAvailable,
    })

    await expect(orch.create(input)).rejects.toThrow(
      /lane creation persistence failed \(EISDIR\)/i,
    )
    expect(wt.removed).toEqual([
      path.join(tempRoot, 'wt', 'lane_create_failure'),
    ])
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

  it('awaits an asynchronous backend check and fails closed', async () => {
    const wt = fakeWorktrees()
    const orch = createLaneOrchestrator({
      registryPath: path.join(tempRoot, 'lanes.jsonl'),
      worktrees: wt.manager,
      isBackendAvailable: async () => false,
    })

    await expect(orch.create(input)).rejects.toThrow(/not configured/)
    expect(await orch.list()).toHaveLength(0)
  })

  it('fails closed for gateway backends when no catalogue probe is injected', async () => {
    const wt = fakeWorktrees()
    const orch = createLaneOrchestrator({
      registryPath: path.join(tempRoot, 'lanes.jsonl'),
      worktrees: wt.manager,
    })

    await expect(orch.create(input)).rejects.toThrow(/not configured/)
    expect(await orch.list()).toHaveLength(0)
  })

  it('stop removes the worktree and excludes the lane from the active list', async () => {
    const wt = fakeWorktrees()
    const orch = createLaneOrchestrator({
      registryPath: path.join(tempRoot, 'lanes.jsonl'),
      worktrees: wt.manager,
      idgen: () => 'lane_x',
      isBackendAvailable: gatewayAvailable,
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
      isBackendAvailable: gatewayAvailable,
    })
    await a.create(input)

    const wtB = fakeWorktrees()
    const b = createLaneOrchestrator({
      registryPath,
      worktrees: wtB.manager,
      isBackendAvailable: gatewayAvailable,
    })
    expect(await b.get('lane_p')).not.toBeNull()
    expect(await b.list()).toHaveLength(1)
  })

  it('fails closed when the lane registry is malformed', async () => {
    const registryPath = path.join(tempRoot, 'lanes.jsonl')
    await fs.writeFile(registryPath, '{not-json}\n')
    const orch = createLaneOrchestrator({
      registryPath,
      worktrees: fakeWorktrees().manager,
    })

    await expect(orch.list()).rejects.toThrow(/malformed JSONL/i)
  })

  it('fails closed when a lane registry record is structurally invalid', async () => {
    const registryPath = path.join(tempRoot, 'lanes.jsonl')
    await fs.writeFile(registryPath, '{}\n')
    const orch = createLaneOrchestrator({
      registryPath,
      worktrees: fakeWorktrees().manager,
    })

    await expect(orch.list()).rejects.toThrow(/malformed JSONL/i)
  })

  it('throws a clear error when stopping an unknown lane', async () => {
    const wt = fakeWorktrees()
    const orch = createLaneOrchestrator({
      registryPath: path.join(tempRoot, 'lanes.jsonl'),
      worktrees: wt.manager,
    })
    await expect(orch.stop('nope')).rejects.toThrow(/not found/)
  })

  it('does not report stopped when worktree cleanup fails', async () => {
    const wt = fakeWorktrees()
    wt.manager.remove = async () => {
      throw new Error('permission denied')
    }
    const orch = createLaneOrchestrator({
      registryPath: path.join(tempRoot, 'lanes.jsonl'),
      worktrees: wt.manager,
      idgen: () => 'lane_cleanup_failure',
      isBackendAvailable: gatewayAvailable,
    })
    await orch.create(input)

    await expect(orch.stop('lane_cleanup_failure')).rejects.toThrow(
      /permission denied/,
    )
    await expect(orch.get('lane_cleanup_failure')).resolves.toMatchObject({
      status: 'error',
      blockedReason: expect.stringMatching(/cleanup failed.*permission denied/i),
    })
  })

  it('treats repeated stop as idempotent without removing twice', async () => {
    const wt = fakeWorktrees()
    const orch = createLaneOrchestrator({
      registryPath: path.join(tempRoot, 'lanes.jsonl'),
      worktrees: wt.manager,
      idgen: () => 'lane_idempotent_stop',
      isBackendAvailable: gatewayAvailable,
    })
    await orch.create(input)

    await expect(orch.stop('lane_idempotent_stop')).resolves.toMatchObject({
      status: 'stopped',
    })
    await expect(orch.stop('lane_idempotent_stop')).resolves.toMatchObject({
      status: 'stopped',
    })
    expect(wt.removed).toHaveLength(1)
  })

  it('recovers acknowledged cleanup when final stopped persistence fails', async () => {
    const registryPath = path.join(tempRoot, 'lanes.jsonl')
    let durableStoppingLedger = ''
    let sabotagePersistence = true
    let removeCalls = 0
    const worktrees: WorktreeManager = {
      async create(_repo, laneId) {
        return {
          worktree: path.join(tempRoot, 'wt', laneId),
          branch: `lane/${laneId}`,
        }
      },
      async remove() {
        removeCalls += 1
        if (!sabotagePersistence) return
        durableStoppingLedger = await fs.readFile(registryPath, 'utf8')
        await fs.rm(registryPath)
        await fs.mkdir(registryPath)
      },
    }
    const orch = createLaneOrchestrator({
      registryPath,
      worktrees,
      idgen: () => 'lane_stop_persistence_failure',
      isBackendAvailable: gatewayAvailable,
    })
    await orch.create(input)

    await expect(
      orch.stop('lane_stop_persistence_failure'),
    ).rejects.toThrow()
    await fs.rm(registryPath, { recursive: true })
    await fs.writeFile(registryPath, durableStoppingLedger)
    sabotagePersistence = false

    await expect(
      orch.stop('lane_stop_persistence_failure'),
    ).resolves.toMatchObject({
      status: 'stopped',
      stopAcknowledgedAt: expect.any(Number),
    })
    expect(removeCalls).toBe(2)
  })

  it('coalesces concurrent stop requests from separate orchestrator instances', async () => {
    const registryPath = path.join(tempRoot, 'lanes.jsonl')
    let removeCalls = 0
    let cleanupStarted!: () => void
    const started = new Promise<void>((resolve) => {
      cleanupStarted = resolve
    })
    let releaseCleanup!: () => void
    const released = new Promise<void>((resolve) => {
      releaseCleanup = resolve
    })
    const worktrees: WorktreeManager = {
      async create(_repo, laneId) {
        return {
          worktree: path.join(tempRoot, 'wt', laneId),
          branch: `lane/${laneId}`,
        }
      },
      async remove() {
        removeCalls += 1
        cleanupStarted()
        await released
      },
    }
    const make = () =>
      createLaneOrchestrator({
        registryPath,
        worktrees,
        idgen: () => 'lane_cross_stop',
        isBackendAvailable: gatewayAvailable,
      })
    const firstOrchestrator = make()
    await firstOrchestrator.create(input)
    const secondOrchestrator = make()

    const first = firstOrchestrator.stop('lane_cross_stop')
    await started
    const second = secondOrchestrator.stop('lane_cross_stop')
    await new Promise((resolve) => setTimeout(resolve, 25))

    expect(removeCalls).toBe(1)
    releaseCleanup()
    await expect(Promise.all([first, second])).resolves.toEqual([
      expect.objectContaining({ status: 'stopped' }),
      expect.objectContaining({ status: 'stopped' }),
    ])
  })
})
