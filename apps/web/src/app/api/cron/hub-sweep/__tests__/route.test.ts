// src/app/api/cron/hub-sweep/__tests__/route.test.ts
// Tests for the nightly hub intelligence sweep cron.

import { vi, describe, it, expect, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mocks — declared before SUT import
// ---------------------------------------------------------------------------

const mockUpsert = vi.fn()
const mockSelect = vi.fn()
const mockEq = vi.fn()
const mockOrder = vi.fn()
const mockLimit = vi.fn()
const mockSingle = vi.fn()
const mockFrom = vi.fn()

// The allow-list drift check calls supabase.auth.admin.listUsers(). Until
// 10/08/2026 this mock provided no `auth` at all, so the check threw on every
// test run — and every test still passed, because the route swallowed the
// failure and no test asserted on its verdict. That is exactly how the guard
// stayed broken in production for weeks while reporting "0 errors".
const mockListUsers = vi.fn()

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: () => ({
    from: mockFrom,
    auth: { admin: { listUsers: (...args: unknown[]) => mockListUsers(...args) } },
  }),
}))

const mockFetchIssueCountByBusiness = vi.fn()
vi.mock('@/lib/integrations/linear', () => ({
  fetchIssueCountByBusiness: (...args: unknown[]) => mockFetchIssueCountByBusiness(...args),
}))

const mockFetchLastCommit = vi.fn()
const mockParseRepoUrl = vi.fn()
vi.mock('@/lib/integrations/github', () => ({
  fetchLastCommit: (...args: unknown[]) => mockFetchLastCommit(...args),
  parseRepoUrl: (...args: unknown[]) => mockParseRepoUrl(...args),
}))

// ---------------------------------------------------------------------------
// SUT — imported after mocks
// ---------------------------------------------------------------------------

import { GET } from '../route'
import { OWNED_BUSINESSES } from '@/lib/businesses'

// The sweep covers every owned business. Derive the count from the same source
// of truth so adding a business doesn't break this test.
const OWNED_COUNT = OWNED_BUSINESSES.length

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const VALID_AUTH = `Bearer test-cron-secret`

function makeRequest(opts: { auth?: string } = {}): Request {
  return new Request('http://localhost/api/cron/hub-sweep', {
    headers: {
      authorization: opts.auth ?? VALID_AUTH,
    },
  })
}

function setupEnv() {
  process.env.CRON_SECRET = 'test-cron-secret'
  process.env.FOUNDER_USER_ID = 'founder-uuid'
}

function setupSupabaseMocks(opts: {
  businessRows?: Array<{ id: string; slug: string }>
  /** Simulate a failed businesses slug → id read (Supabase returns an error). */
  businessRowsError?: { message: string }
  /** Row returned by the advisory_cases (MACAS) lookup when it succeeds. */
  advisoryRow?: { created_at: string } | null
  /** Simulate a failed advisory_cases read. */
  advisoryError?: { message: string }
  /** Rows returned by the bookkeeper_runs lookup when it succeeds. */
  bookkeeperRows?: Array<Record<string, unknown>>
  /** Simulate a failed bookkeeper_runs read. */
  bookkeeperError?: { message: string }
  existingSatellites?: Array<Record<string, unknown>>
  existingSatellitesError?: { message: string }
  /** Override what the upsert readback returns, to simulate divergent state. */
  readbackRows?: Array<Record<string, unknown>>
  /**
   * Transform the echoed payload on readback. Lets a test re-spell dynamic
   * values (e.g. timestamps, as Postgres does) without knowing them upfront.
   */
  readbackTransform?: (payload: Record<string, unknown>) => Record<string, unknown>
} = {}) {
  // advisory_cases query
  const advisoryChain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({
      data: opts.advisoryError ? null : opts.advisoryRow ?? null,
      error: opts.advisoryError ?? null,
    }),
  }

  // bookkeeper_runs query
  const bookkeeperChain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({
      data: opts.bookkeeperError ? null : opts.bookkeeperRows ?? [],
      error: opts.bookkeeperError ?? null,
    }),
  }

  // businesses slug → id lookup
  const businessesChain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockResolvedValue({
      data: opts.businessRowsError ? null : opts.businessRows ?? [],
      error: opts.businessRowsError ?? null,
    }),
  }

  // hub_satellites select (existing rows)
  const hubSelectChain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockResolvedValue({
      data: opts.existingSatellites ?? [],
      error: opts.existingSatellitesError ?? null,
    }),
  }

  // hub_satellites upsert.
  // The route now reads the written row back (write-then-confirm), so the mock
  // must echo what it was sent — a mock that returns nothing would make every
  // sweep look like a readback mismatch.
  const hubUpsertChain = {
    upsert: vi.fn().mockImplementation((payload: Record<string, unknown>) => ({
      // The route now compares EVERY persisted field on readback, so the mock
      // echoes the whole payload. A mock echoing a subset would make each sweep
      // look divergent on the fields it omitted.
      select: vi.fn().mockResolvedValue({
        data: opts.readbackRows
          ?? [opts.readbackTransform ? opts.readbackTransform({ ...payload }) : { ...payload }],
        error: null,
      }),
    })),
  }

  mockFrom.mockImplementation((table: string) => {
    if (table === 'advisory_cases') return advisoryChain
    if (table === 'bookkeeper_runs') return bookkeeperChain
    if (table === 'businesses') return businessesChain
    if (table === 'hub_satellites') {
      // Return select chain first, then upsert chain
      return {
        ...hubSelectChain,
        ...hubUpsertChain,
      }
    }
    return hubUpsertChain
  })

  return { advisoryChain, bookkeeperChain, businessesChain, hubSelectChain, hubUpsertChain }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GET /api/cron/hub-sweep', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupEnv()
    mockFetchIssueCountByBusiness.mockResolvedValue({})
    mockParseRepoUrl.mockReturnValue(null)
    mockFetchLastCommit.mockResolvedValue(null)
  })

  it('returns 401 when Authorization header is missing', async () => {
    const req = makeRequest({ auth: 'wrong-secret' })
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it('returns 401 when CRON_SECRET does not match', async () => {
    process.env.CRON_SECRET = 'different-secret'
    const req = makeRequest()
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it('returns 500 when FOUNDER_USER_ID is not set', async () => {
    delete process.env.FOUNDER_USER_ID
    setupSupabaseMocks()
    const req = makeRequest()
    const res = await GET(req)
    expect(res.status).toBe(500)
  })

  it('returns 200 and sweeps all owned businesses when every source is healthy', async () => {
    // This asserted 200 while the allow-list guard was DEGRADED — the response
    // status did not reflect the sweep's own verdict, which is exactly the
    // defect independent review found on 11/08/2026. A green 200 now requires a
    // genuinely green sweep, so the sources are made healthy here.
    setupSupabaseMocks()
    mockListUsers.mockResolvedValue({
      data: {
        users: [
          { id: 'founder-uuid', email: 'founder@example.com', last_sign_in_at: new Date().toISOString() },
        ],
      },
      error: null,
    })
    const req = makeRequest()
    const res = await GET(req)
    expect(res.status).toBe(200)

    const body = await res.json() as { satellitesSwept: number; success: boolean }
    expect(body.success).toBe(true)
    // Every owned business is swept (CCW is client-type and excluded).
    expect(body.satellitesSwept).toBe(OWNED_COUNT)
  })

  it('treats a Postgres-respelled timestamp readback as confirmed, not divergent', async () => {
    // Production shape 13/08–17/08/2026 (35 errors, synthex/dr/nrpg): the route
    // sent last_swept_at as "…T13:01:43.521Z" and Postgres echoed
    // "…T13:01:43.521+00:00" — the same instant — and every sweep errored
    // "write readback mismatch" over a write that had landed. The readback here
    // re-spells every *_at value exactly as Postgres does; the sweep must be ok.
    setupSupabaseMocks({
      readbackTransform: (payload) => {
        const out = { ...payload }
        for (const [k, v] of Object.entries(out)) {
          if (k.endsWith('_at') && typeof v === 'string' && v.endsWith('Z')) {
            out[k] = `${v.slice(0, -1)}+00:00`
          }
        }
        return out
      },
    })
    mockListUsers.mockResolvedValue({
      data: {
        users: [
          { id: 'founder-uuid', email: 'founder@example.com', last_sign_in_at: new Date().toISOString() },
        ],
      },
      error: null,
    })

    const req = makeRequest()
    const res = await GET(req)

    expect(res.status).toBe(200)
    const body = await res.json() as { success: boolean; errors: number }
    expect(body.success).toBe(true)
    expect(body.errors).toBe(0)
  })

  it('still fails the sweep when a readback timestamp is a genuinely different instant', async () => {
    // Mutation control for the respelling test above: without it, that test
    // could pass because the comparison stopped looking at *_at fields at all.
    // A one-second shift is a REAL divergence and must still error loudly.
    setupSupabaseMocks({
      readbackTransform: (payload) => {
        const swept = payload.last_swept_at
        return {
          ...payload,
          last_swept_at:
            typeof swept === 'string' ? new Date(Date.parse(swept) + 1000).toISOString() : swept,
        }
      },
    })
    mockListUsers.mockResolvedValue({
      data: {
        users: [
          { id: 'founder-uuid', email: 'founder@example.com', last_sign_in_at: new Date().toISOString() },
        ],
      },
      error: null,
    })

    const req = makeRequest()
    const res = await GET(req)

    expect(res.status).toBe(500)
    const body = await res.json() as { success: boolean; errors: number }
    expect(body.success).toBe(false)
    expect(body.errors).toBeGreaterThan(0)
  })

  it('fetches Linear issue counts and includes them in the upsert', async () => {
    setupSupabaseMocks()
    mockFetchIssueCountByBusiness.mockResolvedValue({ synthex: 3, dr: 1 })

    const req = makeRequest()
    await GET(req)

    expect(mockFetchIssueCountByBusiness).toHaveBeenCalledOnce()
  })

  it('fetches GitHub commit data when repo_url is set', async () => {
    // Existing satellite row with repo_url
    const hubRows = [{ business_key: 'synthex', repo_url: 'https://github.com/CleanExpo/Synthex', stack: 'next.js', notes: null }]
    mockFrom.mockImplementation((table: string) => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: table === 'hub_satellites' ? hubRows : [], error: null }),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      upsert: vi.fn().mockResolvedValue({ error: null }),
    }))

    mockParseRepoUrl.mockReturnValue({ owner: 'CleanExpo', repo: 'Synthex' })
    mockFetchLastCommit.mockResolvedValue({ sha: 'abc1234', message: 'feat: add new UI', authorDate: '2026-03-24T10:00:00Z' })

    const req = makeRequest()
    await GET(req)

    expect(mockFetchLastCommit).toHaveBeenCalledWith('CleanExpo', 'Synthex')
  })

  it('falls back to the registry repoUrl when the satellite row has none', async () => {
    setupSupabaseMocks()
    mockParseRepoUrl.mockReturnValue(null)

    const req = makeRequest()
    await GET(req)

    // No satellite rows exist, so every owned business uses its registry default.
    expect(mockParseRepoUrl).toHaveBeenCalledWith('https://github.com/CleanExpo/Disaster-Recovery')
    expect(mockParseRepoUrl).toHaveBeenCalledWith('https://github.com/CleanExpo/Synthex')
  })

  it('queries MACAS verdicts per business via the businesses slug map', async () => {
    const { advisoryChain } = setupSupabaseMocks({ businessRows: [{ id: 'biz-dr', slug: 'dr' }] })

    const req = makeRequest()
    await GET(req)

    // Only 'dr' has a businesses row — advisory_cases is filtered by its id,
    // and no proxy query runs for the other satellites.
    expect(advisoryChain.eq).toHaveBeenCalledWith('business_id', 'biz-dr')
    expect(advisoryChain.maybeSingle).toHaveBeenCalledTimes(1)
  })

  it('does NOT sweep CCW (client-type business)', async () => {
    setupSupabaseMocks()
    const req = makeRequest()
    const res = await GET(req)
    const body = await res.json() as { results: Array<{ businessKey: string }> }

    const keys = body.results.map(r => r.businessKey)
    expect(keys).not.toContain('ccw')
  })

  it('continues sweeping other satellites when one fails', async () => {
    let callCount = 0
    mockFrom.mockImplementation((table: string) => {
      if (table === 'hub_satellites') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ data: [], error: null }),
          // The route now reads the written row back, so the upsert result must
          // expose .select(). First upsert fails, rest succeed.
          upsert: vi.fn().mockImplementation((payload: Record<string, unknown>) => {
            callCount++
            const failed = callCount === 1
            return {
              select: vi.fn().mockResolvedValue({
                data: failed ? null : [{ ...payload }],
                error: failed ? { message: 'DB error' } : null,
              }),
            }
          }),
        }
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
        upsert: vi.fn().mockResolvedValue({ error: null }),
      }
    })

    const req = makeRequest()
    const res = await GET(req)

    // "Partial success" is still a failed sweep. This asserted 200, so a
    // scheduler watching HTTP status recorded a clean invocation after a
    // persistence failure. The other satellites must still be swept — that part
    // of the original intent is preserved below.
    expect(res.status).toBe(500)
    const body = await res.json() as { success: boolean; errors: number; satellitesSwept: number }
    expect(body.success).toBe(false)
    expect(body.errors).toBe(1)
    expect(body.satellitesSwept).toBe(OWNED_COUNT - 1)
  })

  // -------------------------------------------------------------------------
  // Allow-list drift guard — added 10/08/2026.
  //
  // The guard (added 14/07/2026) verifies FOUNDER_USER_ID still names a real,
  // active auth user. In production it failed on EVERY run with
  // "Database error finding users", and the sweep reported `0 errors` and
  // success anyway — so the founder identity drifted to a retired account for
  // weeks with no signal. Nothing tested its verdict, which is why.
  //
  // These tests assert the verdict in BOTH directions: a broken or unhealthy
  // check must make the sweep unsuccessful, and a healthy one must not.
  // -------------------------------------------------------------------------
  describe('allow-list drift guard', () => {
    type SweepBody = {
      success: boolean
      errors: number
      allowListDegraded: boolean
      allowListError: string | null
      allowListHealth: { status: string } | null
    }

    it('reports FAILURE when the allow-list check throws', async () => {
      setupSupabaseMocks()
      mockListUsers.mockRejectedValue(new Error('Database error finding users'))

      const res = await GET(makeRequest())
      const body = (await res.json()) as SweepBody

      // The satellites still swept fine — that is the trap. Success must not
      // be derived from satellite errors alone.
      expect(body.errors).toBe(0)
      expect(body.allowListError).toContain('Database error finding users')
      expect(body.allowListDegraded).toBe(true)
      expect(body.success).toBe(false)
    })

    it('reports FAILURE when the check runs but is not green', async () => {
      setupSupabaseMocks()
      // FOUNDER_USER_ID is 'founder-uuid'; return a different user so the
      // configured founder matches nobody — the real-world drift case.
      mockListUsers.mockResolvedValue({
        data: { users: [{ id: 'somebody-else', email: 'other@example.com', last_sign_in_at: new Date().toISOString() }] },
        error: null,
      })

      const res = await GET(makeRequest())
      const body = (await res.json()) as SweepBody

      expect(body.allowListError).toBeNull()
      expect(body.allowListHealth?.status).not.toBe('green')
      expect(body.allowListDegraded).toBe(true)
      expect(body.success).toBe(false)
    })

    // Negative control. Without this, "always report failure" would satisfy
    // both assertions above while making the guard useless.
    it('reports SUCCESS when the check runs and the founder is present and active', async () => {
      setupSupabaseMocks()
      mockListUsers.mockResolvedValue({
        data: { users: [{ id: 'founder-uuid', email: 'founder@example.com', last_sign_in_at: new Date().toISOString() }] },
        error: null,
      })

      const res = await GET(makeRequest())
      const body = (await res.json()) as SweepBody

      expect(body.allowListError).toBeNull()
      expect(body.allowListDegraded).toBe(false)
      expect(body.success).toBe(true)
    })
  })

  // A failed Linear read used to be swallowed: linearCounts stayed empty, the
  // per-business `?? 0` minted a real zero, calculateHealthStatus read 0 open
  // issues as 'green', and the sweep persisted that and reported success. An
  // unreadable source was being written to the database as good news. Found by
  // independent review 11/08/2026 with a control that rejected the fetch and
  // watched the response come back success:true.
  describe('Linear availability is part of the verdict', () => {
    type SweepBody = {
      success: boolean
      errors: number
      linearDegraded: boolean
      linearError: string | null
    }

    // The allow-list guard is the OTHER input to `success`. It must be green in
    // every test here, or these assertions would pass on its failure instead of
    // the one under test.
    const greenAllowList = () =>
      mockListUsers.mockResolvedValue({
        data: {
          users: [
            { id: 'founder-uuid', email: 'founder@example.com', last_sign_in_at: new Date().toISOString() },
          ],
        },
        error: null,
      })

    const upsertPayloads = (chain: { upsert: ReturnType<typeof vi.fn> }) =>
      chain.upsert.mock.calls.map((c) => c[0] as Record<string, unknown>)

    it('refuses to write anything when Linear is unread and there is no prior row', async () => {
      // With no prior count to preserve, persisting the record at all would mint
      // a literal 0 as the satellite's first and only observation. An absent row
      // is honest; a fabricated zero is not.
      const { hubUpsertChain } = setupSupabaseMocks()
      greenAllowList()
      mockFetchIssueCountByBusiness.mockRejectedValue(new Error('Linear 500'))

      const res = await GET(makeRequest())
      const body = (await res.json()) as SweepBody

      expect(body.linearError).toContain('Linear 500')
      expect(body.linearDegraded).toBe(true)
      expect(body.success).toBe(false)
      expect(body.errors).toBe(OWNED_COUNT)
      expect(upsertPayloads(hubUpsertChain)).toHaveLength(0)
    })

    it('preserves prior counts and degrades health to unknown when a row already exists', async () => {
      const rows = OWNED_BUSINESSES.map((b) => ({
        business_key: b.key,
        repo_url: null,
        stack: null,
        notes: null,
        open_linear_issues: 7,
        health_status: 'yellow',
      }))
      const { hubUpsertChain } = setupSupabaseMocks({ existingSatellites: rows })
      greenAllowList()
      mockFetchIssueCountByBusiness.mockRejectedValue(new Error('Linear 500'))

      const res = await GET(makeRequest())
      const body = (await res.json()) as SweepBody

      expect(body.linearDegraded).toBe(true)
      expect(body.success).toBe(false)

      const payloads = upsertPayloads(hubUpsertChain)
      expect(payloads.length).toBe(OWNED_COUNT)
      for (const p of payloads) {
        expect(p.health_status).toBe('unknown')
        expect(p.open_linear_issues).toBe(7)
        expect((p.last_sweep_data as { linearAvailable: boolean }).linearAvailable).toBe(false)
      }
    })

    it('preserves the last known issue count rather than overwriting it with 0', async () => {
      const key = OWNED_BUSINESSES[0].key
      const { hubUpsertChain } = setupSupabaseMocks({
        existingSatellites: [
          { business_key: key, repo_url: null, stack: null, notes: null, open_linear_issues: 7, health_status: 'yellow' },
        ],
      })
      greenAllowList()
      mockFetchIssueCountByBusiness.mockRejectedValue(new Error('Linear 500'))

      await GET(makeRequest())

      const row = upsertPayloads(hubUpsertChain).find((p) => p.business_key === key)
      expect(row).toBeDefined()
      expect(row?.open_linear_issues).toBe(7)
    })

    // A GitHub read that FAILED used to be indistinguishable from a repository
    // that genuinely has no commits: `fetchLastCommit` answered null for an
    // unconfigured GitHub, a non-OK response and a thrown fetch alike. A null
    // commit date skips the staleness check in calculateHealthStatus, so an
    // unreadable GitHub could certify a satellite GREEN — and the null was
    // persisted over the real last commit on the way out. Third signal in this
    // function; the Linear count and bookkeeper date were already handled.
    // [UNI-2487]
    it('preserves the last known commit and degrades to unknown when GitHub cannot be read', async () => {
      const key = OWNED_BUSINESSES[0].key
      const { hubUpsertChain } = setupSupabaseMocks({
        existingSatellites: [
          {
            business_key: key,
            repo_url: 'https://github.com/CleanExpo/Synthex',
            stack: null,
            notes: null,
            open_linear_issues: 2,
            health_status: 'green',
            last_commit_sha: 'feedfac',
            last_commit_at: '2026-08-01T00:00:00Z',
          },
        ],
      })
      greenAllowList()
      mockFetchIssueCountByBusiness.mockResolvedValue({ [key]: 2 })
      mockParseRepoUrl.mockReturnValue({ owner: 'CleanExpo', repo: 'Synthex' })
      mockFetchLastCommit.mockRejectedValue(new Error('GitHub commits fetch failed: 500'))

      await GET(makeRequest())

      const row = upsertPayloads(hubUpsertChain).find((p) => p.business_key === key)
      expect(row).toBeDefined()
      // The real commit survives. A null here reads as "never committed".
      expect(row?.last_commit_sha).toBe('feedfac')
      expect(row?.last_commit_at).toBe('2026-08-01T00:00:00Z')
      // ...and a source that could not be read may not certify health.
      expect(row?.health_status).toBe('unknown')
    })

    // The VERDICT half of the test above, and the half that was missing.
    //
    // Preserving the row and degrading health were both correct and both
    // asserted — but nothing carried the failure out to `success`, so the sweep
    // answered 200 with `success: true` and logged "7/7 satellites swept,
    // 0 errors" directly beneath seven `GitHub commit read FAILED` lines.
    //
    // This is a REGRESSION guard, not a new feature's test. On origin/main
    // `fetchLastCommit` sat bare inside the per-satellite try, so the throw
    // reached that catch, pushed an error result and made `success` false.
    // Wrapping the call locally to preserve the last known commit swallowed the
    // throw before it reached the counter. Without this test the branch ships a
    // cron that reports success during a GitHub outage where main reported
    // failure — schedulers and uptime monitors key off exactly that. [UNI-2498]
    it('reports FAILURE — 500 and success:false — when a commit read fails', async () => {
      type Body = {
        success: boolean
        errors: number
        githubDegraded: boolean
        githubUnreadable: Array<{ businessKey: string; error: string }>
      }
      const key = OWNED_BUSINESSES[0].key
      setupSupabaseMocks({
        existingSatellites: [
          {
            business_key: key,
            repo_url: 'https://github.com/CleanExpo/Synthex',
            stack: null,
            notes: null,
            open_linear_issues: 2,
            health_status: 'green',
            last_commit_sha: 'feedfac',
            last_commit_at: '2026-08-01T00:00:00Z',
          },
        ],
      })
      greenAllowList()
      mockFetchIssueCountByBusiness.mockResolvedValue({ [key]: 2 })
      mockParseRepoUrl.mockReturnValue({ owner: 'CleanExpo', repo: 'Synthex' })
      mockFetchLastCommit.mockRejectedValue(new Error('GitHub commits fetch failed: 500'))

      const res = await GET(makeRequest())
      const body = (await res.json()) as Body

      // The upsert succeeded — the row WAS written, with the prior commit
      // preserved — so this is deliberately not an `errors` entry. That is
      // exactly why `errors` alone could not carry the signal.
      expect(body.errors).toBe(0)

      expect(body.githubDegraded).toBe(true)
      expect(body.githubUnreadable.map((g) => g.businessKey)).toContain(key)
      expect(body.success).toBe(false)
      expect(res.status).toBe(500)
    })

    // NEGATIVE CONTROL. Without it, "always degrade on GitHub" or "always answer
    // 500" would satisfy the assertions above while making every nightly sweep
    // report failure — the same lie pointing the other way.
    it('a successful commit read leaves the verdict clean', async () => {
      type Body = { success: boolean; githubDegraded: boolean; githubUnreadable: unknown[] }
      const key = OWNED_BUSINESSES[0].key
      setupSupabaseMocks({
        existingSatellites: [
          {
            business_key: key,
            repo_url: 'https://github.com/CleanExpo/Synthex',
            stack: null,
            notes: null,
            open_linear_issues: 2,
            health_status: 'green',
            last_commit_sha: 'feedfac',
            last_commit_at: '2026-08-01T00:00:00Z',
          },
        ],
      })
      greenAllowList()
      mockFetchIssueCountByBusiness.mockResolvedValue({ [key]: 2 })
      mockParseRepoUrl.mockReturnValue({ owner: 'CleanExpo', repo: 'Synthex' })
      mockFetchLastCommit.mockResolvedValue({
        sha: 'abc1234',
        message: 'feat: ship it',
        authorDate: '2026-08-12T00:00:00Z',
      })

      const res = await GET(makeRequest())
      const body = (await res.json()) as Body

      expect(body.githubDegraded).toBe(false)
      expect(body.githubUnreadable).toEqual([])
      expect(body.success).toBe(true)
      expect(res.status).toBe(200)
    })

    // NEGATIVE CONTROL for the test above. Without it, degrading on every
    // commit read would satisfy that assertion perfectly while marking every
    // satellite permanently unknown.
    it('still computes real health when the commit read SUCCEEDS', async () => {
      const key = OWNED_BUSINESSES[0].key
      const { hubUpsertChain } = setupSupabaseMocks({
        existingSatellites: [
          {
            business_key: key,
            repo_url: 'https://github.com/CleanExpo/Synthex',
            stack: null,
            notes: null,
            open_linear_issues: 2,
            health_status: 'green',
            last_commit_sha: 'feedfac',
            last_commit_at: '2026-08-01T00:00:00Z',
          },
        ],
      })
      greenAllowList()
      mockFetchIssueCountByBusiness.mockResolvedValue({ [key]: 2 })
      mockParseRepoUrl.mockReturnValue({ owner: 'CleanExpo', repo: 'Synthex' })
      mockFetchLastCommit.mockResolvedValue({
        sha: 'abc1234',
        message: 'feat: something real',
        authorDate: new Date().toISOString(),
      })

      await GET(makeRequest())

      const row = upsertPayloads(hubUpsertChain).find((p) => p.business_key === key)
      expect(row).toBeDefined()
      expect(row?.last_commit_sha).toBe('abc1234')
      expect(row?.health_status).not.toBe('unknown')
    })

    // Missing configuration is unavailability, not a zero read. This used to
    // return {} silently, so `linearUnavailable` stayed false and every count
    // was persisted as a real zero with green health derived from it.
    it('treats an unconfigured Linear as unavailable, not as zero issues', async () => {
      const { hubUpsertChain } = setupSupabaseMocks()
      greenAllowList()
      mockFetchIssueCountByBusiness.mockRejectedValue(
        new Error('LINEAR_API_KEY is not configured — issue counts are unavailable, not zero'),
      )

      const res = await GET(makeRequest())
      const body = (await res.json()) as SweepBody

      expect(body.linearDegraded).toBe(true)
      expect(body.success).toBe(false)
      for (const p of upsertPayloads(hubUpsertChain)) {
        expect(p.health_status).toBe('unknown')
      }
    })

    // The preserved counts are the only thing standing between an unavailable
    // Linear and a zeroed column, so losing that read is itself a degradation.
    it('ABORTS BEFORE ANY WRITE when the prior-count read fails', async () => {
      // Reporting the failure afterwards was not enough: without the prior rows
      // every upsert writes open_linear_issues 0 and nulls founder-maintained
      // fields (stack, notes), and nothing rolls that back. The sweep would
      // destroy real data and then report the failure it had just caused.
      const { hubUpsertChain } = setupSupabaseMocks({
        existingSatellitesError: { message: 'permission denied' },
      })
      greenAllowList()
      mockFetchIssueCountByBusiness.mockResolvedValue({})

      const res = await GET(makeRequest())
      const body = (await res.json()) as SweepBody & {
        preservationDegraded: boolean
        preservationError: string | null
        aborted: boolean
        satellitesSwept: number
      }

      expect(res.status).toBe(500)
      expect(body.preservationError).toContain('permission denied')
      expect(body.preservationDegraded).toBe(true)
      expect(body.aborted).toBe(true)
      expect(body.success).toBe(false)
      expect(body.satellitesSwept).toBe(0)
      // The decisive assertion: nothing was written at all.
      expect(hubUpsertChain.upsert).not.toHaveBeenCalled()
    })

    // Write-then-confirm: an upsert that reports no error but stores something
    // else is not a successful sweep.
    it('reports FAILURE when the written row does not match what was sent', async () => {
      setupSupabaseMocks({
        readbackRows: [{ business_key: 'divergent', open_linear_issues: 999, health_status: 'green' }],
      })
      greenAllowList()
      mockFetchIssueCountByBusiness.mockResolvedValue({})

      const res = await GET(makeRequest())
      const body = (await res.json()) as SweepBody

      expect(body.errors).toBeGreaterThan(0)
      expect(body.success).toBe(false)
    })

    // Negative control. Without it, "always report Linear degraded" would
    // satisfy both assertions above while making the guard useless.
    it('reports SUCCESS and computes real health when Linear reads cleanly', async () => {
      const { hubUpsertChain } = setupSupabaseMocks()
      greenAllowList()
      mockFetchIssueCountByBusiness.mockResolvedValue({})

      const res = await GET(makeRequest())
      const body = (await res.json()) as SweepBody

      expect(body.linearError).toBeNull()
      expect(body.linearDegraded).toBe(false)
      expect(body.success).toBe(true)

      const statuses = upsertPayloads(hubUpsertChain).map((p) => p.health_status)
      expect(statuses.length).toBeGreaterThan(0)
      expect(statuses).not.toContain('unknown')
    })
  })

  // A failed Supabase read used to be indistinguishable from a genuinely empty
  // one: fetchBusinessIdMap discarded `error` and returned an empty Map,
  // fetchLastMacasVerdictDate and fetchLastBookkeeperRunDate discarded `error`
  // and returned null. calculateHealthStatus reads a null bookkeeper date as
  // "no signal" — it skips the >60d red and >30d yellow branches and returns
  // GREEN — so an unreadable table was persisted as a healthy satellite, and a
  // real last_macas_verdict_date was overwritten with the null the widget shows
  // as "Never". Found by scoped audit UNI-2467, finding 2.
  describe('a failed Supabase read is not an empty result', () => {
    type SweepBody = {
      success: boolean
      errors: number
      businessMapError: string | null
      businessMapDegraded: boolean
      aborted?: boolean
      satellitesSwept: number
      results: Array<{ businessKey: string; status: string }>
    }

    // The allow-list guard and Linear are the OTHER inputs to `success`. Both
    // must be green here or these assertions would pass on the wrong failure.
    // `vi.clearAllMocks()` clears call history but NOT an implementation set
    // with mockRejectedValue, so a rejection from an earlier describe leaks in
    // unless it is explicitly overwritten.
    const greenAllowList = () =>
      mockListUsers.mockResolvedValue({
        data: {
          users: [
            { id: 'founder-uuid', email: 'founder@example.com', last_sign_in_at: new Date().toISOString() },
          ],
        },
        error: null,
      })

    const upsertPayloads = (chain: { upsert: ReturnType<typeof vi.fn> }) =>
      chain.upsert.mock.calls.map((c) => c[0] as Record<string, unknown>)

    // Every owned business needs a businesses row, or fetchLastMacasVerdictDate
    // short-circuits on `!businessId` and the advisory_cases query never runs —
    // a control aimed at a query that was never issued proves nothing.
    const allBusinessRows = () =>
      OWNED_BUSINESSES.map((b) => ({ id: `biz-${b.key}`, slug: b.key }))

    it('ABORTS BEFORE ANY WRITE when the businesses slug→id read fails', async () => {
      // Root read: one failed SELECT would otherwise blank every satellite's
      // last_macas_verdict_date at once, with nothing to roll it back.
      const { hubUpsertChain } = setupSupabaseMocks({
        businessRowsError: { message: 'permission denied for table businesses' },
      })
      greenAllowList()
      mockFetchIssueCountByBusiness.mockResolvedValue({})

      const res = await GET(makeRequest())
      const body = (await res.json()) as SweepBody

      expect(res.status).toBe(500)
      expect(body.businessMapError).toContain('permission denied for table businesses')
      expect(body.businessMapDegraded).toBe(true)
      expect(body.aborted).toBe(true)
      expect(body.success).toBe(false)
      expect(body.satellitesSwept).toBe(0)
      expect(hubUpsertChain.upsert).not.toHaveBeenCalled()
    })

    it('reports FAILURE and writes nothing when the MACAS date read fails', async () => {
      const { hubUpsertChain } = setupSupabaseMocks({
        businessRows: allBusinessRows(),
        advisoryError: { message: 'advisory_cases unavailable' },
      })
      greenAllowList()
      mockFetchIssueCountByBusiness.mockResolvedValue({})

      const res = await GET(makeRequest())
      const body = (await res.json()) as SweepBody

      // Decisive assertion first, so a regression's failure text names the
      // defect: a date we could not read must never be persisted as null
      // ("Never"), which is what the discarded error used to write.
      expect(upsertPayloads(hubUpsertChain).map((p) => p.last_macas_verdict_date)).toEqual([])
      expect(hubUpsertChain.upsert).not.toHaveBeenCalled()
      expect(res.status).toBe(500)
      expect(body.success).toBe(false)
      expect(body.errors).toBe(OWNED_COUNT)
      expect(body.satellitesSwept).toBe(0)
    })

    it('reports FAILURE and never derives green health when the bookkeeper read fails', async () => {
      // The most direct fail-open: a discarded error returned null, and a null
      // bookkeeper date skips both the red and yellow branches → green.
      const { hubUpsertChain } = setupSupabaseMocks({
        businessRows: allBusinessRows(),
        bookkeeperError: { message: 'bookkeeper_runs unavailable' },
      })
      greenAllowList()
      mockFetchIssueCountByBusiness.mockResolvedValue({})

      const res = await GET(makeRequest())
      const body = (await res.json()) as SweepBody

      // Decisive assertion first: no satellite is certified healthy off a read
      // that failed. Asserting the HTTP status before this would mask it.
      expect(upsertPayloads(hubUpsertChain).map((p) => p.health_status)).not.toContain('green')
      expect(hubUpsertChain.upsert).not.toHaveBeenCalled()
      expect(res.status).toBe(500)
      expect(body.success).toBe(false)
      expect(body.errors).toBe(OWNED_COUNT)
      expect(body.results.every((r) => r.status === 'error')).toBe(true)
    })

    // ---- Negative controls -------------------------------------------------
    // Without these, "treat every read as broken" would satisfy all three
    // assertions above while making the sweep permanently red. A genuine
    // absence must still be healthy absence, exactly as before.

    it('still reports SUCCESS when the businesses table is genuinely empty', async () => {
      const { hubUpsertChain } = setupSupabaseMocks({ businessRows: [] })
      greenAllowList()
      mockFetchIssueCountByBusiness.mockResolvedValue({})

      const res = await GET(makeRequest())
      const body = (await res.json()) as SweepBody

      expect(res.status).toBe(200)
      expect(body.businessMapError).toBeNull()
      expect(body.businessMapDegraded).toBe(false)
      expect(body.success).toBe(true)
      expect(body.satellitesSwept).toBe(OWNED_COUNT)
      const statuses = upsertPayloads(hubUpsertChain).map((p) => p.health_status)
      expect(statuses.length).toBe(OWNED_COUNT)
      expect(new Set(statuses)).toEqual(new Set(['green']))
    })

    it('still reports SUCCESS and green health when there is genuinely nothing to find', async () => {
      // Businesses rows exist, so both per-satellite queries really run; both
      // return no rows and no error. That is a healthy young estate, not a
      // broken one — it must stay green with honest null dates.
      const { hubUpsertChain } = setupSupabaseMocks({
        businessRows: allBusinessRows(),
        advisoryRow: null,
        bookkeeperRows: [],
      })
      greenAllowList()
      mockFetchIssueCountByBusiness.mockResolvedValue({})

      const res = await GET(makeRequest())
      const body = (await res.json()) as SweepBody

      expect(res.status).toBe(200)
      expect(body.success).toBe(true)
      expect(body.errors).toBe(0)
      const payloads = upsertPayloads(hubUpsertChain)
      expect(payloads.length).toBe(OWNED_COUNT)
      for (const p of payloads) {
        expect(p.health_status).toBe('green')
        expect(p.last_macas_verdict_date).toBeNull()
        expect(p.last_bookkeeper_run_date).toBeNull()
      }
    })
  })
})
