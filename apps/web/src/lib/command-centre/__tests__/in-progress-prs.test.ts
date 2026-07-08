import { describe, it, expect, vi } from 'vitest'
import { listInProgressPRs } from '@/lib/command-centre/in-progress-prs'

const NOW = () => new Date('2026-07-08T12:00:00.000Z')

function pull(n: number, repo: string, createdAt: string, over: Record<string, unknown> = {}) {
  return {
    number: n,
    title: `PR ${n}`,
    user: { login: 'phill' },
    head: { ref: `feat/x-${n}` },
    created_at: createdAt,
    html_url: `https://github.com/${repo}/pull/${n}`,
    ...over,
  }
}

function okJson(body: unknown) {
  return { ok: true, status: 200, json: async () => body } as unknown as Response
}

describe('listInProgressPRs (UNI-2340 — GitHub API, serverless-safe)', () => {
  it('no token → honest unavailable result, no fetch attempted', async () => {
    const fetchFn = vi.fn()
    const r = await listInProgressPRs({ token: undefined, fetchFn, repos: ['a/b'], now: NOW })
    expect(r.available).toBe(false)
    expect(r.entries).toEqual([])
    expect(r.read_error).toMatch(/GITHUB_TOKEN not configured/)
    expect(fetchFn).not.toHaveBeenCalled()
  })

  it('aggregates open PRs across repos, newest first, with repo attribution', async () => {
    const fetchFn = vi.fn(async (url: RequestInfo | URL) => {
      const u = String(url)
      if (u.includes('/repos/org/one/')) return okJson([pull(1, 'org/one', '2026-07-06T00:00:00Z')])
      if (u.includes('/repos/org/two/')) return okJson([pull(9, 'org/two', '2026-07-07T00:00:00Z')])
      throw new Error(`unexpected url ${u}`)
    })
    const r = await listInProgressPRs({ token: 't', fetchFn, repos: ['org/one', 'org/two'], now: NOW })
    expect(r.available).toBe(true)
    expect(r.entries.map((e) => `${e.repo}#${e.number}`)).toEqual(['org/two#9', 'org/one#1'])
    expect(r.entries[0]).toMatchObject({ author: 'phill', head_ref: 'feat/x-9', age_days: 2 })
    expect(r.status_message).toBe('2 open PRs across 2 repos')
    expect(r.read_error).toBeNull()
  })

  it('partial repo failure keeps successes and reports the failure honestly', async () => {
    const fetchFn = vi.fn(async (url: RequestInfo | URL) => {
      const u = String(url)
      if (u.includes('/repos/org/good/')) return okJson([pull(2, 'org/good', '2026-07-05T00:00:00Z')])
      return { ok: false, status: 403, json: async () => ({}) } as unknown as Response
    })
    const r = await listInProgressPRs({ token: 't', fetchFn, repos: ['org/good', 'org/denied'], now: NOW })
    expect(r.available).toBe(true)
    expect(r.entries).toHaveLength(1)
    expect(r.read_error).toMatch(/org\/denied: HTTP 403/)
    expect(r.status_message).toMatch(/1 open PRs across 1 repos \(1 of 2 repos unreachable\)/)
  })

  it('all repos failing → available:false with per-repo detail', async () => {
    const fetchFn = vi.fn(async () => ({ ok: false, status: 500, json: async () => ({}) }) as unknown as Response)
    const r = await listInProgressPRs({ token: 't', fetchFn, repos: ['a/b', 'c/d'], now: NOW })
    expect(r.available).toBe(false)
    expect(r.entries).toEqual([])
    expect(r.status_message).toMatch(/failed for every repo/)
  })

  it('drops malformed rows and invalid repo names without throwing', async () => {
    const fetchFn = vi.fn(async () =>
      okJson([pull(3, 'org/one', '2026-07-04T00:00:00Z'), { number: 'bad' }, null]),
    )
    const r = await listInProgressPRs({ token: 't', fetchFn, repos: ['org/one', 'not-a-repo'], now: NOW })
    expect(r.entries).toHaveLength(1)
    expect(r.read_error).toMatch(/not-a-repo: invalid repo name/)
  })
})
