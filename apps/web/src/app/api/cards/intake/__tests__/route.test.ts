import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase/service', () => ({ createServiceClient: vi.fn() }))

import { createServiceClient } from '@/lib/supabase/service'
import { POST } from '../route'

const ORDER = { id: 'order-1', founder_id: 'founder-1' }
const BODY = { ref: 'ref_abc123', name: 'Sample Client', business: 'Sample Plumbing Co', email: 'sample@example.invalid', where_met: 'Expo stand' }

const req = (body: unknown, raw = false) =>
  new NextRequest('http://localhost/api/cards/intake', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: raw ? String(body) : JSON.stringify(body),
  })

/** card_orders: select().or().limit() resolves to `orders`; card_order_intakes: insert() resolves to `insert`. */
function mockDb(orders: { data: unknown[] | null; error?: unknown }, insertResult: { error?: unknown } = { error: null }) {
  const or = vi.fn(() => ({ limit: vi.fn(async () => ({ error: null, ...orders })) }))
  const insert = vi.fn(async () => insertResult)
  ;(createServiceClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
    from: vi.fn((t: string) => (t === 'card_orders' ? { select: vi.fn(() => ({ or })) } : { insert })),
  })
  return { or, insert }
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

  it('looks the order up by reference or checkout session id', async () => {
    const db = mockDb({ data: [ORDER] })
    await POST(req(BODY))
    expect(db.or).toHaveBeenCalledWith('reference.eq.ref_abc123,stripe_session_id.eq.ref_abc123')
  })

  it('treats business and where_met as optional', async () => {
    const db = mockDb({ data: [ORDER] })
    const res = await POST(req({ ref: 'ref_abc123', name: 'A', email: 'a@example.invalid' }))
    expect(res.status).toBe(201)
    expect(db.insert).toHaveBeenCalledWith(expect.objectContaining({ business: null, where_met: null }))
  })

  it.each([
    ['missing name', { ...BODY, name: '  ' }],
    ['missing email', { ...BODY, email: '' }],
    ['bad email', { ...BODY, email: 'not-an-email' }],
    ['missing ref', { ...BODY, ref: '' }],
    ['ref with filter characters', { ...BODY, ref: 'a,b.eq.c' }],
    ['over-long name', { ...BODY, name: 'x'.repeat(121) }],
  ])('rejects %s with 400 before touching the database', async (_label, body) => {
    const db = mockDb({ data: [ORDER] })
    const res = await POST(req(body))
    expect(res.status).toBe(400)
    expect(db.or).not.toHaveBeenCalled()
    expect(db.insert).not.toHaveBeenCalled()
  })

  it('rejects a body that is not JSON', async () => {
    mockDb({ data: [ORDER] })
    expect((await POST(req('{nope', true))).status).toBe(400)
  })

  it('returns 404 for a reference with no order', async () => {
    const db = mockDb({ data: [] })
    expect((await POST(req(BODY))).status).toBe(404)
    expect(db.insert).not.toHaveBeenCalled()
  })

  it('returns 409 when two orders share the reference, rather than guessing', async () => {
    const db = mockDb({ data: [ORDER, { id: 'order-2', founder_id: 'founder-1' }] })
    expect((await POST(req(BODY))).status).toBe(409)
    expect(db.insert).not.toHaveBeenCalled()
  })

  it('returns 409 on a second submission for the same order', async () => {
    mockDb({ data: [ORDER] }, { error: { code: '23505' } })
    expect((await POST(req(BODY))).status).toBe(409)
  })

  it('returns 500, not a success, when the lookup or the write fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    mockDb({ data: null, error: { message: 'down' } })
    expect((await POST(req(BODY))).status).toBe(500)
    mockDb({ data: [ORDER] }, { error: { code: '57P01', message: 'down' } })
    expect((await POST(req(BODY))).status).toBe(500)
  })
})
