import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

import GrowPage from '../page'
import { GROW_CARD_OFFERS, NFC_TAP_CARD_ENV, liveCardOffers } from '../living-card'

const render = () => renderToStaticMarkup(createElement(GrowPage))
const offer = (html: string, id: string) => {
  const at = html.indexOf(`data-card-offer="${id}"`)
  return at < 0 ? '' : html.slice(at, html.indexOf('</article>', at))
}

afterEach(() => vi.unstubAllEnvs())

describe('/grow Living Business Card section', () => {
  it('is hidden while no card link is set', () => {
    const html = render()
    expect(html).not.toContain('id="living-card"')
    expect(html).not.toContain('buy.stripe.com')
  })

  it('reuses the card order page env vars and shows GST-inclusive prices', () => {
    vi.stubEnv('STRIPE_PAYMENT_LINK_CARD_READY', 'https://buy.stripe.com/test_ready')
    vi.stubEnv('STRIPE_PAYMENT_LINK_CARD_CUSTOM', 'https://buy.stripe.com/test_custom')
    vi.stubEnv('STRIPE_PAYMENT_LINK_CARD_EXTRA_BUSINESS', 'https://buy.stripe.com/test_extra')
    const html = render()
    expect(html).toContain('GST included')
    expect(offer(html, 'ready')).toContain('$249')
    expect(offer(html, 'ready')).toContain('href="https://buy.stripe.com/test_ready"')
    expect(offer(html, 'custom')).toContain('$449')
    expect(offer(html, 'custom')).toContain('href="https://buy.stripe.com/test_custom"')
    expect(offer(html, 'extra_business')).toContain('$199')
    expect(offer(html, 'extra_business')).toContain('href="https://buy.stripe.com/test_extra"')
    expect(offer(html, 'nfc_tap')).toBe('')
  })

  it('shows each offer only when its own link is set, and the NFC slot only with its new env var', () => {
    vi.stubEnv(NFC_TAP_CARD_ENV, 'https://buy.stripe.com/test_nfc')
    const html = render()
    expect(offer(html, 'nfc_tap')).toContain('href="https://buy.stripe.com/test_nfc"')
    expect(offer(html, 'ready')).toBe('')
  })

  it('ignores a link that is not an https Stripe Payment Link', () => {
    expect(liveCardOffers({ STRIPE_PAYMENT_LINK_CARD_READY: 'https://evil.example/x' })).toEqual([])
  })

  it('leaves the monthly packages untouched and mentions no niche', () => {
    vi.stubEnv('STRIPE_PAYMENT_LINK_CARD_READY', 'https://buy.stripe.com/test_ready')
    const html = render()
    expect(html).toContain('Prices in AUD, excluding GST.')
    expect(html).not.toMatch(/restoration|training/i)
    expect(GROW_CARD_OFFERS.map((o) => o.id)).toEqual(['ready', 'custom', 'extra_business', 'nfc_tap'])
  })
})
