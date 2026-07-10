import { describe, it, expect } from 'vitest'
import { withShadow } from './shadow.js'
import { runLoop } from './loop.js'
import type { RunOnceDeps } from './run-once.js'
import type { LinearExecutionPacket, FetchPacketResult } from './packet.js'

const ticket: LinearExecutionPacket = {
  source: 'command-centre:linear-claim',
  runId: 'run-1',
  runner: 'shadow-test',
  issue: { id: 'UNI-777', identifier: 'UNI-777', title: 'Fix a thing', priority: 1 },
  branchName: 'feature/agent-uni-777',
  prompt: 'Repair the failing test',
  steps: [],
}

// "Live" deps: every write effect THROWS. A green run therefore PROVES shadow blocked
// all of them. author + gauntlet are faked green to simulate a successful repair.
function liveDeps(): RunOnceDeps {
  let served = false
  return {
    fetchPacket: async (): Promise<FetchPacketResult> => {
      if (served) return { status: 'idle' }
      served = true
      return { status: 'packet', packet: ticket }
    },
    prepareWorktree: async () => ({ ok: true, path: '/tmp/wt-777', branch: ticket.branchName }),
    cleanupWorktree: async () => {},
    author: async () => ({ ok: true }), // Claude authored a fix
    runGauntlet: async () => ({ passed: true, results: [], failedAt: null }), // Docker gauntlet green
    publishBranch: async () => {
      throw new Error('LIVE push to GitHub attempted')
    },
    openPr: async () => {
      throw new Error('LIVE PR open attempted')
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
      throw new Error('LIVE merge attempted')
    },
  }
}

describe('one ticket, end-to-end, in shadow', () => {
  it('runs the full pipeline and loops to next with zero live writes', async () => {
    const { deps, writes } = withShadow(liveDeps())

    // Must not throw — any of the live write deps would throw if shadow leaked.
    const result = await runLoop(deps, { maxIters: 5, shouldStop: () => false })

    expect(result.stoppedReason).toBe('idle') // pulled the ticket, then the queue drained
    expect(result.iterations).toBe(2) // 1 ticket + 1 idle tick
    expect(result.outcomes[0]?.status).toBe('left_for_human') // stops at the human merge gate
    // The pipeline reached publish + PR — recorded, never performed:
    expect(writes).toEqual([
      { type: 'publish', branch: 'feature/agent-uni-777' },
      { type: 'open_pr', issue: 'UNI-777' },
    ])
    // And crucially: no merge was even attempted.
    expect(writes.some((w) => w.type === 'merge')).toBe(false)
  })
})
