import { describe, expect, it } from 'vitest'

import {
  CARDS_AB_EXPERIMENT,
  assignVariant,
  parseVariantLabel,
  srmCheck,
  tagLabel,
} from '../cards-ab'

describe('assignVariant', () => {
  it('is deterministic: the same participant always gets the same arm', () => {
    for (const id of ['a1b2c3d4e5f6a1b2c3d4e5f6', 'zzz', '0']) {
      expect(assignVariant(id)).toBe(assignVariant(id))
    }
  })

  it('splits 50/50 over many random participant ids (sample ratio within 1 percent)', () => {
    let b = 0
    const n = 40_000
    for (let i = 0; i < n; i++) {
      const id = Array.from({ length: 12 }, () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0')).join('')
      if (assignVariant(id) === 'B') b++
    }
    expect(Math.abs(b / n - 0.5)).toBeLessThan(0.01)
  })

  it('splits sequential ids evenly too, so a counter cannot bias an arm', () => {
    let b = 0
    for (let i = 0; i < 20_000; i++) if (assignVariant(String(i)) === 'B') b++
    expect(Math.abs(b / 20_000 - 0.5)).toBeLessThan(0.015)
  })

  it('depends on the experiment key, so a later experiment re-randomises', () => {
    let differ = 0
    for (let i = 0; i < 2_000; i++) if (assignVariant(String(i)) !== assignVariant(String(i), 'other_experiment')) differ++
    expect(differ).toBeGreaterThan(800)
  })
})

describe('tagLabel / parseVariantLabel', () => {
  it('round-trips the experiment and arm and keeps the base label', () => {
    const tagged = tagLabel('cards-hero-get-card', 'B')
    expect(parseVariantLabel(tagged)).toEqual({ base: 'cards-hero-get-card', experiment: CARDS_AB_EXPERIMENT, variant: 'B' })
  })

  it('tags an empty base label (a page view or exposure has none)', () => {
    expect(parseVariantLabel(tagLabel('', 'A'))).toEqual({ base: '', experiment: CARDS_AB_EXPERIMENT, variant: 'A' })
  })

  it('never exceeds the 120 character label limit and never loses the arm', () => {
    const tagged = tagLabel('x'.repeat(300), 'B')
    expect(tagged.length).toBeLessThanOrEqual(120)
    expect(parseVariantLabel(tagged)?.variant).toBe('B')
  })

  it('returns null for an untagged label', () => {
    expect(parseVariantLabel('cards-hero-get-card')).toBeNull()
  })

  it('carries only the experiment key and the arm: no participant id, no PII', () => {
    expect(tagLabel('cta', 'A')).toMatch(/^cta\|x=[a-z0-9_]+\|v=[AB]$/)
  })
})

describe('srmCheck (sample ratio mismatch)', () => {
  it('passes a healthy 50/50 split', () => {
    expect(srmCheck(5_010, 4_990).mismatch).toBe(false)
  })

  it('flags a broken split', () => {
    expect(srmCheck(5_600, 4_400).mismatch).toBe(true)
  })

  it('refuses to judge an empty arm: unknown, not clean', () => {
    expect(srmCheck(0, 0).mismatch).toBeNull()
  })

  it('treats invalid counts as unknown, never as a healthy split', () => {
    for (const [a, b] of [[Number.NaN, 5], [Number.POSITIVE_INFINITY, 5], [1.5, 1], [-3, 4]]) {
      expect(srmCheck(a, b)).toEqual({ chiSquare: null, mismatch: null })
    }
  })
})
