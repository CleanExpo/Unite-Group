import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase/service', () => ({ createServiceClient: vi.fn() }))
vi.mock('@/lib/integrations/mailtrap', () => ({
  sendEmail: vi.fn(async () => 'msg-1'),
  leadAlertEmailTo: () => 'contact@unite-group.in',
  mailtrapFromEmail: () => 'contact@unite-group.in',
}))

import { createServiceClient } from '@/lib/supabase/service'
import { sendEmail } from '@/lib/integrations/mailtrap'
import { POST } from '../route'

const ORDER = { id: 'order-1', founder_id: 'founder-1', customer_email: 'sample@example.invalid', tier: 'ready' }
const BODY = {
  session_id: 'cs_test_a1',
  film: 'forge',
  name: 'Sample Client',
  business: 'Sample Plumbing Co',
  email: 'sample@example.invalid',
  contact_details: 'Sample Client, Director, 0400 000 000',
  logo_link: 'https://example.invalid/logo.png',
  brief: '',
  where_met: 'Expo stand',
}

const req = (body: unknown, raw = false) =>
  new NextRequest('http://localhost/api/cards/intake', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: raw ? String(body) : JSON.stringify(body),
  })

/** card_orders: select().eq().limit() resolves to `orders`; card_order_intakes: insert() resolves to `insert`. */
function mockDb(orders: { data: unknown[] | null; error?: unknown }, insertResult: { error?: unknown } = { error: null }, existing: unknown[] = []) {
  const eq = vi.fn(() => ({ limit: vi.fn(async () => ({ error: null, ...orders })) }))
  const insert = vi.fn(async () => insertResult)
  const existingEq = vi.fn(() => ({ limit: vi.fn(async () => ({ error: null, data: existing })) }))
  ;(createServiceClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
    from: vi.fn((t: string) => (t === 'card_orders' ? { select: vi.fn(() => ({ eq })) } : { insert, select: vi.fn(() => ({ eq: existingEq })) })),
  })
  return { eq, insert }
}

describe('POST /api/cards/intake', () => {
  beforeEach(() => vi.clearAllMocks())
  afterEach(() => vi.restoreAllMocks())

  it('stores the intake against the order found by its reference, with the order founder', async () => {
    const db = mockDb({ data: [ORDER] })
    const res = await POST(req(BODY))
    expect(res.status).toBe(201)
    expect(db.insert).toHaveBeenCalledWith({
      order_id: 'order-1',
      founder_id: 'founder-1',
      name: 'Sample Client',
      business: 'Sample Plumbing Co',
      email: 'sample@example.invalid',
      where_met: 'Expo stand',
    })
  })

  it('looks the order up by the checkout session id and nothing else', async () => {
    const db = mockDb({ data: [ORDER] })
    await POST(req(BODY))
    expect(db.eq).toHaveBeenCalledTimes(1)
    expect(db.eq).toHaveBeenCalledWith('stripe_session_id', 'cs_test_a1')
  })

  it('lets the real buyer in whatever the case or spacing of their email', async () => {
    const db = mockDb({ data: [ORDER] })
    const res = await POST(req({ ...BODY, email: ' Sample@Example.Invalid ' }))
    expect(res.status).toBe(201)
    expect(db.insert).toHaveBeenCalledTimes(1)
  })

  it('stores the intake when Stripe recorded no email for the order', async () => {
    const db = mockDb({ data: [{ ...ORDER, customer_email: null }] })
    expect((await POST(req(BODY))).status).toBe(201)
    expect(db.insert).toHaveBeenCalledTimes(1)
  })

  it.each([
    ['a readable client reference sent as the id', { ...BODY, session_id: 'sample-plumbing-2610' }],
    ['a readable reference sent in the old ref field', { name: BODY.name, email: BODY.email, ref: 'sample-plumbing-2610' }],
    ['a readable reference beside a session id', { ...BODY, ref: 'sample-plumbing-2610', session_id: undefined }],
  ])('a guessed or readable reference cannot claim an order: %s', async (_l, body) => {
    const db = mockDb({ data: [ORDER] })
    const res = await POST(req(body))
    expect(res.status).toBe(400)
    expect(db.eq).not.toHaveBeenCalled()
    expect(db.insert).not.toHaveBeenCalled()
  })

  it('answers a wrong session id exactly as an unknown one, and a wrong email the same way', async () => {
    const unknown = mockDb({ data: [] })
    const a = await POST(req({ ...BODY, session_id: 'cs_test_zzz' }))
    const aBody = await a.json()
    expect(unknown.insert).not.toHaveBeenCalled()
    const wrongEmail = mockDb({ data: [ORDER] })
    const b = await POST(req({ ...BODY, email: 'someone-else@example.invalid' }))
    expect(wrongEmail.insert).not.toHaveBeenCalled()
    expect(a.status).toBe(404)
    expect(b.status).toBe(a.status)
    expect(await b.json()).toEqual(aBody)
  })

  it('treats business, where_met, logo link and brief as optional', async () => {
    const db = mockDb({ data: [ORDER] })
    const res = await POST(req({ session_id: 'cs_test_a1', film: 'forge', contact_details: 'x', name: 'A', email: 'sample@example.invalid' }))
    expect(res.status).toBe(201)
    expect(db.insert).toHaveBeenCalledWith(expect.objectContaining({ business: null, where_met: null }))
  })

  it.each([
    ['missing name', { ...BODY, name: '  ' }],
    ['missing email', { ...BODY, email: '' }],
    ['bad email', { ...BODY, email: 'not-an-email' }],
    ['missing session id', { ...BODY, session_id: '' }],
    ['session id with filter characters', { ...BODY, session_id: 'cs_test_a,b.eq.c' }],
    ['over-long name', { ...BODY, name: 'x'.repeat(121) }],
    ['no film', { ...BODY, film: '' }],
    ['an unknown film', { ...BODY, film: 'not-a-film' }],
    ['no contact details', { ...BODY, contact_details: ' ' }],
    ['a logo link that is not http(s)', { ...BODY, logo_link: 'javascript:alert(1)' }],
    ['an over-long brief', { ...BODY, brief: 'x'.repeat(1501) }],
  ])('rejects %s with 400 before touching the database', async (_label, body) => {
    const db = mockDb({ data: [ORDER] })
    const res = await POST(req(body))
    expect(res.status).toBe(400)
    expect(db.eq).not.toHaveBeenCalled()
    expect(db.insert).not.toHaveBeenCalled()
  })

  it('rejects a body that is not JSON', async () => {
    mockDb({ data: [ORDER] })
    expect((await POST(req('{nope', true))).status).toBe(400)
  })

  it('returns 404 for a session id with no order', async () => {
    const db = mockDb({ data: [] })
    expect((await POST(req(BODY))).status).toBe(404)
    expect(db.insert).not.toHaveBeenCalled()
  })

  it('returns 409 on a second submission for the same order, without emailing again', async () => {
    mockDb({ data: [ORDER] }, { error: null }, [{ id: 'intake-1' }])
    expect((await POST(req(BODY))).status).toBe(409)
    expect(sendEmail).not.toHaveBeenCalled()
  })

  it('returns 409 when the insert loses a race on the unique order', async () => {
    mockDb({ data: [ORDER] }, { error: { code: '23505' } })
    expect((await POST(req(BODY))).status).toBe(409)
  })

  it('emails the film, contact details and logo link to the lead-alert address, escaped, replying to the buyer', async () => {
    mockDb({ data: [ORDER] })
    await POST(req({ ...BODY, brief: '<b>modern</b>', film: 'made-for-you' }))
    const mail = (sendEmail as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(mail.to).toEqual({ email: 'contact@unite-group.in' })
    expect(mail.replyTo).toEqual({ email: 'sample@example.invalid' })
    expect(mail.subject).toContain('Made for you')
    expect(mail.text).toContain('Show at the end of the film: Sample Client, Director, 0400 000 000')
    expect(mail.text).toContain('Logo link: https://example.invalid/logo.png')
    expect(mail.html).toContain('&lt;b&gt;modern&lt;/b&gt;')
    expect(mail.html).not.toContain('<b>')
  })

  it('stores nothing and returns 502 when the delivery email cannot be sent, so the buyer can retry', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const db = mockDb({ data: [ORDER] })
    ;(sendEmail as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('down'))
    expect((await POST(req(BODY))).status).toBe(502)
    ;(sendEmail as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null)
    expect((await POST(req(BODY))).status).toBe(502)
    expect(db.insert).not.toHaveBeenCalled()
  })

  it('returns 500, not a success, when the lookup or the write fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    mockDb({ data: null, error: { message: 'down' } })
    expect((await POST(req(BODY))).status).toBe(500)
    mockDb({ data: [ORDER] }, { error: { code: '57P01', message: 'down' } })
    expect((await POST(req(BODY))).status).toBe(500)
  })
})
