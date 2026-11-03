import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

import CardsShowroomPage from '../page'
import { CARD_EXTRA_BUSINESS, CARD_TIERS, OrderView } from '../order/order-view'
import { CARD_ORDER_TERMS } from '../terms/terms-content'
import { GROW_CARD_OFFERS } from '../../grow/living-card'

/** Phill's model, 02/11/2026, written out so a changed name, price or count fails here. */
const MODEL = [
  { id: 'ready', name: 'Starter pack', priceAud: 249, rounds: 3 },
  { id: 'custom', name: 'Business Pack', priceAud: 449, rounds: 10 },
]

const online = () => {
  vi.stubEnv('STRIPE_PAYMENT_LINK_CARD_READY', 'https://buy.stripe.com/test_ready')
  vi.stubEnv('STRIPE_PAYMENT_LINK_CARD_CUSTOM', 'https://buy.stripe.com/test_custom')
  vi.stubEnv('STRIPE_PAYMENT_LINK_CARD_EXTRA_BUSINESS', 'https://buy.stripe.com/test_extra')
}

afterEach(() => vi.unstubAllEnvs())

describe('tier names, prices and round counts', () => {
  it('match the founder model', () => {
    expect(CARD_TIERS.map(({ id, name, priceAud, rounds }) => ({ id, name, priceAud, rounds }))).toEqual(MODEL)
    expect(CARD_EXTRA_BUSINESS).toMatchObject({ id: 'extra_business', name: 'Staff card', priceAud: 199, rounds: 3 })
  })

  it('keep the live Stripe env names, so existing payment links keep working', () => {
    expect(CARD_TIERS.map((t) => t.paymentLinkEnv)).toEqual(['STRIPE_PAYMENT_LINK_CARD_READY', 'STRIPE_PAYMENT_LINK_CARD_CUSTOM'])
    expect(CARD_EXTRA_BUSINESS.paymentLinkEnv).toBe('STRIPE_PAYMENT_LINK_CARD_EXTRA_BUSINESS')
  })

  it('are shown on /cards/order', () => {
    online()
    const html = renderToStaticMarkup(createElement(OrderView, { edition: null, referrer: null }))
    for (const t of MODEL) {
      expect(html).toContain(t.name)
      expect(html).toContain(`Includes ${t.rounds} rounds of changes.`)
    }
    expect(html).toContain('3 rounds of changes each')
    expect(html).toContain('only their own name, photo and mobile')
  })

  it('are shown on /cards', () => {
    online()
    const html = renderToStaticMarkup(createElement(CardsShowroomPage))
    for (const t of MODEL) {
      expect(html).toContain(t.name)
      expect(html).toContain(`Includes ${t.rounds} rounds of changes.`)
    }
  })

  it('are shown on /grow', () => {
    const benefit = (id: string) => GROW_CARD_OFFERS.find((o) => o.id === id)?.benefits.join(' | ')
    expect(GROW_CARD_OFFERS.find((o) => o.id === 'ready')?.name).toBe('Starter pack')
    expect(benefit('ready')).toContain('Includes 3 rounds of changes')
    expect(GROW_CARD_OFFERS.find((o) => o.id === 'custom')?.name).toBe('Business Pack')
    expect(benefit('custom')).toContain('Includes 10 rounds of changes')
    expect(benefit('extra_business')).toContain('Includes 3 rounds of changes')
  })

  it('are in the terms', () => {
    expect(CARD_ORDER_TERMS).toContain('**Starter pack, AUD 249 (GST included)**')
    expect(CARD_ORDER_TERMS).toContain('**Business Pack, AUD 449 (GST included)**')
    expect(CARD_ORDER_TERMS).toContain('Starter pack includes 3 rounds. Business Pack includes 10 rounds.')
    expect(CARD_ORDER_TERMS).toContain('at AUD 199 each (GST included), with no limit. Each staff card is for one staff member and includes 3 rounds.')
    expect(CARD_ORDER_TERMS).toContain('A staff member can change only their own name, photo and mobile.')
  })
})
