import { describe, it, expect } from 'vitest'
import { windowUsage, windowedPressure, prepaidPressure, nextResetAt, WINDOW, type QuotaEvent, type WindowCap } from '../quota'

const NOW = '2026-06-21T10:00:00.000Z'

function evt(at: string, units: number): QuotaEvent {
  return { at, units }
}

describe('windowUsage', () => {
  it('sums only events within the window', () => {
    const events = [
      evt('2026-06-21T09:30:00.000Z', 10), // 30 min ago — in 5h window
      evt('2026-06-21T04:30:00.000Z', 5), // 5.5h ago — outside 5h window
      evt('2026-06-21T08:00:00.000Z', 7), // 2h ago — in window
    ]
    expect(windowUsage(events, WINDOW.fiveHour, NOW)).toBe(17)
  })

  it('is 0 with no in-window events', () => {
    expect(windowUsage([evt('2026-06-01T00:00:00.000Z', 99)], WINDOW.fiveHour, NOW)).toBe(0)
  })
})

describe('windowedPressure', () => {
  const caps: WindowCap[] = [
    { label: '5h', seconds: WINDOW.fiveHour, cap: 100 },
    { label: 'weekly', seconds: WINDOW.weekly, cap: 1000 },
  ]

  it('takes the worst (highest) pressure across windows', () => {
    // 80 in last 5h → 0.8 on 5h cap; weekly total 80 → 0.08. Worst = 0.8.
    const events = [evt('2026-06-21T09:00:00.000Z', 80)]
    expect(windowedPressure(events, caps, NOW)).toBeCloseTo(0.8, 5)
  })

  it('weekly cap can dominate even with a quiet 5h window', () => {
    // 950 units a day ago: 0 in 5h window, 0.95 weekly.
    const events = [evt('2026-06-20T10:00:00.000Z', 950)]
    expect(windowedPressure(events, caps, NOW)).toBeCloseTo(0.95, 5)
  })

  it('clamps to 1 when over cap', () => {
    expect(windowedPressure([evt('2026-06-21T09:00:00.000Z', 500)], caps, NOW)).toBe(1)
  })

  it('is 0 with no caps', () => {
    expect(windowedPressure([evt(NOW, 100)], [], NOW)).toBe(0)
  })
})

describe('prepaidPressure', () => {
  it('is spent/purchased', () => {
    expect(prepaidPressure(250, 1000)).toBeCloseTo(0.25, 5)
  })
  it('clamps to 1 when overspent and treats no balance as exhausted', () => {
    expect(prepaidPressure(1200, 1000)).toBe(1)
    expect(prepaidPressure(0, 0)).toBe(1)
  })
})

describe('nextResetAt', () => {
  const cap: WindowCap = { label: '5h', seconds: WINDOW.fiveHour, cap: 100 }

  it('returns oldest-in-window + window when at cap', () => {
    // 100 units exactly at cap; oldest in-window event at 08:00 → reset 13:00.
    const events = [evt('2026-06-21T08:00:00.000Z', 60), evt('2026-06-21T09:00:00.000Z', 40)]
    expect(nextResetAt(events, cap, NOW)).toBe('2026-06-21T13:00:00.000Z')
  })

  it('returns null when under cap', () => {
    expect(nextResetAt([evt('2026-06-21T09:00:00.000Z', 50)], cap, NOW)).toBeNull()
  })
})
