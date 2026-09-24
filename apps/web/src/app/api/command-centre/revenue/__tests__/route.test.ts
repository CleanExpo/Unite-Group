// Regression coverage — GET /api/command-centre/revenue
// Auth gate; a missing key or failed read is NOT CONNECTED and never a $0;
// a successful read carries the Agency host split; and no key-shaped string
// ever reaches the response body (Stripe SDK mocked throughout).
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))

const stripeBehaviour = vi.hoisted(() => ({
  mode: 'ok' as 'ok' | 'auth_error' | 'rate_limit',
  keysSeen: [] as string[],
}))

function pager<T>(rows: T[]) {
  return { autoPagingToArray: async () => rows }
}

// Built at runtime so no secret-shaped literal sits in the source.
const FAKE_AGENCY_KEY = ['rk', 'live', 'AGENCYAGENCYAGENCYAGENCY01'].join('_')
const FAKE_SYNTHEX_KEY = ['sk', 'live', 'SYNTHEXSYNTHEXSYNTHEX0001'].join('_')
const KEY_SHAPE = /\b[sr]k_(live|test)_/

vi.mock('stripe', () => ({
  default: vi.fn(function FakeStripe(key: string) {
    stripeBehaviour.keysSeen.push(key)
    const fail = () => {
      if (stripeBehaviour.mode === 'auth_error') {
        // Mirrors Stripe's real 401 text, which quotes the masked key.
        throw Object.assign(new Error(`Invalid API Key provided: ${key.slice(0, 8)}****${key.slice(-4)}`), {
          type: 'StripeAuthenticationError',
          statusCode: 401,
        })
      }
      if (stripeBehaviour.mode === 'rate_limit') {
        throw Object.assign(new Error('Too many requests'), { type: 'StripeRateLimitError', statusCode: 429 })
      }
    }
    const nowSec = Math.floor(Date.now() / 1000)
    return {
      balanceTransactions: {
        list: () => ({
          autoPagingToArray: async () => {
            fail()
            return [
              {
                type: 'charge',
                status: 'available',
                amount: 10_000,
                fee: 300,
                net: 9_700,
                currency: 'aud',
                available_on: nowSec - 60,
                created: nowSec - 3 * 86_400,
                source: { object: 'charge', payment_intent: 'pi_carsi', customer: 'cus_1' },
              },
            ]
          },
        }),
      },
      checkout: {
        sessions: {
          list: () => pager([{ payment_intent: 'pi_carsi', customer: 'cus_1', success_url: 'https://www.carsi.com.au/ok' }]),
        },
      },
      subscriptions: { list: () => pager([]) },
    }
  }),
}))

import { getUser } from '@/lib/supabase/server'
import { resetRevenueCache } from '@/lib/revenue/revenue-snapshot'
import { GET } from '../route'

const ORIGINAL_ENV = { ...process.env }

type Body = {
  accounts: Array<{ account: string; status: string; reason?: string; cleared?: { weekNetCents: number; byBusiness: Array<{ business: string }> } }>
  combined: { weekNetCents: number; complete: boolean; verdict: string }
}

async function read() {
  const res = await GET()
  const text = await res.text()
  return { res, text, body: JSON.parse(text) as Body }
}

describe('GET /api/command-centre/revenue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetRevenueCache()
    stripeBehaviour.mode = 'ok'
    stripeBehaviour.keysSeen = []
    delete process.env.STRIPE_AGENCY_READ_KEY
    delete process.env.STRIPE_SYNTHEX_READ_KEY
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as never)
  })

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV }
  })

  it('401 when unauthenticated, and Stripe is never called', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await GET()
    expect(res.status).toBe(401)
    expect(stripeBehaviour.keysSeen).toEqual([])
  })

  it('missing keys → NOT CONNECTED (missing_key) with no figures, never $0', async () => {
    const { res, body } = await read()
    expect(res.status).toBe(200)
    for (const a of body.accounts) {
      expect(a.status).toBe('not_connected')
      expect(a.reason).toBe('missing_key')
      expect(a).not.toHaveProperty('cleared')
    }
    expect(body.combined.complete).toBe(false)
    expect(body.combined.verdict).toBe('partial')
  })

  it('one key missing → that account NOT CONNECTED, other reads, verdict partial', async () => {
    process.env.STRIPE_AGENCY_READ_KEY = FAKE_AGENCY_KEY
    const { body } = await read()
    const agency = body.accounts.find((a) => a.account === 'agency')!
    const synthex = body.accounts.find((a) => a.account === 'synthex')!
    expect(agency.status).toBe('ok')
    expect(agency.cleared?.weekNetCents).toBe(9_700)
    expect(agency.cleared?.byBusiness.map((b) => b.business)).toEqual(['carsi'])
    expect(synthex).toMatchObject({ status: 'not_connected', reason: 'missing_key' })
    expect(synthex).not.toHaveProperty('cleared')
    expect(body.combined.verdict).toBe('partial')
  })

  it('401 from Stripe → NOT CONNECTED (auth_failed); rate limit → rate_limited', async () => {
    process.env.STRIPE_AGENCY_READ_KEY = FAKE_AGENCY_KEY
    process.env.STRIPE_SYNTHEX_READ_KEY = FAKE_SYNTHEX_KEY
    stripeBehaviour.mode = 'auth_error'
    const { body } = await read()
    expect(body.accounts.map((a) => [a.status, a.reason])).toEqual([
      ['not_connected', 'auth_failed'],
      ['not_connected', 'auth_failed'],
    ])
    expect(body.accounts.every((a) => !('cleared' in a))).toBe(true)

    resetRevenueCache()
    stripeBehaviour.mode = 'rate_limit'
    const second = await read()
    expect(second.body.accounts.map((a) => a.reason)).toEqual(['rate_limited', 'rate_limited'])
  })

  it('never returns a key-shaped string — on success or on Stripe’s key-quoting 401', async () => {
    process.env.STRIPE_AGENCY_READ_KEY = FAKE_AGENCY_KEY
    process.env.STRIPE_SYNTHEX_READ_KEY = FAKE_SYNTHEX_KEY

    const ok = await read()
    expect(stripeBehaviour.keysSeen).toContain(FAKE_AGENCY_KEY) // positive control: keys were in play
    expect(ok.text).not.toMatch(KEY_SHAPE)
    expect(ok.text).not.toContain(FAKE_AGENCY_KEY.slice(-4))

    resetRevenueCache()
    stripeBehaviour.mode = 'auth_error'
    const failed = await read()
    expect(failed.text).not.toMatch(KEY_SHAPE)
    expect(failed.text).not.toContain(FAKE_SYNTHEX_KEY.slice(-4))
  })

  it('serves the cached read for 5 minutes instead of re-hitting Stripe', async () => {
    process.env.STRIPE_AGENCY_READ_KEY = FAKE_AGENCY_KEY
    process.env.STRIPE_SYNTHEX_READ_KEY = FAKE_SYNTHEX_KEY
    await read()
    await read()
    expect(stripeBehaviour.keysSeen).toHaveLength(2) // one client per account, once
  })
})
