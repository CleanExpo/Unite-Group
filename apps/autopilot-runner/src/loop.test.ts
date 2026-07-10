import { describe, it, expect } from 'vitest'
import { join } from 'node:path'
import { runLoop, hardStopEngaged } from './loop.js'
import type { RunOnceDeps } from './run-once.js'
import type { LinearExecutionPacket, FetchPacketResult } from './packet.js'

function mkPacket(id: string): LinearExecutionPacket {
  return {
    source: 'command-centre:linear-claim',
    runId: id,
    runner: 'test',
    issue: { id, identifier: `UNI-${id}`, title: 't', priority: 2 },
    branchName: `feature/agent-${id}`,
    prompt: 'p',
    steps: [],
  }
}

function depsFor(fetch: () => Promise<FetchPacketResult>): RunOnceDeps {
  return {
    fetchPacket: fetch,
    prepareWorktree: async () => ({ ok: true, path: '/tmp/wt', branch: 'feature/agent-x' }),
    cleanupWorktree: async () => {},
    author: async () => ({ ok: true }),
    runGauntlet: async () => ({ passed: true, results: [], failedAt: null }),
    publishBranch: async () => ({ ok: true, hasChanges: true }),
    openPr: async () => ({ ok: true, prNumber: 1, url: 'u' }),
    evaluateMerge: async () => ({
      ci: 'success',
      review: 'approved',
      labels: [],
      baseBranch: 'main',
      linearHistory: true,
      liveGate: false,
      authoredByRunner: true,
    }),
    mergePr: async () => ({ ok: true }),
  }
}

function queued(packets: LinearExecutionPacket[]) {
  let i = 0
  return async (): Promise<FetchPacketResult> =>
    i < packets.length ? { status: 'packet', packet: packets[i++]! } : { status: 'idle' }
}

describe('runLoop — pull next until drained / capped / stopped', () => {
  it('drains the queue then stops on idle', async () => {
    const res = await runLoop(depsFor(queued([mkPacket('a'), mkPacket('b')])), { maxIters: 10 })
    expect(res.stoppedReason).toBe('idle')
    expect(res.iterations).toBe(3) // 2 packets + 1 idle tick
    expect(res.outcomes.at(-1)?.status).toBe('idle')
  })

  it('stops at the iteration cap when tasks never drain', async () => {
    const res = await runLoop(depsFor(async () => ({ status: 'packet', packet: mkPacket('x') })), { maxIters: 3 })
    expect(res.stoppedReason).toBe('max_iters')
    expect(res.iterations).toBe(3)
  })

  it('honours the stop signal before running any tick', async () => {
    const res = await runLoop(depsFor(queued([mkPacket('a')])), { maxIters: 5, shouldStop: () => true })
    expect(res.stoppedReason).toBe('stopped')
    expect(res.iterations).toBe(0)
    expect(res.outcomes).toEqual([])
  })
})

describe('hardStopEngaged', () => {
  it('is true when the drain file exists, false otherwise', () => {
    expect(hardStopEngaged(join(process.cwd(), 'package.json'))).toBe(true)
    expect(hardStopEngaged('/no/such/hard_stop/file')).toBe(false)
  })
})
