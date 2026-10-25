import { afterEach, describe, expect, it, vi } from 'vitest'

import sitemap from '../sitemap'

const byPath = () => new Map(sitemap().map((e) => [new URL(e.url).pathname, e]))

afterEach(() => vi.useRealTimers())

describe('sitemap lastmod and priority (D28)', () => {
  it('gives every entry a valid YYYY-MM-DD lastModified that is not in the future', () => {
    const today = new Date().toISOString().slice(0, 10)
    for (const e of sitemap()) {
      expect(typeof e.lastModified, e.url).toBe('string')
      const d = e.lastModified as string
      expect(d, e.url).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(new Date(`${d}T00:00:00Z`).toISOString().slice(0, 10), e.url).toBe(d)
      expect(d <= today, e.url).toBe(true)
    }
  })

  it('is fixed in code: moving the clock changes nothing', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-25T00:00:00Z'))
    const first = sitemap().map((e) => e.lastModified)
    vi.setSystemTime(new Date('2027-03-01T12:00:00Z'))
    const second = sitemap().map((e) => e.lastModified)
    expect(second).toEqual(first)
    expect(first.every((d) => d !== undefined && d !== '2027-03-01')).toBe(true)
  })

  it('is fixed in code even when the module is first loaded under a moved clock', async () => {
    // A date computed once at module load (new Date().toISOString().slice(0, 10)) would pass the test above,
    // because the module was imported before the clock moved. Import it afresh under a fake clock.
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2031-01-02T12:00:00Z'))
    vi.resetModules()
    const { default: fresh } = await import('../sitemap')
    for (const e of fresh()) expect(e.lastModified, e.url).not.toBe('2031-01-02')
  })

  it('pins the order page to the date its rendered module last changed (page.tsx only wraps order-view.tsx)', () => {
    expect(byPath().get('/cards/order')!.lastModified).toBe('2026-10-25')
  })

  it('uses the agreed priority per path and makes / the unique maximum', () => {
    const m = byPath()
    const expected: Record<string, number> = {
      '/': 1,
      '/cards': 0.9,
      '/cards/order': 0.8,
      '/solutions/conversion': 0.7,
      '/solutions/visibility': 0.6,
      '/solutions/experience': 0.6,
      '/solutions/intelligence': 0.6,
      '/cards/terms': 0.3,
      '/privacy-policy': 0.2,
      '/terms-of-service': 0.2,
    }
    expect([...m.keys()].sort()).toEqual(Object.keys(expected).sort())
    for (const [p, pri] of Object.entries(expected)) expect(m.get(p)!.priority, p).toBe(pri)
    const max = Math.max(...[...m.values()].map((e) => e.priority ?? 0))
    expect([...m.values()].filter((e) => e.priority === max).map((e) => new URL(e.url).pathname)).toEqual(['/'])
  })
})
