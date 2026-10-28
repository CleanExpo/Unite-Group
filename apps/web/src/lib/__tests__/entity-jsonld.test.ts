import { afterEach, describe, expect, it, vi } from 'vitest'

import { CARD_TIERS } from '@/app/cards/order/order-view'

import { entityJsonLd } from '../entity'

const graph = () => entityJsonLd()['@graph'] as Record<string, any>[]
const ofType = (t: string) => graph().filter((n) => n['@type'] === t)

afterEach(() => vi.unstubAllEnvs())

describe('entity JSON-LD (AC-8)', () => {
  it('has one OnlineBusiness with name, url, logo and AU and NZ, sameAs only the confirmed LinkedIn page, and no LocalBusiness', () => {
    const orgs = ofType('OnlineBusiness')
    expect(orgs).toHaveLength(1)
    const org = orgs[0]
    expect(org.name).toBe('Unite-Group Nexus Pty Ltd')
    expect(org.url).toBe('https://unite-group.in')
    expect(org.logo).toMatch(/^https:\/\/unite-group\.in\/.+\.png$/)
    expect(org.areaServed.map((a: { name: string }) => a.name)).toEqual(['Australia', 'New Zealand'])
    expect(org.sameAs).toEqual(['https://www.linkedin.com/company/unite-group-australia'])
    expect(JSON.stringify(entityJsonLd())).not.toMatch(/LocalBusiness/)
  })

  it('has one WebSite', () => {
    expect(ofType('WebSite')).toHaveLength(1)
  })

  it('has a Product and an AUD Offer for each card tier, priced from CARD_TIERS', () => {
    vi.stubEnv('STRIPE_PAYMENT_LINK_CARD_READY', 'https://buy.stripe.com/test_ready')
    vi.stubEnv('STRIPE_PAYMENT_LINK_CARD_CUSTOM', 'https://buy.stripe.com/test_custom')
    const products = ofType('Product')
    expect(products).toHaveLength(CARD_TIERS.length)
    CARD_TIERS.forEach((t, i) => {
      expect(products[i].offers['@type']).toBe('Offer')
      expect(products[i].offers.price).toBe(String(t.priceAud))
      expect(products[i].offers.priceCurrency).toBe('AUD')
      expect(products[i].offers.availability).toBe('https://schema.org/InStock')
    })
  })

  it('offers no card a buyer cannot pay for: none while ordering is off, made-for-you alone when only it is live', () => {
    vi.stubEnv('STRIPE_PAYMENT_LINK_CARD_READY', '')
    vi.stubEnv('STRIPE_PAYMENT_LINK_CARD_CUSTOM', '')
    expect(ofType('Product')).toHaveLength(0)
    vi.stubEnv('STRIPE_PAYMENT_LINK_CARD_CUSTOM', 'https://buy.stripe.com/test_custom')
    expect(ofType('Product').map((p) => p.offers.price)).toEqual(['449'])
  })

  it('never names the internal agency', () => {
    expect(JSON.stringify(entityJsonLd())).not.toMatch(/synthex/i)
  })
})
