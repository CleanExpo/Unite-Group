import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { buttonVariants } from '../button'

// The primary label sits on --color-accent-10 (and -20 on hover) over the light surfaces.
// Read the real token values from globals.css and compute WCAG contrast, so a token change
// that drops the label under AA (4.5:1 for normal-size text) fails here.
const css = readFileSync(join(__dirname, '../../../app/globals.css'), 'utf8')

function token(name: string): string {
  const match = css.match(new RegExp(`${name}:\\s*([^;]+);`))
  if (!match) throw new Error(`token ${name} not found in globals.css`)
  return match[1].trim()
}

function hex(value: string): number[] {
  const m = value.match(/^#([0-9a-f]{6})$/i)
  if (!m) throw new Error(`expected #rrggbb, got ${value}`)
  return [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16))
}

function rgba(value: string): { rgb: number[]; alpha: number } {
  const m = value.match(/^rgba\(\s*(\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\s*\)$/)
  if (!m) throw new Error(`expected rgba(), got ${value}`)
  return { rgb: [Number(m[1]), Number(m[2]), Number(m[3])], alpha: Number(m[4]) }
}

function luminance(rgb: number[]): number {
  const [r, g, b] = rgb.map((v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrast(a: number[], b: number[]): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

function over(fill: { rgb: number[]; alpha: number }, base: number[]): number[] {
  return fill.rgb.map((v, i) => v * fill.alpha + base[i] * (1 - fill.alpha))
}

describe('Button primary variant', () => {
  it('labels with the on-tint token, not the near-white shadcn accent or the overridable accent text', () => {
    const cls = buttonVariants({ variant: 'primary' }).split(/\s+/)
    expect(cls).toContain('text-(--color-accent-on-tint)')
    expect(cls).not.toContain('text-accent')
    expect(cls).not.toContain('text-(--color-accent-text)')
    expect(cls).toContain('bg-(--color-accent-10)')
    expect(cls).toContain('hover:bg-(--color-accent-20)')
  })

  it('keeps the label at or above 4.5:1 on the fill and hover fill over every light surface', () => {
    const label = hex(token('--color-accent-on-tint'))
    const fills = [rgba(token('--color-accent-10')), rgba(token('--color-accent-20'))]
    const surfaces = ['--surface-canvas', '--surface-card', '--surface-overlay'].map((s) => hex(token(s)))
    for (const fill of fills) {
      for (const surface of surfaces) {
        expect(contrast(label, over(fill, surface))).toBeGreaterThanOrEqual(4.5)
      }
    }
  })
})
