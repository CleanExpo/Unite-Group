// UNI-3175: the $99 Starter plan and $22 email signatures are the full price the customer
// pays, GST included (Phill, 02/11/2026, confirmed 23/11/2026). Every surface that names
// them reads the wording from one owner, src/lib/public-pricing.ts, so they cannot drift.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import * as pricing from '@/lib/public-pricing'
import { pricingPageJsonLd } from '@/lib/pricing-jsonld'
import { homeFaqItems } from '@/components/public/home/faq-data'
import { TODAY } from '@/components/public/today-coming-data'

const { GST_INCLUDED, SIGNATURE_ADDON, STARTER_PLAN } = pricing as typeof pricing & { GST_INCLUDED: string }
const web = join(__dirname, '..', '..', '..')

describe('GST-inclusive plan and add-on prices (UNI-3175)', () => {
  it('has one owner for the wording, and it says GST included', () => {
    expect(GST_INCLUDED).toBe('GST included')
    expect('PLUS_GST' in pricing, 'the old plus-GST label is still exported').toBe(false)
    expect(STARTER_PLAN.priceAud).toBe(99)
    expect(SIGNATURE_ADDON.priceAud).toBe(22)
  })

  it('pricing JSON-LD marks both offers as tax-inclusive at the shown price', () => {
    const ld = pricingPageJsonLd() as {
      description: string
      mainEntity: { itemListElement: Array<{ name: string; price: number; priceSpecification?: Record<string, unknown> }> }
    }
    expect(ld.description).toContain('GST included')
    const offers = ld.mainEntity.itemListElement
    expect(offers.map((o) => o.price)).toEqual([99, 22])
    for (const offer of offers) {
      expect(offer.priceSpecification, `${offer.name} has no priceSpecification`).toMatchObject({
        '@type': 'UnitPriceSpecification',
        price: offer.price,
        priceCurrency: 'AUD',
        valueAddedTaxIncluded: true,
      })
    }
  })

  it('home FAQ and the Today list say GST included, never plus GST', () => {
    const cost = homeFaqItems().find((i) => i.q === 'What does it cost?')
    expect(cost?.a).toContain('$99 a month')
    expect(cost?.a).toContain('both GST included')
    const lines = TODAY.map((t) => t.line).join('\n')
    expect(lines).toContain('$99 a month, GST included')
    expect(lines).toContain('$22 each, GST included')
    for (const s of [cost?.a ?? '', lines]) expect(s).not.toMatch(/plus GST/i)
  })

  it('llms.txt states the same GST-inclusive prices and no 10% uplift', () => {
    const llms = readFileSync(join(web, 'public', 'llms.txt'), 'utf8')
    expect(llms).toContain(`- Starter plan: A$${STARTER_PLAN.priceAud} a month, ${GST_INCLUDED}; ask us to start.`)
    expect(llms).toContain(`- Email signatures: A$${SIGNATURE_ADDON.priceAud} each, ${GST_INCLUDED}, an add-on; ask us to start.`)
    expect(llms).toContain(`/pricing : Starter plan A$${STARTER_PLAN.priceAud} a month, ${GST_INCLUDED}, and add-ons`)
    expect(llms).toContain(`/signatures : email signatures add-on, A$${SIGNATURE_ADDON.priceAud} each, ${GST_INCLUDED}`)
    expect(llms).not.toMatch(/plus GST/i)
    expect(llms).not.toContain((STARTER_PLAN.priceAud * 1.1).toFixed(2))
  })
})
