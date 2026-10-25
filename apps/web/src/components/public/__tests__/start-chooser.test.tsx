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

// Design-pass gap 05.2 / 05.5: the hero has ONE primary step, and it leads to this chooser.
const OPTIONS = [
  { label: 'discover', no: '01', name: 'Discover', href: '/pricing', line: 'See the Starter plan and add-ons' },
  { label: 'diagnose', no: '02', name: 'Diagnose', href: '/solutions/intelligence', line: 'A check of what is holding your business back' },
  { label: 'create', no: '03', name: 'Create', href: '/cards/order', line: 'Order a living video card, from $249' },
  { label: 'results', no: '04', name: 'Explore results', href: '/cards', line: 'Watch the ten living cards we have made' },
  { label: 'talk', no: '05', name: 'Talk', href: '#contact', line: 'Ask a question and we reply by email' },
] as const

const strip = (html: string) => html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
const signedOut = async () => {
  vi.mocked(getUser).mockResolvedValue(null as Awaited<ReturnType<typeof getUser>>)
  return renderToStaticMarkup(await RootPage())
}
async function chooser() {
  const html = await signedOut()
  const start = html.indexOf('id="start"')
  expect(start, 'section #start exists').toBeGreaterThan(-1)
  const open = html.lastIndexOf('<section', start)
  const block = html.slice(open, html.indexOf('</section>', start) + '</section>'.length)
  const items = [...block.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g)].map((m) => m[1])
  return { html, block, items }
}

beforeEach(() => vi.clearAllMocks())
afterEach(() => vi.unstubAllEnvs())

describe('the start chooser', () => {
  it('is the section right after the hero, before the highlights', async () => {
    const { html } = await chooser()
    const ids = [...html.matchAll(/<section[^>]*\bid="([a-z]+)"/g)].map((m) => m[1])
    expect(ids.slice(0, 3)).toEqual(['hero', 'start', 'highlights'])
  })

  it('is labelled by a visible h2 "Where do you want to start?"', async () => {
    const { block } = await chooser()
    const labelled = block.match(/aria-labelledby="([^"]+)"/)?.[1]
    expect(labelled).toBeTruthy()
    const h2 = block.match(new RegExp(`<h2[^>]*id="${labelled}"[^>]*>([\\s\\S]*?)</h2>`))
    expect(h2).not.toBeNull()
    expect(strip(h2![1])).toBe('Where do you want to start?')
  })

  it('is an ordered list of five links with the exact hrefs, in order', async () => {
    const { block, items } = await chooser()
    expect(block).toMatch(/<ol[ >]/)
    expect(items).toHaveLength(5)
    const links = items.map((i) => i.match(/<a [^>]*>/)?.[0] ?? '')
    expect(links.map((a) => a.match(/href="([^"]+)"/)?.[1])).toEqual(OPTIONS.map((o) => o.href))
    items.forEach((item, i) => {
      expect(strip(item), OPTIONS[i].name).toContain(OPTIONS[i].no)
      expect(strip(item), OPTIONS[i].name).toContain(OPTIONS[i].name)
      expect(strip(item), OPTIONS[i].name).toContain(OPTIONS[i].line)
    })
  })

  it('tracks every option as a CTA with its own label', async () => {
    const { items } = await chooser()
    items.forEach((item, i) => {
      const a = item.match(/<a [^>]*>/)![0]
      expect(a).toContain('data-track="cta"')
      expect(a).toContain(`data-track-label="home-start-${OPTIONS[i].label}"`)
    })
  })

  it('keeps each plain line to 64 characters or fewer, with no emoji and no exclamation marks', async () => {
    const { block } = await chooser()
    for (const o of OPTIONS) expect(o.line.length).toBeLessThanOrEqual(64)
    const paragraphs = [...block.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/g)].map((m) => strip(m[1]))
    for (const o of OPTIONS) expect(paragraphs, o.name).toContain(o.line)
    for (const p of paragraphs) expect(p.length, p).toBeLessThanOrEqual(64)
    expect(strip(block)).not.toMatch(/!|\p{Extended_Pictographic}/u)
  })

  it('shows "Coming" on Diagnose only, because it is not live', async () => {
    const { items } = await chooser()
    expect(strip(items[1])).toContain('Coming')
    for (const i of [0, 2, 3, 4]) expect(strip(items[i]), OPTIONS[i].name).not.toContain('Coming')
  })

  it('carries no pictures', async () => {
    const { block } = await chooser()
    expect(block).not.toMatch(/<img|<video|<picture|url\(/)
  })
})
