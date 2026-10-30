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
import { PublicHome } from '@/public/home/public-home'
import { PAYMENT_ENTITY_LINE } from '@/app/cards/payment-entity'
import { CONTACT_MAILTO } from '@/public/site/site-nav'

// Phill 26/10/2026 (UNI-3034): /grow is linked from the nav and the home page; /cards, /cards/order and /cards/terms
// carry the same site header as the home page; Email us stays in the page body on / and /cards; the QR code sits on the /cards card face.
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

  it.each([pages[0], pages[1]])('%s keeps Email us in the page body, not the top nav', (_p, render) => {
    const html = render()
    expect(mainNav(html)).not.toMatch(/href="mailto:contact@unite-group.in"[^>]*>\s*Email us/)
    const body = html.slice(html.indexOf('<main'))
    expect(body).toMatch(/href="mailto:contact@unite-group.in"[^>]*>\s*Email us/)
  })

  // Phill, 27/10/2026: keep Rana's Email us link. It must stay exactly one, outside the contact form section.
  it('/ has exactly one Email us mailto, and none inside the contact section', () => {
    const html = pages[0][1]()
    expect(html.match(/href="mailto:[^"]*"[^>]*>\s*Email us/g)).toHaveLength(1)
    const contact = html.slice(html.indexOf('id="contact"'), html.indexOf('<footer'))
    expect(contact).not.toContain('href="mailto:')
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
  // The showroom lists the signature reveal plus nine editions, so ten films (founder decision; EDITIONS.length).
  // "nine films" would now be the wrong count; "six businesses" stays banned.
  it('/cards and / never say nine films or six businesses', () => {
    for (const [, render] of [pages[0], pages[1]]) {
      const html = render()
      expect(html).not.toMatch(/\bnine (card )?films|\bone of nine\b|\bthe nine\b|six businesses/i)
    }
  })
  it('the showroom really holds ten films', async () => {
    const { EDITIONS } = await import('../cards/editions')
    expect(EDITIONS).toHaveLength(10)
  })
  it('the guard can fail', () => {
    expect('one of nine films').toMatch(/\bnine (card )?films/i)
  })
})

// UNI-3034 review: scan the rendered pages, not only the data. The only allowed match is the payment-entity line
// (terms section 1.2, ABN 95 691 477 844), shown wherever a pay button is.
const BANNED = /carsi|disaster|nrpg|restor|training|water damage/i
const visible = (html: string) =>
  html
    .replace(/<script[\s\S]*?<\/script>/g, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/\s+/g, ' ')
const offending = (html: string) => {
  const attrs = [...html.matchAll(/(?:href|src|alt|title|content|aria-label|value)="([^"]*)"/g)].map((m) => m[1])
  return [visible(html).replaceAll(PAYMENT_ENTITY_LINE, ''), ...attrs].filter((t) => BANNED.test(t))
}

describe('rendered public pages carry no restoration-industry content', () => {
  it('the one allowed line is the unchanged payment-entity disclosure', () => {
    expect(PAYMENT_ENTITY_LINE).toBe('Payment is taken by our related company CARSI Pty Ltd, which appears on your statement.')
  })

  it.each(pages.slice(0, 3))('%s', async (_p, render) => {
    expect(offending(render())).toEqual([])
  })

  it('page metadata is clean', async () => {
    const metas = [(await import('@/app/page')).metadata, (await import('@/app/cards/page')).metadata, (await import('@/app/cards/order/page')).metadata]
    for (const m of metas) expect(JSON.stringify(m ?? {})).not.toMatch(BANNED)
  })

  it('the guard can fail: planted copy is caught, the payment line is allowed', () => {
    expect(offending('<main><p>CARSI restoration training</p></main>')).not.toEqual([])
    expect(offending(`<p>${PAYMENT_ENTITY_LINE}</p>`)).toEqual([])
    expect(offending('<p>Payment is taken by our related company CARSI Pty Ltd, and Restoration training is advertised.</p>')).not.toEqual([])
  })
})
