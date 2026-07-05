// src/lib/command-centre/__tests__/team-activity-github.test.ts
// GitHub commit fetcher — honest degradation, incl. request timeout (UNI-2307).
import { describe, it, expect, vi } from 'vitest'
import { makeGithubCommitFetcher } from '../team-activity-github'

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
})
