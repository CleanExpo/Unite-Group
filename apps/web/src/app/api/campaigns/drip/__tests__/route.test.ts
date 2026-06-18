import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Shared single mock ────────────────────────────────────────────────────────
const mockSingle = vi.fn()
const mockMaybeSingle = vi.fn()

function makeChain() {
  const b: Record<string, ReturnType<typeof vi.fn>> = {
    select: vi.fn(),
    eq: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    order: vi.fn(),
    lte: vi.fn(),
  }
  b.select.mockReturnValue(b)
  b.eq.mockReturnValue(b)
  b.insert.mockReturnValue(b)
  b.update.mockReturnValue(b)
  b.order.mockReturnValue(b)
  b.lte.mockReturnValue(b)
  ;(b as any).single = mockSingle
  ;(b as any).maybeSingle = mockMaybeSingle
  return b
}

let chain: ReturnType<typeof makeChain>
const mockFrom = vi.fn()
const mockClient = { from: mockFrom }

vi.mock('@/lib/supabase/server', () => ({
  getUser: vi.fn(),
  createClient: vi.fn(),
}))

import { getUser, createClient } from '@/lib/supabase/server'
import { POST } from '../route'

function req(body: object) {
  return new Request('https://app.test/api/campaigns/drip', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

describe('POST /api/campaigns/drip', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    chain = makeChain()
    mockFrom.mockReturnValue(chain)
    vi.mocked(createClient).mockResolvedValue(mockClient as any)
  })

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await POST(req({ action: 'create_campaign' }))
    expect(res.status).toBe(401)
  })

  it('returns 400 when action is missing', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const res = await POST(req({}))
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ error: 'action is required' })
  })

  it('returns 400 when create_campaign is missing required fields', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const res = await POST(req({ action: 'create_campaign', name: 'Test' }))
    expect(res.status).toBe(400)
  })

  it('creates a drip campaign', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const created = { id: 'dc-1', name: 'Summer Drip', business_key: 'synthex', status: 'draft', source: 'api', metadata: {}, created_at: '2026-01-01', updated_at: '2026-01-01', founder_id: 'user-1', subject: 'Sub', body_html: '<p>Hi</p>', body_text: null }
    mockSingle.mockResolvedValue({ data: created, error: null })

    const res = await POST(req({
      action: 'create_campaign',
      businessKey: 'synthex',
      name: 'Summer Drip',
      subject: 'Sub',
      bodyHtml: '<p>Hi</p>',
    }))
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.campaign.id).toBe('dc-1')
  })

  it('returns 400 for unknown action', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const res = await POST(req({ action: 'teleport', campaignId: 'dc-1' }))
    // campaignId lookup will need to pass — mock campaign not found → 404
    // Actually missing campaignId for this action gets caught as: loadCampaign → null → 404
    // But 'teleport' falls through to unsupported action → 400
    // The required('campaignId') runs first for non-create actions — campaignId is provided
    mockSingle.mockResolvedValue({ data: { id: 'dc-1', founder_id: 'user-1', business_key: 'synthex', name: 'T', subject: 'S', body_html: '<p>', body_text: null, status: 'draft', source: 'api', metadata: {}, created_at: '', updated_at: '' }, error: null })
    const res2 = await POST(req({ action: 'teleport', campaignId: 'dc-1' }))
    expect(res2.status).toBe(400)
    const body = await res2.json()
    expect(body.error).toMatch(/Unsupported action/)
  })

  it('returns 404 when campaign not found for add_step', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    mockSingle.mockResolvedValue({ data: null, error: { message: 'not found' } })

    const res = await POST(req({ action: 'add_step', campaignId: 'missing', subject: 'S', bodyHtml: '<p>' }))
    expect(res.status).toBe(404)
  })

  it('returns 409 when contact is already enrolled', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const campaign = { id: 'dc-1', founder_id: 'user-1', business_key: 'synthex', name: 'T', subject: 'S', body_html: '<p>', body_text: null, status: 'draft', source: 'api', metadata: {}, created_at: '', updated_at: '' }
    const contact = { id: 'c-1', email: 'test@example.com', first_name: 'Test', last_name: 'User' }

    let callCount = 0
    mockSingle.mockImplementation(() => {
      callCount++
      if (callCount === 1) return Promise.resolve({ data: campaign, error: null }) // campaign lookup
      if (callCount === 2) return Promise.resolve({ data: contact, error: null })  // contact lookup
      return Promise.resolve({ data: [], error: null }) // steps
    })
    // steps query uses order() not single() — need chain to return steps
    chain.order.mockResolvedValue({ data: [{ id: 'step-1', step_order: 1 }], error: null })
    mockMaybeSingle.mockResolvedValue({ data: { id: 'enrollment-1' }, error: null }) // already enrolled

    const res = await POST(req({ action: 'enroll_contact', campaignId: 'dc-1', contactId: 'c-1' }))
    expect(res.status).toBe(409)
    expect(await res.json()).toMatchObject({ error: 'Contact is already enrolled' })
  })
})
