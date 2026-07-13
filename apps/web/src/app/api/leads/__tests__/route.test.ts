import { describe, it, expect, vi, beforeEach } from 'vitest'

// --- Supabase service mock: per-table FIFO queues + write capture --------
let responses: Record<string, any[]>
let inserts: Array<{ table: string; payload: any }>

function makeChain(table: string) {
  const next = () => {
    const queue = responses[table] ?? []
    return queue.shift() ?? { data: null, error: null }
  }
  const b: Record<string, any> = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    insert: vi.fn(),
    single: vi.fn(() => Promise.resolve(next())),
    maybeSingle: vi.fn(() => Promise.resolve(next())),
    then(onFulfilled: any, onRejected: any) {
      return Promise.resolve(next()).then(onFulfilled, onRejected)
    },
  }
  b.select.mockReturnValue(b)
  b.eq.mockReturnValue(b)
  b.order.mockReturnValue(b)
  b.insert.mockImplementation((payload: any) => {
    inserts.push({ table, payload })
    return b
  })
  return b
}

const mockFrom = vi.fn((table: string) => makeChain(table))

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: vi.fn(() => ({ from: mockFrom })),
}))

import { POST } from '../route'

function req(body: unknown, headers: Record<string, string> = {}) {
  return new Request('https://app.test/api/leads', {
    method: 'POST',
    body: typeof body === 'string' ? body : JSON.stringify(body),
    headers,
  }) as any
}

const VALID_LEAD = { first_name: 'Jane', email: 'Jane@Example.com' }

describe('POST /api/leads', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.unstubAllEnvs()
    vi.stubEnv('FOUNDER_USER_ID', 'founder-1')
    responses = {}
    inserts = []
  })

  it('returns 500 when FOUNDER_USER_ID is not configured', async () => {
    vi.stubEnv('FOUNDER_USER_ID', '')
    const res = await POST(req(VALID_LEAD))
    expect(res.status).toBe(500)
  })

  it('returns 400 on invalid JSON', async () => {
    const res = await POST(req('not-json'))
    expect(res.status).toBe(400)
  })

  it('returns 400 when first_name is missing', async () => {
    const res = await POST(req({ email: 'jane@example.com' }))
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ error: 'first_name is required' })
  })

  it('returns 400 when email is invalid', async () => {
    const res = await POST(req({ first_name: 'Jane', email: 'not-an-email' }))
    expect(res.status).toBe(400)
  })

  it('captures a lead with founder scoping, source, and request metadata', async () => {
    responses.crm_leads = [{ data: { id: 'lead-1' }, error: null }]

    const res = await POST(
      req(
        {
          ...VALID_LEAD,
          phone: '0400 000 000',
          business_key: 'dr',
          marketing_consent: true,
        },
        { 'x-forwarded-for': '203.0.113.7, 10.0.0.1', 'user-agent': 'vitest' }
      )
    )

    expect(res.status).toBe(201)
    expect(await res.json()).toMatchObject({ id: 'lead-1' })
    const insert = inserts.find((i) => i.table === 'crm_leads')
    expect(insert?.payload).toMatchObject({
      founder_id: 'founder-1',
      first_name: 'Jane',
      email: 'jane@example.com',
      source: 'website_form',
      marketing_consent: true,
      ip_address: '203.0.113.7',
      user_agent: 'vitest',
      additional_data: { business_key: 'dr' },
    })
  })

  it('returns 500 when the insert fails', async () => {
    responses.crm_leads = [{ data: null, error: { message: 'boom' } }]
    const res = await POST(req(VALID_LEAD))
    expect(res.status).toBe(500)
  })

  it('creates a contact and enrolls it when drip_campaign_id is provided', async () => {
    responses.crm_leads = [{ data: { id: 'lead-1' }, error: null }]
    responses.drip_campaigns = [{ data: { id: 'camp-1' }, error: null }]
    responses.drip_steps = [{ data: [{ id: 'step-1', step_order: 1 }], error: null }]
    responses.contacts = [
      { data: null, error: null }, // lookup miss
      { data: { id: 'c-1', email: 'jane@example.com', first_name: 'Jane', last_name: null }, error: null }, // create
    ]
    responses.drip_enrollments = [
      { data: null, error: null }, // duplicate check miss
      { data: null, error: null }, // enrollment insert
    ]

    const res = await POST(req({ ...VALID_LEAD, drip_campaign_id: 'camp-1' }))

    expect(res.status).toBe(201)
    expect(await res.json()).toMatchObject({
      id: 'lead-1',
      drip: { enrolled: true, contactId: 'c-1' },
    })
    expect(inserts.find((i) => i.table === 'contacts')?.payload).toMatchObject({
      founder_id: 'founder-1',
      status: 'lead',
      email: 'jane@example.com',
    })
    expect(inserts.find((i) => i.table === 'drip_enrollments')?.payload).toMatchObject({
      founder_id: 'founder-1',
      campaign_id: 'camp-1',
      contact_id: 'c-1',
      status: 'active',
      current_step_order: 1,
    })
  })

  it('still captures the lead when the drip campaign is unknown', async () => {
    responses.crm_leads = [{ data: { id: 'lead-1' }, error: null }]
    responses.drip_campaigns = [{ data: null, error: { message: 'not found' } }]

    const res = await POST(req({ ...VALID_LEAD, drip_campaign_id: 'missing' }))

    expect(res.status).toBe(201)
    expect(await res.json()).toMatchObject({
      id: 'lead-1',
      drip: { enrolled: false, reason: 'campaign_not_found' },
    })
  })
})
