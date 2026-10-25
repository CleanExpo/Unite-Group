import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/integrations/stripe/client', () => ({
  getStripe: vi.fn(),
}))
vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: vi.fn(),
}))
vi.mock('@/lib/integrations/sendgrid', () => ({
  sendEmail: vi.fn(),
}))

import { getStripe } from '@/lib/integrations/stripe/client'
import { createServiceClient } from '@/lib/supabase/service'
import { sendEmail } from '@/lib/integrations/sendgrid'
import { POST } from '../route'

function req(body = '{}', signature?: string | null): NextRequest {
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (signature) headers['stripe-signature'] = signature
  return new NextRequest('http://localhost/api/webhooks/stripe', { method: 'POST', headers, body })
}

function mockStripe(constructEvent: () => unknown) {
  ;(getStripe as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
    webhooks: { constructEvent },
  })
}

function mockInsert(result: { error?: unknown }) {
  const insert = vi.fn(async () => result)
  ;(createServiceClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
    from: vi.fn(() => ({ insert })),
  })
  return insert
}

const EVENT = { id: 'evt_123', type: 'checkout.session.completed', api_version: '2024-01-01', livemode: false }

describe('POST /api/webhooks/stripe', () => {
  const original = process.env.STRIPE_WEBHOOK_SECRET

  beforeEach(() => {
    vi.clearAllMocks()
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test'
  })
  afterEach(() => {
    if (original === undefined) delete process.env.STRIPE_WEBHOOK_SECRET
    else process.env.STRIPE_WEBHOOK_SECRET = original
  })

  it('returns 503 when Stripe is not configured', async () => {
    ;(getStripe as unknown as ReturnType<typeof vi.fn>).mockReturnValue(null)
    const res = await POST(req())
    expect(res.status).toBe(503)
  })

  it('returns 503 when the webhook secret is unset', async () => {
    delete process.env.STRIPE_WEBHOOK_SECRET
    mockStripe(() => EVENT)
    const res = await POST(req())
    expect(res.status).toBe(503)
  })

  it('returns 400 when the signature header is missing', async () => {
    mockStripe(() => EVENT)
    const res = await POST(req('{}', null))
    expect(res.status).toBe(400)
  })

  it('returns 400 on an invalid signature', async () => {
    mockStripe(() => {
      throw new Error('bad sig')
    })
    const res = await POST(req('{}', 'sig'))
    expect(res.status).toBe(400)
  })

  it('persists the event and returns 200 on a valid signature', async () => {
    mockStripe(() => EVENT)
    const insert = mockInsert({ error: null })
    const res = await POST(req('{}', 'sig'))
    expect(res.status).toBe(200)
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ stripe_event_id: 'evt_123', type: 'checkout.session.completed' }),
    )
  })

  it('is idempotent — returns 200 on a duplicate (unique violation)', async () => {
    mockStripe(() => EVENT)
    mockInsert({ error: { code: '23505' } })
    const res = await POST(req('{}', 'sig'))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ received: true, idempotent: true })
  })
})

// ---- paid card orders (UNI-2996 B5). Test-mode fixtures only; no Stripe API is called. ----

const card = (over: Record<string, unknown> = {}, livemode = false) => ({
  ...EVENT,
  livemode,
  data: {
    object: {
      id: 'cs_test_a1',
      object: 'checkout.session',
      client_reference_id: 'ref_abc123',
      amount_total: 24900,
      currency: 'aud',
      payment_status: 'paid',
      payment_link: 'plink_test_card',
      customer_details: { name: 'Sample Client', email: 'sample@example.invalid' },
      ...over,
    },
  },
})

type Result = { error?: unknown }
/** from(table).insert(row): stripe_events and card_orders each take their own scripted result. */
function mockTables(events: Result, orders: Result) {
  const inserts = { stripe_events: vi.fn(async () => events), card_orders: vi.fn(async () => orders) }
  ;(createServiceClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
    from: vi.fn((t: keyof typeof inserts) => ({ insert: inserts[t] })),
  })
  return inserts
}

describe('POST /api/webhooks/stripe, paid card order', () => {
  const saved = { to: process.env.LEAD_ALERT_EMAIL_TO, from: process.env.SENDGRID_FROM_EMAIL, f: process.env.FOUNDER_USER_ID, l: process.env.STRIPE_CARD_PAYMENT_LINK_IDS }
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test'
    process.env.LEAD_ALERT_EMAIL_TO = 'alerts@example.invalid'
    process.env.SENDGRID_FROM_EMAIL = 'noreply@example.invalid'
    process.env.FOUNDER_USER_ID = '00000000-0000-0000-0000-000000000001'
    process.env.STRIPE_CARD_PAYMENT_LINK_IDS = 'plink_test_other, plink_test_card'
    vi.mocked(sendEmail).mockResolvedValue('sg-1')
  })
  afterEach(() => {
    for (const [k, v] of [['LEAD_ALERT_EMAIL_TO', saved.to], ['SENDGRID_FROM_EMAIL', saved.from], ['FOUNDER_USER_ID', saved.f], ['STRIPE_CARD_PAYMENT_LINK_IDS', saved.l]] as const) {
      if (v === undefined) delete process.env[k]
      else process.env[k] = v
    }
  })

  it('writes one order row with the client_reference_id as its reference', async () => {
    mockStripe(() => card())
    const t = mockTables({ error: null }, { error: null })
    const res = await POST(req('{}', 'sig'))
    expect(res.status).toBe(200)
    expect(t.card_orders).toHaveBeenCalledTimes(1)
    expect(t.card_orders).toHaveBeenCalledWith(
      expect.objectContaining({
        reference: 'ref_abc123',
        stripe_session_id: 'cs_test_a1',
        tier: 'ready',
        customer_name: 'Sample Client',
        founder_id: '00000000-0000-0000-0000-000000000001',
        livemode: false,
      }),
    )
  })

  it('recognises the made-for-you tier by its price', async () => {
    mockStripe(() => card({ amount_total: 44900 }))
    const t = mockTables({ error: null }, { error: null })
    await POST(req('{}', 'sig'))
    expect(t.card_orders).toHaveBeenCalledWith(expect.objectContaining({ tier: 'custom' }))
  })

  it('emails the alert address once with name and tier only', async () => {
    mockStripe(() => card())
    mockTables({ error: null }, { error: null })
    await POST(req('{}', 'sig'))
    const alerts = vi.mocked(sendEmail).mock.calls.filter(([a]) => a.categories?.includes('card-order-alert'))
    expect(alerts).toHaveLength(1)
    const arg = alerts[0][0]
    expect(arg.to).toEqual({ email: 'alerts@example.invalid' })
    const text = `${arg.subject}\n${arg.text}\n${arg.html}`
    expect(text).toContain('Sample Client')
    expect(text).toContain('Ready-made')
    expect(text).not.toContain('sample@example.invalid')
    expect(text).not.toMatch(/4242|card number|cvc/i)
  })

  it('sends one email and writes one row when the same event arrives twice', async () => {
    mockStripe(() => card())
    // first delivery: both inserts succeed. Redelivery: the ledger and the order both say duplicate.
    const t = mockTables({ error: null }, { error: null })
    await POST(req('{}', 'sig'))
    t.stripe_events.mockResolvedValue({ error: { code: '23505' } })
    t.card_orders.mockResolvedValue({ error: { code: '23505' } })
    const res = await POST(req('{}', 'sig'))
    expect(res.status).toBe(200)
    // one alert plus one buyer welcome, never repeated on redelivery
    expect(sendEmail).toHaveBeenCalledTimes(2)
  })

  it('still records an order that the ledger saw but a failed first attempt never wrote', async () => {
    mockStripe(() => card())
    const t = mockTables({ error: { code: '23505' } }, { error: null })
    const res = await POST(req('{}', 'sig'))
    expect(res.status).toBe(200)
    expect(t.card_orders).toHaveBeenCalledTimes(1)
    expect(sendEmail).toHaveBeenCalledTimes(2)
  })

  it('never fails the webhook when the email fails', async () => {
    mockStripe(() => card())
    mockTables({ error: null }, { error: null })
    vi.mocked(sendEmail).mockRejectedValue(new Error('sendgrid down'))
    const res = await POST(req('{}', 'sig'))
    expect(res.status).toBe(200)
  })

  it('skips the alert, not the order or the buyer welcome, when the alert address is unset', async () => {
    delete process.env.LEAD_ALERT_EMAIL_TO
    mockStripe(() => card())
    const t = mockTables({ error: null }, { error: null })
    const res = await POST(req('{}', 'sig'))
    expect(res.status).toBe(200)
    expect(t.card_orders).toHaveBeenCalledTimes(1)
    const cats = vi.mocked(sendEmail).mock.calls.map(([a]) => a.categories?.[0])
    expect(cats).toEqual(['card-order-welcome'])
  })

  it('sends the buyer one Margot welcome from the sender, with next steps and no card data', async () => {
    mockStripe(() => card())
    mockTables({ error: null }, { error: null })
    await POST(req('{}', 'sig'))
    const welcome = vi.mocked(sendEmail).mock.calls.filter(([a]) => a.categories?.includes('card-order-welcome'))
    expect(welcome).toHaveLength(1)
    const arg = welcome[0][0]
    expect(arg.to).toEqual({ email: 'sample@example.invalid' })
    expect(arg.from.name).toBe('Margot at Unite-Group')
    const text = `${arg.subject}\n${arg.text}\n${arg.html}`
    expect(text).toContain('Ready-made')
    expect(text).toContain('logo')
    expect(text).toContain('Margot')
    expect(text).not.toMatch(/4242|card number|cvc/i)
  })

  it('returns 500 so Stripe retries when the order cannot be written', async () => {
    mockStripe(() => card())
    mockTables({ error: null }, { error: { code: '57P01', message: 'down' } })
    const res = await POST(req('{}', 'sig'))
    expect(res.status).toBe(500)
    expect(sendEmail).not.toHaveBeenCalled()
  })

  it('writes nothing for a checkout that is not a card tier', async () => {
    mockStripe(() => card({ amount_total: 9900 }))
    const t = mockTables({ error: null }, { error: null })
    const res = await POST(req('{}', 'sig'))
    expect(res.status).toBe(200)
    expect(t.card_orders).not.toHaveBeenCalled()
    expect(sendEmail).not.toHaveBeenCalled()
  })

  it.each([
    ['another product at a card price (a different payment link)', { payment_link: 'plink_test_unrelated' }],
    ['a checkout with no payment link at a card price', { payment_link: null }],
  ])('writes nothing and sends nothing for %s', async (_n, over) => {
    mockStripe(() => card(over))
    const t = mockTables({ error: null }, { error: null })
    const res = await POST(req('{}', 'sig'))
    expect(res.status).toBe(200)
    expect(t.card_orders).not.toHaveBeenCalled()
    expect(sendEmail).not.toHaveBeenCalled()
  })

  it('fails closed when no card payment link is configured', async () => {
    delete process.env.STRIPE_CARD_PAYMENT_LINK_IDS
    mockStripe(() => card())
    const t = mockTables({ error: null }, { error: null })
    expect((await POST(req('{}', 'sig'))).status).toBe(200)
    expect(t.card_orders).not.toHaveBeenCalled()
    expect(sendEmail).not.toHaveBeenCalled()
  })

  it('accepts an expanded payment_link object', async () => {
    mockStripe(() => card({ payment_link: { id: 'plink_test_card' } }))
    const t = mockTables({ error: null }, { error: null })
    await POST(req('{}', 'sig'))
    expect(t.card_orders).toHaveBeenCalledTimes(1)
  })

  it('writes nothing for an unpaid session or another event type', async () => {
    mockStripe(() => card({ payment_status: 'unpaid' }))
    const t = mockTables({ error: null }, { error: null })
    await POST(req('{}', 'sig'))
    mockStripe(() => ({ ...card(), type: 'invoice.paid' }))
    await POST(req('{}', 'sig'))
    expect(t.card_orders).not.toHaveBeenCalled()
  })

  it('still refuses an invalid signature before touching anything', async () => {
    mockStripe(() => {
      throw new Error('bad sig')
    })
    const t = mockTables({ error: null }, { error: null })
    expect((await POST(req('{}', 'sig'))).status).toBe(400)
    expect(t.stripe_events).not.toHaveBeenCalled()
    expect(t.card_orders).not.toHaveBeenCalled()
  })
})
