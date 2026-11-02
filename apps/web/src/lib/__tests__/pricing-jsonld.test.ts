import { describe, expect, it } from 'vitest'

import { HOME_HIGHLIGHTS } from '@/components/public/home/copy'
import { homeFaqItems } from '@/components/public/home/faq-data'
import { pricingPageJsonLd } from '@/lib/pricing-jsonld'

type Offer = { name: string; price: number; priceCurrency: string; priceSpecification: unknown }

// UNI-3175: Phill confirmed on 2 Nov 2026 that $99 and $22 already include GST.
describe('pricingPageJsonLd', () => {
  const jsonLd = pricingPageJsonLd()
  const offers = (jsonLd.mainEntity as { itemListElement: Offer[] }).itemListElement

  it.each([
    ['Starter', 99],
    ['Email signatures', 22],
  ])('marks %s at %i AUD with GST included', (name, price) => {
    const offer = offers.find((o) => o.name === name)
    expect(offer?.price).toBe(price)
    expect(offer?.priceCurrency).toBe('AUD')
    expect(offer?.priceSpecification).toEqual({
      '@type': 'PriceSpecification',
      price,
      priceCurrency: 'AUD',
      valueAddedTaxIncluded: true,
    })
  })

  it('says GST included in its description and never shows a GST-added amount', () => {
    expect(jsonLd.description).toContain('GST included')
    const serialised = JSON.stringify(jsonLd)
    expect(serialised).not.toMatch(/108\.9|24\.2|plus GST/)
    expect(serialised).not.toContain('valueAddedTaxIncluded":false')
  })
})

describe('home page price copy', () => {
  it('says both prices include GST in the FAQ', () => {
    const cost = homeFaqItems().find((i) => i.q === 'What does it cost?')
    expect(cost?.a).toContain('both GST included')
    expect(cost?.a).not.toContain('plus GST')
  })

  it('does not suggest GST may be added on the pricing highlight', () => {
    const line = HOME_HIGHLIGHTS.cards.find((c) => c.title === 'Pricing')?.line
    expect(line).toContain('GST included')
    expect(line).not.toContain('where it applies')
  })
})
