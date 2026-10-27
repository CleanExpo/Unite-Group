import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

import CardsShowroomPage from '../page'
import { PAYMENT_ENTITY_LINE } from '../payment-entity'

/**
 * UNI-3049 part 1. /cards takes a visitor to the Ready-made Stripe Payment Link in one click, from the same env var
 * and validator the order page uses. No valid link, no button: the /cards/order path stays either way.
 */
const LINK = 'https://buy.stripe.com/test_ready'
const LABEL = 'Buy Ready-made, A$249'

const showroom = () => renderToStaticMarkup(createElement(CardsShowroomPage))
const count = (html: string, needle: string) => html.split(needle).length - 1
const buyBlock = (html: string) => {
  const start = html.indexOf('data-buy-now=')
  return start < 0 ? null : html.slice(start, html.indexOf('</div>', start))
}

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('/cards one-click buy', () => {
  it('links the button straight to the configured Ready-made Payment Link, with the payment line under it', () => {
    vi.stubEnv('STRIPE_PAYMENT_LINK_CARD_READY', LINK)
    const html = showroom()
    expect(count(html, `href="${LINK}"`)).toBe(1)
    const block = buyBlock(html)!
    expect(block).toMatch(new RegExp(`<a [^>]*href="${LINK}"[^>]*>${LABEL.replace('$', '\\$')}</a>`))
    expect(block).toContain('GST included')
    expect(count(html, PAYMENT_ENTITY_LINE)).toBe(1)
    expect(block.indexOf(PAYMENT_ENTITY_LINE)).toBeGreaterThan(block.indexOf('</a>'))
    // The chooser path stays.
    expect(html).toContain('href="/cards/order"')
  })

  it('uses the Ready-made link only, never another tier link', () => {
    vi.stubEnv('STRIPE_PAYMENT_LINK_CARD_CUSTOM', 'https://buy.stripe.com/test_custom')
    const html = showroom()
    expect(buyBlock(html)).toBeNull()
    expect(html).not.toContain(LABEL)
    expect(html).not.toContain('buy.stripe.com')
  })

  it('shows no buy button and no payment line when the link is unset', () => {
    vi.stubEnv('STRIPE_PAYMENT_LINK_CARD_READY', '')
    const html = showroom()
    expect(buyBlock(html)).toBeNull()
    expect(html).not.toContain(LABEL)
    expect(html).not.toContain('buy.stripe.com')
    expect(html).not.toContain(PAYMENT_ENTITY_LINE)
    expect(html).toContain('href="/cards/order"')
  })

  it.each([
    'https://buy.stripe.com.evil.example/x',
    'http://buy.stripe.com/x',
    'https://evil.example/pay',
    'https://user:pw@buy.stripe.com/x',
    'https://buy.stripe.com@evil.example/x',
    'not a url',
    '   ',
  ])('refuses %s: no buy button, no placeholder link', (bad) => {
    vi.stubEnv('STRIPE_PAYMENT_LINK_CARD_READY', bad)
    const html = showroom()
    expect(buyBlock(html)).toBeNull()
    expect(html).not.toContain(LABEL)
    expect(html).not.toMatch(/evil\.example|buy\.stripe\.com/)
    expect(html).not.toContain(PAYMENT_ENTITY_LINE)
    expect(html).toContain('href="/cards/order"')
  })
})
