import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createHmac } from 'node:crypto'

const mocks = vi.hoisted(() => ({ getUser: vi.fn(), from: vi.fn(), rpc: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({ auth: { getUser: mocks.getUser } }) }))
vi.mock('@/lib/supabase/service', () => ({ createServiceClient: () => ({ from: mocks.from, rpc: mocks.rpc }) }))
import { POST } from '../route'
import { allPackageLabels } from '@/lib/notifications/lead-alert'

const founder = '00000000-0000-4000-8000-0000000000f1'
const ID = '00000000-0000-4000-8000-000000000001'
const OTHER = '00000000-0000-4000-8000-000000000002'
const STRANGER = '00000000-0000-4000-8000-000000000003'
const SECRET = 'test-placeholder-dedup-secret'
const ROW_CAP = 1000
const key = (email: string, label: string) => createHmac('sha256', SECRET).update(`${founder}|${email}|${label}`).digest('hex')
const call = (id = ID) => POST(new Request(`https://app.example.invalid/api/founder/leads/${id}/erase-alert-data`, { method: 'POST' }) as any,
  { params: Promise.resolve({ id }) })

type Lead = { id: string; email: string; interests: string | null; founder_id: string; additional_data?: Record<string, unknown> }
let leads: Lead[]
/** Lead ids whose alert data the database actually erased, whichever function the route called. */
let erasedIds: Set<string>
let clientPatterns: string[]

/**
 * PostgREST's ilike operator, as the API applies it: '*' is ALSO a wildcard (it becomes '%'),
 * and the API returns at most ROW_CAP rows. This fake can express both review findings, so a
 * route that matches people in the API layer fails here rather than passing on a fake.
 */
function postgrestIlike(value: string, pattern: string): boolean {
  let source = ''
  for (let i = 0; i < pattern.length; i++) {
    const character = pattern[i]
    if (character === '\\' && i + 1 < pattern.length) source += pattern[++i].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    else if (character === '%' || character === '*') source += '.*'
    else if (character === '_') source += '.'
    else source += character.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }
  return new RegExp(`^${source}$`, 'is').test(value)
}

/** The SQL contract of erase_lead_alert_data_for_email: exact founder-scoped lower() equality, no row cap. */
function sqlEraseForEmail(args: { p_founder: string; p_lead_id: string }) {
  const target = leads.find((lead) => lead.founder_id === args.p_founder && lead.id === args.p_lead_id)
  if (!target) return []
  const matched = leads.filter((lead) => lead.founder_id === args.p_founder && lead.email.toLowerCase() === target.email.toLowerCase())
  for (const lead of matched) {
    erasedIds.add(lead.id)
    lead.additional_data = { ...(lead.additional_data ?? {}), alert_erased_at: '2026-10-25T00:00:00.000Z' }
  }
  return [{ leads_erased: matched.length, log_rows_deleted: matched.length, timeline_rows_deleted: matched.length }]
}

beforeEach(() => {
  vi.clearAllMocks()
  erasedIds = new Set()
  clientPatterns = []
  vi.stubEnv('FOUNDER_USER_ID', founder)
  vi.stubEnv('ALERT_DEDUP_SECRET', SECRET)
  vi.spyOn(console, 'error').mockImplementation(() => {})
  mocks.getUser.mockResolvedValue({ data: { user: { id: founder } }, error: null })
  leads = [
    { id: ID, email: 'Buyer@Example.invalid', interests: 'living-card', founder_id: founder },
    { id: OTHER, email: 'buyer@example.invalid', interests: null, founder_id: founder },
    { id: STRANGER, email: 'someone@example.invalid', interests: null, founder_id: founder },
  ]
  mocks.from.mockImplementation(() => {
    let rows = leads
    const q: any = {
      select: () => q,
      eq: (column: string, value: unknown) => { rows = rows.filter((row: any) => row[column] === value); return q },
      ilike: (column: string, value: string) => {
        clientPatterns.push(value)
        rows = rows.filter((row: any) => postgrestIlike(String(row[column]), value))
        return q
      },
      update: () => {
        const u: any = { eq: () => u, then: (resolve: any, reject: any) => Promise.resolve({ error: null }).then(resolve, reject) }
        return u
      },
      maybeSingle: async () => ({ data: rows[0] ?? null, error: null }),
      then: (resolve: any, reject: any) => Promise.resolve({ data: rows.slice(0, ROW_CAP), error: null }).then(resolve, reject),
    }
    return q
  })
  mocks.rpc.mockImplementation(async (name: string, args: any) => {
    if (name === 'erase_lead_alert_data_for_email') return { data: sqlEraseForEmail(args), error: null }
    if (name === 'erase_lead_alert_data') {
      erasedIds.add(args.p_lead_id)
      return { data: [{ log_rows_deleted: 1, timeline_rows_deleted: 1 }], error: null }
    }
    return { data: null, error: { name: 'PostgrestError' } }
  })
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
    expect(erasedIds.size).toBe(0)
  })

  it('erases every enquiry from the same email (case-insensitive) and nobody else', async () => {
    const response = await call()
    expect(response.status).toBe(303)
    expect(response.headers.get('location')).toContain(`/founder/leads/${ID}?erased=2`)
    expect([...erasedIds].sort()).toEqual([ID, OTHER])
  })

  it('a literal-star address never erases another person whose address the star would match', async () => {
    leads = [
      { id: ID, email: 'a*b@example.invalid', interests: null, founder_id: founder },
      { id: STRANGER, email: 'axyzb@example.invalid', interests: null, founder_id: founder },
      { id: OTHER, email: 'A*B@example.invalid', interests: null, founder_id: founder },
    ]
    expect((await call()).status).toBe(303)
    expect([...erasedIds].sort()).toEqual([ID, OTHER])
  })

  it('percent and underscore addresses never erase other people', async () => {
    leads = [
      { id: ID, email: 'a_b%@example.invalid', interests: null, founder_id: founder },
      { id: STRANGER, email: 'axbzz@example.invalid', interests: null, founder_id: founder },
    ]
    expect((await call()).status).toBe(303)
    expect([...erasedIds]).toEqual([ID])
  })

  it('erases every matching enquiry beyond the API row cap and reports the true count', async () => {
    leads = Array.from({ length: ROW_CAP + 1 }, (_, i) => ({
      id: i === 0 ? ID : `00000000-0000-4000-8000-${String(i + 100).padStart(12, '0')}`,
      email: 'repeat@example.invalid', interests: null, founder_id: founder,
    }))
    const response = await call()
    expect(response.status).toBe(303)
    expect(erasedIds.size).toBe(ROW_CAP + 1)
    expect(response.headers.get('location')).toContain(`?erased=${ROW_CAP + 1}`)
  })

  it('never matches people in the API layer: one founder-scoped SQL call by lead id, with every possible keyed hash', async () => {
    expect((await call()).status).toBe(303)
    expect(clientPatterns).toEqual([])
    expect(mocks.rpc).toHaveBeenCalledTimes(1)
    const [name, args] = mocks.rpc.mock.calls[0]
    expect(name).toBe('erase_lead_alert_data_for_email')
    expect(args.p_founder).toBe(founder)
    expect(args.p_lead_id).toBe(ID)
    // The key lower-cases the email, so these cover every enquiry from this address for every package.
    expect(args.p_dedup_keys).toEqual(allPackageLabels().map((label) => key('buyer@example.invalid', label)))
    expect(args.p_dedup_keys).toContain(key('buyer@example.invalid', 'Living card'))
    expect(args.p_dedup_keys).toContain(key('buyer@example.invalid', 'Not specified'))
    // An alert sent while the Restoration edition was on sale stays erasable after it was retired.
    expect(args.p_dedup_keys).toContain(key('buyer@example.invalid', 'Living card: restoration'))
    expect(JSON.stringify(args)).not.toContain('example.invalid')
  })

  it('still erases by lead id when no dedup secret is set (no keys sent)', async () => {
    vi.stubEnv('ALERT_DEDUP_SECRET', '')
    expect((await call()).status).toBe(303)
    expect(mocks.rpc).toHaveBeenCalledWith('erase_lead_alert_data_for_email', { p_founder: founder, p_lead_id: ID, p_dedup_keys: [] })
    expect([...erasedIds].sort()).toEqual([ID, OTHER])
  })

  it('treats a database error as a failure and never reports success, without echoing the message', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { name: 'PostgrestError', message: 'SENTINEL buyer@example.invalid' } })
    const response = await call()
    expect(response.status).toBe(500)
    expect(JSON.stringify(await response.json())).not.toContain('SENTINEL')
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain('SENTINEL')
  })

  it('returns 404, not success, when the lead vanished before the SQL call', async () => {
    mocks.rpc.mockResolvedValue({ data: [], error: null })
    expect((await call()).status).toBe(404)
  })

  it('leaves a non-personal tombstone on every erased lead (set in SQL, keeping other additional_data)', async () => {
    leads[1].additional_data = { keep: 'me' }
    expect((await call()).status).toBe(303)
    expect(leads[0].additional_data?.alert_erased_at).toEqual(expect.any(String))
    expect(leads[1].additional_data).toMatchObject({ keep: 'me', alert_erased_at: expect.any(String) })
    expect(leads[2].additional_data).toBeUndefined()
  })
})
