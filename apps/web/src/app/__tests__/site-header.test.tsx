import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('next/navigation', () => ({ redirect: vi.fn() }))

import CardsShowroomPage from '@/app/cards/page'
import CardTermsPage from '@/app/cards/terms/page'
import { OrderView } from '@/app/cards/order/order-view'
import { PublicHome } from '@/components/public/public-home'
import { CONTACT_MAILTO } from '@/components/public/site-nav'

// Phill 26/10/2026 (UNI-3034): /grow is linked from the nav and the home page; /cards, /cards/order and /cards/terms
// carry the same site header as the home page; a visible "Email us" link; the QR code sits on the /cards card face.
const mainNav = (html: string) => {
  const i = html.indexOf('<nav aria-label="Main"')
  return i < 0 ? '' : html.slice(i, html.indexOf('</nav>', i))
}

const pages: Array<[string, () => string]> = [
  ['/', () => renderToStaticMarkup(createElement(PublicHome))],
  ['/cards', () => renderToStaticMarkup(createElement(CardsShowroomPage))],
  ['/cards/order', () => renderToStaticMarkup(createElement(OrderView, { edition: null, referrer: null }))],
  ['/cards/terms', () => renderToStaticMarkup(createElement(CardTermsPage))],
]

describe('shared site header', () => {
  it.each(pages)('%s renders the home page header with links to /, /cards and /grow', (_p, render) => {
    const nav = mainNav(render())
    expect(nav).toContain('href="/cards"')
    expect(nav).toMatch(/href="\/grow"[^>]*>Grow your business</)
    expect(render()).toMatch(/<a href="\/" [^>]*>[\s\S]*?Unite Group<\/a>/)
  })

  it('the home page links to /grow from its body, not only the nav', () => {
    const html = renderToStaticMarkup(createElement(PublicHome))
    const body = html.slice(html.indexOf('<main'))
    expect(body).toMatch(/href="\/grow"/)
  })

  it('the guard can fail: a page without the header has no Main nav', () => {
    expect(mainNav('<main><a href="/grow">x</a></main>')).toBe('')
  })
})

describe('Email us', () => {
  it('is a mailto to contact@unite-group.in', () => {
    expect(CONTACT_MAILTO).toBe('mailto:contact@unite-group.in')
  })

  it.each([pages[0], pages[1]])('%s shows a visible Email us link in the header and near the card CTA', (_p, render) => {
    const html = render()
    expect(mainNav(html)).toMatch(/href="mailto:contact@unite-group.in"[^>]*>\s*Email us/)
    const body = html.slice(html.indexOf('<main'))
    expect(body).toMatch(/href="mailto:contact@unite-group.in"[^>]*>\s*Email us/)
  })
})

describe('QR code on the /cards card', () => {
  it('sits inside the hero card wrapper, with alt text and the scan label', () => {
    const html = renderToStaticMarkup(createElement(CardsShowroomPage))
    const start = html.indexOf('data-card-qr')
    const card = html.slice(start, html.indexOf('</figure>', start))
    expect(card).toContain('data-edition="signature"')
    expect(card).toMatch(/<img src="\/cards\/living-card-qr.png" alt="QR code that opens unite-group.in\/cards"/)
    expect(card).toContain('Scan to open this page')
  })

  it('serves the verified QR image (sha256 pinned; it decodes to https://unite-group.in/cards)', async () => {
    const { createHash } = await import('node:crypto')
    const png = readFileSync(join(__dirname, '..', '..', '..', 'public', 'cards', 'living-card-qr.png'))
    expect(createHash('sha256').update(png).digest('hex')).toBe('f9e8ea772732eb68a08b10b7a8470eab666cf8e7b4cdcd48c3fca149cf7c2bf0')
  })
})

describe('film and business counts (UNI-3034 review)', () => {
  it('/cards and / never say ten films or six businesses', () => {
    for (const [, render] of [pages[0], pages[1]]) {
      const html = render()
      expect(html).not.toMatch(/\bten (card )?films|\bthe ten\b|six businesses/i)
    }
  })
  it('the guard can fail', () => {
    expect('one of the ten').toMatch(/\bthe ten\b/)
  })
})
