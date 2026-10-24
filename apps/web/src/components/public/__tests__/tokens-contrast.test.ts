import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const css = readFileSync(join(__dirname, '..', '..', '..', 'styles', 'public-tokens.css'), 'utf8')
const token = (name: string) => {
  const m = new RegExp(`--pub-${name}:\\s*(#[0-9a-fA-F]{6})`).exec(css)
  if (!m) throw new Error(`token --pub-${name} missing`)
  return m[1]
}

function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const ratio = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

// [text token, background token]: every pair the public components actually use.
const PAIRS = [
  ['ink', 'bg'], ['ink', 'bg-alt'], ['ink-soft', 'bg'], ['ink-soft', 'bg-alt'], ['muted', 'bg'], ['muted', 'bg-alt'],
  ['accent', 'bg'], ['accent', 'bg-alt'], ['accent-strong', 'bg'], ['accent-strong', 'bg-alt'], ['accent-strong', 'accent-soft'],
  ['accent-ink', 'accent'], ['accent-ink', 'accent-strong'], ['danger', 'bg'], ['bg', 'ink'],
  // Mode A, warm white (spec 10.5): the page canvas sits behind the white cards
  ['ink', 'canvas'], ['ink-soft', 'canvas'], ['muted', 'canvas'], ['accent', 'canvas'], ['accent-strong', 'canvas'], ['focus', 'canvas'],
  // Mode B, the dark hero band: light text, and the sampled copper as text and as a button face
  ['night-ink', 'night'], ['night-soft', 'night'], ['highlight', 'night'], ['night', 'highlight'],
] as const

describe('public tokens: text and button pairs are at least 4.5:1', () => {
  // Phill 25/10/2026: the copper is the one sampled from the Unite-Group Nexus logo file, not the earlier brown-orange.
  it('uses the copper sampled from the logo as --highlight, and a darker shade of it for text on light', () => {
    expect(token('highlight')).toBe('#ec7b41')
    expect(ratio(token('accent'), token('bg'))).toBeGreaterThanOrEqual(4.5)
    expect(token('accent')).not.toBe('#c2410c')
    const hue = (hex: string) => {
      const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b)
      return mx === r ? (((g - b) / (mx - mn)) * 60 + 360) % 360 : 0
    }
    expect(Math.abs(hue(token('accent')) - hue(token('highlight')))).toBeLessThan(8)
  })
  it('uses the spec 10.5 warm-white canvas', () => {
    expect(token('canvas')).toBe('#f6f7f4')
    expect(token('ink')).toBe('#17242b')
  })
  it.each(PAIRS)('%s on %s', (fg, bg) => {
    expect(ratio(token(fg), token(bg)), `${fg} on ${bg}`).toBeGreaterThanOrEqual(4.5)
  })
})
