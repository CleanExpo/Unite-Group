import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import PrivacyPolicyPage from '../privacy-policy/page'
import TermsOfServicePage from '../terms-of-service/page'

// Both pages sit on a light paper background (#fffdf7). From 22/06/2026 (#390) until this test,
// their text stayed white, so the published privacy policy and terms were unreadable.
// Every inline text colour must parse as a colour and reach WCAG AA (4.5:1) on both backgrounds
// the pages use: the paper (#fffdf7) and the header band (#fff7ec). Anything the parser cannot
// read (a keyword such as `white`, hsl(), a variable) fails closed.
const PAPER: [number, number, number] = [255, 253, 247]
const HEADER: [number, number, number] = [255, 247, 236]

function parseColour(value: string): [number, number, number, number] | null {
  const v = value.trim().toLowerCase()
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/.exec(v)
  if (hex) {
    const h = hex[1].length === 3 ? hex[1].replace(/./g, (c) => c + c) : hex[1]
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), 1]
  }
  const rgb = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)$/.exec(v)
  if (rgb) return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3]), rgb[4] === undefined ? 1 : Number(rgb[4])]
  return null
}

function luminance([r, g, b]: number[]): number {
  const lin = (c: number) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

function contrastOn(value: string, bg: [number, number, number]): number | null {
  const c = parseColour(value)
  if (!c) return null
  const [r, g, b, a] = c
  const mixed = [r, g, b].map((ch, i) => ch * a + bg[i] * (1 - a))
  const [hi, lo] = [luminance(bg), luminance(mixed)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

// Worst case over the two backgrounds the legal pages actually use.
function contrastOnPaper(value: string): number | null {
  const onPaper = contrastOn(value, PAPER)
  const onHeader = contrastOn(value, HEADER)
  return onPaper === null || onHeader === null ? null : Math.min(onPaper, onHeader)
}

function textColours(html: string): string[] {
  return [...html.matchAll(/style="([^"]*)"/g)].flatMap((m) =>
    [...m[1].matchAll(/(?:^|;)\s*color:\s*([^;]+)/gi)].map((c) => c[1].replace(/&#x27;|&quot;/g, '')),
  )
}

describe('contrastOnPaper', () => {
  it.each(['white', '#fff', '#ffffff', 'rgba(255,255,255,0.88)', 'hsl(0, 0%, 100%)', 'var(--x)'])(
    'fails %s',
    (v) => {
      expect((contrastOnPaper(v) ?? 0) >= 4.5).toBe(false)
    },
  )

  it('fails a grey that passes on the paper but not on the header band', () => {
    expect(contrastOn('#757575', PAPER)!).toBeGreaterThanOrEqual(4.5)
    expect(contrastOnPaper('#757575')!).toBeLessThan(4.5)
  })

  it('passes dark stone ink', () => {
    expect(contrastOnPaper('#1c1917')!).toBeGreaterThan(15)
  })
})

describe.each([
  ['privacy policy', PrivacyPolicyPage],
  ['terms of service', TermsOfServicePage],
])('%s', (_name, Page) => {
  const html = renderToStaticMarkup(createElement(Page))

  it('renders on the light paper background', () => {
    expect(html).toMatch(/background:\s*#fffdf7/i)
  })

  it('has every inline text colour readable on the paper (WCAG AA)', () => {
    const colours = textColours(html)
    expect(colours.length).toBeGreaterThan(5)
    expect(colours.filter((c) => (contrastOnPaper(c) ?? 0) < 4.5)).toEqual([])
  })
})

describe('privacy policy covers website enquiries (/grow)', () => {
  const text = renderToStaticMarkup(createElement(PrivacyPolicyPage))
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x27;|&#8217;/g, "'")
    .replace(/\s+/g, ' ')

  it('names what /grow collects, the consent rule, and how to opt out or delete', () => {
    expect(text).toContain('10. Website Enquiries and Free Audits')
    expect(text).toContain('https://unite-group.in/grow')
    expect(text).toMatch(/name, email address, and optionally your phone number/)
    expect(text).toContain('Your enquiry records whether you ticked the box agreeing to receive marketing email.')
    expect(text).toContain('To ask us not to send you marketing email, email')
    expect(text).toMatch(/ask to see, correct or delete your information/)
    expect(text).toContain('12. Contact Us')
  })
})
