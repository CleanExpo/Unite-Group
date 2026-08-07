// UNI-2373 P9 — the five blockers that failed the previous review, as tests.
//
// Each test fails if its defect is reinstated:
//   dormant       — an unarmed invocation must touch nothing
//   persistence   — a discarded Supabase error must not return success: true
//   no-clobber    — the weekly must not reset the daily's status/brief_md
//   visibility    — the weekly must write `agenda`, which is what MeetingCard renders
//   honest-zeros  — an unreachable Linear must not read as a zero week

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/lib/supabase/service', () => ({ createServiceClient: vi.fn() }))
vi.mock('@/lib/integrations/github-board', () => ({
  fetchOrgRepos: vi.fn().mockResolvedValue([]),
  fetchRecentCommits: vi.fn().mockResolvedValue([]),
  fetchOpenPRs: vi.fn().mockResolvedValue([]),
  isGitHubBoardConfigured: vi.fn().mockReturnValue(false),
}))
vi.mock('@/lib/integrations/linear-board', () => ({
  fetchRecentlyCompletedIssues: vi.fn().mockResolvedValue([]),
  fetchInFlightIssues: vi.fn().mockResolvedValue([]),
  fetchIssuesWithDueDates: vi.fn().mockResolvedValue([]),
}))
vi.mock('@/lib/notifications', () => ({ notify: vi.fn().mockResolvedValue(undefined) }))

import { createServiceClient } from '@/lib/supabase/service'
import { fetchRecentlyCompletedIssues } from '@/lib/integrations/linear-board'
import { GET } from '../route'

vi.stubEnv('CRON_SECRET', 'test-secret')
vi.stubEnv('FOUNDER_USER_ID', 'founder-1')

function req(auth = 'Bearer test-secret') {
  return new Request('https://app.test', { headers: { authorization: auth } })
}

/** Per-table thenable query builder. `awaitResult` is what `await qb...` yields;
 *  `maybeSingle` is a shared mock so read/insert/confirm can be sequenced. */
function makeTable(awaitResult: unknown = { data: [], error: null }) {
  const calls: Record<string, unknown[]> = {}
  const b: Record<string, unknown> = {
    then: (onOk: (v: unknown) => unknown, onErr: (e: unknown) => unknown) =>
      Promise.resolve(awaitResult).then(onOk, onErr),
  }
  for (const m of ['select', 'eq', 'gte', 'or', 'upsert', 'update', 'insert', 'order', 'limit', 'neq', 'in']) {
    b[m] = vi.fn((...args: unknown[]) => {
      ;(calls[m] ??= []).push(args[0])
      return b
    })
  }
  b.maybeSingle = vi.fn()
  b.single = b.maybeSingle
  ;(b as { _calls: unknown })._calls = calls
  return b as Record<string, ReturnType<typeof vi.fn>> & { _calls: Record<string, unknown[]> }
}

let tables: Record<string, ReturnType<typeof makeTable>>

function installClient() {
  vi.mocked(createServiceClient).mockReturnValue({
    from: vi.fn((t: string) => (tables[t] ??= makeTable())),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  } as never)
}

/** Arm the route and give board_meetings the read → confirm sequence for an
 *  existing daily row (the collision case the register flagged). */
function armWithExistingDailyRow() {
  vi.stubEnv('PI_CEO_WEEKLY_REVIEW_LIVE', '1')
  tables.weekly_reviews = makeTable({ error: null })
  const bm = makeTable({ error: null })
  bm.maybeSingle
    .mockResolvedValueOnce({ data: { id: 'bm-1', agenda: { shipped: { title: 'Shipped', items: [] } } }, error: null })
    .mockResolvedValueOnce({ data: { agenda: { shipped: {}, weekly: { title: 'Weekly review' } } }, error: null })
  tables.board_meetings = bm
  return bm
}

describe('GET /api/cron/pi-ceo-weekly-review', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    tables = {}
    installClient()
  })
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.stubEnv('CRON_SECRET', 'test-secret')
    vi.stubEnv('FOUNDER_USER_ID', 'founder-1')
  })

  it('returns 401 when unauthorized', async () => {
    const res = await GET(req('bad'))
    expect(res.status).toBe(401)
  })

  describe('dormant by default (blocker 5 — merging must arm nothing)', () => {
    it('performs no Supabase work and reports armed:false when the flag is unset', async () => {
      const client = { from: vi.fn(), rpc: vi.fn() }
      vi.mocked(createServiceClient).mockReturnValue(client as never)

      const res = await GET(req())
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.armed).toBe(false)
      expect(body.persisted).toBe(false)
      // The proof it is inert: no table was ever touched.
      expect(client.from).not.toHaveBeenCalled()
      expect(client.rpc).not.toHaveBeenCalled()
    })

    it('does not run dormant once armed', async () => {
      armWithExistingDailyRow()
      const body = await (await GET(req())).json()
      expect(body.armed).toBe(true)
      expect(body.persisted).toBe(true)
    })
  })

  describe('write-then-confirm (blocker 4 — no success:true over a discarded error)', () => {
    it('returns 500 when the weekly_reviews upsert fails', async () => {
      vi.stubEnv('PI_CEO_WEEKLY_REVIEW_LIVE', '1')
      tables.weekly_reviews = makeTable({ error: { message: 'permission denied' } })
      tables.board_meetings = makeTable({ error: null })

      const res = await GET(req())
      const body = await res.json()

      expect(res.status).toBe(500)
      expect(body.success).toBe(false)
      expect(body.error).toContain('weekly_reviews upsert failed')
    })

    it('returns 500 when the board_meetings merge fails', async () => {
      vi.stubEnv('PI_CEO_WEEKLY_REVIEW_LIVE', '1')
      tables.weekly_reviews = makeTable({ error: null })
      const bm = makeTable({ error: { message: 'update rejected' } })
      bm.maybeSingle.mockResolvedValueOnce({ data: { id: 'bm-1', agenda: {} }, error: null })
      tables.board_meetings = bm

      const res = await GET(req())
      expect(res.status).toBe(500)
      expect((await res.json()).error).toContain('board_meetings merge failed')
    })

    it('returns 500 when the read-back cannot confirm the weekly section landed', async () => {
      vi.stubEnv('PI_CEO_WEEKLY_REVIEW_LIVE', '1')
      tables.weekly_reviews = makeTable({ error: null })
      const bm = makeTable({ error: null })
      bm.maybeSingle
        .mockResolvedValueOnce({ data: { id: 'bm-1', agenda: {} }, error: null })
        // Write accepted, but the row does not carry the section.
        .mockResolvedValueOnce({ data: { agenda: {} }, error: null })
      tables.board_meetings = bm

      const res = await GET(req())
      expect(res.status).toBe(500)
      expect((await res.json()).error).toContain('weekly agenda section not present')
    })
  })

  describe('board_meetings collision (blocker 2 — must merge, never clobber)', () => {
    it('updates only agenda + updated_at, preserving the daily row', async () => {
      const bm = armWithExistingDailyRow()
      await GET(req())

      expect(bm.update).toHaveBeenCalledTimes(1)
      const patch = bm.update.mock.calls[0][0] as Record<string, unknown>
      expect(Object.keys(patch).sort()).toEqual(['agenda', 'updated_at'])
      // The columns the daily cron owns are never in the weekly's patch.
      for (const owned of ['status', 'brief_md', 'linear_data', 'github_data', 'metrics']) {
        expect(patch).not.toHaveProperty(owned)
      }
      // And the daily's own agenda section survives the merge.
      expect(patch.agenda).toHaveProperty('shipped')
      expect(patch.agenda).toHaveProperty('weekly')
      expect(bm.insert).not.toHaveBeenCalled()
    })

    it('re-reads and merges instead of clobbering when the daily inserts mid-flight (23505)', async () => {
      vi.stubEnv('PI_CEO_WEEKLY_REVIEW_LIVE', '1')
      tables.weekly_reviews = makeTable({ error: null })
      const bm = makeTable({ error: null })
      bm.maybeSingle
        .mockResolvedValueOnce({ data: null, error: null })                                  // no row yet
        .mockResolvedValueOnce({ data: null, error: { code: '23505', message: 'dup' } })     // insert raced
        .mockResolvedValueOnce({ data: { id: 'bm-9', agenda: { shipped: {} } }, error: null }) // re-read
        .mockResolvedValueOnce({ data: { agenda: { shipped: {}, weekly: {} } }, error: null }) // confirm
      tables.board_meetings = bm

      const res = await GET(req())
      expect(res.status).toBe(200)
      expect(bm.update).toHaveBeenCalledTimes(1)
      expect(bm.update.mock.calls[0][0]).toHaveProperty('agenda.shipped')
    })
  })

  describe('weekly_reviews must not clobber either (same class, one table over)', () => {
    it('omits status from the upsert so a re-run cannot reset "reviewed" to "new"', async () => {
      armWithExistingDailyRow()
      await GET(req())

      const payload = tables.weekly_reviews.upsert.mock.calls[0][0] as Record<string, unknown>
      expect(payload).not.toHaveProperty('status')
      // Still writes the content it owns.
      expect(payload).toHaveProperty('brief_md')
      expect(payload).toHaveProperty('headline')
    })
  })

  describe('visibility (blocker 3 — the founder must actually see it)', () => {
    it('writes an agenda section, which is the field MeetingCard renders', async () => {
      const bm = armWithExistingDailyRow()
      await GET(req())

      const agenda = (bm.update.mock.calls[0][0] as { agenda: Record<string, { title: string; items: string[] }> }).agenda
      expect(agenda.weekly.title).toBe('Weekly review')
      expect(agenda.weekly.items.length).toBeGreaterThan(0)
    })
  })

  describe('honest upstream states (blocker — no fabricated zeros)', () => {
    it('reports Linear unavailable rather than a zero week, and computes no velocity score', async () => {
      vi.mocked(fetchRecentlyCompletedIssues).mockRejectedValueOnce(new Error('linear down'))
      armWithExistingDailyRow()

      const body = await (await GET(req())).json()

      expect(body.brief.velocityScore).toBeNull()
      expect(body.brief.headline).toContain('Linear unavailable')
      expect(body.brief.metrics.linear.available).toBe(false)
      expect(body.brief.metrics.linear.shipped).toBeNull()
      // The exact fabrication being guarded against.
      expect(body.brief.metrics.linear.shipped).not.toBe(0)
      expect(body.brief.topWins.join(' ')).toContain('unavailable')
    })

    it('reports a real zero week as zero — the guard must not fire when Linear is healthy', async () => {
      armWithExistingDailyRow()
      const body = await (await GET(req())).json()

      expect(body.brief.metrics.linear.available).toBe(true)
      expect(body.brief.metrics.linear.shipped).toBe(0)
      expect(body.brief.velocityScore).not.toBeNull()
    })
  })
})
