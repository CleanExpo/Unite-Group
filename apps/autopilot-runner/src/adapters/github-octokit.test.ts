import { describe, it, expect, vi } from 'vitest'
import {
  createGithubOps,
  aggregateCi,
  latestReviewVerdict,
  parseRepo,
  type OctokitLike,
} from './github-octokit'

describe('aggregateCi', () => {
  it('fails on a failing combined status', () => {
    expect(aggregateCi([], 'failure')).toBe('failure')
  })
  it('fails on a failing check-run conclusion', () => {
    expect(aggregateCi([{ status: 'completed', conclusion: 'failure' }], 'success')).toBe('failure')
  })
  it('pends while a check is still running', () => {
    expect(aggregateCi([{ status: 'in_progress', conclusion: null }], 'success')).toBe('pending')
  })
  it('pends on a pending combined status', () => {
    expect(aggregateCi([{ status: 'completed', conclusion: 'success' }], 'pending')).toBe('pending')
  })
  it('succeeds when all checks completed green', () => {
    expect(aggregateCi([{ status: 'completed', conclusion: 'success' }, { status: 'completed', conclusion: 'skipped' }], 'success')).toBe('success')
  })
  it('succeeds when there are no checks at all', () => {
    expect(aggregateCi([], 'success')).toBe('success')
  })
})

describe('latestReviewVerdict', () => {
  it('returns none when no review submitted', () => {
    expect(latestReviewVerdict([{ state: 'COMMENTED', submitted_at: null }])).toBe('none')
  })
  it('returns approved for the latest APPROVED', () => {
    expect(latestReviewVerdict([
      { state: 'CHANGES_REQUESTED', submitted_at: '2026-06-01' },
      { state: 'APPROVED', submitted_at: '2026-06-02' },
    ])).toBe('approved')
  })
  it('returns changes_requested for the latest such review', () => {
    expect(latestReviewVerdict([{ state: 'CHANGES_REQUESTED', submitted_at: '2026-06-02' }])).toBe('changes_requested')
  })
})

describe('parseRepo', () => {
  it('splits owner/name', () => {
    expect(parseRepo('CleanExpo/Unite-Group')).toEqual({ owner: 'CleanExpo', name: 'Unite-Group' })
  })
  it('throws on a bad value', () => {
    expect(() => parseRepo('no-slash')).toThrow(/invalid GH_REPO/)
  })
})

function fakeClient(overrides: Partial<OctokitLike> = {}): OctokitLike {
  return {
    pulls: {
      create: vi.fn(async () => ({ data: { number: 7, html_url: 'https://github.com/x/y/pull/7' } })),
      get: vi.fn(async () => ({ data: { head: { sha: 'abc' }, mergeable_state: 'clean' } })),
      listReviews: vi.fn(async () => ({ data: [] })),
      merge: vi.fn(async () => ({ data: { merged: true } })),
      ...(overrides.pulls ?? {}),
    } as OctokitLike['pulls'],
    issues: {
      addLabels: vi.fn(async () => ({})),
      listLabelsOnIssue: vi.fn(async () => ({ data: [{ name: 'mesh:auto' }] })),
      ...(overrides.issues ?? {}),
    } as OctokitLike['issues'],
    checks: {
      listForRef: vi.fn(async () => ({ data: { check_runs: [{ status: 'completed', conclusion: 'success' }] } })),
      ...(overrides.checks ?? {}),
    } as OctokitLike['checks'],
    repos: {
      getCombinedStatusForRef: vi.fn(async () => ({ data: { state: 'success' } })),
      ...(overrides.repos ?? {}),
    } as OctokitLike['repos'],
  }
}

const repo = { owner: 'CleanExpo', name: 'Unite-Group' }

describe('createGithubOps', () => {
  it('createPullRequest returns number + url and passes the repo', async () => {
    const client = fakeClient()
    const ops = createGithubOps(client, repo)
    const r = await ops.createPullRequest({ title: 't', head: 'b', base: 'main', body: 'x' })
    expect(r).toEqual({ number: 7, url: 'https://github.com/x/y/pull/7' })
    expect(client.pulls.create).toHaveBeenCalledWith(expect.objectContaining({ owner: 'CleanExpo', repo: 'Unite-Group', base: 'main' }))
  })

  it('getCiState aggregates checks + combined status', async () => {
    const ops = createGithubOps(fakeClient(), repo)
    expect(await ops.getCiState(7)).toBe('success')
  })

  it('getReviewVerdict reflects the latest review', async () => {
    const client = fakeClient({ pulls: { ...fakeClient().pulls, listReviews: vi.fn(async () => ({ data: [{ state: 'APPROVED', submitted_at: '2026-06-02' }] })) } })
    expect(await createGithubOps(client, repo).getReviewVerdict(7)).toBe('approved')
  })

  it('isUpToDateWithBase is false when behind', async () => {
    const client = fakeClient({ pulls: { ...fakeClient().pulls, get: vi.fn(async () => ({ data: { head: { sha: 'abc' }, mergeable_state: 'behind' } })) } })
    expect(await createGithubOps(client, repo).isUpToDateWithBase(7)).toBe(false)
  })

  it('squashMerge uses the squash method', async () => {
    const client = fakeClient()
    await createGithubOps(client, repo).squashMerge(7)
    expect(client.pulls.merge).toHaveBeenCalledWith(expect.objectContaining({ pull_number: 7, merge_method: 'squash' }))
  })
})
