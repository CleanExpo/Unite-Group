import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('@/lib/supabase/service', () => ({ createServiceClient: vi.fn() }))

import { createServiceClient } from '@/lib/supabase/service'
import { getUser } from '@/lib/supabase/server'
import { GET, POST } from '../route'
import { PATCH as withdraw } from '../[id]/route'
import { POST as makeCode } from '../[id]/comp-codes/route'
import { PATCH as revokeCode } from '../[id]/comp-codes/[codeId]/route'

const FOUNDER = '22222222-2222-4222-8222-222222222222'
const LEAD = '33333333-3333-4333-8333-333333333333'
const PROPOSAL = '11111111-1111-4111-8111-111111111111'
const CODE = '44444444-4444-4444-8444-444444444444'

const LEAD_ROW = { id: LEAD, first_name: 'Sam', last_name: 'Owner', company: 'Example Cafe', email: 'sam@example.test' }

function setup(rows: { lead?: object | null; proposal?: object | null } = {}) {
  const inserts: { table: string; row: Record<string, unknown> }[] = []
  const updates: { table: string; row: object; filters: [string, unknown][] }[] = []
  const from = (table: string) => {
    const filters: [string, unknown][] = []
    const read = {
      eq: (column: string, value: unknown) => {
        filters.push([column, value])
        return read
      },
      is: (column: string, value: unknown) => {
        filters.push([column, value])
        return read
      },
      order: () => read,
      limit: async () => ({ data: [], error: null }),
      maybeSingle: async () => ({
        data: table === 'crm_leads' ? (rows.lead === undefined ? LEAD_ROW : rows.lead) : rows.proposal === undefined ? { id: PROPOSAL } : rows.proposal,
        error: null,
      }),
      then: (done: (v: { error: null }) => void) => done({ error: null }),
    }
    return {
      select: () => read,
      insert: (row: Record<string, unknown>) => {
        inserts.push({ table, row })
        return { select: () => ({ single: async () => ({ data: { id: 'new-id' }, error: null }) }) }
      },
      update: (row: object) => {
        updates.push({ table, row, filters })
        return read
      },
    }
  }
  ;(createServiceClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ from })
  return { inserts, updates }
}

const signedInAs = (id: string | null) =>
  (getUser as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(id ? { id } : null)

const json = (body: unknown) =>
  new Request('http://localhost/api/founder/proposals', { method: 'POST', body: JSON.stringify(body) })
const idParams = (id = PROPOSAL) => ({ params: Promise.resolve({ id }) })

describe('founder proposal routes', () => {
  const original = process.env.FOUNDER_USER_ID

  beforeEach(() => {
    vi.clearAllMocks()
    process.env.FOUNDER_USER_ID = FOUNDER
    signedInAs(FOUNDER)
  })
  afterEach(() => {
    if (original === undefined) delete process.env.FOUNDER_USER_ID
    else process.env.FOUNDER_USER_ID = original
  })

  it.each([
    ['signed out', null, 401],
    ['another invited account', '55555555-5555-4555-8555-555555555555', 403],
  ])('refuses %s on every route, before any write', async (_label, user, status) => {
    const { inserts, updates } = setup()
    signedInAs(user)
    const body = { leadId: LEAD, planId: 'growth' }
    expect((await GET()).status).toBe(status)
    expect((await POST(json(body))).status).toBe(status)
    expect((await withdraw(new Request('http://x'), idParams())).status).toBe(status)
    expect((await makeCode(json({}), idParams())).status).toBe(status)
    expect((await revokeCode(new Request('http://x'), { params: Promise.resolve({ id: PROPOSAL, codeId: CODE }) })).status).toBe(status)
    expect(inserts).toEqual([])
    expect(updates).toEqual([])
  })

  it('refuses everyone when FOUNDER_USER_ID is unset', async () => {
    delete process.env.FOUNDER_USER_ID
    setup()
    expect((await GET()).status).toBe(403)
  })

  it('issues a proposal priced from the plan, keeping only the hash of the link token', async () => {
    const { inserts } = setup()
    const res = await POST(json({ leadId: LEAD, planId: 'growth', amount_cents: 1 }))
    expect(res.status).toBe(201)
    const { path } = await res.json()
    const token = path.replace('/proposal/', '')
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/)
    const { row } = inserts[0]
    expect(row).toMatchObject({
      founder_id: FOUNDER,
      lead_id: LEAD,
      client_name: 'Sam Owner',
      client_business: 'Example Cafe',
      client_email: 'sam@example.test',
      plan_id: 'growth',
      amount_cents: 200000,
      price_is_placeholder: true,
    })
    expect(row.token_hash).toMatch(/^[0-9a-f]{64}$/)
    expect(JSON.stringify(row)).not.toContain(token)
  })

  it.each([
    ['an unknown plan', { leadId: LEAD, planId: 'nope' }, undefined, 400],
    ['a malformed lead id', { leadId: 'nope', planId: 'growth' }, undefined, 400],
    ['a lead outside this founder', { leadId: LEAD, planId: 'growth' }, null, 404],
  ])('creates nothing for %s', async (_label, body, lead, status) => {
    const { inserts } = setup({ lead })
    expect((await POST(json(body))).status).toBe(status)
    expect(inserts).toEqual([])
  })

  it('makes a code, returns it once, stores only its hash, and lowercases the bound email', async () => {
    const { inserts } = setup()
    const res = await makeCode(json({ boundEmail: 'Sam@Example.Test' }), idParams())
    expect(res.status).toBe(201)
    const { code } = await res.json()
    expect(code).toMatch(/^.{4}-.{4}-.{4}-.{4}$/)
    const { row } = inserts[0]
    expect(row.code_hash).toMatch(/^[0-9a-f]{64}$/)
    expect(row.bound_email).toBe('sam@example.test')
    expect(JSON.stringify(row)).not.toContain(code)
  })

  it('defaults a code to 14 days', async () => {
    const { inserts } = setup()
    await makeCode(json({}), idParams())
    const days = (new Date(inserts[0].row.expires_at as string).getTime() - Date.now()) / 86_400_000
    expect(days).toBeGreaterThan(13.9)
    expect(days).toBeLessThanOrEqual(14)
  })

  it('makes no code for a proposal outside this founder', async () => {
    const { inserts } = setup({ proposal: null })
    expect((await makeCode(json({}), idParams())).status).toBe(404)
    expect(inserts).toEqual([])
  })

  it('scopes withdraw and revoke to the founder', async () => {
    const { updates } = setup()
    expect((await withdraw(new Request('http://x'), idParams())).status).toBe(200)
    expect((await revokeCode(new Request('http://x'), { params: Promise.resolve({ id: PROPOSAL, codeId: CODE }) })).status).toBe(200)
    expect(updates[0].filters).toContainEqual(['founder_id', FOUNDER])
    expect(updates[1].filters).toContainEqual(['founder_id', FOUNDER])
    expect(updates[1].filters).toContainEqual(['proposal_id', PROPOSAL])
  })
})
