import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import postcss from 'postcss'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import PrivacyPolicyPage from '../privacy-policy/page'
import TermsOfServicePage from '../terms-of-service/page'

// From 22/06/2026 (#390) until UNI-2980 (#1207), the privacy policy and terms had white text on a light
// paper background, so the published pages were unreadable. The rule: every text colour reaches WCAG AA
// (4.5:1) on the background behind it. Anything the parser cannot read (a keyword such as `white`, hsl(),
// an unknown variable) fails closed.
// Since 076b0a91 both pages render through the shared legal shell in its 'site' tone: the dark site canvas,
// coloured by components/public/legal/legal-shell.module.css with tokens from styles/public-tokens.css. The
// section component (legal-document.module.css) still sets dark ink, so any text the shell's light-ink
// rules do not reach would be dark on dark: the third test below checks that none exists.
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

const PUBLIC = join(__dirname, '..', '..', 'components', 'public')
const TOKENS = new Map<string, string>()
postcss.parse(readFileSync(join(__dirname, '..', '..', 'styles', 'public-tokens.css'), 'utf8')).walkRules(':root', (rule) =>
  rule.walkDecls(/^--/, (d) => void TOKENS.set(d.prop, d.value.trim())),
)
const token = (value: string) => value.trim().replace(/^var\((--[\w-]+)\)$/, (whole, name: string) => TOKENS.get(name) ?? whole)
const rgb = (value: string): [number, number, number] => {
  const c = parseColour(token(value))
  if (!c || c[3] !== 1) throw new Error(`background ${value} is not an opaque colour`)
  return [c[0], c[1], c[2]]
}

const SHELL = postcss.parse(readFileSync(join(PUBLIC, 'legal', 'legal-shell.module.css'), 'utf8'))
const declared = (selector: string, prop: string) => {
  let value: string | undefined
  SHELL.walkRules((rule) => {
    if (rule.selectors.includes(selector)) rule.walkDecls(prop, (d) => void (value = d.value.trim()))
  })
  return value
}
// The site tone's text sits on the canvas; table headers sit on the surface. Check every colour on both.
const CANVAS = rgb('var(--pub-canvas)')
const SURFACE = rgb('var(--pub-surface)')
// Text rules of the site tone: the reading column (.proseSite) and the hero chrome above it.
const CHROME = ['.root', '.heroBandSite', '.rootSite .title', '.crumbs', '.crumbs a', '.crumbs a:hover', '.eyebrow', '.meta', '.related a', '.related a:hover']
// The one exclusion: the breadcrumb separator glyph is decoration (--pub-line-strong is a line token, never text).
const DECORATION = ['.crumbs li + li::before']
const siteColours = () => {
  const out: Array<[string, string]> = []
  SHELL.walkRules((rule) => {
    const site = rule.selectors.filter((s) => (s.startsWith('.proseSite') || CHROME.includes(s)) && !DECORATION.includes(s))
    if (site.length) rule.walkDecls('color', (d) => void out.push([site.join(', '), d.value.trim()]))
  })
  return out
}
// Elements whose text the shell colours: `.proseSite :global(section <tag>)` and `.proseSite :global(<tag>)`
// rules that set a colour.
const lightInkTags = () => {
  const tags = new Set<string>()
  SHELL.walkRules((rule) => {
    let colours = false
    rule.walkDecls('color', () => void (colours = true))
    if (!colours) return
    for (const s of rule.selectors) {
      const m = /^\.proseSite :global\((?:section )?([a-z0-9]+)\)$/.exec(s)
      if (m) tags.add(m[1])
    }
  })
  return [...tags]
}

describe.each([
  ['privacy policy', PrivacyPolicyPage],
  ['terms of service', TermsOfServicePage],
])('%s', (_name, Page) => {
  const html = renderToStaticMarkup(createElement(Page))

  it('renders the site tone of the legal shell, on the dark canvas', () => {
    expect(html).toMatch(/<main[^>]*class="[^"]*rootSite/)
    expect(html).toMatch(/<div class="[^"]*proseSite/)
    expect(declared('.rootSite', 'background')).toBe('var(--pub-canvas)')
    expect(declared('.docWrapSite', 'background')).toBe('var(--pub-canvas)')
  })

  it('has every text colour of the site tone readable on the canvas and the table surface (WCAG AA)', () => {
    const colours = siteColours()
    expect(colours.length).toBeGreaterThan(10)
    const weak = colours.filter(([, c]) => Math.min(contrastOn(token(c), CANVAS) ?? 0, contrastOn(token(c), SURFACE) ?? 0) < 4.5)
    expect(weak).toEqual([])
  })

  it('has no section text outside the elements the light-ink rules colour', () => {
    const tags = lightInkTags()
    expect(tags).toEqual(expect.arrayContaining(['p', 'li', 'h2']))
    const doc = new DOMParser().parseFromString(html, 'text/html')
    const prose = doc.querySelector('[class*="proseSite"]')
    expect(prose, 'proseSite container').not.toBeNull()
    const walker = doc.createTreeWalker(prose!, NodeFilter.SHOW_TEXT)
    let text = 0
    const bare: string[] = []
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (!n.textContent?.trim()) continue
      text++
      if (!n.parentElement?.closest(tags.join(','))) bare.push(n.textContent.trim().slice(0, 60))
    }
    expect(text).toBeGreaterThan(50)
    expect(bare).toEqual([])
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
    expect(text).toContain('We send you marketing emails only if you tick the marketing box.')
    expect(text).toMatch(/ask to see, correct or delete your information/)
    expect(text).toContain('12. Contact Us')
  })
})
