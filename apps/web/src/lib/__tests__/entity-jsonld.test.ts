import { describe, expect, it } from 'vitest'

import { CARD_TIERS } from '@/app/cards/order/order-view'

import { entityJsonLd } from '../entity'

const graph = () => entityJsonLd()['@graph'] as Record<string, any>[]
const ofType = (t: string) => graph().filter((n) => n['@type'] === t)

describe('entity JSON-LD (AC-8)', () => {
  it('has one OnlineBusiness with name, url, logo and AU and NZ, and no sameAs or LocalBusiness', () => {
    const orgs = ofType('OnlineBusiness')
    expect(orgs).toHaveLength(1)
    const org = orgs[0]
    expect(org.name).toBe('Unite-Group Nexus Pty Ltd')
    expect(org.url).toBe('https://unite-group.in')
    expect(org.logo).toMatch(/^https:\/\/unite-group\.in\/.+\.png$/)
    expect(org.areaServed.map((a: { name: string }) => a.name)).toEqual(['Australia', 'New Zealand'])
    expect('sameAs' in org).toBe(false)
    expect(JSON.stringify(entityJsonLd())).not.toMatch(/LocalBusiness/)
  })

  it('has one WebSite', () => {
    expect(ofType('WebSite')).toHaveLength(1)
  })

  it('has a Product and an AUD Offer for each card tier, priced from CARD_TIERS', () => {
    const products = ofType('Product')
    expect(products).toHaveLength(CARD_TIERS.length)
    CARD_TIERS.forEach((t, i) => {
      expect(products[i].offers['@type']).toBe('Offer')
      expect(products[i].offers.price).toBe(String(t.priceAud))
      expect(products[i].offers.priceCurrency).toBe('AUD')
    })
  })

  it('never names the internal agency', () => {
    expect(JSON.stringify(entityJsonLd())).not.toMatch(/synthex/i)
  })
})
