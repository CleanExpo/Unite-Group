import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { RUN_WINDOW, RepoHealthBar, computeRunSegments } from './RepoHealthBar'

const read = (failCountLast10: number) => ({ failCountLast10, latestRunAt: '2026-07-05T02:00:00Z' })

describe('computeRunSegments', () => {
  it('sizes segments in proportion to the counts and sums them to 100%', () => {
    const g = computeRunSegments(read(3))
    expect(g).not.toBeNull()
    expect(g!.total).toBe(RUN_WINDOW)
    expect(g!.segments.map((s) => [s.key, s.count, s.pct])).toEqual([
      ['failed', 3, 30],
      ['notFailed', 7, 70],
    ])
    expect(g!.segments.reduce((sum, s) => sum + s.pct, 0)).toBe(100)
  })

  it('still sums to exactly 100% when the split does not divide evenly', () => {
    const g = computeRunSegments(read(1), 3)
    expect(g!.segments.map((s) => s.pct)).toEqual([33.33, 66.67])
    expect(g!.segments.reduce((sum, s) => sum + s.pct, 0)).toBeCloseTo(100, 10)
  })

  it('omits a zero-count segment instead of drawing a zero-width sliver', () => {
    expect(computeRunSegments(read(0))!.segments.map((s) => [s.key, s.pct])).toEqual([['notFailed', 100]])
    expect(computeRunSegments(read(10))!.segments.map((s) => [s.key, s.pct])).toEqual([['failed', 100]])
  })

  it('returns no bar when the counts are unknown', () => {
    // Read failed — the lib zero-fills failCountLast10, which is not a real zero.
    expect(computeRunSegments({ ...read(0), error: 'github_http_500' })).toBeNull()
    // No runs at all — the tile says "no runs", a 0-of-10 bar would contradict it.
    expect(computeRunSegments({ failCountLast10: 0, latestRunAt: null })).toBeNull()
    // Malformed counts from the wire.
    expect(computeRunSegments(read(Number.NaN))).toBeNull()
    expect(computeRunSegments(read(-1))).toBeNull()
    expect(computeRunSegments(read(11))).toBeNull()
    expect(computeRunSegments({ latestRunAt: '2026-07-05T02:00:00Z' } as never)).toBeNull()
  })
})

describe('RepoHealthBar', () => {
  it('draws one span per non-zero segment with proportional widths and the total as a number', () => {
    render(<RepoHealthBar repo="Synthex" health={read(3)} />)
    const bar = screen.getByTestId('portfolio-bar-Synthex')
    expect(bar).toHaveAttribute('aria-label', '3 of the last 10 runs failed')
    expect(screen.getByTestId('portfolio-bar-Synthex-failed').style.width).toBe('30%')
    expect(screen.getByTestId('portfolio-bar-Synthex-notFailed').style.width).toBe('70%')
    expect(screen.getByTestId('portfolio-bar-Synthex-total')).toHaveTextContent('10')
  })

  it('renders nothing for an unreadable repo', () => {
    const { container } = render(<RepoHealthBar repo="Nexus" health={{ ...read(0), error: 'boom' }} />)
    expect(container).toBeEmptyDOMElement()
  })
})
