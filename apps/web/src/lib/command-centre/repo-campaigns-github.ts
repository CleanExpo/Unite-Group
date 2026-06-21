// src/lib/command-centre/repo-campaigns-github.ts
//
// Concrete GitHub signal fetcher for the repo-campaigns overview. Uses the REST
// API via the injected fetch (no Octokit dependency — matches the existing
// webhook handler's plain-fetch pattern). Honest by construction: with no token
// it returns `not_connected`; on any API failure it returns `error`, never a
// fabricated signal.

import type { GithubRepoFetcher, RepoSignalResult } from './repo-campaigns'

const GH = 'https://api.github.com'

interface FetchDeps {
  token: string | undefined
  fetchFn?: typeof fetch
}

/**
 * Build a fetcher for "owner/name" repos. Two REST calls per repo: the repo
 * (default branch + last push time) and open PRs (count). Returns honest
 * not_connected/error states rather than throwing.
 */
export function makeGithubRepoFetcher(deps: FetchDeps): GithubRepoFetcher {
  const fetchFn = deps.fetchFn ?? fetch
  const token = deps.token

  return async (repo: string): Promise<RepoSignalResult> => {
    if (!token) return { ok: false, reason: 'not_connected', detail: 'GITHUB_TOKEN not configured' }
    if (!/^[^/]+\/[^/]+$/.test(repo)) return { ok: false, reason: 'error', detail: `invalid repo "${repo}"` }

    const headers = {
      authorization: `Bearer ${token}`,
      accept: 'application/vnd.github+json',
      'x-github-api-version': '2022-11-28',
    }

    try {
      const [repoRes, pullsRes] = await Promise.all([
        fetchFn(`${GH}/repos/${repo}`, { headers }),
        fetchFn(`${GH}/repos/${repo}/pulls?state=open&per_page=100`, { headers }),
      ])

      if (repoRes.status === 404) return { ok: false, reason: 'error', detail: 'repo not found' }
      if (!repoRes.ok) return { ok: false, reason: 'error', detail: `repo HTTP ${repoRes.status}` }
      if (!pullsRes.ok) return { ok: false, reason: 'error', detail: `pulls HTTP ${pullsRes.status}` }

      const repoData = (await repoRes.json()) as { default_branch?: string; pushed_at?: string | null }
      const pulls = (await pullsRes.json()) as unknown[]

      return {
        ok: true,
        signal: {
          defaultBranch: repoData.default_branch ?? 'main',
          openPRs: Array.isArray(pulls) ? pulls.length : 0,
          lastCommitAt: repoData.pushed_at ?? null,
        },
      }
    } catch (err) {
      return { ok: false, reason: 'error', detail: err instanceof Error ? err.message : 'fetch failed' }
    }
  }
}
