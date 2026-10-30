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
  // insert(row).select('id').single(): the claim insert returns the new row id (or the error).
  const insert = vi.fn(() => ({
    select: () => ({ single: async () => ({ data: insertResult.error ? null : { id: 'intake-new' }, error: insertResult.error ?? null }) }),
  }))
  const existingEq = vi.fn(() => ({ limit: vi.fn(async () => ({ error: null, data: existing })) }))
  ;(createServiceClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
    from: vi.fn((t: string) => (t === 'card_orders' ? { select: vi.fn(() => ({ eq })) } : { insert, select: vi.fn(() => ({ eq: existingEq })) })),
  })
  return { eq, insert }
}

/**
 * A stateful card_order_intakes with a real UNIQUE(order_id): the first insert wins, later ones get 23505.
 * insert yields to the event loop first so two concurrent requests both pass the "existing" read, as in production.
 */
function statefulDb(opts: { deleteError?: unknown } = {}) {
  const rows = new Map<string, { id: string; order_id: string }>()
  let n = 0
  const insert = vi.fn((row: { order_id: string }) => ({
    select: () => ({
      single: async () => {
        await Promise.resolve()
        await Promise.resolve()
        if ([...rows.values()].some((r) => r.order_id === row.order_id)) return { data: null, error: { code: '23505' } }
        const id = `intake-${++n}`
        rows.set(id, { id, order_id: row.order_id })
        return { data: { id }, error: null }
      },
    }),
  }))
  const del = vi.fn((id: string) => {
    if (!opts.deleteError) rows.delete(id)
    return Promise.resolve({ error: opts.deleteError ?? null })
  })
  ;(createServiceClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
    from: vi.fn((t: string) =>
      t === 'card_orders'
        ? { select: () => ({ eq: () => ({ limit: async () => ({ error: null, data: [ORDER] }) }) }) }
        : {
            insert,
            select: () => ({ eq: () => ({ limit: async () => ({ error: null, data: [...rows.values()].map((r) => ({ id: r.id })) }) }) }),
            delete: () => ({ eq: (_col: string, id: string) => del(id) }),
          },
    ),
  })
  return { insert, del, rows }
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

  it('returns 502 and releases its own claim when the delivery email cannot be sent, so a retry sends once', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const db = statefulDb()
    ;(sendEmail as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('down'))
    expect((await POST(req(BODY))).status).toBe(502)
    expect(db.del).toHaveBeenCalledWith('intake-1')
    expect(db.rows.size).toBe(0)
    ;(sendEmail as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null)
    expect((await POST(req(BODY))).status).toBe(502)
    expect(db.rows.size).toBe(0)
    vi.mocked(sendEmail).mockClear()
    expect((await POST(req(BODY))).status).toBe(201)
    expect(sendEmail).toHaveBeenCalledTimes(1)
    expect(db.rows.size).toBe(1)
  })

  it('still returns 502 and tells the buyer to reply to the receipt when the claim cannot be released', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const db = statefulDb({ deleteError: { message: 'permission denied' } })
    ;(sendEmail as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null)
    const res = await POST(req(BODY))
    expect(res.status).toBe(502)
    expect((await res.json()).error).toContain('reply to your payment receipt email')
    expect(db.rows.size).toBe(1)
    vi.mocked(sendEmail).mockClear()
    expect((await POST(req(BODY))).status).toBe(409)
    expect(sendEmail).not.toHaveBeenCalled()
  })

  it('two concurrent submits for one order send exactly one email and one gets 409', async () => {
    const db = statefulDb()
    const res = await Promise.all([POST(req(BODY)), POST(req({ ...BODY, film: 'blueprint' }))])
    expect(res.map((r) => r.status).sort()).toEqual([201, 409])
    expect(sendEmail).toHaveBeenCalledTimes(1)
    expect(db.rows.size).toBe(1)
  })

  it('sends nothing when the claim insert loses on the unique order (23505)', async () => {
    mockDb({ data: [ORDER] }, { error: { code: '23505' } })
    expect((await POST(req(BODY))).status).toBe(409)
    expect(sendEmail).not.toHaveBeenCalled()
  })

  it('claims the order before it emails', async () => {
    const order: string[] = []
    const db = statefulDb()
    db.insert.mockImplementationOnce(((row: { order_id: string }) => {
      order.push('insert')
      return { select: () => ({ single: async () => ({ data: { id: 'intake-1' }, error: null }) }) }
    }) as never)
    ;(sendEmail as unknown as ReturnType<typeof vi.fn>).mockImplementationOnce(async () => {
      order.push('send')
      return 'msg-1'
    })
    await POST(req(BODY))
    expect(order).toEqual(['insert', 'send'])
  })

  it('returns 500, not a success, when the lookup or the write fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    mockDb({ data: null, error: { message: 'down' } })
    expect((await POST(req(BODY))).status).toBe(500)
    mockDb({ data: [ORDER] }, { error: { code: '57P01', message: 'down' } })
    expect((await POST(req(BODY))).status).toBe(500)
  })
})
