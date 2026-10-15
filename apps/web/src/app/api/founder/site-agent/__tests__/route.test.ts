import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn(), createClient: vi.fn() }))
vi.mock('@/lib/supabase/service', () => ({ createServiceClient: vi.fn() }))
vi.mock('@/lib/error-reporting', () => ({
  captureApiError: vi.fn(),
  sanitiseError: (_e: unknown, msg: string) => msg,
}))

import { getUser, createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { GET, POST } from '../route'
import { brisbaneDay } from '@/lib/site-agent/quota'

type Result = { data: unknown; error: unknown }
type Call = { table: string; method: string; args: unknown[] }

/**
 * Chainable stand-in for the supabase-js query builder. Every call is recorded
 * per table; awaiting the chain resolves the next queued result for that table.
 */
function fakeClient(results: Record<string, Result[]> = {}) {
  const calls: Call[] = []
  const from = (table: string) => {
    const builder: Record<string, unknown> = {}
    for (const method of ['select', 'eq', 'order', 'insert', 'update', 'upsert', 'maybeSingle', 'single']) {
      builder[method] = (...args: unknown[]) => {
        calls.push({ table, method, args })
        return builder
      }
    }
    builder.then = (resolve: (r: Result) => unknown, reject: (e: unknown) => unknown) =>
      Promise.resolve(results[table]?.shift() ?? { data: null, error: null }).then(resolve, reject)
    return builder
  }
  return { client: { from }, calls }
}

const called = (calls: Call[], table: string, method: string) =>
  calls.filter((c) => c.table === table && c.method === method)

function post(body: unknown) {
  return POST(
    new Request('https://app.test/api/founder/site-agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  )
}

const FOUNDER = { id: 'founder-1', email: 'founder@example.com' }
const KEY_ID = '7f1c2a9e-1111-4222-8333-944455556666'
const savedAllowList = process.env.FOUNDER_ALLOWED_USER_IDS

beforeEach(() => {
  vi.clearAllMocks()
  process.env.FOUNDER_ALLOWED_USER_IDS = FOUNDER.id
  vi.mocked(getUser).mockResolvedValue(FOUNDER as never)
})

afterEach(() => {
  if (savedAllowList === undefined) delete process.env.FOUNDER_ALLOWED_USER_IDS
  else process.env.FOUNDER_ALLOWED_USER_IDS = savedAllowList
})

describe('auth', () => {
  it('returns 401 without a session and touches no table', async () => {
    vi.mocked(getUser).mockResolvedValue(null as never)
    const res = await GET()
    expect(res.status).toBe(401)
    expect(createClient).not.toHaveBeenCalled()
  })

  it('returns 403 for a signed-in user who is not on the founder allow-list', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'someone-else' } as never)
    expect((await GET()).status).toBe(403)
    expect((await post({ action: 'set_controls', enabled: true })).status).toBe(403)
    expect(createServiceClient).not.toHaveBeenCalled()
  })
})

describe('GET /api/founder/site-agent', () => {
  it('scopes every section to the founder and returns them as ok', async () => {
    const { client, calls } = fakeClient({
      businesses: [{ data: [{ id: 'b1', name: 'Acme', slug: 'acme', status: 'active' }], error: null }],
      site_keys: [{ data: [{ id: KEY_ID, business_key: 'acme' }], error: null }],
      public_agent_controls: [{ data: null, error: null }],
      public_agent_usage_daily: [{ data: [{ scope: '*founder', kind: 'chat', count: 3 }], error: null }],
    })
    vi.mocked(createClient).mockResolvedValue(client as never)

    const res = await GET()
    expect(res.status).toBe(200)
    expect(res.headers.get('Cache-Control')).toBe('no-store')
    const body = await res.json()

    for (const table of ['businesses', 'site_keys', 'public_agent_controls', 'public_agent_usage_daily']) {
      expect(called(calls, table, 'eq').map((c) => c.args)).toContainEqual(['founder_id', FOUNDER.id])
    }
    expect(called(calls, 'public_agent_usage_daily', 'eq').map((c) => c.args)).toContainEqual(['day', body.day])
    expect(body.businesses).toEqual({ status: 'ok', data: [{ id: 'b1', name: 'Acme', slug: 'acme', status: 'active' }] })
    // No controls row is a successful read meaning "paused", not an error.
    expect(body.controls).toEqual({ status: 'ok', data: null })
    expect(body.usage.data).toEqual([{ scope: '*founder', kind: 'chat', count: 3 }])
  })

  it('reports a failed read as an error, never as an empty list', async () => {
    const { client } = fakeClient({
      public_agent_usage_daily: [{ data: null, error: { message: 'relation does not exist' } }],
    })
    vi.mocked(createClient).mockResolvedValue(client as never)

    const body = await (await GET()).json()
    expect(body.usage).toEqual({ status: 'error', error: 'Usage unavailable' })
    expect(body.usage).not.toHaveProperty('data')
    // The other sections are unaffected.
    expect(body.businesses.status).toBe('ok')
  })
})

describe('POST create_site', () => {
  const valid = {
    action: 'create_site',
    businessName: 'Acme Plumbing',
    businessSlug: 'acme-plumbing',
    allowedOrigins: ['HTTPS://Acme.example/contact', 'https://acme.example'],
  }

  it.each([
    ['an empty allow-list', []],
    ['a non-http origin', ['javascript:alert(1)']],
    ['a non-URL origin', ['acme.example']],
  ])('rejects %s with 400 and writes nothing', async (_label, allowedOrigins) => {
    const { client, calls } = fakeClient()
    vi.mocked(createClient).mockResolvedValue(client as never)
    const res = await post({ ...valid, allowedOrigins })
    expect(res.status).toBe(400)
    expect(calls.filter((c) => c.method === 'insert')).toHaveLength(0)
  })

  it('rejects a slug that grounding could never resolve', async () => {
    expect((await post({ ...valid, businessSlug: 'Acme Plumbing' })).status).toBe(400)
  })

  it('creates the business, then a founder-scoped key with normalised origins', async () => {
    const { client, calls } = fakeClient({
      businesses: [
        { data: null, error: null },
        { data: { id: 'b1' }, error: null },
      ],
      site_keys: [{ data: { id: KEY_ID, business_key: 'acme-plumbing' }, error: null }],
    })
    vi.mocked(createClient).mockResolvedValue(client as never)

    const res = await post({ ...valid, founder_id: 'attacker' })
    expect(res.status).toBe(201)
    expect((await res.json()).businessCreated).toBe(true)

    expect(called(calls, 'businesses', 'insert')[0].args[0]).toEqual({
      founder_id: FOUNDER.id,
      name: 'Acme Plumbing',
      slug: 'acme-plumbing',
    })
    const keyRow = called(calls, 'site_keys', 'insert')[0].args[0] as Record<string, unknown>
    expect(keyRow.founder_id).toBe(FOUNDER.id)
    expect(keyRow.business_key).toBe('acme-plumbing')
    expect(keyRow.allowed_origins).toEqual(['https://acme.example'])
    expect(String(keyRow.publishable_key)).toMatch(/^sk_site_[A-Za-z0-9_-]{32}$/)
  })

  it('reuses an existing business with the same slug', async () => {
    const { client, calls } = fakeClient({
      businesses: [{ data: { id: 'b1', slug: 'acme-plumbing' }, error: null }],
      site_keys: [{ data: { id: KEY_ID }, error: null }],
    })
    vi.mocked(createClient).mockResolvedValue(client as never)

    const res = await post(valid)
    expect(res.status).toBe(201)
    expect((await res.json()).businessCreated).toBe(false)
    expect(called(calls, 'businesses', 'insert')).toHaveLength(0)
  })

  it('returns 500, not success, when the key insert fails', async () => {
    const { client } = fakeClient({
      businesses: [{ data: { id: 'b1' }, error: null }],
      site_keys: [{ data: null, error: { message: 'duplicate key' } }],
    })
    vi.mocked(createClient).mockResolvedValue(client as never)
    expect((await post(valid)).status).toBe(500)
  })
})

describe('POST update_key', () => {
  it('returns 404 when the key is not the founder’s, scoping by founder and id', async () => {
    const { client, calls } = fakeClient({ site_keys: [{ data: null, error: null }] })
    vi.mocked(createClient).mockResolvedValue(client as never)

    const res = await post({ action: 'update_key', id: KEY_ID, active: false })
    expect(res.status).toBe(404)
    const eqArgs = called(calls, 'site_keys', 'eq').map((c) => c.args)
    expect(eqArgs).toContainEqual(['founder_id', FOUNDER.id])
    expect(eqArgs).toContainEqual(['id', KEY_ID])
  })

  it('rejects clearing the allow-list', async () => {
    expect((await post({ action: 'update_key', id: KEY_ID, allowedOrigins: [] })).status).toBe(400)
  })

  it('rejects an update with nothing to change', async () => {
    expect((await post({ action: 'update_key', id: KEY_ID })).status).toBe(400)
  })

  it('updates origins and active together', async () => {
    const { client, calls } = fakeClient({ site_keys: [{ data: { id: KEY_ID, active: false }, error: null }] })
    vi.mocked(createClient).mockResolvedValue(client as never)

    const res = await post({
      action: 'update_key',
      id: KEY_ID,
      allowedOrigins: ['https://new.example'],
      active: false,
    })
    expect(res.status).toBe(200)
    const patch = called(calls, 'site_keys', 'update')[0].args[0] as Record<string, unknown>
    expect(patch).toMatchObject({ allowed_origins: ['https://new.example'], active: false })
  })
})

describe('POST set_controls', () => {
  it('refuses a plan with no founder-set ceiling and writes nothing', async () => {
    const res = await post({ action: 'set_controls', enabled: true, plan: 'growth' })
    expect(res.status).toBe(400)
    expect(createServiceClient).not.toHaveBeenCalled()
  })

  it('upserts the kill switch and plan ceiling for the signed-in founder only', async () => {
    const { client, calls } = fakeClient({
      public_agent_controls: [{ data: { enabled: true, chat_daily_per_key: 200 }, error: null }],
    })
    vi.mocked(createServiceClient).mockReturnValue(client as never)

    const res = await post({ action: 'set_controls', enabled: true, plan: 'starter', founder_id: 'attacker' })
    expect(res.status).toBe(200)
    const [row, options] = called(calls, 'public_agent_controls', 'upsert')[0].args as [
      Record<string, unknown>,
      unknown,
    ]
    expect(row).toMatchObject({ founder_id: FOUNDER.id, enabled: true, chat_daily_per_key: 200 })
    expect(options).toEqual({ onConflict: 'founder_id' })
  })

  it('returns 500, not success, when the controls write fails', async () => {
    const { client } = fakeClient({
      public_agent_controls: [{ data: null, error: { message: 'relation does not exist' } }],
    })
    vi.mocked(createServiceClient).mockReturnValue(client as never)
    expect((await post({ action: 'set_controls', enabled: false })).status).toBe(500)
  })
})

describe('brisbaneDay', () => {
  it('rolls over at Brisbane midnight (14:00 UTC)', () => {
    expect(brisbaneDay(new Date('2026-10-14T13:59:59Z'))).toBe('2026-10-14')
    expect(brisbaneDay(new Date('2026-10-14T14:00:00Z'))).toBe('2026-10-15')
  })
})
