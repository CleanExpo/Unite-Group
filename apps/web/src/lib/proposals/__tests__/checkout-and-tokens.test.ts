import { describe, it, expect, vi, beforeEach } from 'vitest'
import type Stripe from 'stripe'

vi.mock('@/lib/integrations/stripe/client', () => ({ getStripe: vi.fn(() => ({ marker: 'stripe' })) }))

import { openCheckoutUrl, testModeStripe } from '../checkout'
import type { ProposalRow } from '../store'
import { hashCompCode, isProposalToken, newCompCode, newProposalToken, normaliseCompCode } from '../tokens'

const env = (key?: string) => ({ STRIPE_SECRET_KEY: key }) as unknown as NodeJS.ProcessEnv

describe('testModeStripe', () => {
  it('gives a client only for a test key', () => {
    expect(testModeStripe(env('sk_test_placeholder'))).toEqual({ marker: 'stripe' })
    expect(testModeStripe(env('rk_test_placeholder'))).toEqual({ marker: 'stripe' })
  })

  it.each([['live secret key', 'sk_live_placeholder'], ['live restricted key', 'rk_live_placeholder'], ['empty', ''], ['unset', undefined]])(
    'refuses a %s',
    (_label, key) => {
      expect(testModeStripe(env(key))).toBeNull()
    },
  )
})

const PROPOSAL = {
  id: 'p1',
  plan_name: 'Growth',
  amount_cents: 200000,
  currency: 'aud',
  billing_interval: 'month',
  client_email: 'owner@example.test',
  stripe_session_id: null,
} as unknown as ProposalRow

function fakeStripe(existing?: { status: string; url: string | null; id: string }) {
  const create = vi.fn(async () => ({ id: 'cs_new', url: 'https://checkout.example.test/new' }))
  const retrieve = vi.fn(async () => existing)
  return { stripe: { checkout: { sessions: { create, retrieve } } } as unknown as Stripe, create, retrieve }
}

const URLS = { success: 'https://x.test/ok', cancel: 'https://x.test/no' }

describe('openCheckoutUrl', () => {
  beforeEach(() => vi.clearAllMocks())

  it('charges the amount on the proposal row and tags the session with its id', async () => {
    const { stripe, create } = fakeStripe()
    await expect(openCheckoutUrl(stripe, PROPOSAL, URLS)).resolves.toEqual({ url: 'https://checkout.example.test/new', sessionId: 'cs_new' })
    const [params, options] = create.mock.calls[0] as unknown as [Stripe.Checkout.SessionCreateParams, { idempotencyKey: string }]
    expect(params.mode).toBe('subscription')
    expect(params.metadata).toEqual({ proposal_id: 'p1' })
    expect(params.line_items?.[0].price_data?.unit_amount).toBe(200000)
    expect(params.line_items?.[0].price_data?.recurring).toEqual({ interval: 'month' })
    expect(options.idempotencyKey).toBe('proposal:p1:first')
  })

  it('uses one-off payment mode for a plan with no billing interval', async () => {
    const { stripe, create } = fakeStripe()
    await openCheckoutUrl(stripe, { ...PROPOSAL, billing_interval: null }, URLS)
    const [params] = create.mock.calls[0] as unknown as [Stripe.Checkout.SessionCreateParams]
    expect(params.mode).toBe('payment')
    expect(params.subscription_data).toBeUndefined()
  })

  it('reuses a session that is still open instead of creating a second', async () => {
    const { stripe, create } = fakeStripe({ status: 'open', url: 'https://checkout.example.test/open', id: 'cs_old' })
    await expect(openCheckoutUrl(stripe, { ...PROPOSAL, stripe_session_id: 'cs_old' }, URLS)).resolves.toEqual({
      url: 'https://checkout.example.test/open',
      sessionId: 'cs_old',
    })
    expect(create).not.toHaveBeenCalled()
  })

  it('replaces an expired session under a new idempotency key', async () => {
    const { stripe, create } = fakeStripe({ status: 'expired', url: null, id: 'cs_old' })
    await openCheckoutUrl(stripe, { ...PROPOSAL, stripe_session_id: 'cs_old' }, URLS)
    const [, options] = create.mock.calls[0] as unknown as [unknown, { idempotencyKey: string }]
    expect(options.idempotencyKey).toBe('proposal:p1:cs_old')
  })
})

describe('tokens', () => {
  it('makes tokens of the shape the proxy opens, and refuses others', () => {
    expect(isProposalToken(newProposalToken())).toBe(true)
    expect(isProposalToken('short')).toBe(false)
    expect(isProposalToken(`${'a'.repeat(42)}/`)).toBe(false)
    expect(isProposalToken('a'.repeat(44))).toBe(false)
  })

  it('makes different codes in the readable format', () => {
    const code = newCompCode()
    expect(code).toMatch(/^[0-9A-HJKMNP-TV-Z]{4}(-[0-9A-HJKMNP-TV-Z]{4}){3}$/)
    expect(newCompCode()).not.toBe(code)
  })

  it('matches a code however it was typed, and only that code', () => {
    expect(normaliseCompCode(' ab12-cd34 ')).toBe('AB12CD34')
    expect(hashCompCode('ab12-cd34')).toBe(hashCompCode('AB12CD34'))
    expect(hashCompCode('AB12CD35')).not.toBe(hashCompCode('AB12CD34'))
  })
})
