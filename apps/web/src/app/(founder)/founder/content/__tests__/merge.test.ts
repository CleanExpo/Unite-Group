import { describe, it, expect } from 'vitest'

import { mergeNewestFirst, parseSourceFilter } from '../merge'

describe('parseSourceFilter', () => {
  it('accepts the three known source filters', () => {
    expect(parseSourceFilter('wiki')).toBe('wiki')
    expect(parseSourceFilter('pages')).toBe('pages')
    expect(parseSourceFilter('drafts')).toBe('drafts')
  })

  it('falls back to all for unknown or missing values', () => {
    expect(parseSourceFilter(undefined)).toBe('all')
    expect(parseSourceFilter('')).toBe('all')
    expect(parseSourceFilter('bogus')).toBe('all')
    expect(parseSourceFilter('WIKI')).toBe('all')
  })
})

describe('mergeNewestFirst', () => {
  it('merges multiple lists newest-first', () => {
    const a = [
      { id: 'a1', timestamp: '2026-07-01T00:00:00Z' },
      { id: 'a2', timestamp: '2026-07-10T00:00:00Z' },
    ]
    const b = [{ id: 'b1', timestamp: '2026-07-05T00:00:00Z' }]

    expect(mergeNewestFirst(a, b).map((i) => i.id)).toEqual(['a2', 'b1', 'a1'])
  })

  it('sinks null and unparseable timestamps to the end', () => {
    const items = [
      { id: 'none', timestamp: null },
      { id: 'new', timestamp: '2026-07-10T00:00:00Z' },
      { id: 'junk', timestamp: 'not-a-date' },
      { id: 'old', timestamp: '2026-01-01T00:00:00Z' },
    ]

    const merged = mergeNewestFirst(items).map((i) => i.id)
    expect(merged.slice(0, 2)).toEqual(['new', 'old'])
    expect(merged.slice(2).sort()).toEqual(['junk', 'none'])
  })

  it('handles empty input', () => {
    expect(mergeNewestFirst()).toEqual([])
    expect(mergeNewestFirst([], [])).toEqual([])
  })
})
