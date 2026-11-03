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

  it('records the payment mode and the confirmed send on the account', async () => {
    store.tables.card_orders.push(order({ livemode: true }))
    await provisionCardOrder(store.admin, 'cs_test_1')
    const [account] = store.tables.card_business_accounts
    expect(account.livemode).toBe(true)
    expect(account.owner_link_sent_at).toEqual(expect.any(String))
  })

  it('throws when the link email fails, so Stripe retries, and tells the founder without the link', async () => {
    store.tables.card_orders.push(order({}))
    sendEmail.mockImplementationOnce(async () => { throw new Error('mail down') })
    await expect(provisionCardOrder(store.admin, 'cs_test_1')).rejects.toThrow('link email failed')
    expect(store.tables.card_business_accounts[0].owner_link_sent_at).toBeUndefined()
    const alert = mails().at(-1)
    expect(alert?.text).toContain('did not send')
    expect(alert?.text).not.toContain('#k=')
  })

  it('still throws when the link email and the founder alert both fail', async () => {
    store.tables.card_orders.push(order({}))
    sendEmail.mockImplementation(async () => null as unknown as string)
    await expect(provisionCardOrder(store.admin, 'cs_test_1')).rejects.toThrow('link email failed')
  })

  it('heals on the retry: a new link that works, the old one dead, and no third email', async () => {
    store.tables.card_orders.push(order({}))
    sendEmail.mockImplementationOnce(async () => { throw new Error('mail down') })
    await expect(provisionCardOrder(store.admin, 'cs_test_1')).rejects.toThrow()
    const firstHash = store.tables.card_business_accounts[0].owner_token_hash
    sendEmail.mockClear()
    expect(await provisionCardOrder(store.admin, 'cs_test_1')).toBe('account_link_replaced')
    expect(store.tables.card_business_accounts).toHaveLength(1)
    const [account] = store.tables.card_business_accounts
    const raw = /cards\/manage#k=([A-Za-z0-9_-]{43})/.exec(mails()[0].text)?.[1] as string
    expect(account.owner_token_hash).toBe(hashCardToken(raw))
    expect(account.owner_token_hash).not.toBe(firstHash)
    expect(account.owner_link_sent_at).toEqual(expect.any(String))
    expect(await provisionCardOrder(store.admin, 'cs_test_1')).toBe('account_exists')
    expect(mails()).toHaveLength(1)
  })

  it('leaves a link being emailed alone: an overlapping retry throws and the first link stays the working one', async () => {
    store.tables.card_orders.push(order({}))
    let release: (v: string) => void = () => {}
    sendEmail.mockImplementationOnce(() => new Promise<string>((r) => { release = r }))
    const first = provisionCardOrder(store.admin, 'cs_test_1')
    await vi.waitFor(() => expect(sendEmail).toHaveBeenCalledTimes(1))
    await expect(provisionCardOrder(store.admin, 'cs_test_1')).rejects.toThrow('in progress')
    release('msg-1')
    expect(await first).toBe('account_created')
    const raw = /cards\/manage#k=([A-Za-z0-9_-]{43})/.exec(mails()[0].text)?.[1] as string
    expect(store.tables.card_business_accounts[0].owner_token_hash).toBe(hashCardToken(raw))
    expect(mails()).toHaveLength(1)
  })

  it('takes over a claim left by a dead request once its lease is out', async () => {
    store.tables.card_orders.push(order({}))
    store.tables.card_business_accounts.push({ id: 'a', order_id: 'order-1', founder_id: 'f', owner_token_hash: 'old', owner_link_claimed_at: new Date(Date.now() - 11 * 60 * 1000).toISOString() })
    expect(await provisionCardOrder(store.admin, 'cs_test_1')).toBe('account_link_replaced')
    expect(store.tables.card_business_accounts[0].owner_token_hash).not.toBe('old')
  })

  it('waits while a claim is just inside its lease', async () => {
    store.tables.card_orders.push(order({}))
    store.tables.card_business_accounts.push({ id: 'a', order_id: 'order-1', founder_id: 'f', owner_token_hash: 'old', owner_link_claimed_at: new Date(Date.now() - 9 * 60 * 1000).toISOString() })
    await expect(provisionCardOrder(store.admin, 'cs_test_1')).rejects.toThrow('in progress')
    expect(store.tables.card_business_accounts[0].owner_token_hash).toBe('old')
  })

  it('does not let a request whose claim was taken over mark its link as sent', async () => {
    store.tables.card_orders.push(order({}))
    let release: (v: string) => void = () => {}
    sendEmail.mockImplementationOnce(() => new Promise<string>((r) => { release = r }))
    const first = provisionCardOrder(store.admin, 'cs_test_1')
    await vi.waitFor(() => expect(sendEmail).toHaveBeenCalledTimes(1))
    store.tables.card_business_accounts[0].owner_link_claimed_at = new Date(Date.now() - 11 * 60 * 1000).toISOString()
    sendEmail.mockImplementationOnce(async () => { throw new Error('mail down') })
    await expect(provisionCardOrder(store.admin, 'cs_test_1')).rejects.toThrow('link email failed')
    release('msg-1')
    await first
    expect(store.tables.card_business_accounts[0].owner_link_sent_at).toBeUndefined()
  })

  it('throws when the sent mark fails, and a later retry sends a newer link that works', async () => {
    store.tables.card_orders.push(order({}))
    store.failPatch.key = 'owner_link_sent_at'
    await expect(provisionCardOrder(store.admin, 'cs_test_1')).rejects.toThrow('mark failed')
    store.failPatch.key = null
    store.tables.card_business_accounts[0].owner_link_claimed_at = new Date(Date.now() - 11 * 60 * 1000).toISOString()
    expect(await provisionCardOrder(store.admin, 'cs_test_1')).toBe('account_link_replaced')
    const raw = /cards\/manage#k=([A-Za-z0-9_-]{43})/.exec(mails().at(-1)?.text as string)?.[1] as string
    expect(store.tables.card_business_accounts[0].owner_token_hash).toBe(hashCardToken(raw))
    expect(store.tables.card_business_accounts[0].owner_link_sent_at).toEqual(expect.any(String))
  })

  it('never replaces a link that was delivered', async () => {
    store.tables.card_orders.push(order({}))
    await provisionCardOrder(store.admin, 'cs_test_1')
    const hash = store.tables.card_business_accounts[0].owner_token_hash
    await provisionCardOrder(store.admin, 'cs_test_1')
    expect(store.tables.card_business_accounts[0].owner_token_hash).toBe(hash)
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
    store.tables.card_business_accounts.push({ id: 'acct-1', founder_id: 'f', owner_email: 'owner@example.invalid', livemode: false })
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
    for (const id of ids) store.tables.card_business_accounts.push({ id, founder_id: 'f', owner_email: 'owner@example.invalid', livemode: false })
    store.tables.card_orders.push(order({ tier: 'extra_business', quantity: 2 }))
    expect(await provisionCardOrder(store.admin, 'cs_test_1')).toBe('unlinked')
    expect(store.tables.card_staff_cards).toHaveLength(0)
    expect(mails()).toHaveLength(1)
    expect(mails()[0].text).toContain('Link it by hand')
  })

  it('does not match another founder\'s account on the same email', async () => {
    store.tables.card_business_accounts.push({ id: 'other', founder_id: 'someone-else', owner_email: 'owner@example.invalid', livemode: false })
    store.tables.card_orders.push(order({ tier: 'extra_business', quantity: 1 }))
    expect(await provisionCardOrder(store.admin, 'cs_test_1')).toBe('unlinked')
  })

  it.each([[true, false], [false, true]])('does not put a livemode=%s order on a livemode=%s account', async (orderMode, accountMode) => {
    store.tables.card_business_accounts.push({ id: 'acct-1', founder_id: 'f', owner_email: 'owner@example.invalid', livemode: accountMode })
    store.tables.card_orders.push(order({ tier: 'extra_business', quantity: 1, livemode: orderMode }))
    expect(await provisionCardOrder(store.admin, 'cs_test_1')).toBe('unlinked')
    expect(store.tables.card_staff_cards).toHaveLength(0)
  })

  it('throws when the founder cannot be told about unlinked seats, so the order is not lost', async () => {
    store.tables.card_orders.push(order({ tier: 'extra_business', quantity: 1 }))
    sendEmail.mockImplementation(async () => null as unknown as string)
    await expect(provisionCardOrder(store.admin, 'cs_test_1')).rejects.toThrow('alert failed')
  })

  it('keeps the seats and tells the founder when the owner email fails', async () => {
    withAccount()
    sendEmail.mockImplementationOnce(async () => null as unknown as string)
    expect(await provisionCardOrder(store.admin, 'cs_test_1')).toBe('seats_added')
    expect(store.tables.card_staff_cards).toHaveLength(7)
    expect(mails().at(-1)?.text).toContain('did not send')
  })
})

describe('failure handling', () => {
  it('sets up nothing when Stripe recorded no email, and tells the founder', async () => {
    store.tables.card_orders.push(order({ customer_email: null }))
    expect(await provisionCardOrder(store.admin, 'cs_test_1')).toBe('skipped_no_email')
    expect(store.tables.card_business_accounts).toHaveLength(0)
    expect(mails()[0].text).toContain('no buyer email')
  })

  it('throws when there is no buyer email and the founder cannot be told', async () => {
    store.tables.card_orders.push(order({ customer_email: null }))
    sendEmail.mockImplementation(async () => null as unknown as string)
    await expect(provisionCardOrder(store.admin, 'cs_test_1')).rejects.toThrow('alert failed')
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
