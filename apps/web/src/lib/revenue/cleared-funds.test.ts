// Founder revenue panel — pure maths: Sydney week boundary, cleared-only week
// total, break-even verdict, success_url host split, MRR normalisation.
import { describe, expect, it } from 'vitest'
import {
  attributeCharge,
  breakEvenVerdict,
  buildAttributionMaps,
  hostToBusiness,
  monthlyCents,
  summariseCleared,
  sydneyTrendDays,
  sydneyWeekBounds,
  type AttributedTxn,
} from './cleared-funds'

const sec = (iso: string) => Math.floor(Date.parse(iso) / 1000)

function txn(over: Partial<AttributedTxn> & { at: string }): AttributedTxn {
  const { at, ...rest } = over
  return {
    type: 'charge',
    status: 'available',
    amount: 10_000,
    fee: 200,
    net: 9_800,
    currency: 'aud',
    available_on: sec(at),
    created: sec(at) - 3 * 86_400,
    business: 'carsi',
    ...rest,
  }
}

describe('sydneyWeekBounds — Mon–Sun, Australia/Sydney', () => {
  it('Sunday 23:59 and Monday 00:01 Sydney (AEST, +10) fall in different weeks', () => {
    const sun = sydneyWeekBounds(new Date('2026-09-20T13:59:00Z')) // Sun 20 Sep 23:59 AEST
    const mon = sydneyWeekBounds(new Date('2026-09-20T14:01:00Z')) // Mon 21 Sep 00:01 AEST
    expect(sun).toMatchObject({ startDate: '2026-09-14', endDate: '2026-09-20' })
    expect(mon).toMatchObject({ startDate: '2026-09-21', endDate: '2026-09-27' })
    expect(new Date(mon.startMs).toISOString()).toBe('2026-09-20T14:00:00.000Z')
    expect(sun.endMs).toBe(mon.startMs)
  })

  it('uses the daylight-saving offset (AEDT, +11) in summer', () => {
    const sun = sydneyWeekBounds(new Date('2026-11-15T12:59:00Z')) // Sun 15 Nov 23:59 AEDT
    const mon = sydneyWeekBounds(new Date('2026-11-15T13:01:00Z')) // Mon 16 Nov 00:01 AEDT
    expect(sun.startDate).toBe('2026-11-09')
    expect(mon.startDate).toBe('2026-11-16')
    expect(new Date(mon.startMs).toISOString()).toBe('2026-11-15T13:00:00.000Z')
  })

  it('a week spanning the DST switch is 167 hours long', () => {
    const w = sydneyWeekBounds(new Date('2026-10-04T01:00:00Z')) // Sun 4 Oct, after 02:00 switch
    expect(w.startDate).toBe('2026-09-28')
    expect(new Date(w.startMs).toISOString()).toBe('2026-09-27T14:00:00.000Z')
    expect(new Date(w.endMs).toISOString()).toBe('2026-10-04T13:00:00.000Z')
    expect((w.endMs - w.startMs) / 3_600_000).toBe(167)
  })

  it('trend is the last 7 Sydney days ending today', () => {
    const days = sydneyTrendDays(new Date('2026-09-20T14:01:00Z'))
    expect(days.map((d) => d.date)).toEqual([
      '2026-09-15', '2026-09-16', '2026-09-17', '2026-09-18', '2026-09-19', '2026-09-20', '2026-09-21',
    ])
  })
})

describe('summariseCleared — only available charge/payment money counts', () => {
  const now = new Date('2026-09-24T02:00:00Z') // Thu 24 Sep 12:00 AEST; week Mon 21 – Sun 27

  it('sums net for cleared funds inside the Sydney week and nothing else', () => {
    const s = summariseCleared(
      [
        txn({ at: '2026-09-20T14:00:00Z', net: 100_000 }), // Mon 00:00 Sydney — IN
        txn({ at: '2026-09-20T13:59:59Z', net: 50_000 }), // Sun 23:59:59 prior week — OUT
        txn({ at: '2026-09-23T00:00:00Z', type: 'payment', net: 20_000, business: 'restore' }), // IN
        txn({ at: '2026-09-23T00:00:00Z', status: 'pending', net: 7_000 }), // pending — OUT
        txn({ at: '2026-09-23T00:00:00Z', type: 'refund', net: -5_000 }), // refund type — OUT
        txn({ at: '2026-09-23T00:00:00Z', type: 'payout', net: -90_000 }), // payout — OUT
        txn({ at: '2026-09-23T00:00:00Z', currency: 'usd', net: 3_000 }), // non-AUD — OUT, counted
        txn({ at: '2026-09-25T00:00:00Z', net: 9_000 }), // available_on in the future — OUT
      ],
      now,
    )
    expect(s.weekNetCents).toBe(120_000)
    expect(s.weekCount).toBe(2)
    expect(s.nonAudExcludedCount).toBe(1)
    expect(s.byBusiness).toEqual([
      { business: 'carsi', label: 'CARSI', weekNetCents: 100_000, weekCount: 1 },
      { business: 'restore', label: 'RestoreAssist', weekNetCents: 20_000, weekCount: 1 },
    ])
    expect(s.trend.find((d) => d.date === '2026-09-20')?.netCents).toBe(50_000)
    expect(s.trend.find((d) => d.date === '2026-09-21')?.netCents).toBe(100_000)
    expect(s.lastPayments).toHaveLength(3)
    expect(s.lastPayments[0].netCents).toBe(20_000)
  })

  it('caps last payments at 10, newest first', () => {
    const many = Array.from({ length: 14 }, (_, i) => txn({ at: `2026-09-${String(10 + i).padStart(2, '0')}T01:00:00Z`, net: i }))
    const s = summariseCleared(many, now)
    expect(s.lastPayments).toHaveLength(10)
    expect(s.lastPayments[0].netCents).toBe(13)
  })
})

describe('breakEvenVerdict — $3,233 break-even, $6,470 margin', () => {
  it('draws the line at the exact cent', () => {
    expect(breakEvenVerdict(323_299, true)).toMatchObject({ verdict: 'below_break_even', gapToBreakEvenCents: 1 })
    expect(breakEvenVerdict(323_300, true)).toMatchObject({ verdict: 'break_even_met', gapToBreakEvenCents: 0, gapToMarginCents: 323_700 })
    expect(breakEvenVerdict(647_000, true).verdict).toBe('margin_target_met')
  })

  it('never claims a verdict when an account is missing', () => {
    expect(breakEvenVerdict(900_000, false).verdict).toBe('partial')
    expect(breakEvenVerdict(0, false).verdict).toBe('partial')
  })
})

describe('success_url host split', () => {
  it('maps carsi.com.au AND www.carsi.com.au to CARSI, RA and DR hosts, unknown → Unattributed', () => {
    expect(hostToBusiness('https://carsi.com.au/checkout/success?session_id={CHECKOUT_SESSION_ID}')).toBe('carsi')
    expect(hostToBusiness('https://www.carsi.com.au/thanks')).toBe('carsi')
    expect(hostToBusiness('https://restoreassist.app/billing/success')).toBe('restore')
    expect(hostToBusiness('https://disasterrecovery.com.au/paid')).toBe('dr')
    expect(hostToBusiness('https://evil-carsi.com.au/')).toBe('unattributed')
    expect(hostToBusiness('https://localhost:3000/')).toBe('unattributed')
    expect(hostToBusiness(null)).toBe('unattributed')
    expect(hostToBusiness('not a url')).toBe('unattributed')
  })

  it('attributes one-off charges by payment_intent and renewals by customer; never drops unknowns', () => {
    const maps = buildAttributionMaps([
      { payment_intent: 'pi_1', customer: 'cus_a', success_url: 'https://www.carsi.com.au/ok' },
      { subscription: 'sub_1', customer: 'cus_b', success_url: 'https://restoreassist.app/ok' },
      { payment_intent: 'pi_2', customer: 'cus_c', success_url: 'https://unknown.example/ok' },
      { payment_intent: 'pi_3', customer: 'cus_d', success_url: 'https://carsi.com.au/ok' },
      { payment_intent: 'pi_4', customer: 'cus_d', success_url: 'https://restoreassist.app/ok' },
    ])
    expect(attributeCharge({ payment_intent: 'pi_1' }, maps)).toBe('carsi')
    expect(attributeCharge({ payment_intent: 'pi_renewal', customer: 'cus_b' }, maps)).toBe('restore')
    expect(attributeCharge({ payment_intent: 'pi_2', customer: 'cus_c' }, maps)).toBe('unattributed')
    expect(attributeCharge({ payment_intent: 'pi_x', customer: 'cus_d' }, maps)).toBe('unattributed') // ambiguous customer
    expect(attributeCharge({ payment_intent: 'pi_nope' }, maps)).toBe('unattributed')
    expect(maps.bySubscription.get('sub_1')).toBe('restore')

    const s = summariseCleared(
      [
        txn({ at: '2026-09-22T00:00:00Z', business: attributeCharge({ payment_intent: 'pi_1' }, maps) }),
        txn({ at: '2026-09-22T00:00:00Z', business: attributeCharge({ payment_intent: 'pi_2' }, maps) }),
      ],
      new Date('2026-09-24T02:00:00Z'),
    )
    expect(s.byBusiness.map((b) => b.business).sort()).toEqual(['carsi', 'unattributed'])
    expect(s.weekNetCents).toBe(19_600)
  })
})

describe('monthlyCents', () => {
  it('normalises intervals to a month', () => {
    const item = (interval: 'month' | 'year' | 'week', unit_amount: number, interval_count = 1, quantity = 1) => ({
      quantity,
      price: { unit_amount, currency: 'aud', recurring: { interval, interval_count } },
    })
    expect(monthlyCents(item('month', 4_900))).toBe(4_900)
    expect(monthlyCents(item('year', 120_000))).toBe(10_000)
    expect(monthlyCents(item('month', 30_000, 3))).toBe(10_000)
    expect(monthlyCents(item('month', 1_000, 1, 5))).toBe(5_000)
    expect(monthlyCents(item('week', 1_200))).toBe(5_200)
  })
})
