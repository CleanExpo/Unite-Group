// src/lib/command-centre/in-progress-prs.ts
//
// Lane 16.5 — In-Progress PRs tile (UNI-2340 slice: serverless GitHub API).
//
// Previously shelled out to a locally-authenticated `gh` CLI, which does not
// exist on Vercel — the tile rendered permanently empty in production. Now
// reads open PRs across every portfolio repo via the GitHub REST API with
// GITHUB_TOKEN (same injected-fetch pattern as repo-campaigns-github /
// team-activity-github). Honest by construction: no token → available:false
// with the reason; per-repo failures are reported, never papered over.

import { getProjects } from './registry'

const GH = 'https://api.github.com'
const PER_REPO_LIMIT = 50
const MAX_ENTRIES = 30

export interface InProgressPR {
  /** PR number, as a string (kept string for the tile's existing render). */
  number: string
  title: string
  author: string
  head_ref: string
  /** ISO 8601 timestamp the PR was created. */
  created_at: string
  url: string
  age_days: number | null
  /** "owner/name" the PR belongs to (multi-repo view). */
  repo: string
}

export interface InProgressPRsResult {
  /** Data source identifier for the tile's honesty line. */
  source: 'github_api'
  scanned_at: string
  /** True when GITHUB_TOKEN is configured AND at least one repo was queryable. */
  available: boolean
  /** Open PRs across all portfolio repos, newest first (capped). */
  entries: InProgressPR[]
  /** Human-readable status, suitable for tile render. */
  status_message: string
  /** Non-null when the source is unavailable or some repos failed. */
  read_error: string | null
}

interface GithubPullApiShape {
  number?: number
  title?: string
  user?: { login?: string } | null
  head?: { ref?: string } | null
  created_at?: string
  html_url?: string
}

export interface InProgressPRsDeps {
  token?: string | undefined
  fetchFn?: typeof fetch
  /** "owner/name" repos to scan; defaults to the portfolio registry. */
  repos?: string[]
  now?: () => Date
}

function emptyResult(now: () => Date, available: boolean, status: string, error: string | null): InProgressPRsResult {
  return {
    source: 'github_api',
    scanned_at: now().toISOString(),
    available,
    entries: [],
    status_message: status,
    read_error: error,
  }
}

/**
 * List open PRs across the portfolio repos via the GitHub REST API.
 * Never throws; degrades honestly (no token / repo failures reported).
 */
export async function listInProgressPRs(deps: InProgressPRsDeps = {}): Promise<InProgressPRsResult> {
  const now = deps.now ?? (() => new Date())
  const token = deps.token ?? process.env.GITHUB_TOKEN
  const fetchFn = deps.fetchFn ?? fetch

  if (!token) {
    return emptyResult(now, false, 'GitHub not connected', 'GITHUB_TOKEN not configured')
  }

  let repos = deps.repos
  if (!repos) {
    try {
      const projects = await getProjects()
      repos = [...new Set(projects.map((p) => p.github_repo).filter((r): r is string => !!r))]
    } catch (err) {
      return emptyResult(now, false, 'portfolio registry unavailable', err instanceof Error ? err.message : 'registry read failed')
    }
  }
  if (repos.length === 0) {
    return emptyResult(now, true, 'no portfolio repos declared', null)
  }

  const headers = {
    authorization: `Bearer ${token}`,
    accept: 'application/vnd.github+json',
    'x-github-api-version': '2022-11-28',
  }

  const failures: string[] = []
  const perRepo = await Promise.all(
    repos.map(async (repo): Promise<InProgressPR[]> => {
      if (!/^[^/]+\/[^/]+$/.test(repo)) {
        failures.push(`${repo}: invalid repo name`)
        return []
      }
      try {
        const res = await fetchFn(`${GH}/repos/${repo}/pulls?state=open&per_page=${PER_REPO_LIMIT}`, {
          headers,
          signal: AbortSignal.timeout(8000),
          // Short data-cache window: absorbs founder page reloads and serves
          // through brief GitHub degradations (matches sibling tiles' 60s cadence).
          next: { revalidate: 60 },
        })
        if (!res.ok) {
          failures.push(`${repo}: HTTP ${res.status}`)
          return []
        }
        const rows = (await res.json()) as unknown
        if (!Array.isArray(rows)) {
          failures.push(`${repo}: non-array response`)
          return []
        }
        return rows
          .map((raw): InProgressPR | null => {
            if (typeof raw !== 'object' || raw === null) return null
            const r = raw as GithubPullApiShape
            if (
              typeof r.number !== 'number' ||
              typeof r.title !== 'string' ||
              typeof r.created_at !== 'string' ||
              typeof r.html_url !== 'string'
            ) {
              return null
            }
            const created = new Date(r.created_at)
            const ageMs = now().getTime() - created.getTime()
            const ageDays = Number.isFinite(ageMs) ? Math.max(0, Math.round(ageMs / 86_400_000)) : null
            return {
              number: String(r.number),
              title: r.title,
              author: r.user?.login ?? 'unknown',
              head_ref: r.head?.ref ?? '',
              created_at: r.created_at,
              url: r.html_url,
              age_days: ageDays,
              repo,
            }
          })
          .filter((e): e is InProgressPR => e !== null)
      } catch (err) {
        failures.push(`${repo}: ${err instanceof Error ? err.message : 'fetch failed'}`)
        return []
      }
    }),
  )

  const entries = perRepo
    .flat()
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
    .slice(0, MAX_ENTRIES)

  const allFailed = failures.length === repos.length
  const reachable = repos.length - failures.length
  // Honesty: a partial failure must never read as an all-clear.
  const unreachableNote = failures.length > 0 ? ` (${failures.length} of ${repos.length} repos unreachable)` : ''
  const status =
    entries.length === 0
      ? allFailed
        ? 'GitHub queries failed for every repo'
        : `no open PRs across reachable repos${unreachableNote}`
      : `${entries.length} open PRs across ${reachable} repos${unreachableNote}`

  return {
    source: 'github_api',
    scanned_at: now().toISOString(),
    available: !allFailed,
    entries,
    status_message: status,
    read_error: failures.length ? failures.join('; ') : null,
  }
}
