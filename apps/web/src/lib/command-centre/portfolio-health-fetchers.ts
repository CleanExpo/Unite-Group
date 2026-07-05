// src/lib/command-centre/portfolio-health-fetchers.ts
//
// UNI-2201 — concrete upstream fetchers for the portfolio-health aggregator.
// Same plain-fetch, honest-state discipline as repo-campaigns-github.ts. The
// GITHUB_TOKEN / LINEAR_API_KEY are only ever attached to the outbound request
// headers — never returned to the caller or embedded in a value.

import type { GithubRunsFetcher, LinearP0P1Fetcher, RunLite } from './portfolio-health'

const GH = 'https://api.github.com'
const LINEAR_GQL = 'https://api.linear.app/graphql'
const UPSTREAM_TIMEOUT_MS = 8000

/**
 * Live GitHub Actions CI fetcher: the latest 10 runs on the repo's main branch.
 * Mirrors the operator-mcp `get-portfolio-health` tool's query, but driven by
 * GITHUB_TOKEN over the REST API so it runs from Vercel rather than a local
 * `gh` CLI. Returns an honest error string rather than throwing.
 */
export function makeGithubRunsFetcher(token: string): GithubRunsFetcher {
  const headers = {
    authorization: `Bearer ${token}`,
    accept: 'application/vnd.github+json',
    'x-github-api-version': '2022-11-28',
  }

  return async (fullName) => {
    if (!/^[^/]+\/[^/]+$/.test(fullName)) return { ok: false, error: `invalid repo "${fullName}"` }
    try {
      const res = await fetch(
        `${GH}/repos/${fullName}/actions/runs?branch=main&per_page=10`,
        { headers, cache: 'no-store', signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS) },
      )
      if (res.status === 404) return { ok: false, error: 'repo not found or no access' }
      if (!res.ok) return { ok: false, error: `HTTP ${res.status}` }
      const data = (await res.json()) as { workflow_runs?: RunLite[] }
      const runs = Array.isArray(data.workflow_runs) ? data.workflow_runs : []
      return { ok: true, runs }
    } catch (err) {
      const timedOut = err instanceof Error && err.name === 'TimeoutError'
      return { ok: false, error: timedOut ? 'timeout' : err instanceof Error ? err.message : 'fetch failed' }
    }
  }
}

const P0P1_QUERY = `query PortfolioP0P1 {
  issues(first: 100, filter: {
    priority: { in: [1, 2] }
    completedAt: { null: true }
    canceledAt: { null: true }
  }) { nodes { id } }
}`

/**
 * Portfolio-wide count of open urgent(1)+high(2) Linear issues. Absent key →
 * an explicit not_configured signal (never a fabricated zero). Bounded at the
 * first 100 open P0/P1 — a count past that is a red flag on its own.
 */
export function makeLinearP0P1Fetcher(apiKey: string | undefined): LinearP0P1Fetcher {
  return async () => {
    if (!apiKey) return { ok: 'not_configured' }
    try {
      const res = await fetch(LINEAR_GQL, {
        method: 'POST',
        headers: { authorization: apiKey, 'content-type': 'application/json' },
        body: JSON.stringify({ query: P0P1_QUERY }),
        cache: 'no-store',
        signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      })
      if (!res.ok) return { ok: false, error: `HTTP ${res.status}` }
      const json = (await res.json()) as { data?: { issues?: { nodes?: unknown[] } }; errors?: unknown }
      if (json.errors || !json.data?.issues) return { ok: false, error: 'graphql error' }
      return { ok: true, count: json.data.issues.nodes?.length ?? 0 }
    } catch (err) {
      const timedOut = err instanceof Error && err.name === 'TimeoutError'
      return { ok: false, error: timedOut ? 'timeout' : err instanceof Error ? err.message : 'fetch failed' }
    }
  }
}
