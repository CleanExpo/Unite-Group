// src/lib/command-centre/team-activity-github.ts
//
// Concrete GitHub commit fetcher for the per-person team-activity tile. Uses the
// REST API via the injected fetch (no Octokit — matches repo-campaigns-github).
// Honest by construction: no token → not_connected; any API failure → error,
// never a fabricated commit.

import type { CommitRecord } from './team-activity'

const GH = 'https://api.github.com'
const PER_PAGE = 100
const MAX_PAGES = 3 // cap: up to 300 commits over the window

export type CommitsResult =
  | { ok: true; commits: CommitRecord[] }
  | { ok: false; reason: 'not_connected' | 'error'; detail?: string }

interface GithubCommitApiShape {
  commit?: {
    message?: string
    author?: { email?: string | null; date?: string | null } | null
    committer?: { email?: string | null; date?: string | null } | null
  }
}

interface FetchDeps {
  token: string | undefined
  fetchFn?: typeof fetch
}

/** Fetch commits on `owner/name` authored since `sinceIso`. Paginated + capped. */
export function makeGithubCommitFetcher(deps: FetchDeps) {
  const fetchFn = deps.fetchFn ?? fetch
  const token = deps.token

  return async (repo: string, sinceIso: string): Promise<CommitsResult> => {
    if (!token) return { ok: false, reason: 'not_connected', detail: 'GITHUB_TOKEN not configured' }
    if (!/^[^/]+\/[^/]+$/.test(repo)) return { ok: false, reason: 'error', detail: `invalid repo "${repo}"` }

    const headers = {
      authorization: `Bearer ${token}`,
      accept: 'application/vnd.github+json',
      'x-github-api-version': '2022-11-28',
    }

    const commits: CommitRecord[] = []
    try {
      for (let page = 1; page <= MAX_PAGES; page++) {
        const url = `${GH}/repos/${repo}/commits?since=${encodeURIComponent(sinceIso)}&per_page=${PER_PAGE}&page=${page}`
        const res = await fetchFn(url, { headers })
        if (res.status === 404) return { ok: false, reason: 'error', detail: 'repo not found' }
        if (!res.ok) return { ok: false, reason: 'error', detail: `commits HTTP ${res.status}` }

        const batch = (await res.json()) as GithubCommitApiShape[]
        if (!Array.isArray(batch) || batch.length === 0) break

        for (const item of batch) {
          const c = item.commit
          const authoredAt = c?.author?.date ?? c?.committer?.date
          if (!authoredAt) continue
          commits.push({
            authorEmail: c?.author?.email ?? null,
            committerEmail: c?.committer?.email ?? null,
            authoredAt,
            subject: (c?.message ?? '').split('\n')[0]!.trim(),
          })
        }

        if (batch.length < PER_PAGE) break // last page
      }
      return { ok: true, commits }
    } catch (err) {
      return { ok: false, reason: 'error', detail: err instanceof Error ? err.message : 'fetch failed' }
    }
  }
}
