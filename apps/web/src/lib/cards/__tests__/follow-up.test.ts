import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const sendEmail = vi.hoisted(() => vi.fn())
vi.mock('@/lib/integrations/mailtrap', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/integrations/mailtrap')>()),
  sendEmail,
}))

import {
  DAY_MS,
  buildFollowUpEmail,
  dueFollowUps,
  isFollowUpSendEnabled,
  processCardFollowUps,
  reviewUrl,
  type FollowUpOrder,
} from '../follow-up'

const NOW = Date.parse('2026-10-27T12:00:00Z')
const order = (daysOld: number, over: Partial<FollowUpOrder> = {}): FollowUpOrder => ({
  id: `o${daysOld}`,
  created_at: new Date(NOW - daysOld * DAY_MS).toISOString(),
  tier: 'ready',
  customer_name: 'Sam Lee',
  customer_email: 'sam@example.com',
  livemode: true,
  ...over,
})
const opts = (over: Record<string, unknown> = {}) => ({
  now: NOW,
  hasIntake: false,
  alreadySent: new Set<never>(),
  reviewUrl: 'https://g.page/r/example/review',
  includeTest: false,
  ...over,
})

beforeEach(() => {
  vi.unstubAllEnvs()
  sendEmail.mockReset()
})
afterEach(() => vi.unstubAllEnvs())

describe('isFollowUpSendEnabled', () => {
  it('needs both the exact flag and a Mailtrap key', () => {
    vi.stubEnv('MAILTRAP_API_KEY', '')
    vi.stubEnv('CARD_FOLLOWUP_EMAILS_ENABLED', 'true')
    expect(isFollowUpSendEnabled()).toBe(false)
    vi.stubEnv('MAILTRAP_API_KEY', 'k')
    for (const v of ['', 'TRUE', '1', 'false']) {
      vi.stubEnv('CARD_FOLLOWUP_EMAILS_ENABLED', v)
      expect(isFollowUpSendEnabled()).toBe(false)
    }
    vi.stubEnv('CARD_FOLLOWUP_EMAILS_ENABLED', 'true')
    expect(isFollowUpSendEnabled()).toBe(true)
  })
})

describe('reviewUrl', () => {
  it('accepts https only and fails closed', () => {
    vi.stubEnv('CARD_REVIEW_URL', '')
    expect(reviewUrl()).toBeNull()
    vi.stubEnv('CARD_REVIEW_URL', 'http://x.test/r')
    expect(reviewUrl()).toBeNull()
    vi.stubEnv('CARD_REVIEW_URL', 'not a url')
    expect(reviewUrl()).toBeNull()
    vi.stubEnv('CARD_REVIEW_URL', 'https://g.page/r/x/review')
    expect(reviewUrl()).toBe('https://g.page/r/x/review')
  })
})

describe('dueFollowUps', () => {
  it('sends nothing before day 3', () => expect(dueFollowUps(order(2), opts())).toEqual([]))
  it('reminds from day 3 when no details arrived', () => expect(dueFollowUps(order(3), opts())).toEqual(['intake_reminder']))
  it('does not remind once details arrived', () => expect(dueFollowUps(order(5), opts({ hasIntake: true }))).toEqual([]))
  it('asks for a review from day 21', () =>
    expect(dueFollowUps(order(21), opts({ hasIntake: true }))).toEqual(['review_request']))
  it('never asks for a review without a review URL', () =>
    expect(dueFollowUps(order(30), opts({ hasIntake: true, reviewUrl: null }))).toEqual([]))
  it('never repeats a kind already sent', () =>
    expect(dueFollowUps(order(30), opts({ alreadySent: new Set(['intake_reminder', 'review_request']) }))).toEqual([]))
  it('ignores orders older than 60 days', () => expect(dueFollowUps(order(61), opts())).toEqual([]))
  it('ignores add-on rows and orders without an email', () => {
    expect(dueFollowUps(order(5, { tier: 'extra_business' }), opts())).toEqual([])
    expect(dueFollowUps(order(5, { customer_email: null }), opts())).toEqual([])
  })
  it('skips test-mode orders unless included', () => {
    expect(dueFollowUps(order(5, { livemode: false }), opts())).toEqual([])
    expect(dueFollowUps(order(5, { livemode: false }), opts({ includeTest: true }))).toEqual(['intake_reminder'])
  })
})

describe('buildFollowUpEmail', () => {
  it.each(['intake_reminder', 'review_request'] as const)('%s stays on brand and claims nothing unproven', (kind) => {
    const m = buildFollowUpEmail(kind, { customer_name: '<b>Sam Lee', tier: 'custom' }, 'https://g.page/r/x/review')
    const all = `${m.subject}\n${m.text}\n${m.html}`
    expect(all).not.toMatch(/nexus|carsi|restoration|disaster|nrpg/i)
    expect(all).not.toMatch(/\d+\s*(stars?|reviews|customers)/i)
    expect(m.text).toContain('Made for you')
    expect(m.html).not.toContain('<b>')
    expect(m.html).toContain('&lt;b&gt;Sam')
  })
  it('the review request carries the review link', () => {
    expect(buildFollowUpEmail('review_request', { customer_name: null, tier: 'ready' }, 'https://g.page/r/x/review').text).toContain(
      'https://g.page/r/x/review',
    )
  })
})

// Minimal chainable Supabase stand-in.
function fakeAdmin(state: { orders: FollowUpOrder[]; intakes: string[]; sent: { order_id: string; kind: string }[]; claimError?: { code: string } }) {
  const calls = { inserts: [] as unknown[], deletes: 0, updates: 0 }
  const admin = {
    from(table: string) {
      const result = () =>
        table === 'card_orders'
          ? { data: state.orders, error: null }
          : table === 'card_order_intakes'
            ? { data: state.intakes.map((order_id) => ({ order_id })), error: null }
            : { data: state.sent, error: null }
      const q: any = {
        select: () => q,
        eq: () => q,
        gte: () => q,
        in: () => q,
        then: (f: any, r: any) => Promise.resolve(result()).then(f, r),
        insert: (row: unknown) => {
          calls.inserts.push(row)
          return { select: () => ({ single: async () => (state.claimError ? { data: null, error: state.claimError } : { data: { id: 'c1' }, error: null }) }) }
        },
        update: () => ({ eq: async () => { calls.updates++; return { error: null } } }),
        delete: () => ({ eq: async () => { calls.deletes++; return { error: null } } }),
      }
      return q
    },
  }
  return { admin: admin as never, calls }
}

describe('processCardFollowUps', () => {
  beforeEach(() => {
    vi.stubEnv('CARD_REVIEW_URL', 'https://g.page/r/x/review')
    vi.stubEnv('MAILTRAP_API_KEY', 'k')
  })

  it('claims then sends each due email once', async () => {
    sendEmail.mockResolvedValue('msg_1')
    const { admin, calls } = fakeAdmin({ orders: [order(4), order(25, { id: 'o25' })], intakes: ['o25'], sent: [] })
    const s = await processCardFollowUps(admin, 'founder-1', NOW)
    expect(s).toMatchObject({ checked: 2, sent: 2, failed: 0 })
    expect(calls.inserts).toHaveLength(2)
    expect(calls.updates).toBe(2)
    expect(sendEmail.mock.calls.map((c) => c[0].categories[0]).sort()).toEqual(['card-intake-reminder', 'card-review-request'])
  })

  it('removes the claim when Mailtrap rejects the request, so a later run can retry', async () => {
    sendEmail.mockRejectedValue(new Error('[mailtrap] send failed: HTTP 500'))
    const { admin, calls } = fakeAdmin({ orders: [order(4)], intakes: [], sent: [] })
    const s = await processCardFollowUps(admin, 'founder-1', NOW)
    expect(s).toMatchObject({ sent: 0, failed: 1 })
    expect(calls.deletes).toBe(1)
  })

  it('keeps the claim on a timeout, because the email may already have gone out', async () => {
    sendEmail.mockRejectedValue(new DOMException('The operation timed out.', 'TimeoutError'))
    const { admin, calls } = fakeAdmin({ orders: [order(4)], intakes: [], sent: [] })
    expect(await processCardFollowUps(admin, 'founder-1', NOW)).toMatchObject({ sent: 0, failed: 1 })
    expect(calls.deletes).toBe(0)
    expect(calls.updates).toBe(1)
  })

  it('keeps the claim when Mailtrap accepts without a message id (no repeat)', async () => {
    sendEmail.mockResolvedValue(null)
    const { admin, calls } = fakeAdmin({ orders: [order(4)], intakes: [], sent: [] })
    expect(await processCardFollowUps(admin, 'founder-1', NOW)).toMatchObject({ sent: 1, failed: 0 })
    expect(calls.deletes).toBe(0)
    expect(calls.updates).toBe(1)
  })

  it('claims and sends nothing without a Mailtrap key', async () => {
    vi.stubEnv('MAILTRAP_API_KEY', '')
    const { admin, calls } = fakeAdmin({ orders: [order(4)], intakes: [], sent: [] })
    expect(await processCardFollowUps(admin, 'founder-1', NOW)).toMatchObject({ sent: 0, skipped: 1 })
    expect(calls.inserts).toHaveLength(0)
    expect(sendEmail).not.toHaveBeenCalled()
  })

  it('a claim that already exists sends nothing', async () => {
    const { admin } = fakeAdmin({ orders: [order(4)], intakes: [], sent: [], claimError: { code: '23505' } })
    expect(await processCardFollowUps(admin, 'founder-1', NOW)).toMatchObject({ sent: 0, skipped: 1 })
    expect(sendEmail).not.toHaveBeenCalled()
  })
})
