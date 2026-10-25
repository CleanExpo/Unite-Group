import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createHmac } from 'node:crypto'

const mocks = vi.hoisted(() => ({ getUser: vi.fn(), from: vi.fn(), rpc: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({ auth: { getUser: mocks.getUser } }) }))
vi.mock('@/lib/supabase/service', () => ({ createServiceClient: () => ({ from: mocks.from, rpc: mocks.rpc }) }))
import { POST } from '../route'

const founder = '00000000-0000-4000-8000-0000000000f1'
const ID = '00000000-0000-4000-8000-000000000001'
const OTHER = '00000000-0000-4000-8000-000000000002'
const SECRET = 'test-placeholder-dedup-secret'
const key = (email: string, label: string) => createHmac('sha256', SECRET).update(`${founder}|${email}|${label}`).digest('hex')
const call = (id = ID) => POST(new Request(`https://app.example.invalid/api/founder/leads/${id}/erase-alert-data`, { method: 'POST' }) as any,
  { params: Promise.resolve({ id }) })

let leads: Array<{ id: string; email: string; interests: string | null; founder_id: string; additional_data?: Record<string, unknown> }>
let updates: Array<{ id: unknown; patch: any }>
let filters: Array<[string, unknown]>

beforeEach(() => {
  vi.clearAllMocks()
  filters = []
  updates = []
  vi.stubEnv('FOUNDER_USER_ID', founder)
  vi.stubEnv('ALERT_DEDUP_SECRET', SECRET)
  vi.spyOn(console, 'error').mockImplementation(() => {})
  mocks.getUser.mockResolvedValue({ data: { user: { id: founder } }, error: null })
  leads = [
    { id: ID, email: 'Buyer@Example.invalid', interests: 'living-card', founder_id: founder },
    { id: OTHER, email: 'buyer@example.invalid', interests: null, founder_id: founder },
    { id: '00000000-0000-4000-8000-000000000003', email: 'someone@example.invalid', interests: null, founder_id: founder },
  ]
  mocks.from.mockImplementation(() => {
    let rows = leads
    const q: any = {
      select: () => q,
      eq: (column: string, value: unknown) => { filters.push([column, value]); rows = rows.filter((row: any) => row[column] === value); return q },
      ilike: (column: string, value: string) => {
        filters.push([column, value])
        const plain = value.replace(/\\([\\%_])/g, '$1').toLowerCase()
        rows = rows.filter((row: any) => row[column].toLowerCase() === plain)
        return q
      },
      update: (patch: any) => {
        const u: any = { eq: (column: string, value: unknown) => { filters.push([column, value]); if (column === 'id') updates.push({ id: value, patch }); return u },
          then: (resolve: any, reject: any) => Promise.resolve({ error: null }).then(resolve, reject) }
        return u
      },
      maybeSingle: async () => ({ data: rows[0] ?? null, error: null }),
      then: (resolve: any, reject: any) => Promise.resolve({ data: rows, error: null }).then(resolve, reject),
    }
    return q
  })
  mocks.rpc.mockResolvedValue({ data: [{ log_rows_deleted: 1, timeline_rows_deleted: 1 }], error: null })
})
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs() })

describe('POST erase-alert-data', () => {
  it('rejects a signed-out caller and a non-founder before touching the database', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null })
    expect((await call()).status).toBe(401)
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'someone-else' } }, error: null })
    expect((await call()).status).toBe(404)
    expect(mocks.from).not.toHaveBeenCalled()
    expect(mocks.rpc).not.toHaveBeenCalled()
  })

  it('rejects an id that is not a uuid', async () => {
    expect((await call('not-a-uuid')).status).toBe(404)
    expect(mocks.rpc).not.toHaveBeenCalled()
  })

  it('returns 404 for a lead the founder does not own, and erases nothing', async () => {
    leads[0].founder_id = 'another-founder'
    expect((await call()).status).toBe(404)
    expect(mocks.rpc).not.toHaveBeenCalled()
  })

  it("erases every enquiry from the same email (case-insensitive) with each one's own keyed hash", async () => {
    const response = await call()
    expect(response.status).toBe(303)
    expect(response.headers.get('location')).toContain(`/founder/leads/${ID}?erased=2`)
    expect(mocks.rpc).toHaveBeenCalledTimes(2)
    expect(mocks.rpc).toHaveBeenCalledWith('erase_lead_alert_data',
      { p_founder: founder, p_lead_id: ID, p_dedup_key: key('buyer@example.invalid', 'Living card') })
    expect(mocks.rpc).toHaveBeenCalledWith('erase_lead_alert_data',
      { p_founder: founder, p_lead_id: OTHER, p_dedup_key: key('buyer@example.invalid', 'Not specified') })
    expect(mocks.rpc).not.toHaveBeenCalledWith('erase_lead_alert_data', expect.objectContaining({ p_lead_id: '00000000-0000-4000-8000-000000000003' }))
  })

  it('still erases by lead id when no dedup secret is set (key null)', async () => {
    vi.stubEnv('ALERT_DEDUP_SECRET', '')
    expect((await call()).status).toBe(303)
    expect(mocks.rpc).toHaveBeenCalledWith('erase_lead_alert_data', { p_founder: founder, p_lead_id: ID, p_dedup_key: null })
  })

  it('treats a database error as a failure and never reports success, without echoing the message', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { name: 'PostgrestError', message: 'SENTINEL buyer@example.invalid' } })
    const response = await call()
    expect(response.status).toBe(500)
    expect(JSON.stringify(await response.json())).not.toContain('SENTINEL')
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain('SENTINEL')
  })

  it('marks each erased lead with a non-personal tombstone, keeping other additional_data, so health stops counting it unalerted', async () => {
    leads[1].additional_data = { keep: 'me' }
    expect((await call()).status).toBe(303)
    expect(updates.map((u) => u.id).sort()).toEqual([ID, OTHER])
    for (const u of updates) {
      expect(u.patch.additional_data.alert_erased_at).toMatch(/^\d{4}-\d{2}-\d{2}T/)
      expect(Object.keys(u.patch)).toEqual(['additional_data'])
    }
    expect(updates.find((u) => u.id === OTHER)!.patch.additional_data.keep).toBe('me')
    expect(JSON.stringify(updates)).not.toContain('example.invalid')
  })

  it('does not mark a lead whose erasure failed', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { name: 'PostgrestError' } })
    expect((await call()).status).toBe(500)
    expect(updates).toEqual([])
  })

  it('escapes LIKE wildcards in the email so one address cannot match other people', async () => {
    leads[0].email = 'a_b%@example.invalid'
    await call()
    expect(filters.find(([column]) => column === 'email')?.[1]).toBe('a\\_b\\%@example.invalid')
  })
})
