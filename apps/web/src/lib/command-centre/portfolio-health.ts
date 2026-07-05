// src/lib/command-centre/portfolio-health.ts
//
// UNI-2201 — Nexus portfolio health. Aggregates live GitHub Actions CI health
// across the three portfolio repos (RestoreAssist, Synthex, Nexus) plus a
// portfolio-wide count of open P0/P1 (urgent/high) Linear issues, and reduces
// each to a red / yellow / green signal for the Mission Control command deck.
//
// Honest by construction: the source discriminators surface not_configured /
// error / partial states so a degraded upstream can never be dressed as live
// (No-Invaders rule #1). Pure logic here; the route injects the real fetchers
// and owns the secrets — no token is ever attached to a value in this module.

export type Conclusion =
  | 'success'
  | 'failure'
  | 'cancelled'
  | 'skipped'
  | 'in_progress'
  | 'unknown'

export type HealthColor = 'green' | 'yellow' | 'red' | 'grey'

/** The three repos the ticket names, mapped to their CleanExpo full names. */
export const PORTFOLIO_REPOS: ReadonlyArray<{ repo: string; fullName: string }> = [
  { repo: 'RestoreAssist', fullName: 'CleanExpo/RestoreAssist' },
  { repo: 'Synthex', fullName: 'CleanExpo/Synthex' },
  { repo: 'Nexus', fullName: 'CleanExpo/Unite-Group' },
]

export interface RunLite {
  conclusion: string | null
  status?: string | null
  html_url?: string
  updated_at?: string | null
}

export interface RepoHealth {
  repo: string
  fullName: string
  latestConclusion: Conclusion
  failCountLast10: number
  latestRunAt: string | null
  latestRunUrl: string | null
  color: HealthColor
  error?: string
}

export interface PortfolioHealthPayload {
  configured: boolean
  source: 'github_live' | 'not_configured' | 'error' | 'partial'
  repos: RepoHealth[]
  overall: HealthColor
  /** Portfolio-wide open urgent(1)+high(2) Linear issues, or null when Linear is not configured. */
  openP0P1: number | null
  linearSource: 'linear_live' | 'not_configured' | 'error'
  timestamp: string
  error?: string
}

export type GithubRunsFetcher = (
  fullName: string,
) => Promise<{ ok: true; runs: RunLite[] } | { ok: false; error: string }>

export type LinearP0P1Fetcher = () => Promise<
  { ok: true; count: number } | { ok: false; error: string } | { ok: 'not_configured' }
>

function normaliseConclusion(run: RunLite | undefined): Conclusion {
  if (!run) return 'unknown'
  // A run still executing has status !== 'completed' and a null conclusion.
  if (run.conclusion == null) {
    return run.status && run.status !== 'completed' ? 'in_progress' : 'unknown'
  }
  switch (run.conclusion) {
    case 'success':
    case 'failure':
    case 'cancelled':
    case 'skipped':
      return run.conclusion
    default:
      return 'unknown'
  }
}

/**
 * Per-repo colour: red on a failed latest run, green only when the latest run
 * succeeded with a clean rolling-10 window, grey when the repo could not be
 * read, yellow for everything in between (flaky window, in-flight, cancelled).
 */
export function repoColor(
  latest: Conclusion,
  failCountLast10: number,
  hasError: boolean,
): HealthColor {
  if (hasError) return 'grey'
  if (latest === 'failure') return 'red'
  if (latest === 'success' && failCountLast10 === 0) return 'green'
  return 'yellow'
}

const COLOR_RANK: Record<HealthColor, number> = { green: 0, grey: 1, yellow: 2, red: 3 }

/** Overall = the worst repo colour; an empty set is grey (nothing to read). */
export function overallColor(repos: RepoHealth[]): HealthColor {
  if (repos.length === 0) return 'grey'
  return repos.reduce<HealthColor>(
    (worst, r) => (COLOR_RANK[r.color] > COLOR_RANK[worst] ? r.color : worst),
    'green',
  )
}

export function deriveRepoHealth(
  repo: string,
  fullName: string,
  result: { ok: true; runs: RunLite[] } | { ok: false; error: string },
): RepoHealth {
  if (!result.ok) {
    return {
      repo,
      fullName,
      latestConclusion: 'unknown',
      failCountLast10: 0,
      latestRunAt: null,
      latestRunUrl: null,
      color: 'grey',
      error: result.error,
    }
  }

  const runs = result.runs.slice(0, 10)
  const latest = runs[0]
  const latestConclusion = normaliseConclusion(latest)
  const failCountLast10 = runs.filter((r) => r.conclusion === 'failure').length

  return {
    repo,
    fullName,
    latestConclusion,
    failCountLast10,
    latestRunAt: latest?.updated_at ?? null,
    latestRunUrl: latest?.html_url ?? null,
    color: repoColor(latestConclusion, failCountLast10, false),
  }
}

export interface BuildDeps {
  repos: ReadonlyArray<{ repo: string; fullName: string }>
  fetchRuns: GithubRunsFetcher
  fetchP0P1: LinearP0P1Fetcher
  now: string
}

export async function buildPortfolioHealth(deps: BuildDeps): Promise<PortfolioHealthPayload> {
  const { repos, fetchRuns, fetchP0P1, now } = deps

  const [repoResults, p0p1] = await Promise.all([
    Promise.all(
      repos.map(async ({ repo, fullName }) =>
        deriveRepoHealth(repo, fullName, await fetchRuns(fullName)),
      ),
    ),
    fetchP0P1(),
  ])

  const errored = repoResults.filter((r) => r.error).length
  const source: PortfolioHealthPayload['source'] =
    errored === 0 ? 'github_live' : errored === repoResults.length ? 'error' : 'partial'

  let openP0P1: number | null = null
  let linearSource: PortfolioHealthPayload['linearSource'] = 'error'
  if (p0p1.ok === 'not_configured') {
    linearSource = 'not_configured'
  } else if (p0p1.ok === true) {
    openP0P1 = p0p1.count
    linearSource = 'linear_live'
  }

  return {
    configured: true,
    source,
    repos: repoResults,
    overall: overallColor(repoResults),
    openP0P1,
    linearSource,
    timestamp: now,
  }
}
