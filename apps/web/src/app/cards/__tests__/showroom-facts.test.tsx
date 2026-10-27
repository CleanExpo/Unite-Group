import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import CardsShowroomPage from '../page'
import { CARD_TIERS } from '../order/order-view'
import { CARD_ORDER_TERMS } from '../terms/terms-content'
import {
  EXCLUSION_FACTS,
  FAQ_FACTS,
  HOSTING_FACTS,
  PRICE_NOTE,
  provenanceStrings,
} from '../showroom-facts'

// Prices show only for tiers whose payment link is live (liveCardTiers); open both for the page under test.
vi.stubEnv('STRIPE_PAYMENT_LINK_CARD_READY', 'https://buy.stripe.com/test_ready')
vi.stubEnv('STRIPE_PAYMENT_LINK_CARD_CUSTOM', 'https://buy.stripe.com/test_custom')
const html = renderToStaticMarkup(createElement(CardsShowroomPage))
vi.unstubAllEnvs()
const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')

describe('/cards showroom facts', () => {
  it('shows each tier name with its price in the terms form, from CARD_TIERS', () => {
    for (const tier of CARD_TIERS) {
      expect(text).toContain(tier.name)
      expect(text).toContain(`AUD ${tier.priceAud} (GST included)`)
    }
    expect(text).toContain('AUD 249')
    expect(text).toContain('AUD 449')
    expect(text).toContain('GST included')
  })

  it('names no tier price while online ordering is off', () => {
    vi.stubEnv('STRIPE_PAYMENT_LINK_CARD_READY', '')
    vi.stubEnv('STRIPE_PAYMENT_LINK_CARD_CUSTOM', '')
    const closed = renderToStaticMarkup(createElement(CardsShowroomPage)).replace(/<[^>]+>/g, ' ')
    vi.unstubAllEnvs()
    expect(closed).not.toMatch(/AUD \d/)
    expect(closed).toContain('Online orders are not open yet')
  })

  it('states the 12-month hosting term and the renewal rule', () => {
    expect(text).toContain('We host your card for 12 months from the day it goes live. There is no monthly fee.')
    expect(text).toContain('Hosting does not renew unless you choose to pay.')
  })

  it('lists the exclusions', () => {
    expect(text).toContain('A new concept or full redesign is not a revision; we quote it first.')
    // a sentence that points at "this section" of the terms reads wrongly off the terms page
    expect(text).not.toContain('this section lists')
    // the order page's tier line says "below"; on /cards the films are above the price
    expect(text).not.toContain('ten card films below')
    expect(text).toContain('Our services come with guarantees that cannot be excluded under the Australian Consumer Law.')
    expect(EXCLUSION_FACTS.length).toBeGreaterThanOrEqual(4)
    for (const s of EXCLUSION_FACTS) expect(text).toContain(s)
  })

  it('has an FAQ of 4 to 6 questions, each answer rendered', () => {
    expect(FAQ_FACTS.length).toBeGreaterThanOrEqual(4)
    expect(FAQ_FACTS.length).toBeLessThanOrEqual(6)
    expect(html).toMatch(/<h2[^>]*>[^<]*(Questions|FAQ)/)
    for (const f of FAQ_FACTS) {
      expect(text).toContain(f.question)
      for (const s of f.answer) expect(text).toContain(s)
    }
  })

  it('links to the order terms and the order page', () => {
    expect(html).toMatch(/<a [^>]*href="\/cards\/terms"[^>]*>[^<]*Order terms/)
    expect(html).toContain('href="/cards/order"')
  })

  it('PROVENANCE: every published claim is a substring of the approved order terms', () => {
    const claims = provenanceStrings()
    expect(claims.length).toBeGreaterThan(15)
    for (const c of claims) {
      const ok = CARD_ORDER_TERMS.includes(c)
      expect(ok, `invented claim: ${c}`).toBe(true)
    }
    // Control: the guard must be able to fail.
    expect(CARD_ORDER_TERMS.includes('Hosting is free for life.')).toBe(false)
    expect(PRICE_NOTE).toBe('Prices are in Australian dollars and include GST. You pay the full price up front.')
    expect(HOSTING_FACTS.length).toBeGreaterThan(0)
  })
})
