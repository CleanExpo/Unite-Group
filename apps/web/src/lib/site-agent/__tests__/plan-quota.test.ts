import { describe, it, expect } from 'vitest'
import { chatDailyPerKeyForPlan, SITE_AGENT_PLANS } from '../plan-quota'

describe('chatDailyPerKeyForPlan', () => {
  it('maps starter to the migration default ceiling', () => {
    expect(chatDailyPerKeyForPlan('starter')).toEqual({ ok: true, chatDailyPerKey: 200 })
  })

  it.each(['growth', 'managed'])('refuses %s until the founder sets its ceiling', (plan) => {
    expect(chatDailyPerKeyForPlan(plan)).toEqual({ ok: false, reason: 'unset' })
  })

  it.each(['', 'Starter', 'enterprise', 'toString', '__proto__'])('rejects unknown plan %j', (plan) => {
    expect(chatDailyPerKeyForPlan(plan)).toEqual({ ok: false, reason: 'unknown_plan' })
  })

  it('every resolved ceiling is a non-negative integer (the column CHECK)', () => {
    for (const plan of SITE_AGENT_PLANS) {
      const quota = chatDailyPerKeyForPlan(plan)
      if (quota.ok) {
        expect(Number.isInteger(quota.chatDailyPerKey)).toBe(true)
        expect(quota.chatDailyPerKey).toBeGreaterThanOrEqual(0)
      }
    }
  })
})
