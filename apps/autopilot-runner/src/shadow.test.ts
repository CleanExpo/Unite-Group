import { describe, it, expect } from 'vitest'
import { withShadow } from './shadow.js'
import { runOnce, type RunOnceDeps } from './run-once.js'
import type { LinearExecutionPacket, FetchPacketResult } from './packet.js'

const packet: LinearExecutionPacket = {
  source: 'command-centre:linear-claim',
  runId: 'r1',
  runner: 'test',
  issue: { id: 'i1', identifier: 'UNI-1', title: 'x', priority: 2 },
  branchName: 'feature/agent-uni-1',
  prompt: 'do it',
  steps: [],
}

// Deps whose LIVE write effects THROW — if shadow fails to intercept one, the test throws.
function liveWriteThrowing(fetch: () => Promise<FetchPacketResult>): RunOnceDeps {
  return {
    fetchPacket: fetch,
    prepareWorktree: async () => ({ ok: true, path: '/tmp/wt', branch: 'feature/agent-uni-1' }),
    cleanupWorktree: async () => {},
    author: async () => ({ ok: true }),
    runGauntlet: async () => ({ passed: true, results: [], failedAt: null }),
    publishBranch: async () => {
      throw new Error('LIVE publishBranch attempted')
    },
    openPr: async () => {
      throw new Error('LIVE openPr attempted')
    },
    evaluateMerge: async () => ({
      ci: 'success',
      review: 'approved',
      labels: ['pi-dev:autonomous'],
      baseBranch: 'main',
      linearHistory: true,
      liveGate: false,
      authoredByRunner: true,
    }),
    mergePr: async () => {
      throw new Error('LIVE mergePr attempted')
    },
  }
}

describe('withShadow — physically no live writes', () => {
  it('intercepts publish + open_pr; the live write deps never fire', async () => {
    const { deps, writes } = withShadow(liveWriteThrowing(async () => ({ status: 'packet', packet })))
    const outcome = await runOnce(deps) // would throw if a live write leaked through
    expect(writes.map((w) => w.type)).toEqual(['publish', 'open_pr'])
    expect(outcome.status).toBe('left_for_human') // liveGate off ⇒ never merges
  })

  it('never records a merge in shadow (kill-switch-off short-circuits before merge)', async () => {
    const { deps, writes } = withShadow(liveWriteThrowing(async () => ({ status: 'packet', packet })))
    await runOnce(deps)
    expect(writes.some((w) => w.type === 'merge')).toBe(false)
  })
})
