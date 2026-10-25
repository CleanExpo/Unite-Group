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
  { name: 'CARSI', href: url('CARSI') },
  { name: 'Disaster Recovery', href: url('Disaster Recovery') },
  { name: 'RestoreAssist', href: url('RestoreAssist') },
  { name: 'NRPG', href: url('NRPG') },
]
const COMING = ['Revenue Intelligence', 'Experience Intelligence', 'Operations Intelligence']

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
  it('is a section with id today, directly after the group and before the cards gallery, with its heading', async () => {
    const html = await home()
    const sections = [...html.matchAll(/<(?:section|footer)[^>]*\bid="([a-z]+)"/g)].map((m) => m[1])
    expect(sections[sections.indexOf('group') + 1]).toBe('today')
    expect(sections[sections.indexOf('today') + 1]).toBe('cards')
    expect(blocks(html, 'id="today"', 'section')).toHaveLength(1)
    expect(html).toMatch(/<h2[^>]*>Today, and what is coming<\/h2>/)
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

  it('lists exactly the three coming items, each with a Coming chip and no link anywhere in the column', async () => {
    const col = blocks(await home(), 'data-coming-list', 'ul')[0]
    expect(col).not.toMatch(/<a[\s>]/)
    expect(col).not.toMatch(/href=/)
    const items = blocks(col, 'data-coming-item', 'li')
    expect(items).toHaveLength(COMING.length)
    for (const [i, name] of COMING.entries()) {
      expect(text(blocks(items[i], 'data-name', 'strong')[0]), name).toBe(name)
      expect(items[i], name).toMatch(/data-chip="coming"[^>]*>Coming</)
    }
  })

  it('keeps every line to 60 characters and shows the note under the Coming column', async () => {
    const html = await home()
    const lines = blocks(html, 'data-line', 'span').map(text)
    expect(lines).toHaveLength(TODAY.length + COMING.length)
    for (const l of lines) expect(l.length, l).toBeLessThanOrEqual(60)
    expect(text(blocks(html, 'data-coming-note', 'p')[0])).toBe('Coming means it is not for sale yet.')
  })

  it('makes no claim it cannot back: no Synthex, Trade Hall, certified, IICRC, 24/7, and no price in Coming', async () => {
    const html = await home()
    const sec = text(blocks(html, 'id="today"', 'section')[0])
    for (const bad of [/synthex/i, /trade hall/i, /certified/i, /iicrc/i, /24\/7/, /!/]) expect(sec).not.toMatch(bad)
    expect(sec).toContain('from $249')
    const coming = text(blocks(html, 'data-coming', 'div')[0])
    expect(coming).not.toMatch(/\$/)
    expect(coming).not.toMatch(/synthex|trade hall|certified|iicrc|24\/7/i)
  })

  it('has its own stylesheet with a stacked layout and two columns from 900px', () => {
    const css = readFileSync(join(__dirname, '..', 'today-coming.module.css'), 'utf8')
    expect(css).toMatch(/@media \(min-width: 900px\)/)
    expect(css).toMatch(/minmax\(0, 1fr\)/)
  })
})
