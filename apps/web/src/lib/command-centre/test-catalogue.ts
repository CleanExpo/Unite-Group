// src/lib/command-centre/test-catalogue.ts
//
// Mission Control — test catalogue tile.
//
// Two halves, kept apart on purpose:
//   1. The catalogue itself: a static JSON snapshot of the vault page
//      Wiki/test-catalogue-100-2026-09-27.md (id, test, status, portable).
//      It is a plan and a ledger, not a live test result — the tile says so.
//   2. Live state: the RestoreAssist branch that carries the built tests —
//      its head commit, the CI check runs on that commit, and its PR — read
//      from the GitHub REST API. Never throws; degrades honestly.

import { z } from 'zod'
import catalogueJson from '../../../data/command-centre/test-catalogue.json'

const GH = 'https://api.github.com'

export const TEST_STATUSES = ['BUILT', 'DEFECT', 'TODO', 'EXISTS', 'COVERED'] as const
export type TestStatus = (typeof TEST_STATUSES)[number]

const RowSchema = z.object({
  id: z.string().regex(/^[A-Z]+(-[A-Z]+)?-\d+$/),
  area: z.string().min(1),
  test: z.string().min(1),
  status: z.enum(TEST_STATUSES),
  note: z.string().nullable(),
  portable: z.boolean(),
})

const CatalogueSchema = z.object({
  source: z.string(),
  generated: z.string(),
  project: z.string(),
  repo: z.string().regex(/^[^/]+\/[^/]+$/),
  branch: z.string().min(1),
  commit: z.string(),
  rows: z.array(RowSchema).min(1),
})

export type TestCatalogueRow = z.infer<typeof RowSchema>

export interface TestCatalogueData {
  ok: boolean
  source: string
  generated: string
  project: string
  repo: string
  branch: string
  commit: string
  rows: TestCatalogueRow[]
  counts: Record<TestStatus, number>
  portable: number
  read_error: string | null
}

function zeroCounts(): Record<TestStatus, number> {
  return { BUILT: 0, DEFECT: 0, TODO: 0, EXISTS: 0, COVERED: 0 }
}

/** Validate and summarise a catalogue payload. NEVER throws. */
export function summariseCatalogue(raw: unknown): TestCatalogueData {
  const parsed = CatalogueSchema.safeParse(raw)
  if (!parsed.success) {
    return {
      ok: false,
      source: 'data/command-centre/test-catalogue.json',
      generated: '',
      project: '',
      repo: '',
      branch: '',
      commit: '',
      rows: [],
      counts: zeroCounts(),
      portable: 0,
      read_error: `catalogue failed validation: ${parsed.error.issues[0]?.message ?? 'invalid'}`,
    }
  }
  const c = parsed.data
  const ids = new Set<string>()
  for (const row of c.rows) {
    if (ids.has(row.id)) {
      return { ...summariseCatalogue(null), read_error: `duplicate test id ${row.id}` }
    }
    ids.add(row.id)
  }
  const counts = zeroCounts()
  for (const row of c.rows) counts[row.status] += 1
  // Live defects first, then what was built, then the backlog.
  const order: Record<TestStatus, number> = { DEFECT: 0, BUILT: 1, TODO: 2, EXISTS: 3, COVERED: 4 }
  const rows = [...c.rows].sort((a, b) => order[a.status] - order[b.status])
  return {
    ok: true,
    source: c.source,
    generated: c.generated,
    project: c.project,
    repo: c.repo,
    branch: c.branch,
    commit: c.commit,
    rows,
    counts,
    portable: c.rows.filter((r) => r.portable).length,
    read_error: null,
  }
}

export function loadTestCatalogue(): TestCatalogueData {
  return summariseCatalogue(catalogueJson)
}

// ── Live branch state ───────────────────────────────────────────────────

export type CiState = 'passing' | 'failing' | 'running' | 'unknown' | 'none'

export interface TestBranchStatus {
  available: boolean
  checked_at: string
  repo: string
  branch: string
  head_sha: string | null
  head_url: string | null
  ci: CiState
  checks_total: number
  checks_failed: number
  checks_pending: number
  checks_unknown: number
  pr_number: number | null
  pr_url: string | null
  pr_state: 'open' | 'draft' | 'merged' | 'closed' | 'none'
  status_message: string
  read_error: string | null
}

export interface TestBranchStatusDeps {
  token?: string
  fetchFn?: typeof fetch
  now?: () => Date
  repo?: string
  branch?: string
}

interface CheckRun {
  status: string
  conclusion: string | null
}

/**
 * Pure: fold GitHub check runs into one CI state. Fails closed: a completed run is green only
 * when its conclusion is on the allow-list; 'stale', null or any unrecognised value is unknown.
 */
export function summariseCheckRuns(
  runs: CheckRun[],
): Pick<TestBranchStatus, 'ci' | 'checks_total' | 'checks_failed' | 'checks_pending' | 'checks_unknown'> {
  const greenConclusions = new Set(['success', 'neutral', 'skipped'])
  const failedConclusions = new Set(['failure', 'timed_out', 'cancelled', 'action_required', 'startup_failure'])
  const completed = runs.filter((r) => r.status === 'completed')
  const pending = runs.length - completed.length
  const failed = completed.filter((r) => r.conclusion !== null && failedConclusions.has(r.conclusion)).length
  const unknown = completed.filter(
    (r) => r.conclusion === null || (!greenConclusions.has(r.conclusion) && !failedConclusions.has(r.conclusion)),
  ).length
  const ci: CiState =
    runs.length === 0 ? 'none' : failed > 0 ? 'failing' : pending > 0 ? 'running' : unknown > 0 ? 'unknown' : 'passing'
  return { ci, checks_total: runs.length, checks_failed: failed, checks_pending: pending, checks_unknown: unknown }
}

/** Largest number of check-run pages read before the result is reported incomplete. */
const MAX_CHECK_PAGES = 10

/** Read the catalogue branch's head, CI and PR. NEVER throws. */
export async function getTestBranchStatus(deps: TestBranchStatusDeps = {}): Promise<TestBranchStatus> {
  const now = deps.now ?? (() => new Date())
  const token = deps.token ?? process.env.GITHUB_TOKEN
  const fetchFn = deps.fetchFn ?? fetch
  const catalogue = loadTestCatalogue()
  const repo = deps.repo ?? catalogue.repo
  const branch = deps.branch ?? catalogue.branch

  const base: TestBranchStatus = {
    available: false,
    checked_at: now().toISOString(),
    repo,
    branch,
    head_sha: null,
    head_url: null,
    ci: 'none',
    checks_total: 0,
    checks_failed: 0,
    checks_pending: 0,
    checks_unknown: 0,
    pr_number: null,
    pr_url: null,
    pr_state: 'none',
    status_message: '',
    read_error: null,
  }

  if (!token) return { ...base, status_message: 'GitHub not connected', read_error: 'GITHUB_TOKEN not configured' }
  if (!repo || !branch) return { ...base, status_message: 'catalogue unavailable', read_error: catalogue.read_error }

  const headers = {
    authorization: `Bearer ${token}`,
    accept: 'application/vnd.github+json',
    'x-github-api-version': '2022-11-28',
  }
  const get = async (path: string): Promise<unknown> => {
    const res = await fetchFn(`${GH}${path}`, { headers, signal: AbortSignal.timeout(8000), cache: 'no-store' })
    if (!res.ok) throw new Error(`${path.split('?')[0]}: HTTP ${res.status}`)
    return res.json()
  }

  try {
    const branchRes = (await get(`/repos/${repo}/branches/${encodeURIComponent(branch)}`)) as {
      commit?: { sha?: string; html_url?: string }
    }
    const sha = branchRes.commit?.sha ?? null
    if (!sha) return { ...base, status_message: 'branch has no head commit', read_error: 'no commit sha' }

    // Every page, checked against total_count: a failure past page one must not read as green.
    const getAllCheckRuns = async (): Promise<CheckRun[]> => {
      const runs: CheckRun[] = []
      let total = 0
      for (let page = 1; page <= MAX_CHECK_PAGES; page++) {
        const body = (await get(`/repos/${repo}/commits/${sha}/check-runs?per_page=100&page=${page}`)) as {
          total_count?: unknown
          check_runs?: unknown
        }
        if (typeof body?.total_count !== 'number' || !Array.isArray(body.check_runs)) {
          throw new Error('check-runs: malformed response body')
        }
        total = body.total_count
        runs.push(...(body.check_runs as CheckRun[]))
        if (runs.length >= total || body.check_runs.length === 0) break
      }
      if (runs.length < total) throw new Error(`check-runs: incomplete, read ${runs.length} of ${total}`)
      return runs
    }

    const [checkRuns, pulls] = await Promise.all([
      getAllCheckRuns(),
      get(`/repos/${repo}/pulls?state=all&head=${encodeURIComponent(`${repo.split('/')[0]}:${branch}`)}&per_page=1`),
    ])
    if (!Array.isArray(pulls)) throw new Error('pulls: malformed response body')

    const pr = pulls[0] as
      | { number: number; html_url: string; state: string; draft?: boolean; merged_at?: string | null }
      | undefined
    const prState: TestBranchStatus['pr_state'] = !pr
      ? 'none'
      : pr.merged_at
        ? 'merged'
        : pr.state === 'closed'
          ? 'closed'
          : pr.draft
            ? 'draft'
            : 'open'
    const ci = summariseCheckRuns(checkRuns)

    return {
      ...base,
      ...ci,
      available: true,
      head_sha: sha,
      head_url: branchRes.commit?.html_url ?? `https://github.com/${repo}/commit/${sha}`,
      pr_number: pr?.number ?? null,
      pr_url: pr?.html_url ?? null,
      pr_state: prState,
      status_message: ci.ci === 'none' ? 'no CI runs on this commit yet' : `CI ${ci.ci}`,
    }
  } catch (err) {
    return {
      ...base,
      status_message: 'GitHub read failed',
      read_error: err instanceof Error ? err.message : String(err),
    }
  }
}
