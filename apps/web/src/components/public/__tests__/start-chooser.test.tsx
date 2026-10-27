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
// Live since the 27/10/2026 redesign (f4a0d9d8): a "Quick links" rail of five short names, no numbers or sub-lines.
const OPTIONS = [
  { label: 'discover', name: 'Pricing', href: '/pricing' },
  { label: 'diagnose', name: 'Nexus CRM', href: '/solutions/intelligence' },
  { label: 'create', name: 'Order', href: '/cards/order' }, // 'Order · from $X' while a card link is live, else 'Order a card'
  { label: 'results', name: 'Showroom', href: '/cards' },
  { label: 'talk', name: 'Ask a question', href: '#contact' },
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

beforeEach(() => {
  vi.clearAllMocks()
  // The Create line names a price only while a card payment link is live (cardFromAud); open that gate here.
  vi.stubEnv('STRIPE_PAYMENT_LINK_CARD_READY', 'https://buy.stripe.com/test_ready')
})
afterEach(() => vi.unstubAllEnvs())

describe('the start chooser', () => {
  it('is the section right after the hero, before the highlights', async () => {
    const { html } = await chooser()
    const ids = [...html.matchAll(/<section[^>]*\bid="([a-z]+)"/g)].map((m) => m[1])
    expect(ids.slice(0, 3)).toEqual(['hero', 'start', 'highlights'])
  })

  it('is labelled "Quick links" for screen readers', async () => {
    const { block } = await chooser()
    expect(block.match(/<section[^>]*>/)![0]).toContain('aria-label="Quick links"')
  })

  it('is an ordered list of five links with the exact hrefs and names, in order', async () => {
    const { block, items } = await chooser()
    expect(block).toMatch(/<ol[ >]/)
    expect(items).toHaveLength(5)
    const links = items.map((i) => i.match(/<a [^>]*>/)?.[0] ?? '')
    expect(links.map((a) => a.match(/href="([^"]+)"/)?.[1])).toEqual(OPTIONS.map((o) => o.href))
    items.forEach((item, i) => {
      expect(strip(item), OPTIONS[i].name).toContain(OPTIONS[i].name)
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

  it('keeps each link to 64 characters or fewer, with no emoji and no exclamation marks', async () => {
    const { block, items } = await chooser()
    for (const item of items) expect(strip(item).length, strip(item)).toBeLessThanOrEqual(64)
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

  it('names no card price on Create while online ordering is off, and $449 when only made-for-you is live', async () => {
    vi.stubEnv('STRIPE_PAYMENT_LINK_CARD_READY', '')
    vi.stubEnv('STRIPE_PAYMENT_LINK_CARD_CUSTOM', '')
    let create = strip((await chooser()).items[2])
    expect(create).toBe('Order a card')
    expect(create).not.toMatch(/\$\d/)
    vi.stubEnv('STRIPE_PAYMENT_LINK_CARD_CUSTOM', 'https://buy.stripe.com/test_custom')
    create = strip((await chooser()).items[2])
    expect(create).toBe('Order · from $449')
  })
})
