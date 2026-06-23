import { describe, it, expect } from 'vitest'
import { LANE_ADAPTERS, getLaneAdapter } from '../lanes'

const ctx = { idea: 'Launch a winter promo', clarifications: { questions: [], answers: {} } }

describe('LaneAdapter registry', () => {
  it('has marketing, software and content adapters with hints', () => {
    expect(Object.keys(LANE_ADAPTERS).sort()).toEqual(['content', 'marketing', 'software'])
    for (const a of Object.values(LANE_ADAPTERS)) expect(a.matchHints.length).toBeGreaterThan(0)
  })

  it('each adapter returns non-empty build + distribute plans', () => {
    for (const a of Object.values(LANE_ADAPTERS)) {
      expect(a.planBuild(ctx).length).toBeGreaterThan(0)
      expect(a.planDistribute(ctx).length).toBeGreaterThan(0)
    }
  })

  it('getLaneAdapter returns null for unknown', () => {
    expect(getLaneAdapter('unknown')).toBeNull()
    expect(getLaneAdapter('marketing')?.key).toBe('marketing')
  })
})
