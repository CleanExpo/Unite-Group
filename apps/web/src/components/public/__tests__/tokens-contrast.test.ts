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
] as const

describe('public tokens: text and button pairs are at least 4.5:1', () => {
  it('keeps the copper accent at 5.18:1 on white', () => {
    expect(token('accent')).toBe('#c2410c')
    expect(ratio(token('accent'), token('bg'))).toBeGreaterThan(5.1)
  })
  it.each(PAIRS)('%s on %s', (fg, bg) => {
    expect(ratio(token(fg), token(bg)), `${fg} on ${bg}`).toBeGreaterThanOrEqual(4.5)
  })
})
