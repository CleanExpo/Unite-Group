import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { GAUGE, gaugeArc, gaugeTone, UsageGauge } from '../UsageGauge'
import { deriveProviderState, NEAR_LIMIT_PRESSURE } from '@/lib/command-centre/provider-usage'

/** Parse the end point of an `M x,y A r r 0 large 1 x,y` arc path. */
function arcParts(path: string) {
  const m = /^M([\d.-]+),([\d.-]+) A([\d.]+) ([\d.]+) 0 ([01]) 1 ([\d.-]+),([\d.-]+)$/.exec(path)
  if (!m) throw new Error(`not an arc path: ${path}`)
  const [, sx, sy, , , large, ex, ey] = m
  return { start: { x: Number(sx), y: Number(sy) }, large: Number(large), end: { x: Number(ex), y: Number(ey) } }
}

// Start of the 270-degree sweep is bottom-left (135deg), end is bottom-right (45deg).
const START = { x: GAUGE.cx - GAUGE.r * Math.SQRT1_2, y: GAUGE.cy + GAUGE.r * Math.SQRT1_2 }
const END = { x: GAUGE.cx + GAUGE.r * Math.SQRT1_2, y: GAUGE.cy + GAUGE.r * Math.SQRT1_2 }

describe('gaugeArc', () => {
  it('track is the full 270-degree arc, bottom-left to bottom-right, large-arc flag set', () => {
    const { trackPath } = gaugeArc(40)
    const t = arcParts(trackPath)
    expect(t.start.x).toBeCloseTo(START.x, 1)
    expect(t.start.y).toBeCloseTo(START.y, 1)
    expect(t.end.x).toBeCloseTo(END.x, 1)
    expect(t.end.y).toBeCloseTo(END.y, 1)
    expect(t.large).toBe(1)
  })

  it('0% draws no value arc (empty track), fraction 0', () => {
    const g = gaugeArc(0)
    expect(g.fraction).toBe(0)
    expect(g.valuePath).toBeNull()
  })

  it('50% ends at the top of the dial (135deg of 270), small-arc flag', () => {
    const g = gaugeArc(50)
    expect(g.fraction).toBe(0.5)
    const v = arcParts(g.valuePath!)
    expect(v.start.x).toBeCloseTo(START.x, 1)
    expect(v.end.x).toBeCloseTo(GAUGE.cx, 1)
    expect(v.end.y).toBeCloseTo(GAUGE.cy - GAUGE.r, 1)
    expect(v.large).toBe(0)
  })

  it('100% value arc equals the track', () => {
    const g = gaugeArc(100)
    expect(g.fraction).toBe(1)
    expect(g.valuePath).toBe(g.trackPath)
  })

  it('above 100% clamps the arc to full', () => {
    const g = gaugeArc(137)
    expect(g.fraction).toBe(1)
    expect(g.valuePath).toBe(g.trackPath)
  })
})

describe('gaugeTone', () => {
  it('maps the library state: near_limit is caution, blocked is alarm, everything else ok', () => {
    expect(gaugeTone('available')).toBe('ok')
    expect(gaugeTone('watching')).toBe('ok')
    expect(gaugeTone('unknown')).toBe('ok')
    expect(gaugeTone('near_limit')).toBe('caution')
    expect(gaugeTone('blocked')).toBe('alarm')
  })
})

describe('gauge tone agrees with the provider state label', () => {
  it('uses the library classification at its real boundaries (0.795 / 0.8 / 0.95)', () => {
    expect(NEAR_LIMIT_PRESSURE).toBe(0.8)
    const justUnder = deriveProviderState({ configured: true, usagePressure: 0.795 })
    expect(justUnder.usagePct).toBe(80) // rounds to 80 for display...
    expect(justUnder.state).toBe('watching') // ...but is not near limit
    expect(gaugeTone(justUnder.state)).toBe('ok')
    const at = deriveProviderState({ configured: true, usagePressure: NEAR_LIMIT_PRESSURE })
    expect(at.state).toBe('near_limit')
    expect(gaugeTone(at.state)).toBe('caution')
    const limit = deriveProviderState({ configured: true, usagePressure: 0.95 })
    expect(limit.state).toBe('blocked')
    expect(gaugeTone(limit.state)).toBe('alarm')
  })
})

describe('UsageGauge', () => {
  it('draws the arc in the fill token for its band and the label in the text token', () => {
    const { rerender } = render(<UsageGauge id="t" label="X" pct={79} state="watching" caption="c" />)
    expect(screen.getByTestId('usage-gauge-value-t').getAttribute('stroke')).toContain('--deck-go')
    rerender(<UsageGauge id="t" label="X" pct={80} state="near_limit" caption="c" />)
    expect(screen.getByTestId('usage-gauge-value-t').getAttribute('stroke')).toContain('--deck-amber')
    expect(screen.getByTestId('usage-gauge-pct-t').getAttribute('fill')).toContain('--deck-amber-text')
    rerender(<UsageGauge id="t" label="X" pct={100} state="blocked" caption="c" />)
    expect(screen.getByTestId('usage-gauge-value-t').getAttribute('stroke')).toContain('--deck-abort')
    expect(screen.getByTestId('usage-gauge-pct-t').getAttribute('fill')).toContain('--deck-abort-text')
  })

  it('above 100 draws a full arc but the centre label keeps the true number', () => {
    render(<UsageGauge id="o" label="Over" pct={137} state="blocked" caption="c" />)
    expect(screen.getByTestId('usage-gauge-pct-o')).toHaveTextContent('137%')
    expect(screen.getByTestId('usage-gauge-value-o').getAttribute('d')).toBe(gaugeArc(100).trackPath)
    expect(screen.getByRole('meter')).toHaveAttribute('aria-valuenow', '137')
  })

  it('shows provider name and caption under the dial', () => {
    render(<UsageGauge id="n" label="Anthropic API" pct={10} state="available" caption="Metered API route · estimated" />)
    expect(screen.getByText('Anthropic API')).toBeInTheDocument()
    expect(screen.getByText('Metered API route · estimated')).toBeInTheDocument()
    expect(screen.getByTestId('usage-gauge-pct-n')).toHaveTextContent('10%')
  })

  it('carries a reduced-motion override for the sweep-in', () => {
    const { container } = render(<UsageGauge id="m" label="M" pct={50} state="watching" caption="c" />)
    const css = container.querySelector('style')?.textContent ?? ''
    expect(css).toMatch(/prefers-reduced-motion: reduce\)\{\.ug-arc\{animation:none/)
  })
})
