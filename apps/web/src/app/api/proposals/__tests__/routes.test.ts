import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/integrations/stripe/client', () => ({ getStripe: vi.fn() }))
vi.mock('@/lib/supabase/service', () => ({ createServiceClient: vi.fn() }))

import { getStripe } from '@/lib/integrations/stripe/client'
import { createServiceClient } from '@/lib/supabase/service'
import { POST as checkout } from '../[token]/checkout/route'
import { POST as redeem } from '../[token]/redeem/route'

const TOKEN = 'a'.repeat(43)
const params = (token = TOKEN) => ({ params: Promise.resolve({ token }) })

const PROPOSAL = {
  id: 'p1',
  founder_id: 'f1',
  client_email: 'owner@example.test',
  plan_name: 'Growth',
  amount_cents: 200000,
  currency: 'aud',
  billing_interval: 'month',
  expires_at: '2999-01-01T00:00:00.000Z',
  withdrawn_at: null,
  stripe_session_id: null,
}

type Setup = {
  proposal?: object | null
  order?: object | null
  proposalError?: string
  rpc?: { data?: unknown; error?: { message: string } | null }
  /** What saving the session id hands back: null when no row matched, because the proposal was withdrawn meanwhile. */
  saved?: object | null
  saveError?: string
  /** An order that appears after the first look-up, from a redeem committing mid-request. */
  orderLater?: object | null
  orderLaterError?: string
  /** The session id on the row when it is read again after redeeming. */
  latestSession?: string | null
}

function setup({ proposal = PROPOSAL, order = null, proposalError, rpc, saved = { id: 'p1' }, saveError, orderLater, orderLaterError, latestSession }: Setup = {}) {
  const updates: object[] = []
  const onlyIf: [string, unknown][] = []
  const rpcCall = vi.fn(async () => ({ data: rpc?.data ?? null, error: rpc?.error ?? null }))
  const reads = { website_proposals: 0, website_orders: 0 }
  const from = (table: string) => {
    const single = async () => {
      const nth = ++reads[table as keyof typeof reads]
      if (table === 'website_proposals') {
        if (nth > 1 && latestSession !== undefined) return { data: { stripe_session_id: latestSession }, error: null }
        return { data: proposalError ? null : proposal, error: proposalError ? { message: proposalError } : null }
      }
      if (nth > 1 && orderLaterError) return { data: null, error: { message: orderLaterError } }
      return { data: nth > 1 && orderLater !== undefined ? orderLater : order, error: null }
    }
    const chain = { eq: () => chain, maybeSingle: single }
    return {
      select: () => chain,
      update: (row: object) => {
        updates.push(row)
        const after = {
          eq: () => after,
          is: (column: string, value: unknown) => {
            onlyIf.push([column, value])
            return after
          },
          select: () => after,
          maybeSingle: async () => ({ data: saveError ? null : saved, error: saveError ? { message: saveError } : null }),
          then: (done: (v: { error: null }) => void) => done({ error: null }),
        }
        return after
      },
    }
  }
  ;(createServiceClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ from, rpc: rpcCall })
  return { updates, onlyIf, rpcCall }
}

function stripeMock() {
  const create = vi.fn(async () => ({ id: 'cs_1', url: 'https://checkout.example.test/1' }))
  const expire = vi.fn(async () => ({}))
  const retrieve = vi.fn(async (): Promise<object> => ({ id: 'cs_open', status: 'open', url: 'https://checkout.example.test/open' }))
  ;(getStripe as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
    checkout: { sessions: { create, expire, retrieve } },
  })
  return { create, expire, retrieve }
}

const post = (path: string, body: unknown) =>
  new NextRequest(`http://localhost/api/proposals/${TOKEN}/${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })

const ACCEPT = { name: 'Sam Owner', acceptedTerms: true }
const CODE = { ...ACCEPT, email: 'owner@example.test', code: 'AAAA-BBBB-CCCC-DDDD' }

describe('POST /api/proposals/[token]/checkout', () => {
  const original = process.env.STRIPE_SECRET_KEY

  beforeEach(() => {
    vi.clearAllMocks()
    process.env.STRIPE_SECRET_KEY = 'sk_test_placeholder'
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })
  afterEach(() => {
    if (original === undefined) delete process.env.STRIPE_SECRET_KEY
    else process.env.STRIPE_SECRET_KEY = original
  })

  it('records acceptance and returns the Stripe URL, ignoring any price the browser sends', async () => {
    const { updates } = setup()
    const { create } = stripeMock()
    const res = await checkout(post('checkout', { ...ACCEPT, amount_cents: 1 }), params())
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ url: 'https://checkout.example.test/1' })
    expect(updates[0]).toMatchObject({ accepted_name: 'Sam Owner' })
    expect(updates[1]).toEqual({ stripe_session_id: 'cs_1' })
    const [stripeParams] = create.mock.calls[0] as unknown as [{ line_items: { price_data: { unit_amount: number } }[] }]
    expect(stripeParams.line_items[0].price_data.unit_amount).toBe(200000)
  })

  it('never hands the link token to Stripe', async () => {
    setup()
    const { create } = stripeMock()
    await checkout(post('checkout', ACCEPT), params())
    const sent = JSON.stringify(create.mock.calls[0])
    expect(sent).not.toContain(TOKEN)
    expect(sent).toContain('/proposal/return?session_id={CHECKOUT_SESSION_ID}')
  })

  it('answers payment_pending and opens nothing new when the saved session is already complete', async () => {
    setup({ proposal: { ...PROPOSAL, stripe_session_id: 'cs_done' } })
    const { create, retrieve } = stripeMock()
    retrieve.mockResolvedValueOnce({ id: 'cs_done', status: 'complete', url: null })
    const res = await checkout(post('checkout', ACCEPT), params())
    expect(res.status).toBe(409)
    expect((await res.json()).error).toBe('payment_pending')
    expect(create).not.toHaveBeenCalled()
  })

  it('closes the new session and releases no URL when the proposal was withdrawn while it was created', async () => {
    const { onlyIf } = setup({ saved: null })
    const { expire } = stripeMock()
    const res = await checkout(post('checkout', ACCEPT), params())
    expect(onlyIf).toContainEqual(['withdrawn_at', null])
    expect(res.status).toBe(410)
    expect(await res.json()).toEqual({ error: 'closed' })
    expect(expire).toHaveBeenCalledWith('cs_1')
  })

  it('closes the new session and releases no URL when it could not be saved', async () => {
    setup({ saveError: 'down' })
    const { expire } = stripeMock()
    const res = await checkout(post('checkout', ACCEPT), params())
    expect(res.status).toBe(503)
    expect(await res.json()).toEqual({ error: 'unavailable' })
    expect(expire).toHaveBeenCalledWith('cs_1')
  })

  it('closes the new session and releases no URL when a code was redeemed while it was created', async () => {
    setup({ orderLater: { id: 'o1' } })
    const { expire } = stripeMock()
    const res = await checkout(post('checkout', ACCEPT), params())
    expect(res.status).toBe(409)
    expect(await res.json()).toEqual({ error: 'already_ordered' })
    expect(expire).toHaveBeenCalledWith('cs_1')
  })

  it('releases no URL when the order check fails, because no answer is not a no', async () => {
    setup({ orderLaterError: 'down' })
    const { expire } = stripeMock()
    const res = await checkout(post('checkout', ACCEPT), params())
    expect(res.status).toBe(503)
    expect(expire).toHaveBeenCalledWith('cs_1')
  })

  it('refuses a live key before touching the database or Stripe', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_live_placeholder'
    setup()
    const { create } = stripeMock()
    const res = await checkout(post('checkout', ACCEPT), params())
    expect(res.status).toBe(503)
    expect((await res.json()).error).toBe('payment_off')
    expect(create).not.toHaveBeenCalled()
    expect(createServiceClient).not.toHaveBeenCalled()
  })

  it.each([
    ['terms not accepted', { name: 'Sam', acceptedTerms: false }],
    ['no name', { acceptedTerms: true }],
  ])('refuses %s', async (_label, body) => {
    setup()
    const { create } = stripeMock()
    expect((await checkout(post('checkout', body), params())).status).toBe(400)
    expect(create).not.toHaveBeenCalled()
  })

  it.each([
    ['a bad link shape', { token: 'short' }, 404],
    ['an unknown link', { proposal: null }, 404],
    ['a withdrawn proposal', { proposal: { ...PROPOSAL, withdrawn_at: '2026-01-01T00:00:00.000Z' } }, 410],
    ['an expired proposal', { proposal: { ...PROPOSAL, expires_at: '2020-01-01T00:00:00.000Z' } }, 410],
    ['a proposal already ordered', { order: { source: 'paid' } }, 409],
    ['a database outage, which is not "not found"', { proposalError: 'down' }, 503],
  ])('opens no Checkout for %s', async (_label, state, status) => {
    const { token, ...rest } = state as Setup & { token?: string }
    setup(rest)
    const { create } = stripeMock()
    expect((await checkout(post('checkout', ACCEPT), params(token))).status).toBe(status)
    expect(create).not.toHaveBeenCalled()
  })

  it('answers 502 with no URL when Stripe fails', async () => {
    setup()
    const { create } = stripeMock()
    create.mockRejectedValueOnce(new Error('stripe down'))
    const res = await checkout(post('checkout', ACCEPT), params())
    expect(res.status).toBe(502)
    expect(await res.json()).toEqual({ error: 'checkout_failed' })
  })
})

describe('POST /api/proposals/[token]/redeem', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.STRIPE_SECRET_KEY = 'sk_test_placeholder'
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('redeems through the one database function, sending the code only as a hash', async () => {
    const { rpcCall } = setup({ rpc: { data: 'redeemed' } })
    stripeMock()
    const res = await redeem(post('redeem', CODE), params())
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ redeemed: true })
    const [name, args] = rpcCall.mock.calls[0] as unknown as [string, Record<string, string>]
    expect(name).toBe('redeem_website_comp_code')
    expect(args.p_proposal_id).toBe('p1')
    expect(args.p_code_hash).toMatch(/^[0-9a-f]{64}$/)
    expect(JSON.stringify(args)).not.toContain('AAAA')
  })

  it('makes an open Checkout unpayable before the code commits', async () => {
    const { rpcCall } = setup({ proposal: { ...PROPOSAL, stripe_session_id: 'cs_open' }, rpc: { data: 'redeemed' } })
    const { expire } = stripeMock()
    const res = await redeem(post('redeem', CODE), params())
    expect(res.status).toBe(200)
    expect(expire).toHaveBeenCalledWith('cs_open')
    expect(expire.mock.invocationCallOrder[0]).toBeLessThan(rpcCall.mock.invocationCallOrder[0])
  })

  it('does not ask Stripe to close a Checkout that has already expired', async () => {
    const { rpcCall } = setup({ proposal: { ...PROPOSAL, stripe_session_id: 'cs_gone' }, rpc: { data: 'redeemed' } })
    const { expire, retrieve } = stripeMock()
    retrieve.mockResolvedValueOnce({ id: 'cs_gone', status: 'expired', url: null })
    expect((await redeem(post('redeem', CODE), params())).status).toBe(200)
    expect(expire).not.toHaveBeenCalled()
    expect(rpcCall).toHaveBeenCalled()
  })

  it('redeems nothing when the payment finishes just as the Checkout is being closed', async () => {
    const { rpcCall } = setup({ proposal: { ...PROPOSAL, stripe_session_id: 'cs_racing' }, rpc: { data: 'redeemed' } })
    const { expire, retrieve } = stripeMock()
    retrieve.mockResolvedValueOnce({ id: 'cs_racing', status: 'open', url: 'https://checkout.example.test/open' })
    expire.mockRejectedValueOnce(new Error('session is complete'))
    retrieve.mockResolvedValueOnce({ id: 'cs_racing', status: 'complete', url: null })
    const res = await redeem(post('redeem', CODE), params())
    expect(res.status).toBe(409)
    expect((await res.json()).error).toBe('payment_pending')
    expect(rpcCall).not.toHaveBeenCalled()
  })

  it('redeems nothing when the Checkout cannot be closed and is still open', async () => {
    const { rpcCall } = setup({ proposal: { ...PROPOSAL, stripe_session_id: 'cs_open' }, rpc: { data: 'redeemed' } })
    const { expire } = stripeMock()
    expire.mockRejectedValueOnce(new Error('stripe down'))
    expect((await redeem(post('redeem', CODE), params())).status).toBe(503)
    expect(rpcCall).not.toHaveBeenCalled()
  })

  it('closes a Checkout opened while the code was redeeming, and failing to does not undo the redemption', async () => {
    setup({ rpc: { data: 'redeemed' }, latestSession: 'cs_new' })
    const { expire } = stripeMock()
    expire.mockRejectedValueOnce(new Error('already gone'))
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const res = await redeem(post('redeem', CODE), params())
    expect(res.status).toBe(200)
    expect(expire).toHaveBeenCalledWith('cs_new')
  })

  it('will not let a code overtake a finished payment whose webhook is on the way', async () => {
    const { rpcCall } = setup({ proposal: { ...PROPOSAL, stripe_session_id: 'cs_done' }, rpc: { data: 'redeemed' } })
    const { retrieve } = stripeMock()
    retrieve.mockResolvedValueOnce({ id: 'cs_done', status: 'complete', url: null })
    const res = await redeem(post('redeem', CODE), params())
    expect(res.status).toBe(409)
    expect((await res.json()).error).toBe('payment_pending')
    expect(rpcCall).not.toHaveBeenCalled()
  })

  it('redeems nothing when the Checkout status cannot be read', async () => {
    const { rpcCall } = setup({ proposal: { ...PROPOSAL, stripe_session_id: 'cs_x' }, rpc: { data: 'redeemed' } })
    const { retrieve } = stripeMock()
    retrieve.mockRejectedValueOnce(new Error('stripe down'))
    expect((await redeem(post('redeem', CODE), params())).status).toBe(503)
    expect(rpcCall).not.toHaveBeenCalled()
  })

  it('gives every refused code the same answer', async () => {
    setup({ rpc: { data: 'invalid' } })
    const res = await redeem(post('redeem', CODE), params())
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'invalid_code' })
  })

  it('reports an order that got there first', async () => {
    setup({ rpc: { data: 'already_ordered' } })
    expect((await redeem(post('redeem', CODE), params())).status).toBe(409)
  })

  it('reports a database fault as unavailable, never as a bad code', async () => {
    setup({ rpc: { error: { message: 'down' } } })
    const res = await redeem(post('redeem', CODE), params())
    expect(res.status).toBe(503)
    expect((await res.json()).error).toBe('unavailable')
  })

  it.each([
    ['terms not accepted', { ...CODE, acceptedTerms: false }],
    ['a bad email', { ...CODE, email: 'nope' }],
    ['no code', { ...CODE, code: '' }],
  ])('never calls the database function for %s', async (_label, body) => {
    const { rpcCall } = setup({ rpc: { data: 'redeemed' } })
    expect((await redeem(post('redeem', body), params())).status).toBe(400)
    expect(rpcCall).not.toHaveBeenCalled()
  })

  it.each([
    ['a withdrawn proposal', { proposal: { ...PROPOSAL, withdrawn_at: '2026-01-01T00:00:00.000Z' } }, 410],
    ['a proposal already ordered', { order: { source: 'comped' } }, 409],
    ['an unknown link', { proposal: null }, 404],
    ['a database outage', { proposalError: 'down' }, 503],
  ])('never calls the database function for %s', async (_label, state, status) => {
    const { rpcCall } = setup({ ...state, rpc: { data: 'redeemed' } } as Setup)
    expect((await redeem(post('redeem', CODE), params())).status).toBe(status)
    expect(rpcCall).not.toHaveBeenCalled()
  })
})
