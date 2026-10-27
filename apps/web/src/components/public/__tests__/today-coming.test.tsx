import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('next/navigation', () => ({
  redirect: vi.fn((to: string) => {
    throw new Error(`NEXT_REDIRECT ${to}`)
  }),
}))

import { getUser } from '@/lib/supabase/server'

import RootPage from '@/app/page'

import { BUSINESSES } from '../businesses'

const url = (name: string) => BUSINESSES.find((b) => b.name === name)!.url!

const TODAY = [
  { name: 'Living business card', href: '/cards' },
  { name: 'Starter plan', href: '/pricing' },
  { name: 'Email signatures', href: '/signatures' },
]
// 27/10/2026 redesign: CRM leads the one Coming line (it was its own Coming card before)
const COMING = ['CRM', 'Revenue Intelligence', 'Experience Intelligence', 'Operations Intelligence']

async function home() {
  vi.mocked(getUser).mockResolvedValue(null as Awaited<ReturnType<typeof getUser>>)
  return renderToStaticMarkup(await RootPage())
}
const text = (h: string) => h.replace(/<[^>]*>/g, ' ').replace(/&#x27;|&#39;/g, "'").replace(/\s+/g, ' ').trim()
/** Elements carrying the attribute, matched to the closing tag of the same name. */
function blocks(html: string, attr: string, tag: string) {
  const out: string[] = []
  for (const m of html.matchAll(new RegExp(`<${tag}[^>]*(?<![\\w-])${attr}(?![\\w-])[^>]*>`, 'g'))) {
    let depth = 0
    const re = new RegExp(`<(/?)${tag}\\b[^>]*>`, 'g')
    re.lastIndex = m.index!
    for (let t = re.exec(html); t; t = re.exec(html)) {
      depth += t[1] ? -1 : 1
      if (depth === 0) {
        out.push(html.slice(m.index!, re.lastIndex))
        break
      }
    }
  }
  return out
}

beforeEach(() => vi.clearAllMocks())
afterEach(() => vi.unstubAllEnvs())

describe('Today and what is coming', () => {
  it('is a section with id today, directly after the start chooser and before the cards gallery, with its heading', async () => {
    const html = await home()
    const sections = [...html.matchAll(/<(?:section|footer)[^>]*\bid="([a-z]+)"/g)].map((m) => m[1])
    expect(sections).not.toContain('group')
    expect(sections[sections.indexOf('start') + 1]).toBe('today')
    expect(sections[sections.indexOf('today') + 1]).toBe('cards')
    expect(blocks(html, 'id="today"', 'section')).toHaveLength(1)
    expect(html).toMatch(/<h2[^>]*>What you can use now<\/h2>/)
  })

  it('lists the five live items in order, each linked to its page with a Live chip', async () => {
    const col = blocks(await home(), 'data-today-list', 'ul')[0]
    const items = blocks(col, 'data-today-item', 'li')
    expect(items).toHaveLength(TODAY.length)
    for (const [i, want] of TODAY.entries()) {
      const links = [...items[i].matchAll(/<a[^>]*href="([^"]*)"[^>]*>/g)]
      expect(links.map((l) => l[1]), want.name).toEqual([want.href])
      expect(text(blocks(items[i], 'data-name', 'strong')[0]), want.name).toBe(want.name)
      expect(items[i], want.name).toMatch(/data-chip="live"[^>]*>Live</)
    }
  })

  it('lists exactly the four coming names under one Coming chip, with no link anywhere on the line', async () => {
    const line = blocks(await home(), 'data-coming', 'div')[0]
    expect(line).not.toMatch(/<a[\s>]|href=/)
    expect(line.match(/data-chip="coming"[^>]*>Coming</g)).toHaveLength(1)
    const col = blocks(line, 'data-coming-list', 'ul')[0]
    expect(col).not.toMatch(/<a[\s>]/)
    expect(col).not.toMatch(/href=/)
    const items = blocks(col, 'data-coming-item', 'li')
    expect(items).toHaveLength(COMING.length)
    for (const [i, name] of COMING.entries()) {
      expect(text(blocks(items[i], 'data-name', 'strong')[0]), name).toBe(name)
    }
  })

  it('keeps every line to 60 characters and shows the note under the Coming names', async () => {
    const html = await home()
    const lines = blocks(html, 'data-line', 'span').map(text)
    expect(lines).toHaveLength(TODAY.length)
    for (const l of lines) expect(l.length, l).toBeLessThanOrEqual(60)
    expect(text(blocks(html, 'data-coming-note', 'p')[0])).toBe('Coming means it is not for sale yet.')
  })

  it('makes no claim it cannot back: no Synthex, Trade Hall, certified, IICRC, 24/7, and no price in Coming', async () => {
    const html = await home()
    const sec = text(blocks(html, 'id="today"', 'section')[0])
    for (const bad of [/synthex/i, /trade hall/i, /certified/i, /iicrc/i, /24\/7/, /!/]) expect(sec).not.toMatch(bad)
    // The card price shows only behind the order page's payment-link gate, never here unconditionally.
    expect(sec).not.toMatch(/\$249|\$449/)
    expect(sec).toContain('$99 a month plus GST')
    expect(sec).toContain('$22 each plus GST')
    const coming = text(blocks(html, 'data-coming', 'div')[0])
    expect(coming).not.toMatch(/\$/)
    expect(coming).not.toMatch(/synthex|trade hall|certified|iicrc|24\/7/i)
  })

  // The home page draws this section itself (home/home-page.tsx); today-coming.tsx is no longer on the page.
  it('is styled by the home page stylesheet, which defines every class the section uses', async () => {
    const section = blocks(await home(), 'id="today"', 'section')[0]
    const tsx = readFileSync(join(__dirname, '..', 'home', 'home-page.tsx'), 'utf8')
    const block = tsx.slice(tsx.indexOf('id="today"'), tsx.indexOf('</section>', tsx.indexOf('id="today"')))
    const used = [...new Set([...block.matchAll(/hp\.(\w+)/g)].map((m) => m[1]))]
    expect(used.length, 'classes used by #today').toBeGreaterThan(3)
    const css = readFileSync(join(__dirname, '..', 'home', 'home-page.module.css'), 'utf8')
    for (const c of used) expect(css, c).toMatch(new RegExp(`\\.${c}\\b`))
    expect(section).toMatch(/data-today-list/)
    expect(section).toMatch(/data-coming-list/)
  })
})

// Bugbot on #1248: `.page .live` named a class this module never assigns (CSS modules hash `.page` per file), so the
// Today rows fell back to the page's underlined accent links. Every class a selector names must be one the component sets.
describe('today-coming.module.css only names classes the component assigns', () => {
  it('has no selector that can never match', () => {
    const dir = join(__dirname, '..')
    const css = readFileSync(join(dir, 'today-coming.module.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
    const tsx = readFileSync(join(dir, 'today-coming.tsx'), 'utf8')
    const selectors = css.replace(/\{[^{}]*\}/g, '\n').replace(/@media[^{]*\{/g, '').replace(/}/g, '')
    const named = new Set([...selectors.matchAll(/\.([a-zA-Z_][\w-]*)/g)].map((m) => m[1]))
    expect(named.size).toBeGreaterThan(5)
    const unassigned = [...named].filter((c) => !new RegExp(`\\bt\\.${c}\\b`).test(tsx))
    expect(unassigned).toEqual([])
  })
})
