import { afterEach, describe, expect, it, vi } from 'vitest'

import { CARD_TIERS } from '@/app/cards/order/order-view'
import { cardsShowroomJsonLd } from '@/lib/cards-jsonld'

type Offer = { price: number; priceCurrency: string; priceSpecification: unknown }

describe('cardsShowroomJsonLd', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('marks each card offer as AUD and GST-inclusive without changing the amount', () => {
    for (const t of CARD_TIERS) vi.stubEnv(t.paymentLinkEnv, 'https://buy.stripe.com/test_link')
    const offers = cardsShowroomJsonLd()!.offers as Offer[]
    expect(offers).toHaveLength(CARD_TIERS.length)
    CARD_TIERS.forEach((t, i) => {
      expect(offers[i].price).toBe(t.priceAud)
      expect(offers[i].priceCurrency).toBe('AUD')
      expect(offers[i].priceSpecification).toEqual({
        '@type': 'PriceSpecification',
        price: t.priceAud,
        priceCurrency: 'AUD',
        valueAddedTaxIncluded: true,
      })
    })
  })
})
