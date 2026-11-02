import { describe, it, expect, vi, beforeEach } from 'vitest'
import type Stripe from 'stripe'

import { proposalIdOf, recordPaidProposalOrder } from '../paid-order'
import type { Admin } from '../store'

const PROPOSAL_ID = '11111111-1111-4111-8111-111111111111'
const FOUNDER_ID = '22222222-2222-4222-8222-222222222222'

const PROPOSAL = { id: PROPOSAL_ID, founder_id: FOUNDER_ID, amount_cents: 150000, currency: 'aud', client_email: 'owner@example.test' }

type Fake = {
  admin: Admin
  orders: Record<string, unknown>[]
  flagged: { problem: string; eventId: string }[]
}

/** An in-memory stand-in holding the unique rules the real table has: one order per proposal and per session. */
function fakeAdmin(options: { proposal?: object | null; readError?: string; insertError?: { code?: string; message: string } } = {}): Fake {
  const orders: Record<string, unknown>[] = []
  const flagged: Fake['flagged'] = []
  const proposal = options.proposal === undefined ? PROPOSAL : options.proposal

  const from = (table: string) => {
    if (table === 'website_proposals') {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: options.readError ? null : proposal, error: options.readError ? { message: options.readError } : null }),
          }),
        }),
      }
    }
    if (table === 'stripe_events') {
      return {
        update: (row: { processing_error: string }) => ({
          eq: async (_column: string, eventId: string) => {
            flagged.push({ problem: row.processing_error, eventId })
            return { error: null }
          },
        }),
      }
    }
    return {
      insert: async (row: Record<string, unknown>) => {
        if (options.insertError) return { error: options.insertError }
        if (orders.some((o) => o.proposal_id === row.proposal_id || o.stripe_session_id === row.stripe_session_id)) {
          return { error: { code: '23505', message: 'duplicate key' } }
        }
        orders.push(row)
        return { error: null }
      },
      select: () => ({
        eq: () => ({
          eq: () => ({ maybeSingle: async () => ({ data: orders[0] ?? null, error: null }) }),
        }),
      }),
    }
  }
  return { admin: { from } as unknown as Admin, orders, flagged }
}

function paidEvent(overrides: { session?: Partial<Stripe.Checkout.Session>; event?: Partial<Stripe.Event> } = {}): Stripe.Event {
  return {
    id: 'evt_1',
    type: 'checkout.session.completed',
    livemode: false,
    data: {
      object: {
        id: 'cs_test_1',
        payment_status: 'paid',
        amount_total: 150000,
        currency: 'aud',
        metadata: { proposal_id: PROPOSAL_ID },
        customer_details: { email: 'payer@example.test' },
        ...overrides.session,
      },
    },
    ...overrides.event,
  } as unknown as Stripe.Event
}

describe('recordPaidProposalOrder', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('creates exactly one paid order, with the founder taken from the proposal row', async () => {
    const fake = fakeAdmin()
    await expect(recordPaidProposalOrder(fake.admin, paidEvent())).resolves.toBe('created')
    expect(fake.orders).toHaveLength(1)
    expect(fake.orders[0]).toMatchObject({
      founder_id: FOUNDER_ID,
      proposal_id: PROPOSAL_ID,
      source: 'paid',
      stripe_session_id: 'cs_test_1',
      amount_cents: 150000,
      livemode: false,
      customer_email: 'payer@example.test',
    })
  })

  it('treats the same session redelivered as a duplicate, with no second order and no flag', async () => {
    const fake = fakeAdmin()
    await recordPaidProposalOrder(fake.admin, paidEvent())
    await expect(recordPaidProposalOrder(fake.admin, paidEvent({ event: { id: 'evt_2' } }))).resolves.toBe('duplicate')
    expect(fake.orders).toHaveLength(1)
    expect(fake.flagged).toEqual([])
  })

  it('flags a different session paying a proposal that already has an order, for a possible refund', async () => {
    const fake = fakeAdmin()
    await recordPaidProposalOrder(fake.admin, paidEvent())
    const second = paidEvent({ event: { id: 'evt_2' }, session: { id: 'cs_test_2' } })
    await expect(recordPaidProposalOrder(fake.admin, second)).resolves.toBe('flagged')
    expect(fake.orders).toHaveLength(1)
    expect(fake.flagged[0].eventId).toBe('evt_2')
    expect(fake.flagged[0].problem).toContain('refund')
  })

  it('records nothing for an unpaid completed session (a delayed payment method)', async () => {
    const fake = fakeAdmin()
    await expect(recordPaidProposalOrder(fake.admin, paidEvent({ session: { payment_status: 'unpaid' } }))).resolves.toBe('ignored')
    expect(fake.orders).toEqual([])
  })

  it('records a delayed payment when it succeeds', async () => {
    const fake = fakeAdmin()
    const event = paidEvent({ event: { type: 'checkout.session.async_payment_succeeded' } as Partial<Stripe.Event> })
    await expect(recordPaidProposalOrder(fake.admin, event)).resolves.toBe('created')
    expect(fake.orders).toHaveLength(1)
  })

  it('ignores other Checkout events that carry the metadata', async () => {
    const fake = fakeAdmin()
    const event = paidEvent({ event: { type: 'checkout.session.expired' } as Partial<Stripe.Event> })
    await expect(recordPaidProposalOrder(fake.admin, event)).resolves.toBe('ignored')
    expect(fake.orders).toEqual([])
  })

  it.each([
    ['a lower amount', { amount_total: 100 }],
    ['another currency', { currency: 'usd' }],
    ['no amount', { amount_total: null }],
  ])('flags %s and creates no order', async (_label, session) => {
    const fake = fakeAdmin()
    await expect(recordPaidProposalOrder(fake.admin, paidEvent({ session }))).resolves.toBe('flagged')
    expect(fake.orders).toEqual([])
    expect(fake.flagged).toHaveLength(1)
  })

  it('flags a live-mode payment and creates no order', async () => {
    const fake = fakeAdmin()
    await expect(recordPaidProposalOrder(fake.admin, paidEvent({ event: { livemode: true } }))).resolves.toBe('flagged')
    expect(fake.orders).toEqual([])
    expect(fake.flagged[0].problem).toContain('live-mode')
  })

  it('flags an unknown proposal and a malformed id without creating an order', async () => {
    const unknown = fakeAdmin({ proposal: null })
    await expect(recordPaidProposalOrder(unknown.admin, paidEvent())).resolves.toBe('flagged')
    expect(unknown.orders).toEqual([])

    const malformed = fakeAdmin()
    await expect(recordPaidProposalOrder(malformed.admin, paidEvent({ session: { metadata: { proposal_id: 'nope' } } }))).resolves.toBe('flagged')
    expect(malformed.orders).toEqual([])
  })

  it('flags a payment on a withdrawn proposal for a refund and creates no order', async () => {
    const fake = fakeAdmin({ proposal: { ...PROPOSAL, withdrawn_at: '2026-11-02T00:00:00.000Z' } })
    await expect(recordPaidProposalOrder(fake.admin, paidEvent())).resolves.toBe('flagged')
    expect(fake.orders).toEqual([])
    expect(fake.flagged[0].problem).toContain('withdrawn')
  })

  it('throws when the problem cannot be recorded, so Stripe retries and the marker is not lost', async () => {
    const fake = fakeAdmin()
    const failing = {
      from: (table: string) =>
        table === 'stripe_events'
          ? { update: () => ({ eq: async () => ({ error: { message: 'marker write failed' } }) }) }
          : (fake.admin as unknown as { from: (t: string) => unknown }).from(table),
    } as unknown as Admin
    await expect(recordPaidProposalOrder(failing, paidEvent({ event: { livemode: true } }))).rejects.toThrow('marker write failed')
  })

  it('throws on a database fault so Stripe retries, rather than losing the payment', async () => {
    await expect(recordPaidProposalOrder(fakeAdmin({ readError: 'down' }).admin, paidEvent())).rejects.toThrow('down')
    await expect(
      recordPaidProposalOrder(fakeAdmin({ insertError: { code: '57014', message: 'timeout' } }).admin, paidEvent()),
    ).rejects.toThrow('timeout')
  })
})

describe('proposalIdOf', () => {
  it('reads the id only from Checkout session events', () => {
    expect(proposalIdOf(paidEvent())).toBe(PROPOSAL_ID)
    expect(proposalIdOf(paidEvent({ event: { type: 'invoice.paid' } as Partial<Stripe.Event> }))).toBeNull()
    expect(proposalIdOf(paidEvent({ session: { metadata: {} } }))).toBeNull()
  })
})
