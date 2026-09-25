import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { TrendAreaChart, computeTrendGeometry, CHART } from './TrendAreaChart'

const trend = [
  { date: '2026-09-18', netCents: 0 },
  { date: '2026-09-19', netCents: 50_000 },
  { date: '2026-09-20', netCents: 120_000 },
  { date: '2026-09-21', netCents: 0 },
  { date: '2026-09-22', netCents: 80_000 },
  { date: '2026-09-23', netCents: 30_000 },
  { date: '2026-09-24', netCents: 90_000 },
]

// Declarations for each selector inside the reduced-motion media block of the chart's own <style>.
// jsdom does not apply media queries, so the rules are read from the rendered stylesheet text.
function reducedMotionRules(styleText: string): Record<string, Record<string, string>> {
  const start = styleText.indexOf('@media (prefers-reduced-motion: reduce)')
  if (start < 0) return {}
  const open = styleText.indexOf('{', start)
  let depth = 0
  let end = open
  for (; end < styleText.length; end++) {
    if (styleText[end] === '{') depth++
    else if (styleText[end] === '}' && --depth === 0) break
  }
  const rules: Record<string, Record<string, string>> = {}
  for (const [, selector, body] of styleText.slice(open + 1, end).matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    rules[selector.trim()] = Object.fromEntries(
      body.split(';').filter((d) => d.includes(':')).map((d) => {
        const i = d.indexOf(':')
        return [d.slice(0, i).trim(), d.slice(i + 1).trim()]
      }),
    )
  }
  return rules
}

describe('computeTrendGeometry', () => {
  it('returns one point per data point, higher values drawn higher, x spread plot-left to plot-right', () => {
    const g = computeTrendGeometry(trend)!
    expect(g.points).toHaveLength(trend.length)
    expect(g.points[0].x).toBe(CHART.plotLeft)
    expect(g.points[trend.length - 1].x).toBe(CHART.width - CHART.plotRight)
    // SVG y grows downward: the $1,200 day sits above the $0 day
    expect(g.points[2].y).toBeLessThan(g.points[0].y)
    // $0 lands on the baseline
    expect(g.points[0].y).toBe(g.scaleY(0))
    expect(g.scaleY(0)).toBe(CHART.height - CHART.plotBottom)
  })

  it('the latest-point dot sits at the last value, on the same scale as the ticks', () => {
    const g = computeTrendGeometry(trend)!
    expect(g.latest).toEqual(g.points[g.points.length - 1])
    expect(g.latest.y).toBe(g.scaleY(90_000))
    const top = g.ticks[g.ticks.length - 1]
    expect(top.cents).toBeGreaterThanOrEqual(120_000)
    expect(top.y).toBe(g.scaleY(top.cents))
    expect(top.y).toBe(CHART.plotTop)
    expect(g.linePath.split('L')).toHaveLength(trend.length)
  })

  it('returns null for an empty trend or one with no cleared funds — no flat line', () => {
    expect(computeTrendGeometry([])).toBeNull()
    expect(computeTrendGeometry(trend.map((d) => ({ ...d, netCents: 0 })))).toBeNull()
  })
})

describe('TrendAreaChart', () => {
  it('renders the line, area, gradient, AUD tick labels and a latest dot', () => {
    const { container } = render(<TrendAreaChart trend={trend} id="t1" />)
    expect(container.querySelector('[data-testid="revenue-trend-line"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="revenue-trend-area"]')?.getAttribute('fill')).toBe('url(#t1-fill)')
    expect(container.querySelector('linearGradient#t1-fill')).not.toBeNull()
    const dot = container.querySelector('[data-testid="revenue-trend-latest"]')!
    const g = computeTrendGeometry(trend)!
    expect(Number(dot.getAttribute('cx'))).toBe(g.latest.x)
    expect(Number(dot.getAttribute('cy'))).toBe(g.latest.y)
    expect(container.textContent).toMatch(/\$0/)
    expect(container.textContent).toMatch(/\$1,500/) // nice ceiling above $1,200
  })

  it('reduced motion stops both animations and shows the finished chart', () => {
    const { container } = render(<TrendAreaChart trend={trend} id="t3" />)
    const rules = reducedMotionRules(container.querySelector('style')?.textContent ?? '')
    expect(rules['.rt-line']).toMatchObject({ animation: 'none', 'stroke-dashoffset': '0' })
    expect(rules['.rt-fade']).toMatchObject({ animation: 'none', opacity: '1' })
    // Both animated classes are in use, so the rules above govern real elements
    expect(container.querySelector('.rt-line')).not.toBeNull()
    expect(container.querySelectorAll('.rt-fade').length).toBeGreaterThan(0)
  })

  it('renders no chart path and an honest line when there is nothing to chart', () => {
    const { container } = render(<TrendAreaChart trend={[]} id="t2" />)
    expect(container.querySelector('path')).toBeNull()
    expect(container.textContent).toMatch(/No cleared funds in the last 7 days \(read OK\)/)
  })
})
