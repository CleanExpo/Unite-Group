import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GET } from '../route'

const crypto = vi.hoisted(() => ({ compare: vi.fn() }))
vi.mock('node:crypto', async (original) => {
  const actual = await original<typeof import('node:crypto')>()
  crypto.compare.mockImplementation(actual.timingSafeEqual)
  return { ...actual, default: actual, timingSafeEqual: crypto.compare }
})

const state = vi.hoisted(() => ({
  tables: {} as Record<string, Record<string, unknown>[]>,
  fail: '',
  queries: [] as string[],
}))
vi.mock('@/lib/supabase/service', () => ({ createServiceClient: () => ({
  from(table: string) {
    state.queries.push(table)
    let rows = [...(state.tables[table] ?? [])]
    const query = {
      select: () => query,
      eq(key: string, value: unknown) { rows = rows.filter((r) => r[key] === value); return query },
      gte(key: string, value: string) { rows = rows.filter((r) => String(r[key]) >= value); return query },
      lte(key: string, value: string) { rows = rows.filter((r) => String(r[key]) <= value); return query },
      lt(key: string, value: string) { rows = rows.filter((r) => String(r[key]) < value); return query },
      order(key: string) { rows.sort((a, b) => String(a[key]).localeCompare(String(b[key]))); return query },
      range(start: number, end: number) {
        return Promise.resolve({ data: state.fail === table ? null : rows.slice(start, end + 1),
          error: state.fail === table ? { message: 'SENTINEL-PRIVATE' } : null })
      },
    }
    return query
  },
}) }))

const NOW = new Date('2026-10-24T19:00:00.000Z')
const ago = (ms: number) => new Date(Date.now() - ms).toISOString()
const HOUR = 60 * 60 * 1000
const request = (bearer = 'test-health-token') => new Request('https://app.invalid/api/health/alerts', {
  headers: bearer ? { authorization: `Bearer ${bearer}` } : {},
})
function log(source: string, outcome: string, age = 5 * 60 * 1000, key: string | null = null) {
  return { id: source, source_id: source, source_kind: 'new_lead', channel: 'email', founder_id: 'founder',
    outcome, dedup_key: key, created_at: ago(age), updated_at: ago(age) }
}
function lead(id: string, age = 3 * 60 * 1000) {
  return { id, founder_id: 'founder', captured_at: ago(age) }
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
  vi.stubEnv('ALERT_HEALTH_TOKEN', 'test-health-token')
  vi.stubEnv('CRON_SECRET', '')
  vi.stubEnv('FOUNDER_USER_ID', 'founder')
  state.tables = { alert_delivery_log: [], crm_leads: [], stripe_events: [] }
  state.queries = []
  state.fail = ''
})
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs() })

describe('alert health', () => {
  it('requires the dedicated token, falling back to cron only when blank', async () => {
    expect((await GET(request(''))).status).toBe(401)
    vi.stubEnv('CRON_SECRET', 'test-cron-token')
    expect((await GET(request('test-cron-token'))).status).toBe(401)
    vi.stubEnv('ALERT_HEALTH_TOKEN', ' ')
    expect((await GET(request('test-cron-token'))).status).toBe(200)
    vi.stubEnv('CRON_SECRET', '')
    expect((await GET(request('undefined'))).status).toBe(500)
  })

  it('compares the bearer with timingSafeEqual and never throws on a length mismatch', async () => {
    crypto.compare.mockClear()
    expect((await GET(request('test-health-tokeX'))).status).toBe(401)
    expect(crypto.compare).toHaveBeenCalledTimes(1)
    expect((await GET(request('short'))).status).toBe(401)
    expect((await GET(request('test-health-token-and-more'))).status).toBe(401)
    expect(crypto.compare).toHaveBeenCalledTimes(1) // different length: rejected before the call
    expect((await GET(request())).status).toBe(200)
    expect(crypto.compare).toHaveBeenCalledTimes(2)
  })

  it('does not count an erased enquiry as unalerted, but still counts a genuinely unalerted one', async () => {
    state.tables.crm_leads = [
      { ...lead('erased'), additional_data: { alert_erased_at: '2026-10-24T18:00:00.000Z' } },
      { ...lead('keeps-other-data'), additional_data: { note: 'x' } },
      { ...lead('missing'), additional_data: {} },
      lead('no-column-value'),
    ]
    const body = await (await GET(request())).json()
    expect(body.unalerted).toBe(3)
    expect(body.unalerted_ids).toEqual(['keeps-other-data', 'missing', 'no-column-value'])
  })

  it('counts exact per-source outcomes over 72 hours including stale pending', async () => {
    state.tables.alert_delivery_log = [log('S1', 'failed'), log('S2', 'unconfigured'), log('S3', 'failed'),
      log('S4', 'deduped', 4 * 60 * 1000, 'covered'), log('S5', 'sent', 5 * 60 * 1000, 'covered'),
      log('S6', 'pending', 20_000), log('S7', 'pending', 5_000), log('S8', 'failed', 60 * HOUR),
      log('S9', 'failed', 80 * HOUR), { ...log('foreign', 'failed'), founder_id: 'another' }]
    expect(await (await GET(request())).json()).toEqual({ window_hours: 72, attempts: 7, failed: 5,
      unconfigured: 1, deduped: 1, unalerted: 0, last_failure_at: ago(20_000), sent: 1,
      delivery_note: 'sent means SendGrid accepted the message (HTTP 202); delivery is not confirmed',
      destination: 'unknown', failed_ids: ['S1', 'S2', 'S3', 'S6', 'S8'], unalerted_ids: [] })
  })

  it.each(['alert_delivery_log', 'crm_leads'])('fails closed when %s cannot be read', async (table) => {
    state.fail = table
    expect((await GET(request())).status).toBe(503)
  })

  it('reports yesterday and the day before failures so daily polls cannot miss them', async () => {
    const failureTime = '2026-10-22T19:01:00.000Z'
    state.tables.alert_delivery_log = [{ ...log('boundary', 'failed'), created_at: failureTime, updated_at: failureTime }]
    for (const poll of ['2026-10-23T19:00:00.000Z', '2026-10-24T19:00:00.000Z']) {
      vi.setSystemTime(new Date(poll))
      expect(await (await GET(request())).json()).toMatchObject({ failed: 1, attempts: 1, last_failure_at: failureTime })
    }
  })

  it('reconciles absent alerts and suppressions without sent coverage, with a two-minute grace', async () => {
    state.tables.crm_leads = [lead('missing'), lead('too-young', 60_000), lead('deduped'), lead('covered')]
    state.tables.alert_delivery_log = [log('deduped', 'deduped', 5 * 60 * 1000, 'missing-key'),
      log('covered', 'deduped', 5 * 60 * 1000, 'covered-key'), log('prior', 'sent', 10 * 60 * 1000, 'covered-key')]
    expect(await (await GET(request())).json()).toMatchObject({ unalerted: 2, deduped: 2 })
  })

  it('reports an unclaimed lead after a failed claim rather than returning zeros', async () => {
    state.tables.crm_leads = [lead('claim-failed')]
    expect(await (await GET(request())).json()).toMatchObject({ unalerted: 1, attempts: 0 })
  })

  it('reads coverage before the 72-hour edge without counting it as an attempt', async () => {
    state.tables.alert_delivery_log = [log('suppressed', 'deduped', 71.9 * HOUR, 'edge'),
      log('coverage', 'sent', 72.1 * HOUR, 'edge')]
    expect(await (await GET(request())).json()).toMatchObject({ deduped: 1, attempts: 0, unalerted: 0 })
  })

  it('does not cover a suppression with a later sent row or a send over 60 minutes earlier', async () => {
    state.tables.alert_delivery_log = [log('suppressed', 'deduped', HOUR, 'key'),
      log('later', 'sent', HOUR - 1, 'key'), log('older', 'sent', 2 * HOUR + 1, 'key')]
    expect(await (await GET(request())).json()).toMatchObject({ unalerted: 1 })
  })

  it('pages beyond the API row cap without dropping failures or missing leads', async () => {
    state.tables.alert_delivery_log = Array.from({ length: 1001 }, (_, i) => log(`source-${i}`, i === 999 ? 'failed' : 'sent'))
    state.tables.crm_leads = Array.from({ length: 1001 }, (_, i) => lead(`missing-${i}`))
    expect(await (await GET(request())).json()).toMatchObject({ attempts: 1001, failed: 1, unalerted: 1001 })
  })

  it('S2a excludes checkout events from reconciliation', async () => {
    state.tables.stripe_events = [{ id: 'uuid', stripe_event_id: 'evt_checkout',
      event_type: 'checkout.session.completed', received_at: ago(5 * 60 * 1000) }]
    expect(await (await GET(request())).json()).toMatchObject({ unalerted: 0, attempts: 0 })
    expect(state.queries).not.toContain('stripe_events')
  })
  it('names the leads to follow up: unalerted and failed source ids, capped at 20', async () => {
    state.tables.crm_leads = Array.from({ length: 25 }, (_, i) => lead(`missing-${String(i).padStart(2, '0')}`))
    state.tables.alert_delivery_log = [log('bad-lead', 'failed')]
    const body = await (await GET(request())).json()
    expect(body.unalerted).toBe(25)
    expect(body.unalerted_ids).toHaveLength(20)
    expect(body.unalerted_ids[0]).toBe('missing-00')
    expect(body.failed_ids).toEqual(['bad-lead'])
  })

  describe('destination suppression (SendGrid answers 202 for a suppressed address)', () => {
    const answers = (listed: boolean) => vi.fn(async (url: string | URL) => {
      const path = String(url)
      const body = path.includes('/asm/') ? (listed ? { recipient_email: 'x' } : {}) : (listed && path.includes('/bounces/') ? [{ email: 'x' }] : [])
      return { ok: true, status: 200, json: async () => body } as Response
    })
    beforeEach(() => {
      vi.stubEnv('LEAD_ALERT_EMAIL_TO', 'destination@example.invalid')
      vi.stubEnv('SENDGRID_API_KEY', 'test-placeholder')
    })
    afterEach(() => vi.unstubAllGlobals())

    it('reports suppressed, while every count still says healthy (the 202 hides it)', async () => {
      state.tables.alert_delivery_log = [log('S1', 'sent')]
      vi.stubGlobal('fetch', answers(true))
      expect(await (await GET(request())).json()).toMatchObject({ destination: 'suppressed', failed: 0, unalerted: 0, sent: 1 })
    })
    it('reports clear when no list holds the address', async () => {
      vi.stubGlobal('fetch', answers(false))
      expect(await (await GET(request())).json()).toMatchObject({ destination: 'clear' })
    })
    it('reports unknown, never clear, when the key cannot read the lists', async () => {
      vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 403, json: async () => ({}) }) as Response))
      expect(await (await GET(request())).json()).toMatchObject({ destination: 'unknown' })
    })
  })

  it('refuses a health token that equals CRON_SECRET', async () => {
    vi.stubEnv('CRON_SECRET', 'test-health-token')
    expect((await GET(request())).status).toBe(500)
  })
})
