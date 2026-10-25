import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { CARD_TIERS } from '@/app/cards/order/order-view'

const sendEmail = vi.hoisted(() => vi.fn())
vi.mock('@/lib/integrations/sendgrid', () => ({ sendEmail }))

import { cardOrderReference, matchCardTier, recordPaidCardOrder } from '../paid-order'

// Test-mode fixture shapes only; nothing here is a real Stripe object or payment.
const session = (over: Record<string, unknown> = {}) =>
  ({ id: 'cs_test_a1', amount_total: 24900, currency: 'aud', client_reference_id: 'ref_abc123', ...over }) as never

describe('matchCardTier', () => {
  it('matches each CARD_TIERS price in AUD cents', () => {
    for (const t of CARD_TIERS) {
      expect(matchCardTier(session({ amount_total: t.priceAud * 100 }))?.id).toBe(t.id)
    }
  })

  it.each([
    ['another amount', { amount_total: 24800 }],
    ['another currency', { currency: 'usd' }],
    ['no amount', { amount_total: null }],
  ])('returns null for %s', (_n, over) => {
    expect(matchCardTier(session(over))).toBeNull()
  })
})

describe('cardOrderReference', () => {
  it('takes client_reference_id, trimmed', () => {
    expect(cardOrderReference(session({ client_reference_id: '  ref_abc123 ' }))).toBe('ref_abc123')
  })
  it('falls back to the checkout session id when there is none', () => {
    expect(cardOrderReference(session({ client_reference_id: null }))).toBe('cs_test_a1')
  })
})

describe('recordPaidCardOrder', () => {
  const insert = vi.fn()
  const admin = { from: vi.fn(() => ({ insert })) } as never
  const event = (over: Record<string, unknown> = {}, livemode = true) =>
    ({
      id: 'evt_test_1',
      type: 'checkout.session.completed',
      livemode,
      data: {
        object: {
          id: 'cs_test_a1',
          payment_status: 'paid',
          amount_total: 24900,
          currency: 'aud',
          payment_link: 'plink_card',
          client_reference_id: 'ref_abc123',
          customer_details: { name: 'Sam Buyer', email: 'sam@example.invalid' },
          ...over,
        },
      },
    }) as never

  beforeEach(() => {
    vi.stubEnv('STRIPE_CARD_PAYMENT_LINK_IDS', 'plink_card')
    vi.stubEnv('STRIPE_CARD_EXTRA_BUSINESS_PAYMENT_LINK_ID', 'plink_extra')
    vi.stubEnv('FOUNDER_USER_ID', '00000000-0000-0000-0000-00000000000a')
    vi.stubEnv('LEAD_ALERT_EMAIL_TO', 'alerts@example.invalid')
    vi.stubEnv('SENDGRID_FROM_EMAIL', 'from@example.invalid')
    insert.mockReset().mockResolvedValue({ error: null })
    sendEmail.mockReset().mockResolvedValue(undefined)
  })
  afterEach(() => vi.unstubAllEnvs())

  it.each([
    ['ready', 24900],
    ['custom', 44900],
  ])('inserts a %s order with NO quantity key (works before the quantity migration)', async (tier, amount) => {
    expect(await recordPaidCardOrder(admin, event({ amount_total: amount }))).toBe('created')
    const row = insert.mock.calls[0][0] as Record<string, unknown>
    expect(row.tier).toBe(tier)
    expect(Object.keys(row)).not.toContain('quantity')
  })

  it.each([1, 2, 5])('records %i extra business(es) with tier extra_business and quantity', async (n) => {
    expect(
      await recordPaidCardOrder(admin, event({ amount_total: 19900 * n, payment_link: 'plink_extra' }, false)),
    ).toBe('created')
    const row = insert.mock.calls[0][0] as Record<string, unknown>
    expect(row.tier).toBe('extra_business')
    expect(row.quantity).toBe(n)
    expect(row.amount_total).toBe(19900 * n)
    const mail = sendEmail.mock.calls[0][0] as { subject: string; text: string }
    expect(mail.subject).toBe(`[TEST] New paid card order: Extra business${n > 1 ? ` x${n}` : ''}`)
    expect(mail.text).toContain(n === 1 ? '1 extra business ' : `${n} extra businesses`)
    expect(mail.text).toContain(`A$${199 * n}`)
  })

  it.each([
    ['six (over the cap)', { amount_total: 119400, payment_link: 'plink_extra' }],
    ['a non-multiple', { amount_total: 20000, payment_link: 'plink_extra' }],
    ['a non-allowlisted link at 39800', { amount_total: 39800, payment_link: 'plink_other' }],
    ['zero', { amount_total: 0, payment_link: 'plink_extra' }],
    ['non-AUD', { amount_total: 19900, currency: 'usd', payment_link: 'plink_extra' }],
    ['unpaid', { amount_total: 19900, payment_status: 'unpaid', payment_link: 'plink_extra' }],
    ['a tier link at 39800 (discounted Made for you)', { amount_total: 39800, payment_link: 'plink_card' }],
    ['a tier link at 19900 (discounted Ready)', { amount_total: 19900, payment_link: 'plink_card' }],
    ['the add-on link at a tier price (44900)', { amount_total: 44900, payment_link: 'plink_extra' }],
    ['a discounted add-on (17910)', { amount_total: 17910, payment_link: 'plink_extra' }],
  ])('ignores %s', async (_n, over) => {
    expect(await recordPaidCardOrder(admin, event(over))).toBe('ignored')
    expect(insert).not.toHaveBeenCalled()
  })

  it('records 2 extra businesses at 39800 on the add-on link', async () => {
    expect(await recordPaidCardOrder(admin, event({ amount_total: 39800, payment_link: 'plink_extra' }))).toBe('created')
    expect(insert.mock.calls[0][0]).toMatchObject({ tier: 'extra_business', quantity: 2 })
  })

  it('warns when the add-on link pays an amount that is not 1 to 5 x A$199', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    await recordPaidCardOrder(admin, event({ amount_total: 17910, payment_link: 'plink_extra' }))
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('extra-business link did not match 1 to 5 x A$199'))
    warn.mockRestore()
  })

  it('records nothing for the add-on link when its env var is unset (fail closed)', async () => {
    vi.stubEnv('STRIPE_CARD_EXTRA_BUSINESS_PAYMENT_LINK_ID', '')
    expect(await recordPaidCardOrder(admin, event({ amount_total: 19900, payment_link: 'plink_extra' }))).toBe('ignored')
    expect(insert).not.toHaveBeenCalled()
  })

  describe('half-set add-on env (page link set, webhook link id not)', () => {
    const PAGE_LINK = 'https://buy.stripe.com/test_x'
    const addOnPayment = () => event({ amount_total: 39800, payment_link: 'plink_extra' })

    it('logs exactly one clear warning naming both variables, and records nothing', async () => {
      vi.stubEnv('STRIPE_PAYMENT_LINK_CARD_EXTRA_BUSINESS', PAGE_LINK)
      vi.stubEnv('STRIPE_CARD_EXTRA_BUSINESS_PAYMENT_LINK_ID', '')
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      expect(await recordPaidCardOrder(admin, addOnPayment())).toBe('ignored')
      const half = warn.mock.calls.filter((c) => String(c[0]).includes('STRIPE_CARD_EXTRA_BUSINESS_PAYMENT_LINK_ID'))
      expect(half).toHaveLength(1)
      expect(String(half[0][0])).toContain('STRIPE_PAYMENT_LINK_CARD_EXTRA_BUSINESS')
      expect(insert).not.toHaveBeenCalled()
      warn.mockRestore()
    })

    it.each([
      ['both set', PAGE_LINK, 'plink_extra'],
      ['neither set', '', ''],
      ['only the webhook id set', '', 'plink_extra'],
    ])('does not warn when %s', async (_n, page, id) => {
      vi.stubEnv('STRIPE_PAYMENT_LINK_CARD_EXTRA_BUSINESS', page)
      vi.stubEnv('STRIPE_CARD_EXTRA_BUSINESS_PAYMENT_LINK_ID', id)
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      await recordPaidCardOrder(admin, addOnPayment())
      expect(warn.mock.calls.filter((c) => String(c[0]).includes('STRIPE_CARD_EXTRA_BUSINESS_PAYMENT_LINK_ID'))).toHaveLength(0)
      warn.mockRestore()
    })
  })

  it.each([24900, 44900])(
    'treats a link listed as BOTH tier and add-on as add-on only: a %i tier-price payment on it is ignored, not recorded as a tier',
    async (amount) => {
      vi.stubEnv('STRIPE_CARD_PAYMENT_LINK_IDS', 'plink_card,plink_extra')
      expect(await recordPaidCardOrder(admin, event({ amount_total: amount, payment_link: 'plink_extra' }))).toBe('ignored')
      expect(insert).not.toHaveBeenCalled()
    },
  )

  it('rejects an add-on-link payment with no currency', async () => {
    expect(await recordPaidCardOrder(admin, event({ amount_total: 39800, currency: null, payment_link: 'plink_extra' }))).toBe('ignored')
    expect(insert).not.toHaveBeenCalled()
  })

  it('lets the add-on path win when the link is in both lists', async () => {
    vi.stubEnv('STRIPE_CARD_PAYMENT_LINK_IDS', 'plink_card,plink_extra')
    expect(await recordPaidCardOrder(admin, event({ amount_total: 39800, payment_link: 'plink_extra' }))).toBe('created')
    expect(insert.mock.calls[0][0]).toMatchObject({ tier: 'extra_business', quantity: 2 })
  })

  it('treats a duplicate (23505) as duplicate and sends nothing', async () => {
    insert.mockResolvedValue({ error: { code: '23505', message: 'dup' } })
    expect(await recordPaidCardOrder(admin, event({ amount_total: 39800, payment_link: 'plink_extra' }))).toBe('duplicate')
    expect(sendEmail).not.toHaveBeenCalled()
  })

  it('throws on any other insert error', async () => {
    insert.mockResolvedValue({ error: { code: '42703', message: 'no column' } })
    await expect(recordPaidCardOrder(admin, event())).rejects.toThrow('card_orders insert failed: no column')
  })
})
