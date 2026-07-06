// src/lib/command-centre/__tests__/team-activity-github.test.ts
// GitHub commit fetcher — honest degradation, incl. request timeout (UNI-2307).
import { describe, it, expect, vi } from 'vitest'
import { makeGithubCommitFetcher, fetchTeamCommits } from '../team-activity-github'

describe('makeGithubCommitFetcher', () => {
  it('not_connected when no token is configured', async () => {
    const fetchCommits = makeGithubCommitFetcher({ token: undefined })
    const res = await fetchCommits('owner/repo', '2026-06-01T00:00:00.000Z')
    expect(res).toEqual({ ok: false, reason: 'not_connected', detail: 'GITHUB_TOKEN not configured' })
  })

  it('passes an AbortSignal (request timeout) on every page fetch', async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [],
    })
    const fetchCommits = makeGithubCommitFetcher({ token: 't', fetchFn: fetchFn as unknown as typeof fetch })
    await fetchCommits('owner/repo', '2026-06-01T00:00:00.000Z')

    expect(fetchFn).toHaveBeenCalledTimes(1)
    const [, init] = fetchFn.mock.calls[0]!
    expect(init.signal).toBeInstanceOf(AbortSignal)
  })

  it('degrades to an honest error result (not a throw) when the request times out', async () => {
    const fetchFn = vi.fn().mockImplementation(() => Promise.reject(new DOMException('The operation was aborted due to timeout', 'TimeoutError')))
    const fetchCommits = makeGithubCommitFetcher({ token: 't', fetchFn: fetchFn as unknown as typeof fetch })

    const res = await fetchCommits('owner/repo', '2026-06-01T00:00:00.000Z')

    expect(res.ok).toBe(false)
    expect((res as { reason: string }).reason).toBe('error')
    expect((res as { detail?: string }).detail).toMatch(/timeout/i)
  })

  it('tags every returned commit with the repo it was fetched from', async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [{ commit: { message: 'feat: x', author: { email: 'a@b.com', date: '2026-07-01T00:00:00.000Z' } } }],
    })
    const fetchCommits = makeGithubCommitFetcher({ token: 't', fetchFn: fetchFn as unknown as typeof fetch })
    const res = await fetchCommits('CleanExpo/Unite-Group', '2026-06-01T00:00:00.000Z')

    expect(res.ok).toBe(true)
    expect((res as { commits: { repo: string }[] }).commits[0]!.repo).toBe('CleanExpo/Unite-Group')
  })
})

describe('fetchTeamCommits', () => {
  it('fetches each repo in the union exactly once, even with duplicates in the input', async () => {
    const fetchFn = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => [] })
    await fetchTeamCommits(
      ['CleanExpo/CCW-CRM', 'CleanExpo/Unite-Group', 'CleanExpo/CCW-CRM'],
      '2026-06-01T00:00:00.000Z',
      { token: 't', fetchFn: fetchFn as unknown as typeof fetch },
    )
    expect(fetchFn).toHaveBeenCalledTimes(2)
  })

  it('combines commits across repos and tags each with its source repo', async () => {
    const fetchFn = vi.fn().mockImplementation((url: string) => Promise.resolve({
      ok: true,
      status: 200,
      json: async () => [{
        commit: {
          message: url.includes('Unite-Group') ? 'feat: unite' : 'feat: ccw',
          author: { email: 'a@b.com', date: '2026-07-01T00:00:00.000Z' },
        },
      }],
    }))
    const res = await fetchTeamCommits(
      ['CleanExpo/CCW-CRM', 'CleanExpo/Unite-Group'],
      '2026-06-01T00:00:00.000Z',
      { token: 't', fetchFn: fetchFn as unknown as typeof fetch },
    )
    expect(res.commits).toHaveLength(2)
    expect(res.failures).toEqual([])
    expect(res.commits.map((c) => c.repo).sort()).toEqual(['CleanExpo/CCW-CRM', 'CleanExpo/Unite-Group'])
  })

  it('degrades one failing repo to a recorded failure without dropping the other repos\' commits', async () => {
    const fetchFn = vi.fn().mockImplementation((url: string) => {
      if (url.includes('Unite-Group')) return Promise.resolve({ status: 404, ok: false, json: async () => ({}) })
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => [{ commit: { message: 'feat: ccw', author: { email: 'a@b.com', date: '2026-07-01T00:00:00.000Z' } } }],
      })
    })
    const res = await fetchTeamCommits(
      ['CleanExpo/CCW-CRM', 'CleanExpo/Unite-Group'],
      '2026-06-01T00:00:00.000Z',
      { token: 't', fetchFn: fetchFn as unknown as typeof fetch },
    )
    expect(res.commits).toHaveLength(1)
    expect(res.commits[0]!.repo).toBe('CleanExpo/CCW-CRM')
    expect(res.failures).toEqual([{ repo: 'CleanExpo/Unite-Group', reason: 'error', detail: 'repo not found' }])
  })

  it('reports not_connected per repo when no token is configured', async () => {
    const res = await fetchTeamCommits(['CleanExpo/CCW-CRM', 'CleanExpo/Unite-Group'], '2026-06-01T00:00:00.000Z', { token: undefined })
    expect(res.commits).toEqual([])
    expect(res.failures).toHaveLength(2)
    expect(res.failures.every((f) => f.reason === 'not_connected')).toBe(true)
  })
})
