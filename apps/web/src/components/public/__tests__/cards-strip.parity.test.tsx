import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { CARD_TIERS, OrderView } from '@/app/cards/order/order-view'
import { formatAud } from '@/app/grow/packages'

import { CardsStrip } from '../cards-strip'

afterEach(() => vi.unstubAllEnvs())

describe('cards strip price parity (AC-4)', () => {
  it('shows exactly the CARD_TIERS prices, the GST line, the AI label and an order link under each price', () => {
    const html = renderToStaticMarkup(<CardsStrip />)
    expect(CARD_TIERS.map((t) => t.priceAud)).toEqual([249, 449])
    const tiers = html.split('data-tier="').slice(1)
    expect(tiers).toHaveLength(2)
    CARD_TIERS.forEach((t, i) => {
      expect(tiers[i]).toContain(`>${formatAud(t.priceAud)}<`)
      expect(tiers[i]).toContain('One-off price, GST included')
      expect(tiers[i].indexOf('href="/cards/order"')).toBeGreaterThan(tiers[i].indexOf(formatAud(t.priceAud)))
    })
    expect(html).toContain('AI-generated')
    expect(html).toContain('See the living card')
    expect(html.match(/\$\d+/g)).toEqual(['$249', '$449'])
  })

  it('matches the prices the live /cards/order page renders', () => {
    vi.stubEnv('STRIPE_PAYMENT_LINK_CARD_READY', 'https://buy.stripe.com/test_ready')
    vi.stubEnv('STRIPE_PAYMENT_LINK_CARD_CUSTOM', 'https://buy.stripe.com/test_custom')
    const order = renderToStaticMarkup(<OrderView edition={null} referrer={null} />)
    const strip = renderToStaticMarkup(<CardsStrip />)
    for (const t of CARD_TIERS) {
      expect(order).toContain(formatAud(t.priceAud))
      expect(strip).toContain(formatAud(t.priceAud))
    }
    expect(order).toContain('GST included')
  })
})
