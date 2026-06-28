import { describe, it, expect } from 'vitest'
import { buildRevenueUserMessage } from '../revenue'

const biz = (over: Partial<Parameters<typeof buildRevenueUserMessage>[0]['businesses'][number]> = {}) => ({
  key: 'dr',
  name: 'Disaster Recovery',
  revenueCents: 1_000_00,
  expensesCents: 500_00,
  growth: 5,
  invoiceCount: 3,
  ...over,
})

describe('buildRevenueUserMessage — demo revenue labelling (B1b)', () => {
  it('does NOT label real (xero-sourced) businesses as demo', () => {
    const out = buildRevenueUserMessage({ businesses: [biz({ source: 'xero' })], todayDate: '27/06/2026' })
    expect(out).not.toContain('DEMO')
    expect(out).not.toContain('NOTE:')
  })

  it('labels mock-sourced businesses (DEMO) and prepends a warning banner', () => {
    const out = buildRevenueUserMessage({ businesses: [biz({ source: 'mock' })], todayDate: '27/06/2026' })
    expect(out).toContain('(DEMO — placeholder)')
    expect(out).toContain('NOTE: lines marked (DEMO)')
    expect(out).toContain('do not base advice or alerts on them')
  })

  it('only marks mock lines when sources are mixed', () => {
    const out = buildRevenueUserMessage({
      businesses: [biz({ key: 'dr', source: 'xero' }), biz({ key: 'ccw', name: 'CCW', source: 'mock' })],
      todayDate: '27/06/2026',
    })
    const drLine = out.split('\n').find((l) => l.includes('(dr)'))
    const ccwLine = out.split('\n').find((l) => l.includes('(ccw)'))
    expect(drLine).not.toContain('DEMO')
    expect(ccwLine).toContain('DEMO')
  })

  it('treats missing source as not-demo (backward compatible)', () => {
    const out = buildRevenueUserMessage({ businesses: [biz()], todayDate: '27/06/2026' })
    expect(out).not.toContain('DEMO')
  })
})
