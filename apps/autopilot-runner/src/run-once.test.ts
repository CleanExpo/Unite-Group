import { describe, it, expect, vi } from 'vitest'
import { runOnce, type RunOnceDeps } from './run-once'
import type { LinearExecutionPacket } from './packet'
import type { MergeContext } from './merge-policy'

const packet: LinearExecutionPacket = {
  source: 'command-centre:linear-claim',
  runId: 'r1',
  runner: 'pi-dev-autopilot',
  issue: { id: 'a', identifier: 'UNI-9', title: 'do the thing', priority: 2 },
  branchName: 'pidev/auto-uni-9',
  prompt: 'build it',
  steps: [],
}

/** A merge context that clears every gate (decideMerge → merge). */
const clearedCtx: MergeContext = {
  ci: 'success',
  review: 'approved',
  labels: ['mesh:auto'],
  baseBranch: 'main',
  linearHistory: true,
  liveGate: true,
  authoredByRunner: true,
}

/** All-succeeding deps; override per test. cleanup is a spy so we can assert it always runs. */
function makeDeps(overrides: Partial<RunOnceDeps> = {}): RunOnceDeps {
  return {
    fetchPacket: async () => ({ status: 'packet', packet }),
    prepareWorktree: async () => ({ ok: true, path: '/tmp/wt/pidev-auto-uni-9', branch: packet.branchName }),
    cleanupWorktree: vi.fn(async () => {}),
    author: async () => ({ ok: true }),
    runGauntlet: async () => ({ passed: true, results: [], failedAt: null }),
    openPr: async () => ({ ok: true, prNumber: 42, url: 'https://github.com/x/y/pull/42' }),
    evaluateMerge: async () => clearedCtx,
    mergePr: async () => ({ ok: true }),
    ...overrides,
  }
}

describe('runOnce — happy path', () => {
  it('merges when every stage and gate passes', async () => {
    const deps = makeDeps()
    const r = await runOnce(deps)
    expect(r).toEqual({ status: 'merged', prNumber: 42 })
    expect(deps.cleanupWorktree).toHaveBeenCalledWith('/tmp/wt/pidev-auto-uni-9')
  })

  it('only merges via mergePr after decideMerge clears', async () => {
    const mergePr = vi.fn(async () => ({ ok: true }))
    await runOnce(makeDeps({ mergePr }))
    expect(mergePr).toHaveBeenCalledWith(42)
  })
})

describe('runOnce — short-circuits', () => {
  it('returns idle and never touches a worktree', async () => {
    const prepareWorktree = vi.fn(async () => ({ ok: true as const, path: '/x', branch: 'b' }))
    const r = await runOnce(makeDeps({ fetchPacket: async () => ({ status: 'idle' }), prepareWorktree }))
    expect(r).toEqual({ status: 'idle' })
    expect(prepareWorktree).not.toHaveBeenCalled()
  })

  it('errors at the fetch stage', async () => {
    const r = await runOnce(makeDeps({ fetchPacket: async () => ({ status: 'error', error: 'boom' }) }))
    expect(r).toEqual({ status: 'error', stage: 'fetch', error: 'boom' })
  })

  it('errors at the worktree stage (and does not author)', async () => {
    const author = vi.fn(async () => ({ ok: true }))
    const r = await runOnce(makeDeps({ prepareWorktree: async () => ({ ok: false, error: 'exists' }), author }))
    expect(r).toEqual({ status: 'error', stage: 'worktree', error: 'exists' })
    expect(author).not.toHaveBeenCalled()
  })
})

describe('runOnce — fail-closed gates (worktree always cleaned up)', () => {
  it('leaves for human when authoring fails', async () => {
    const deps = makeDeps({ author: async () => ({ ok: false, error: 'claude died' }) })
    const r = await runOnce(deps)
    expect(r).toEqual({ status: 'left_for_human', reason: 'authoring failed: claude died' })
    expect(deps.cleanupWorktree).toHaveBeenCalled()
  })

  it('leaves for human when the gauntlet fails — never opens a PR', async () => {
    const openPr = vi.fn(async () => ({ ok: true as const, prNumber: 1, url: 'u' }))
    const r = await runOnce(makeDeps({
      runGauntlet: async () => ({ passed: false, results: [], failedAt: 'pnpm type-check' }),
      openPr,
    }))
    expect(r).toEqual({ status: 'left_for_human', reason: 'gauntlet failed at pnpm type-check' })
    expect(openPr).not.toHaveBeenCalled()
  })

  it('errors at the open_pr stage', async () => {
    const r = await runOnce(makeDeps({ openPr: async () => ({ ok: false, error: 'rate limited' }) }))
    expect(r).toEqual({ status: 'error', stage: 'open_pr', error: 'rate limited' })
  })

  it('returns pending (does not merge) when CI is still running', async () => {
    const mergePr = vi.fn(async () => ({ ok: true }))
    const r = await runOnce(makeDeps({
      evaluateMerge: async () => ({ ...clearedCtx, ci: 'pending' }),
      mergePr,
    }))
    expect(r).toEqual({ status: 'pending', reason: 'ci-pending', prNumber: 42 })
    expect(mergePr).not.toHaveBeenCalled()
  })

  it('leaves the PR for a human when decideMerge says so (changes requested)', async () => {
    const mergePr = vi.fn(async () => ({ ok: true }))
    const r = await runOnce(makeDeps({
      evaluateMerge: async () => ({ ...clearedCtx, review: 'changes_requested' }),
      mergePr,
    }))
    expect(r).toEqual({ status: 'left_for_human', reason: 'changes-requested', prNumber: 42 })
    expect(mergePr).not.toHaveBeenCalled()
  })

  it('errors at the merge stage if the merge call fails', async () => {
    const r = await runOnce(makeDeps({ mergePr: async () => ({ ok: false, error: 'protected' }) }))
    expect(r).toEqual({ status: 'error', stage: 'merge', error: 'protected' })
  })

  it('cleans up the worktree even when a later stage throws', async () => {
    const cleanupWorktree = vi.fn(async () => {})
    await expect(
      runOnce(makeDeps({ author: async () => { throw new Error('kaboom') }, cleanupWorktree })),
    ).rejects.toThrow('kaboom')
    expect(cleanupWorktree).toHaveBeenCalled()
  })
})
