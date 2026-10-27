import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('next/navigation', () => ({
  redirect: vi.fn((to: string) => {
    throw new Error(`NEXT_REDIRECT ${to}`)
  }),
}))

import { getUser } from '@/lib/supabase/server'

import RootPage from '../page'

// Phill 25/10/2026: pictures must show the REAL product or the real job, with demo data. Abstract art is rejected.
// The site sweep (defect 10) found the "Four jobs" and "How it works" cards still on the abstract /landing/visuals
// art, with small, low-contrast 01/02/03 labels. These tests hold the fix.

const PUBLIC = join(__dirname, '..', '..', '..', 'public')
const PUB = join(__dirname, '..', '..', 'components', 'public')

const signedOut = async () => {
  vi.mocked(getUser).mockResolvedValue(null as Awaited<ReturnType<typeof getUser>>)
  return renderToStaticMarkup(await RootPage())
}
/** The markup from one section id to the next; fails loudly if either id is missing, so a check never runs on nothing. */
function between(html: string, a: string, b: string) {
  const [from, to] = [html.indexOf(`id="${a}"`), html.indexOf(`id="${b}"`)]
  expect(from, `id="${a}"`).toBeGreaterThan(-1)
  expect(to, `id="${b}" after id="${a}"`).toBeGreaterThan(from)
  return html.slice(from, to)
}
const imgs = (html: string) => [...html.matchAll(/<img\b[^>]*>/g)].map((m) => m[0])
const attr = (tag: string, name: string) => tag.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1]

/** Width and height read back from a webp file header (lossy VP8, lossless VP8L or extended VP8X). */
function webpSize(file: string) {
  const b = readFileSync(file)
  expect(b.toString('ascii', 0, 4) + b.toString('ascii', 8, 12), file).toBe('RIFFWEBP')
  const chunk = b.toString('ascii', 12, 16)
  if (chunk === 'VP8X') return { width: 1 + b.readUIntLE(24, 3), height: 1 + b.readUIntLE(27, 3) }
  if (chunk === 'VP8L') {
    const bits = b.readUInt32LE(21)
    return { width: 1 + (bits & 0x3fff), height: 1 + ((bits >> 14) & 0x3fff) }
  }
  return { width: b.readUInt16LE(26) & 0x3fff, height: b.readUInt16LE(28) & 0x3fff }
}

const SECTIONS = [
  { name: 'Four jobs', from: 'pillars', to: 'how', count: 4 },
  { name: 'How it works', from: 'how', to: 'proof', count: 3 },
] as const

beforeEach(() => vi.clearAllMocks())

describe('the Four jobs and How it works cards show the real product', () => {
  it.each(SECTIONS)('$name references no abstract /landing/visuals/ picture', async ({ from, to }) => {
    const part = between(await signedOut(), from, to)
    expect(part.length).toBeGreaterThan(100)
    expect(decodeURIComponent(part)).not.toContain('/landing/visuals/')
  })

  it.each(SECTIONS)('$name has one picture per card, each with alt text that says what the screen shows', async ({ from, to, count }) => {
    const tags = imgs(between(await signedOut(), from, to))
    expect(tags).toHaveLength(count)
    for (const t of tags) {
      const alt = attr(t, 'alt')
      expect(alt, t).toBeTruthy()
      expect(alt!.length, t).toBeGreaterThanOrEqual(30)
      expect(alt, t).toMatch(/\bscreen\b/i)
      expect(alt, t).not.toMatch(/\b(image|picture|photo) of\b/i)
    }
  })

  it.each(SECTIONS)('$name: every picture file exists at the width and height the tag declares', async ({ from, to }) => {
    for (const t of imgs(between(await signedOut(), from, to))) {
      const src = attr(t, 'src')!
      const file = join(PUBLIC, src)
      expect(existsSync(file), src).toBe(true)
      expect(webpSize(file), src).toEqual({ width: Number(attr(t, 'width')), height: Number(attr(t, 'height')) })
    }
  })
})

// WCAG 2.1 relative luminance and contrast ratio for #rrggbb colours.
const lum = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const contrast = (a: string, b: string) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p)
  return (x + 0.05) / (y + 0.05)
}

describe('the 01/02/03 step labels are readable', () => {
  it('sit on their own solid background at 4.5:1 or better (WCAG AA) and at least 14px', async () => {
    const html = between(await signedOut(), 'how', 'proof')
    const labels = [...html.matchAll(/<span class="([^"]*stepBadge[^"]*)"[^>]*>(\d\d)<\/span>/g)]
    expect(labels.map((m) => m[2])).toEqual(['01', '02', '03'])
    // The home page draws the steps itself (home/home-page.tsx); the rule is .stepBadge in its own stylesheet, and
    // colours resolve through the tokens.
    const tokens = readFileSync(join(__dirname, '..', '..', 'styles', 'public-tokens.css'), 'utf8')
    const resolve = (v: string) => {
      const name = v.match(/var\((--[\w-]+)\)/)?.[1]
      return (name ? tokens.match(new RegExp(`${name}:\\s*(#[0-9a-f]{6})`, 'i'))?.[1] : v.match(/#[0-9a-f]{6}/i)?.[0]) ?? ''
    }
    const rules = ['home/home-page.module.css']
      .filter((f) => existsSync(join(PUB, f)))
      .flatMap((f) => [...readFileSync(join(PUB, f), 'utf8').matchAll(/\.stepBadge\s*\{([^}]*)\}/g)].map((m) => m[1]))
    const rule = rules.find((r) => /background(-color)?:/.test(r)) ?? ''
    const fg = resolve(rule.match(/(?:^|;)\s*color:\s*([^;]+)/)?.[1] ?? '')
    const bg = resolve(rule.match(/background(?:-color)?:\s*([^;]+)/)?.[1] ?? '')
    expect(fg, 'label colour').toMatch(/^#[0-9a-f]{6}$/i)
    expect(bg, 'label background').toMatch(/^#[0-9a-f]{6}$/i)
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(4.5)
    expect(Number(rule.match(/font-size:\s*(\d+)px/)?.[1] ?? 0)).toBeGreaterThanOrEqual(14)
  })
})

describe('the "Where do you want to start?" steps are readable', () => {
  it('each of the five steps shows its number, name and line at 14px or more', async () => {
    const html = await signedOut()
    const from = html.indexOf('id="start"')
    expect(from, 'id="start"').toBeGreaterThan(-1)
    const steps = html.slice(from, html.indexOf('</ol>', from))
    const css = readFileSync(join(PUB, 'home', 'home-page.module.css'), 'utf8')
    for (const cls of ['pathNo', 'pathName', 'pathLine']) {
      // CSS-module class names render with a hash around the name (_pathNo_b9af75 here), so match the name between
      // separators; pathNo must not match pathName.
      expect(steps.match(new RegExp(`class="(?:[^"]*[\\s_])?${cls}(?=[\\s"_])`, 'g')) ?? [], cls).toHaveLength(5)
      const rules = [...css.matchAll(new RegExp(`\\.${cls}\\s*\\{([^}]*)\\}`, 'g'))].map((m) => m[1])
      expect(rules.length, `.${cls} rule`).toBeGreaterThan(0)
      for (const rule of rules) {
        expect(Number(rule.match(/font-size:\s*(\d+)px/)?.[1] ?? 0), `.${cls} font-size`).toBeGreaterThanOrEqual(14)
      }
    }
  })
})

// Founder rule: a seed must never look live. The analytics counts and inbox entries on these screens are invented,
// so every frame says so in a small visible caption.
describe('every home screen frame says it is sample data', () => {
  it('renders the visible caption "Sample data" inside each of the 7 frames, in readable contrast', async () => {
    const html = await signedOut()
    const frames = html.split('data-frame=').slice(1)
    expect(frames).toHaveLength(7)
    for (const f of frames) {
      const frame = f.slice(0, f.indexOf('<img'))
      // a sibling of the (aria-hidden) chrome bar, so a screen reader announces it too
      expect(frame, f.slice(0, 60)).toMatch(/<\/span><span class="[^"]*sample[^"]*">Sample data<\/span>/)
    }
    const css = readFileSync(join(PUB, 'home-screens.module.css'), 'utf8')
    const rule = [...css.matchAll(/\.sample\s*\{([^}]*)\}/g)].map((m) => m[1]).join(';')
    expect(rule, '.sample rule').toMatch(/font-family:\s*var\(--pub-mono\)/)
    const tokens = readFileSync(join(__dirname, '..', '..', 'styles', 'public-tokens.css'), 'utf8')
    const colour = rule.match(/(?:^|;)\s*color:\s*var\((--[\w-]+)\)/)?.[1] ?? ''
    const fg = tokens.match(new RegExp(`${colour}:\\s*(#[0-9a-f]{6})`, 'i'))?.[1] ?? ''
    const bar = css.match(/\.bar\s*\{[^}]*background:\s*(#[0-9a-f]{6})/i)?.[1] ?? ''
    expect(fg, 'caption colour token').toMatch(/^#[0-9a-f]{6}$/i)
    expect(bar, 'bar background').toMatch(/^#[0-9a-f]{6}$/i)
    expect(contrast(fg, bar)).toBeGreaterThanOrEqual(4.5)
    // the phone bar is darker still; the caption must clear it too
    const phoneBar = css.match(/\.phone \.bar\s*\{[^}]*background:\s*(#[0-9a-f]{6})/i)?.[1] ?? ''
    expect(contrast(fg, phoneBar)).toBeGreaterThanOrEqual(4.5)
    expect(Number(rule.match(/font-size:\s*(\d+)px/)?.[1] ?? 0)).toBeGreaterThanOrEqual(11)
  })
})
