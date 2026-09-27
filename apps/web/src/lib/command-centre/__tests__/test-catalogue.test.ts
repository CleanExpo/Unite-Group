import { describe, expect, it } from 'vitest'
import catalogueJson from '../../../../data/command-centre/test-catalogue.json'
import {
  getTestBranchStatus,
  loadTestCatalogue,
  summariseCatalogue,
  summariseCheckRuns,
} from '../test-catalogue'

const now = () => new Date('2026-09-28T00:00:00.000Z')

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}

/** Fake GitHub: routes by path, records every URL it was asked for. */
function fakeGitHub(routes: Record<string, () => Response>) {
  const calls: string[] = []
  const fetchFn = (async (input: RequestInfo | URL) => {
    const url = String(input)
    calls.push(url)
    const key = Object.keys(routes).find((k) => url.includes(k))
    return key ? routes[key]() : jsonResponse({ message: 'Not Found' }, 404)
  }) as typeof fetch
  return { fetchFn, calls }
}

describe('test catalogue ledger', () => {
  it('loads the shipped catalogue: 92 rows, counts add up, live defects first', () => {
    const data = loadTestCatalogue()
    expect(data.ok).toBe(true)
    expect(data.rows).toHaveLength(92)
    expect(data.counts).toEqual({ BUILT: 8, DEFECT: 1, TODO: 41, EXISTS: 41, COVERED: 1 })
    expect(Object.values(data.counts).reduce((a, b) => a + b, 0)).toBe(data.rows.length)
    expect(data.rows[0].status).toBe('DEFECT')
    expect(data.rows[0].id).toBe('SEC-TOKEN-01')
    expect(data.repo).toBe('CleanExpo/RestoreAssist')
  })

  it('reports a validation failure instead of a shorter list', () => {
    const bad = { ...catalogueJson, rows: [{ id: 'X-1', area: 'a', test: 't', status: 'MAYBE', note: null, portable: true }] }
    const data = summariseCatalogue(bad)
    expect(data.ok).toBe(false)
    expect(data.rows).toHaveLength(0)
    expect(data.read_error).toMatch(/failed validation/)
  })

  it('rejects duplicate ids', () => {
    const row = catalogueJson.rows[0]
    const data = summariseCatalogue({ ...catalogueJson, rows: [row, row] })
    expect(data.ok).toBe(false)
    expect(data.read_error).toBe(`duplicate test id ${row.id}`)
  })
})

describe('summariseCheckRuns', () => {
  it('is "none" with no runs, never a green', () => {
    expect(summariseCheckRuns([]).ci).toBe('none')
  })
  it('any failure makes the commit failing, even while others still run', () => {
    const s = summariseCheckRuns([
      { status: 'completed', conclusion: 'success' },
      { status: 'completed', conclusion: 'failure' },
      { status: 'in_progress', conclusion: null },
    ])
    expect(s).toEqual({ ci: 'failing', checks_total: 3, checks_failed: 1, checks_pending: 1, checks_unknown: 0 })
  })
  it('running while any check is unfinished and none failed', () => {
    expect(summariseCheckRuns([{ status: 'queued', conclusion: null }, { status: 'completed', conclusion: 'success' }]).ci).toBe('running')
  })
  it('passing only when every run completed without failure (skipped/neutral allowed)', () => {
    expect(
      summariseCheckRuns([
        { status: 'completed', conclusion: 'success' },
        { status: 'completed', conclusion: 'skipped' },
        { status: 'completed', conclusion: 'neutral' },
      ]).ci,
    ).toBe('passing')
  })
  it('a completed run with a stale, missing or unrecognised conclusion is unknown, never green', () => {
    for (const conclusion of ['stale', null, 'some_future_value']) {
      const s = summariseCheckRuns([
        { status: 'completed', conclusion: 'success' },
        { status: 'completed', conclusion },
      ])
      expect(s.ci).toBe('unknown')
      expect(s.checks_unknown).toBe(1)
    }
  })
})

describe('getTestBranchStatus', () => {
  it('says GitHub is not connected when there is no token, and makes no request', async () => {
    const gh = fakeGitHub({})
    const s = await getTestBranchStatus({ token: '', fetchFn: gh.fetchFn, now })
    expect(s.available).toBe(false)
    expect(s.status_message).toBe('GitHub not connected')
    expect(gh.calls).toHaveLength(0)
  })

  it('reads head, CI and PR for the catalogue branch', async () => {
    const gh = fakeGitHub({
      '/branches/': () => jsonResponse({ commit: { sha: 'abc12345def', html_url: 'https://github.com/x/commit/abc' } }),
      '/check-runs': () =>
        jsonResponse({ total_count: 2, check_runs: [{ status: 'completed', conclusion: 'success' }, { status: 'completed', conclusion: 'failure' }] }),
      '/pulls?': () => jsonResponse([{ number: 2400, html_url: 'https://github.com/x/pull/2400', state: 'open', draft: true }]),
    })
    const s = await getTestBranchStatus({ token: 't', fetchFn: gh.fetchFn, now })
    expect(s.available).toBe(true)
    expect(s.head_sha).toBe('abc12345def')
    expect(s.ci).toBe('failing')
    expect(s.checks_failed).toBe(1)
    expect(s.pr_number).toBe(2400)
    expect(s.pr_state).toBe('draft')
    // The branch name is URL-encoded and the PR lookup is scoped to the owner.
    expect(gh.calls[0]).toContain('/repos/CleanExpo/RestoreAssist/branches/tests%2Fsecurity-catalogue-20260927')
    expect(gh.calls.some((u) => u.includes('head=CleanExpo%3Atests%2Fsecurity-catalogue-20260927'))).toBe(true)
  })

  it('reports "no PR yet" and "no CI" honestly for a branch that has neither', async () => {
    const gh = fakeGitHub({
      '/branches/': () => jsonResponse({ commit: { sha: 'abc' } }),
      '/check-runs': () => jsonResponse({ total_count: 0, check_runs: [] }),
      '/pulls?': () => jsonResponse([]),
    })
    const s = await getTestBranchStatus({ token: 't', fetchFn: gh.fetchFn, now })
    expect(s.available).toBe(true)
    expect(s.ci).toBe('none')
    expect(s.pr_state).toBe('none')
    expect(s.status_message).toBe('no CI runs on this commit yet')
  })

  it('a 200 check-runs body missing total_count or check_runs is a failed read, not "no CI yet"', async () => {
    // Each body alone must be refused by the shape guard: {check_runs: []} would otherwise
    // read as zero runs, and {total_count: 0} as a complete empty result.
    for (const body of [{}, { check_runs: [] }, { total_count: 0 }, { total_count: '0', check_runs: [] }]) {
      const gh = fakeGitHub({
        '/branches/': () => jsonResponse({ commit: { sha: 'abc' } }),
        '/check-runs': () => jsonResponse(body),
        '/pulls?': () => jsonResponse([]),
      })
      const s = await getTestBranchStatus({ token: 't', fetchFn: gh.fetchFn, now })
      expect(s.available).toBe(false)
      expect(s.status_message).toBe('GitHub read failed')
      expect(s.read_error).toBe('check-runs: malformed response body')
    }
  })

  it('a 200 pulls body that is not a list is a failed read, not "no PR yet"', async () => {
    const gh = fakeGitHub({
      '/branches/': () => jsonResponse({ commit: { sha: 'abc' } }),
      '/check-runs': () => jsonResponse({ total_count: 0, check_runs: [] }),
      '/pulls?': () => jsonResponse({ message: 'unexpected' }),
    })
    const s = await getTestBranchStatus({ token: 't', fetchFn: gh.fetchFn, now })
    expect(s.available).toBe(false)
    expect(s.read_error).toMatch(/pulls/)
  })

  it('reads every page of check runs, so a failure past the first 100 is seen', async () => {
    const green = Array.from({ length: 100 }, () => ({ status: 'completed', conclusion: 'success' }))
    const gh = fakeGitHub({
      '/branches/': () => jsonResponse({ commit: { sha: 'abc' } }),
      'page=2': () => jsonResponse({ total_count: 101, check_runs: [{ status: 'completed', conclusion: 'failure' }] }),
      '/check-runs': () => jsonResponse({ total_count: 101, check_runs: green }),
      '/pulls?': () => jsonResponse([]),
    })
    const s = await getTestBranchStatus({ token: 't', fetchFn: gh.fetchFn, now })
    expect(s.available).toBe(true)
    expect(s.checks_total).toBe(101)
    expect(s.ci).toBe('failing')
  })

  it('check runs that cannot all be fetched are a failed read, never a partial green', async () => {
    const green = Array.from({ length: 100 }, () => ({ status: 'completed', conclusion: 'success' }))
    const gh = fakeGitHub({
      '/branches/': () => jsonResponse({ commit: { sha: 'abc' } }),
      'page=2': () => jsonResponse({ total_count: 150, check_runs: [] }),
      '/check-runs': () => jsonResponse({ total_count: 150, check_runs: green }),
      '/pulls?': () => jsonResponse([]),
    })
    const s = await getTestBranchStatus({ token: 't', fetchFn: gh.fetchFn, now })
    expect(s.available).toBe(false)
    expect(s.read_error).toMatch(/100 of 150/)
  })

  it('a total_count that changes between pages is a failed read, never a partial green', async () => {
    const green = Array.from({ length: 100 }, () => ({ status: 'completed', conclusion: 'success' }))
    const gh = fakeGitHub({
      '/branches/': () => jsonResponse({ commit: { sha: 'abc' } }),
      'page=2': () => jsonResponse({ total_count: 100, check_runs: [] }),
      '/check-runs': () => jsonResponse({ total_count: 150, check_runs: green }),
      '/pulls?': () => jsonResponse([]),
    })
    const s = await getTestBranchStatus({ token: 't', fetchFn: gh.fetchFn, now })
    expect(s.available).toBe(false)
    expect(s.read_error).toBe('check-runs: total changed during read (150 then 100)')
  })

  it('a GitHub error is unavailable with the reason, never a stale-looking success', async () => {
    const gh = fakeGitHub({ '/branches/': () => jsonResponse({ message: 'Bad credentials' }, 401) })
    const s = await getTestBranchStatus({ token: 't', fetchFn: gh.fetchFn, now })
    expect(s.available).toBe(false)
    expect(s.ci).toBe('none')
    expect(s.read_error).toMatch(/HTTP 401/)
  })

  it('reports a merged PR as merged', async () => {
    const gh = fakeGitHub({
      '/branches/': () => jsonResponse({ commit: { sha: 'abc' } }),
      '/check-runs': () => jsonResponse({ total_count: 1, check_runs: [{ status: 'completed', conclusion: 'success' }] }),
      '/pulls?': () => jsonResponse([{ number: 1, html_url: 'u', state: 'closed', merged_at: '2026-09-28T00:00:00Z' }]),
    })
    const s = await getTestBranchStatus({ token: 't', fetchFn: gh.fetchFn, now })
    expect(s.pr_state).toBe('merged')
    expect(s.ci).toBe('passing')
  })
})
