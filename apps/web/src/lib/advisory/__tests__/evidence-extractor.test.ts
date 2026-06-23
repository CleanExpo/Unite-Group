// src/lib/advisory/__tests__/evidence-extractor.test.ts
import { describe, it, expect } from 'vitest'

import {
  isValidCitationFormat,
  inferCitationType,
  extractCitations,
} from '../evidence-extractor'
import type { Citation } from '../types'

function makeCitation(overrides: Partial<Citation> = {}): Citation {
  return {
    type: 'ato_ruling',
    reference: 'TR 93/30',
    title: 'Deductions for home office expenses',
    relevance: 'Supports the home-office apportionment.',
    ...overrides,
  }
}

describe('isValidCitationFormat', () => {
  it.each([
    'TR 93/30',
    'TR2021/1',
    'PCG 2021/4',
    'TD 2024/3',
    'S.8-1',
    'S.328-180',
    'Div 7A',
    'Div 328',
    'Div 100-152',
    'Part IVA',
    'ITAA 1997',
    'ITAA 1936',
    'GST Act 1999',
    'FBT Act 1986',
    'PS LA 2005/24',
    'STP Phase 2',
    'TPAR',
  ])('accepts known ATO reference %s', (ref) => {
    expect(isValidCitationFormat(ref)).toBe(true)
  })

  it('trims surrounding whitespace before matching', () => {
    expect(isValidCitationFormat('  TR 93/30  ')).toBe(true)
  })

  it.each(['', 'random text', 'Section 8', 'TR', '99 problems', 'Div'])(
    'rejects unrecognised reference %s',
    (ref) => {
      expect(isValidCitationFormat(ref)).toBe(false)
    }
  )
})

describe('inferCitationType', () => {
  it.each([
    ['TR 93/30', 'ato_ruling'],
    ['TD 2024/3', 'ato_ruling'],
    ['S.8-1', 'legislation'],
    ['Div 7A', 'legislation'],
    ['Part IVA', 'legislation'],
    ['ITAA 1997', 'legislation'],
    ['PCG 2021/4', 'ato_guidance'],
    ['PS LA 2005/24', 'ato_guidance'],
    ['TPAR', 'ato_guidance'],
  ] as const)('infers %s as %s', (ref, expected) => {
    expect(inferCitationType(ref)).toBe(expected)
  })

  it('returns null for an unrecognised reference', () => {
    expect(inferCitationType('not a citation')).toBeNull()
  })
})

describe('extractCitations', () => {
  it('maps citation fields onto an evidence row and scopes founder_id', () => {
    const [row] = extractCitations('prop-1', 'case-1', 'founder-1', [makeCitation()])

    expect(row).toMatchObject({
      proposal_id: 'prop-1',
      case_id: 'case-1',
      founder_id: 'founder-1',
      reference_id: 'TR 93/30',
      reference_title: 'Deductions for home office expenses',
      excerpt: 'Supports the home-office apportionment.',
    })
  })

  it('scores a valid citation 1.0 and an unrecognised one 0.5', () => {
    const rows = extractCitations('p', 'c', 'f', [
      makeCitation({ reference: 'TR 93/30' }),
      makeCitation({ reference: 'made up ref' }),
    ])
    expect(rows[0].relevance_score).toBe(1.0)
    expect(rows[1].relevance_score).toBe(0.5)
  })

  it('overrides the provided type with the inferred type when the format is known', () => {
    // Provided type is wrong (legislation) for a TR ruling → inferred wins.
    const [row] = extractCitations('p', 'c', 'f', [
      makeCitation({ reference: 'TR 93/30', type: 'legislation' }),
    ])
    expect(row.citation_type).toBe('ato_ruling')
  })

  it('falls back to the provided type when the format is unrecognised', () => {
    const [row] = extractCitations('p', 'c', 'f', [
      makeCitation({ reference: 'unknown', type: 'industry_standard' }),
    ])
    expect(row.citation_type).toBe('industry_standard')
  })

  it('builds a docid URL for tax rulings with whitespace stripped from the identifier', () => {
    const [row] = extractCitations('p', 'c', 'f', [makeCitation({ reference: 'TR 93/30' })])
    expect(row.url).toContain('ato.gov.au/law/view/document?docid=')
    // ATO docids carry no internal space: "TR 93/30" → "TR93/30" (no %20).
    expect(row.url).toContain(`docid=${encodeURIComponent('TR93/30')}`)
    expect(row.url).not.toContain('%20')
  })

  it('normalises internal whitespace in tax-ruling docids regardless of spacing', () => {
    const [spaced] = extractCitations('p', 'c', 'f', [makeCitation({ reference: 'TR  2024/1' })])
    const [tight] = extractCitations('p', 'c', 'f', [makeCitation({ reference: 'TR2024/1' })])
    expect(spaced.url).toBe(tight.url)
    expect(spaced.url).toContain(`docid=${encodeURIComponent('TR2024/1')}`)
  })

  it('builds a law-search URL for legislation references', () => {
    const [row] = extractCitations('p', 'c', 'f', [makeCitation({ reference: 'Div 7A' })])
    expect(row.url).toContain('ato.gov.au/law/view/search?q=')
  })

  it('returns a null URL for references with no constructable link', () => {
    const [row] = extractCitations('p', 'c', 'f', [makeCitation({ reference: 'TPAR' })])
    expect(row.url).toBeNull()
  })

  it('returns an empty array for no citations', () => {
    expect(extractCitations('p', 'c', 'f', [])).toEqual([])
  })
})
