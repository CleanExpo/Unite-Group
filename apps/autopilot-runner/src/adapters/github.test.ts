import { describe, it, expect, vi } from 'vitest'
import { makeOpenPr, makeEvaluateMerge, makeMergePr, RUNNER_PR_LABEL, type GithubOps } from './github.js'
import type { LinearExecutionPacket } from '../packet.js'

const packet: LinearExecutionPacket = {
  source: 'command-centre:linear-claim',
  runId: 'r',
  runner: 'pi-dev-autopilot',
  issue: { id: 'a', identifier: 'UNI-9', title: 'do it', url: 'https://linear.app/x/UNI-9', priority: 2 },
  branchName: 'pidev/auto-uni-9',
  prompt: 'p',
  steps: [],
}

/** A fake GithubOps with all-passing defaults; override per test. */
function fakeOps(overrides: Partial<GithubOps> = {}): GithubOps {
  return {
    createPullRequest: async () => ({ number: 42, url: 'https://github.com/x/y/pull/42' }),
    addLabels: vi.fn(async () => {}),
    getCiState: async () => 'success',
    getReviewVerdict: async () => 'approved',
    getPrLabels: async () => [RUNNER_PR_LABEL],
    isUpToDateWithBase: async () => true,
    squashMerge: async () => ({ merged: true }),
    ...overrides,
  }
}

describe('makeOpenPr', () => {
  it('opens a PR and stamps the autonomous label', async () => {
    const ops = fakeOps()
    const r = await makeOpenPr(ops)(packet)
    expect(r).toEqual({ ok: true, prNumber: 42, url: 'https://github.com/x/y/pull/42' })
    expect(ops.addLabels).toHaveBeenCalledWith(42, [RUNNER_PR_LABEL])
  })

  it('targets main with the packet branch as head', async () => {
    const createPullRequest = vi.fn(async () => ({ number: 1, url: 'u' }))
    await makeOpenPr(fakeOps({ createPullRequest }))(packet)
    expect(createPullRequest).toHaveBeenCalledWith(
      expect.objectContaining({ head: 'pidev/auto-uni-9', base: 'main', title: 'UNI-9: do it' }),
    )
  })

  it('fails closed when PR creation throws', async () => {
    const r = await makeOpenPr(fakeOps({ createPullRequest: async () => { throw new Error('rate limited') } }))(packet)
    expect(r).toEqual({ ok: false, error: 'rate limited' })
  })
})

describe('makeEvaluateMerge', () => {
  it('maps ops + live gate into a MergeContext', async () => {
    const ctx = await makeEvaluateMerge(fakeOps(), { liveGate: () => true })(42, packet)
    expect(ctx).toEqual({
      ci: 'success',
      review: 'approved',
      labels: [RUNNER_PR_LABEL],
      baseBranch: 'main',
      linearHistory: true,
      liveGate: true,
      authoredByRunner: true,
    })
  })

  it('reflects a pending CI + drained live gate', async () => {
    const ctx = await makeEvaluateMerge(
      fakeOps({ getCiState: async () => 'pending', isUpToDateWithBase: async () => false }),
      { liveGate: () => false },
    )(42, packet)
    expect(ctx).toMatchObject({ ci: 'pending', linearHistory: false, liveGate: false })
  })
})

describe('makeMergePr', () => {
  it('returns ok when the squash merge succeeds', async () => {
    expect(await makeMergePr(fakeOps())(42)).toEqual({ ok: true })
  })

  it('returns the rejection message when not merged', async () => {
    const ops = fakeOps({ squashMerge: async () => ({ merged: false, message: 'not mergeable' }) })
    expect(await makeMergePr(ops)(42)).toEqual({ ok: false, error: 'not mergeable' })
  })

  it('fails closed when the merge throws', async () => {
    const ops = fakeOps({ squashMerge: async () => { throw new Error('protected branch') } })
    expect(await makeMergePr(ops)(42)).toEqual({ ok: false, error: 'protected branch' })
  })
})
