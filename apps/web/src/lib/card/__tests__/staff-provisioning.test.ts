import { beforeEach, describe, expect, it, vi } from 'vitest'

const sendEmail = vi.hoisted(() => vi.fn(async () => 'msg-1'))
vi.mock('@/lib/integrations/mailtrap', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/integrations/mailtrap')>()),
  sendEmail,
}))

import { hashCardToken } from '../staff-actions'
import { provisionCardOrder } from '../staff-provisioning'
import { makeStore } from './staff-fake'

const order = (over: Record<string, unknown>) => ({
  id: 'order-1',
  stripe_session_id: 'cs_test_1',
  founder_id: 'f',
  tier: 'custom',
  customer_email: 'Owner@Example.invalid',
  livemode: false,
  quantity: 1,
  ...over,
})

let store: ReturnType<typeof makeStore>
const mails = () => sendEmail.mock.calls.map((c) => (c as unknown as [{ to: { email: string }; text: string; subject: string }])[0])

beforeEach(() => {
  store = makeStore()
  sendEmail.mockClear()
  sendEmail.mockImplementation(async () => 'msg-1')
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('a Business Pack order', () => {
  it('opens one account, emails the buyer a private link, and stores only the hash', async () => {
    store.tables.card_orders.push(order({}))
    expect(await provisionCardOrder(store.admin, 'cs_test_1')).toBe('account_created')
    const [account] = store.tables.card_business_accounts
    expect(account.owner_email).toBe('owner@example.invalid')
    const [mail] = mails()
    expect(mail.to.email).toBe('owner@example.invalid')
    const raw = /cards\/manage#k=([A-Za-z0-9_-]{43})/.exec(mail.text)?.[1] as string
    expect(raw).toBeTruthy()
    expect(account.owner_token_hash).toBe(hashCardToken(raw))
    expect(JSON.stringify(store.tables)).not.toContain(raw)
  })

  it('does nothing further on a redelivery, and sends no second link', async () => {
    store.tables.card_orders.push(order({}))
    await provisionCardOrder(store.admin, 'cs_test_1')
    expect(await provisionCardOrder(store.admin, 'cs_test_1')).toBe('account_exists')
    expect(store.tables.card_business_accounts).toHaveLength(1)
    expect(mails()).toHaveLength(1)
  })

  it('tells the founder when the link email fails, without putting the link in the alert', async () => {
    store.tables.card_orders.push(order({}))
    sendEmail.mockImplementationOnce(async () => { throw new Error('mail down') })
    expect(await provisionCardOrder(store.admin, 'cs_test_1')).toBe('account_created')
    const alert = mails().at(-1)
    expect(alert?.text).toContain('did not send')
    expect(alert?.text).not.toContain('#k=')
  })
})

describe('a Starter pack order', () => {
  it('sets up nothing and sends nothing', async () => {
    store.tables.card_orders.push(order({ tier: 'ready' }))
    expect(await provisionCardOrder(store.admin, 'cs_test_1')).toBe('none')
    expect(store.tables.card_business_accounts).toHaveLength(0)
    expect(mails()).toHaveLength(0)
  })
})

describe('a staff-card order', () => {
  const withAccount = () => {
    store.tables.card_business_accounts.push({ id: 'acct-1', founder_id: 'f', owner_email: 'owner@example.invalid' })
    store.tables.card_orders.push(order({ tier: 'extra_business', quantity: 7 }))
  }

  it('adds one seat per card, more than the old cap of five, to the account with the same email', async () => {
    withAccount()
    expect(await provisionCardOrder(store.admin, 'cs_test_1')).toBe('seats_added')
    expect(store.tables.card_staff_cards).toHaveLength(7)
    expect(store.tables.card_staff_cards.every((c) => c.account_id === 'acct-1')).toBe(true)
    expect(mails()[0].text).toContain('7 staff cards')
  })

  it('adds no seats and sends no second email on a redelivery', async () => {
    withAccount()
    await provisionCardOrder(store.admin, 'cs_test_1')
    expect(await provisionCardOrder(store.admin, 'cs_test_1')).toBe('seats_exist')
    expect(store.tables.card_staff_cards).toHaveLength(7)
    expect(mails()).toHaveLength(1)
  })

  it.each([
    ['no account has the email', []],
    ['two accounts have the email', ['a', 'b']],
  ])('does not guess when %s: no seats, and the founder is told', async (_n, ids) => {
    for (const id of ids) store.tables.card_business_accounts.push({ id, founder_id: 'f', owner_email: 'owner@example.invalid' })
    store.tables.card_orders.push(order({ tier: 'extra_business', quantity: 2 }))
    expect(await provisionCardOrder(store.admin, 'cs_test_1')).toBe('unlinked')
    expect(store.tables.card_staff_cards).toHaveLength(0)
    expect(mails()).toHaveLength(1)
    expect(mails()[0].text).toContain('Link it by hand')
  })

  it('does not match another founder\'s account on the same email', async () => {
    store.tables.card_business_accounts.push({ id: 'other', founder_id: 'someone-else', owner_email: 'owner@example.invalid' })
    store.tables.card_orders.push(order({ tier: 'extra_business', quantity: 1 }))
    expect(await provisionCardOrder(store.admin, 'cs_test_1')).toBe('unlinked')
  })
})

describe('failure handling', () => {
  it('sets up nothing when Stripe recorded no email, and tells the founder', async () => {
    store.tables.card_orders.push(order({ customer_email: null }))
    expect(await provisionCardOrder(store.admin, 'cs_test_1')).toBe('skipped_no_email')
    expect(store.tables.card_business_accounts).toHaveLength(0)
    expect(mails()[0].text).toContain('no buyer email')
  })

  it('throws on a failed read, so the webhook answers 500 and Stripe retries', async () => {
    store.failReads.on = true
    await expect(provisionCardOrder(store.admin, 'cs_test_1')).rejects.toThrow('card order read failed')
  })

  it('throws when the recorded order cannot be found, never reporting a quiet success', async () => {
    await expect(provisionCardOrder(store.admin, 'cs_test_missing')).rejects.toThrow('not found')
  })

  it.each([['42P01'], ['PGRST205']])('only warns while the migration is unapplied (%s), so paid orders keep recording', async (code) => {
    const admin = {
      from: (name: string) =>
        name === 'card_orders'
          ? { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: order({}), error: null }) }) }) }
          : { insert: async () => ({ error: { code, message: 'relation does not exist' } }) },
    }
    expect(await provisionCardOrder(admin as never, 'cs_test_1')).toBe('not_applied')
    expect(console.warn).toHaveBeenCalled()
    expect(mails()).toHaveLength(0)
  })

  it('throws on any other insert failure', async () => {
    const admin = {
      from: (name: string) =>
        name === 'card_orders'
          ? { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: order({}), error: null }) }) }) }
          : { insert: async () => ({ error: { code: '500', message: 'boom' } }) },
    }
    await expect(provisionCardOrder(admin as never, 'cs_test_1')).rejects.toThrow('card account insert failed')
  })
})
