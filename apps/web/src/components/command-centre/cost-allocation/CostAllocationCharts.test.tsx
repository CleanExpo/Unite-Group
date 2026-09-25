import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import {
  CostSplitDonut,
  MonthOnMonthBars,
  DONUT,
  BARS,
  computeDonutGeometry,
  computeMonthOnMonthGeometry,
} from './CostAllocationCharts'

const sources = [
  { id: 'a', name: 'Anthropic', amount_aud: 300 },
  { id: 'b', name: 'Vercel', amount_aud: 100 },
  { id: 'c', name: 'Supabase', amount_aud: 0 },
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

describe('computeDonutGeometry', () => {
  it('draws one slice per spending source, each proportional to its amount', () => {
    const g = computeDonutGeometry(sources, 500)!
    expect(g.slices.map((s) => s.id)).toEqual(['a', 'b'])
    // 300 : 100 on one circumference — slice a is three times slice b
    expect(g.slices[0].length).toBeCloseTo(DONUT.circumference * 0.75, 1)
    expect(g.slices[1].length).toBeCloseTo(DONUT.circumference * 0.25, 1)
    const total = g.slices.reduce((acc, s) => acc + s.length, 0)
    expect(total).toBeCloseTo(DONUT.circumference, 1)
    // slice b starts where slice a ends
    expect(g.slices[1].offset).toBeCloseTo(g.slices[0].length, 1)
    expect(g.slices[0].share).toBeCloseTo(0.75, 5)
  })

  it('a single source fills the whole ring', () => {
    const g = computeDonutGeometry([{ id: 'a', name: 'A', amount_aud: 42 }], 10)!
    expect(g.slices).toHaveLength(1)
    expect(g.slices[0].length).toBeCloseTo(DONUT.circumference, 1)
  })

  it('a loss (net < 0) keeps its true sign and takes the alarm colour', () => {
    const g = computeDonutGeometry(sources, -123.4)!
    expect(g.net.label).toMatch(/^-\$123\.40$/)
    expect(g.net.colour).toContain('--deck-abort-text')
    const ok = computeDonutGeometry(sources, 50)!
    expect(ok.net.label).toBe('$50.00')
    expect(ok.net.colour).not.toContain('--deck-abort')
  })

  it('returns null — no ring — for unknown, negative or all-zero figures', () => {
    expect(computeDonutGeometry(sources, Number.NaN)).toBeNull()
    expect(computeDonutGeometry(sources, undefined as unknown as number)).toBeNull()
    expect(computeDonutGeometry([], 10)).toBeNull()
    expect(computeDonutGeometry([{ id: 'z', name: 'Z', amount_aud: 0 }], 10)).toBeNull()
    expect(computeDonutGeometry([{ id: 'x', name: 'X', amount_aud: null as unknown as number }], 10)).toBeNull()
    expect(computeDonutGeometry([{ id: 'x', name: 'X', amount_aud: -5 }, ...sources], 10)).toBeNull()
  })
})

describe('computeMonthOnMonthGeometry', () => {
  it('draws both months on ONE scale — twice the cost is twice the bar', () => {
    const g = computeMonthOnMonthGeometry(200, 100)!
    expect(g.current.width).toBeCloseTo(2 * g.prior.width, 5)
    expect(g.current.width).toBe(g.scaleX(200))
    expect(g.prior.width).toBe(g.scaleX(100))
    // the scale ceiling is at or above the larger month, and fills the plot
    expect(g.max).toBeGreaterThanOrEqual(200)
    expect(g.scaleX(g.max)).toBe(BARS.plotWidth)
    expect(g.current.label).toBe('$200.00')
    expect(g.prior.label).toBe('$100.00')
  })

  it('a real $0 month draws a zero-width bar beside a non-zero one', () => {
    const g = computeMonthOnMonthGeometry(0, 80)!
    expect(g.current.width).toBe(0)
    expect(g.prior.width).toBeGreaterThan(0)
  })

  it('returns null when either month is unknown or negative, or both are $0', () => {
    expect(computeMonthOnMonthGeometry(100, undefined as unknown as number)).toBeNull()
    expect(computeMonthOnMonthGeometry(Number.NaN, 100)).toBeNull()
    expect(computeMonthOnMonthGeometry(100, -1)).toBeNull()
    expect(computeMonthOnMonthGeometry(0, 0)).toBeNull()
  })
})

describe('CostSplitDonut', () => {
  it('renders one arc per slice with the net figure in the centre', () => {
    const { container } = render(<CostSplitDonut sources={sources} net={-20} />)
    const arcs = container.querySelectorAll('[data-testid^="cost-slice-"]')
    expect(arcs).toHaveLength(2)
    const g = computeDonutGeometry(sources, -20)!
    expect(arcs[0].getAttribute('stroke-dasharray')).toBe(`${g.slices[0].dash} ${g.slices[0].rest}`)
    const centre = container.querySelector('[data-testid="cost-net"]')!
    expect(centre.textContent).toBe('-$20.00')
    expect(centre.getAttribute('fill')).toContain('--deck-abort-text')
  })

  it('reduced motion stops the arc fade and bar growth and shows both finished', () => {
    const { container } = render(
      <>
        <CostSplitDonut sources={sources} net={-20} />
        <MonthOnMonthBars current={1234.5} prior={617.25} />
      </>,
    )
    const rules = reducedMotionRules(container.querySelector('style')?.textContent ?? '')
    expect(rules['.ca-arc']).toMatchObject({ animation: 'none', opacity: '1' })
    expect(rules['.ca-bar']).toMatchObject({ animation: 'none', transform: 'none' })
    // Both animated classes are in use, so the rules above govern real elements
    expect(container.querySelectorAll('.ca-arc').length).toBeGreaterThan(0)
    expect(container.querySelectorAll('.ca-bar').length).toBeGreaterThan(0)
  })

  it('renders nothing for an unknown net', () => {
    const { container } = render(<CostSplitDonut sources={sources} net={Number.NaN} />)
    expect(container.querySelector('svg')).toBeNull()
  })
})

describe('MonthOnMonthBars', () => {
  it('renders two bars with en-AU AUD labels', () => {
    const { container } = render(<MonthOnMonthBars current={1234.5} prior={617.25} />)
    const cur = container.querySelector('[data-testid="mom-current"]')!
    const pri = container.querySelector('[data-testid="mom-prior"]')!
    expect(Number(cur.getAttribute('width'))).toBeCloseTo(2 * Number(pri.getAttribute('width')), 1)
    expect(container.textContent).toContain('$1,234.50')
    expect(container.textContent).toContain('$617.25')
  })

  it('renders nothing when the prior month is unknown', () => {
    const { container } = render(<MonthOnMonthBars current={10} prior={undefined as unknown as number} />)
    expect(container.querySelector('svg')).toBeNull()
  })
})
