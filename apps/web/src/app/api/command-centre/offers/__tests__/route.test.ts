import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('@/lib/integrations/stripe/client', () => ({ getStripe: vi.fn() }))
const constructors = vi.hoisted(() => ({ stripe: vi.fn() }))
vi.mock('stripe', () => ({ default: constructors.stripe }))
import { getUser } from '@/lib/supabase/server'
import { getStripe } from '@/lib/integrations/stripe/client'
import { GET } from '../route'

const product = { id: 'prod_idea', name: '<b>Existing idea offer</b>', active: true, livemode: true, metadata: { private: 'private-value' }, description: 'private-description' }
const price = { id: 'price_once', product: 'prod_idea', active: true, livemode: true, currency: 'aud', unit_amount: 12000, type: 'one_time', billing_scheme: 'per_unit', recurring: null, metadata: { private: 'private-price-value' } }
const stripe = {
  accounts: { retrieve: vi.fn() }, products: { list: vi.fn() }, prices: { list: vi.fn() },
}
beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv('FOUNDER_ALLOWED_USER_IDS', 'founder')
  vi.stubEnv('FOUNDER_ALLOWED_EMAILS', '')
  vi.stubEnv('ALLOWED_FOUNDER_EMAILS', '')
  vi.stubEnv('STRIPE_AGENCY_READ_KEY', '')
  vi.stubEnv('STRIPE_SYNTHEX_READ_KEY', '')
  constructors.stripe.mockImplementation(function () { return stripe })
  vi.mocked(getUser).mockResolvedValue({ id: 'founder' } as never)
  vi.mocked(getStripe).mockReturnValue(stripe as never)
  stripe.accounts.retrieve.mockResolvedValue({ id: 'acct_exact', email: 'private-account@example.com', metadata: { secret: 'private-account-value' } })
  stripe.products.list.mockResolvedValue({ data: [product], has_more: false })
  stripe.prices.list.mockResolvedValue({ data: [price], has_more: false })
})
afterEach(() => { vi.unstubAllEnvs(); vi.useRealTimers() })

describe('founder offer catalogue', () => {
  it('rejects unauthenticated and non-founder users before provider access', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    expect((await GET()).status).toBe(401)
    vi.mocked(getUser).mockResolvedValue({ id: 'stranger' } as never)
    expect((await GET()).status).toBe(403)
    expect(getStripe).not.toHaveBeenCalled()
  })
  it('reports absent connection without invented offers', async () => {
    vi.mocked(getStripe).mockReturnValue(null)
    const response = await GET()
    expect(await response.json()).toEqual({ source: 'not_connected', account: 'primary', accountId: null, offers: [], complete: false })
    expect(stripe.accounts.retrieve).not.toHaveBeenCalled()
    expect(response.headers.get('cache-control')).toBe('no-store')
  })
  it('binds safe one-off and recurring prices to the exact SDK account and strips private fields', async () => {
    stripe.prices.list.mockResolvedValue({ data: [price, { ...price, id: 'price_month', type: 'recurring', recurring: { interval: 'month', interval_count: 1, usage_type: 'licensed', private: 'private-recurring-value' } }], has_more: false })
    const response = await GET()
    const text = await response.text()
    const body = JSON.parse(text)
    expect(body).toMatchObject({ source: 'stripe', accountId: 'acct_exact', complete: true, offers: [{ productId: 'prod_idea', name: 'Existing idea offer', livemode: true, prices: [{ priceId: 'price_once', currency: 'aud', unitAmount: 12000, type: 'one_time', recurring: null }, { priceId: 'price_month', recurring: { interval: 'month', intervalCount: 1, usageType: 'licensed' } }] }] })
    expect(text).not.toMatch(/private-|metadata|<b>|description/)
    expect(stripe.accounts.retrieve).toHaveBeenCalledWith(null, {}, expect.objectContaining({ maxNetworkRetries: 0, timeout: expect.any(Number) }))
    expect(stripe.products.list).toHaveBeenCalledWith({ active: true, limit: 100 }, expect.any(Object))
    expect(stripe.prices.list).toHaveBeenCalledWith({ active: true, limit: 100 }, expect.any(Object))
  })
  it('does not treat an empty connected catalogue as a disconnected or fabricated offer', async () => {
    stripe.products.list.mockResolvedValue({ data: [], has_more: false })
    stripe.prices.list.mockResolvedValue({ data: [], has_more: false })
    expect(await (await GET()).json()).toMatchObject({ source: 'stripe', complete: true, offers: [] })
  })
  it('redacts account provider failures and stops before reading products', async () => {
    stripe.accounts.retrieve.mockRejectedValue(new Error('private-key-value'))
    const response = await GET()
    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({ source: 'error', reason: 'account_unavailable', account: 'primary', accountId: null, offers: [], complete: false })
    expect(stripe.products.list).not.toHaveBeenCalled()
  })
  it('retains bounded product observations but reports a failed price read as partial', async () => {
    stripe.prices.list.mockRejectedValue(new Error('private-key-value'))
    expect(await (await GET()).json()).toMatchObject({ source: 'partial', complete: false, limitations: ['prices_unavailable'], offers: [{ productId: 'prod_idea', prices: [] }] })
  })
  it('does not admit cross-product, cross-mode, duplicate, inactive or malformed prices', async () => {
    stripe.prices.list.mockResolvedValue({ data: [price, { ...price }, { ...price, product: null }, null, { ...price, id: 'price_foreign', product: 'prod_elsewhere' }, { ...price, id: 'price_test', livemode: false }, { ...price, id: 'price_inactive', active: false }, { ...price, id: 'price_bad', currency: 'private-invalid' }], has_more: false })
    const body = await (await GET()).json()
    expect(body).toMatchObject({ source: 'partial', complete: false, limitations: ['catalogue_inconsistent'] })
    expect(body.offers[0].prices).toHaveLength(1)
    expect(body.offers[0].prices[0].priceId).toBe('price_once')
  })
  it('caps pages and rows and declares truncation rather than claiming the entire catalogue', async () => {
    stripe.products.list.mockResolvedValueOnce({ data: Array.from({ length: 100 }, (_, i) => ({ ...product, id: `prod_a${i}` })), has_more: true })
      .mockResolvedValueOnce({ data: Array.from({ length: 100 }, (_, i) => ({ ...product, id: `prod_b${i}` })), has_more: true })
    stripe.prices.list.mockResolvedValue({ data: [], has_more: false })
    const body = await (await GET()).json()
    expect(body).toMatchObject({ source: 'partial', complete: false, limitations: ['products_truncated'], bounds: { maximumProducts: 200, maximumPrices: 200, maximumDurationMs: 15000 } })
    expect(body.offers).toHaveLength(200)
    expect(stripe.products.list).toHaveBeenCalledTimes(2)
    expect(stripe.products.list).toHaveBeenLastCalledWith({ active: true, limit: 100, starting_after: 'prod_a99' }, expect.any(Object))
  })
  it('rejects oversized provider pages and stops repeated cursors', async () => {
    stripe.products.list.mockResolvedValue({ data: Array.from({ length: 101 }, () => product), has_more: false })
    stripe.prices.list.mockResolvedValue({ data: [], has_more: false })
    expect(await (await GET()).json()).toMatchObject({ source: 'partial', limitations: ['products_unavailable'], offers: [] })
    stripe.products.list.mockClear().mockResolvedValue({ data: [product], has_more: true })
    expect(await (await GET()).json()).toMatchObject({ source: 'partial', complete: false })
    expect(stripe.products.list).toHaveBeenCalledTimes(2)
  })
  it('bounds a provider that never settles and never exposes exception content', async () => {
    vi.useFakeTimers()
    stripe.accounts.retrieve.mockImplementation(() => new Promise(() => {}))
    const pending = GET()
    await vi.advanceTimersByTimeAsync(4000)
    const response = await pending
    expect(response.status).toBe(503)
    expect(await response.json()).toMatchObject({ reason: 'account_unavailable', complete: false })
    expect(vi.getTimerCount()).toBe(0)
  })
  it('rejects arbitrary account IDs, unknown aliases, duplicate selectors and secret inputs', async () => {
    for (const query of ['account=acct_arbitrary', 'account=unknown', 'account=agency&account=synthex', 'account=agency&key=private-input', 'stripeAccount=acct_arbitrary']) {
      expect((await GET(new Request(`https://app.test/api/command-centre/offers?${query}`))).status).toBe(400)
    }
    expect(getStripe).not.toHaveBeenCalled()
    expect(constructors.stripe).not.toHaveBeenCalled()
  })
  it.each(['agency', 'synthex'] as const)('reads only the selected %s credential and reports its actual account', async account => {
    const key = `private-${account}-read-credential`
    vi.stubEnv(account === 'agency' ? 'STRIPE_AGENCY_READ_KEY' : 'STRIPE_SYNTHEX_READ_KEY', ` ${key} `)
    stripe.accounts.retrieve.mockResolvedValue({ id: `acct_${account}` })
    const response = await GET(new Request(`https://app.test/api/command-centre/offers?account=${account}`))
    const text = await response.text()
    expect(JSON.parse(text)).toMatchObject({ account, accountId: `acct_${account}`, source: 'stripe', complete: true, offers: [{ productId: 'prod_idea' }] })
    expect(constructors.stripe).toHaveBeenCalledExactlyOnceWith(key, { timeout: 4000, maxNetworkRetries: 0 })
    expect(getStripe).not.toHaveBeenCalled()
    expect(text).not.toContain(key)
    expect(text).not.toContain('private-')
  })
  it.each(['agency', 'synthex'] as const)('does not fall back from a missing %s credential to primary or another account', async account => {
    vi.stubEnv(account === 'agency' ? 'STRIPE_SYNTHEX_READ_KEY' : 'STRIPE_AGENCY_READ_KEY', 'private-other-credential')
    const response = await GET(new Request(`https://app.test/api/command-centre/offers?account=${account}`))
    expect(await response.json()).toEqual({ source: 'not_connected', account, accountId: null, offers: [], complete: false })
    expect(getStripe).not.toHaveBeenCalled()
    expect(constructors.stripe).not.toHaveBeenCalled()
  })
  it('does not fall back after a selected read credential is rejected', async () => {
    vi.stubEnv('STRIPE_AGENCY_READ_KEY', 'private-agency-credential')
    stripe.accounts.retrieve.mockRejectedValue(new Error('private-agency-credential'))
    const response = await GET(new Request('https://app.test/api/command-centre/offers?account=agency'))
    expect(response.status).toBe(503)
    expect(await response.json()).toMatchObject({ account: 'agency', source: 'error', accountId: null, complete: false })
    expect(getStripe).not.toHaveBeenCalled()
    expect(constructors.stripe).toHaveBeenCalledTimes(1)
  })
  it('applies one overall deadline across slow paginated reads', async () => {
    vi.useFakeTimers()
    const later = <T,>(value: T) => new Promise<T>(resolve => { setTimeout(() => resolve(value), 3500) })
    stripe.accounts.retrieve.mockImplementation(() => later({ id: 'acct_exact' }))
    stripe.products.list.mockImplementationOnce(() => later({ data: [product], has_more: true }))
      .mockImplementationOnce(() => later({ data: [{ ...product, id: 'prod_second' }], has_more: false }))
    stripe.prices.list.mockImplementationOnce(() => later({ data: [price], has_more: true }))
      .mockImplementationOnce(() => later({ data: [{ ...price, id: 'price_second' }], has_more: false }))
    const pending = GET()
    await vi.advanceTimersByTimeAsync(15000)
    const body = await (await pending).json()
    expect(body).toMatchObject({ source: 'partial', complete: false, limitations: ['prices_unavailable'] })
    expect(body.offers[0].prices).toHaveLength(1)
    expect(stripe.prices.list).toHaveBeenLastCalledWith({ active: true, limit: 100, starting_after: 'price_once' }, { timeout: 1000, maxNetworkRetries: 0 })
    await vi.advanceTimersByTimeAsync(2500)
    expect(stripe.prices.list).toHaveBeenCalledTimes(2)
    expect(vi.getTimerCount()).toBe(0)
  })
})
