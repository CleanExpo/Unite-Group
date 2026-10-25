import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// --- Supabase service mock: per-table FIFO queues + write capture --------
let responses: Record<string, any[]>
let inserts: Array<{ table: string; payload: any }>
let resolvedTables: string[]

function makeChain(table: string) {
  const next = () => {
    resolvedTables.push(table)
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

const { mockNotify } = vi.hoisted(() => ({ mockNotify: vi.fn() }))
vi.mock('@/lib/notifications', () => ({ notify: mockNotify }))

import { POST, maxDuration } from '../route'

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
    mockNotify.mockReset().mockResolvedValue({ email: 'sent' })
    vi.unstubAllEnvs()
    vi.stubEnv('FOUNDER_USER_ID', 'founder-1')
    responses = {}
    inserts = []
    resolvedTables = []
  })

  afterEach(() => vi.useRealTimers())

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

  it('captures a lead with founder scoping, source, request metadata, and a sanitized CRM timeline event', async () => {
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

    const timelineInsert = inserts.find((i) => i.table === 'agent_actions')
    expect(timelineInsert?.payload).toMatchObject({
      source: 'margot',
      action_type: 'crm_timeline_lead_captured',
      status: 'done',
      idea_text: 'Lead captured: Jane via api/leads.',
      client_id: null,
      business_id: null,
      linear_ticket_id: null,
      parent_id: null,
      payload: {
        type: 'lead_captured',
        category: 'lead',
        severity: 'normal',
        actionClass: 'auto',
        actor: 'website_form',
        subjectId: 'lead-1',
        subjectLabel: 'Jane',
        source: 'api/leads',
        summary: 'Lead captured: Jane via api/leads.',
        requiresApproval: false,
        clientSlug: null,
        businessSlug: 'dr',
        metadata: { marketingConsent: true },
      },
    })
    expect(timelineInsert?.payload.payload.metadata).not.toHaveProperty('email')
    expect(timelineInsert?.payload.payload.metadata).not.toHaveProperty('phone')
    expect(timelineInsert?.payload.payload.metadata).not.toHaveProperty('ipAddress')
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

    const res = await POST(req({ ...VALID_LEAD, marketing_consent: true, drip_campaign_id: 'camp-1' }))

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

    const res = await POST(req({ ...VALID_LEAD, marketing_consent: true, drip_campaign_id: 'missing' }))

    expect(res.status).toBe(201)
    expect(await res.json()).toMatchObject({
      id: 'lead-1',
      drip: { enrolled: false, reason: 'campaign_not_found' },
    })
  })

  it('captures the lead but never enrols it in a drip without marketing consent (UNI-2918)', async () => {
    for (const consent of [undefined, false, 'true', 1]) {
      vi.clearAllMocks()
      inserts = []
      responses = { crm_leads: [{ data: { id: 'lead-1' }, error: null }] }
      const body: Record<string, unknown> = { ...VALID_LEAD, drip_campaign_id: 'camp-1' }
      if (consent !== undefined) body.marketing_consent = consent

      const res = await POST(req(body))

      expect(res.status, JSON.stringify(consent)).toBe(201)
      expect(await res.json()).toMatchObject({
        id: 'lead-1',
        drip: { enrolled: false, reason: 'no_marketing_consent' },
      })
      expect(inserts.some((i) => i.table === 'crm_leads')).toBe(true)
      const touched = mockFrom.mock.calls.map(([table]) => table)
      expect(touched).not.toContain('drip_campaigns')
      expect(touched).not.toContain('contacts')
      expect(touched).not.toContain('drip_enrollments')
    }
  })

  it('alerts once only after the lead insert resolves, with the minimal payload', async () => {
    responses.crm_leads = [{ data: { id: 'lead-1', captured_at: '2026-10-24T00:00:00Z' }, error: null }]
    mockNotify.mockImplementation(async (payload) => {
      expect(inserts.filter((row) => row.table === 'crm_leads')).toHaveLength(1)
      expect(resolvedTables).toContain('crm_leads')
      expect(payload).toEqual({
        type: 'new_lead', leadId: 'lead-1', firstName: 'Jane', businessName: 'Example business',
        interests: 'living-card', capturedAt: '2026-10-24T00:00:00Z',
      })
      return { email: 'sent' }
    })
    const response = await POST(req({ ...VALID_LEAD, company: 'Example business', interests: 'living-card' }))
    expect(maxDuration).toBe(30)
    expect(response.status).toBe(201)
    expect(mockNotify).toHaveBeenCalledTimes(1)
  })

  it.each(['rejected', 'failed', 'unconfigured', 'deduped', 'never'])(
    'preserves the exact response and one lead insert when alerts are %s, with and without drip',
    async (outcome) => {
      vi.useFakeTimers()
      for (const withDrip of [false, true]) {
        inserts = []
        responses = { crm_leads: [{ data: { id: 'lead-1' }, error: null }] }
        if (outcome === 'rejected') mockNotify.mockRejectedValue(new Error('provider failure'))
        else if (outcome === 'never') mockNotify.mockImplementation(() => new Promise(() => {}))
        else mockNotify.mockResolvedValue({ email: outcome })
        const pending = POST(req({ ...VALID_LEAD, ...(withDrip ? { drip_campaign_id: 'camp-1' } : {}) }))
        await vi.advanceTimersByTimeAsync(6000)
        const response = await pending
        expect(response.status).toBe(201)
        expect(await response.json()).toEqual({
          id: 'lead-1', ...(withDrip ? { drip: { enrolled: false, reason: 'no_marketing_consent' } } : {}),
        })
        expect(inserts.filter((row) => row.table === 'crm_leads')).toHaveLength(1)
      }
    }, 1000
  )

  it('does not alert on validation or insert failures', async () => {
    await POST(req({ email: 'bad' }))
    responses.crm_leads = [{ data: null, error: { message: 'insert rejected' } }]
    await POST(req(VALID_LEAD))
    expect(mockNotify).not.toHaveBeenCalled()
  })

})
