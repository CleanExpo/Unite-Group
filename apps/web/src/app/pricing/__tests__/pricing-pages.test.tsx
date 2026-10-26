import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

import PricingPage, { metadata as pricingMeta } from '@/app/pricing/page'
import SignaturesPage, { metadata as sigMeta } from '@/app/signatures/page'
import { isPublicPath } from '@/proxy'
import { cardFromAud, SIGNATURE_ADDON, STARTER_PLAN } from '@/lib/public-pricing'

const text = (h: string) => h.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ')
const root = join(__dirname, '..', '..', '..', '..')

describe('/pricing (UNI-3017)', () => {
  const READY = 'STRIPE_PAYMENT_LINK_CARD_READY'
  const CUSTOM = 'STRIPE_PAYMENT_LINK_CARD_CUSTOM'
  afterEach(() => vi.unstubAllEnvs())

  it('shows Starter at $99 a month and signatures at $22 each', () => {
    expect(STARTER_PLAN.priceAud).toBe(99)
    expect(SIGNATURE_ADDON.priceAud).toBe(22)
    const t = text(renderToStaticMarkup(<PricingPage />))
    expect(t).toContain('$99 a month')
    expect(t).toContain('$22 each')
  })
  it('shows the card from-price only from tiers whose payment link is set, like the order page', () => {
    vi.stubEnv(READY, '')
    vi.stubEnv(CUSTOM, 'https://buy.stripe.com/test_custom')
    expect(cardFromAud()).toBe(449)
    expect(text(renderToStaticMarkup(<PricingPage />))).toContain('from $449')
    vi.stubEnv(READY, 'https://buy.stripe.com/test_ready')
    expect(cardFromAud()).toBe(249)
    expect(text(renderToStaticMarkup(<PricingPage />))).toContain('from $249')
  })
  it('shows no card price while online ordering is off', () => {
    vi.stubEnv(READY, '')
    vi.stubEnv(CUSTOM, 'not-a-stripe-link')
    expect(cardFromAud()).toBeNull()
    const t = text(renderToStaticMarkup(<PricingPage />))
    expect(t).not.toMatch(/\$249|\$449|GST included/)
    expect(t).toContain('online orders are not open yet')
    expect(pricingMeta.description).not.toMatch(/\$249|\$449/)
  })
  it('links to the signatures page, the card and the existing card order page, and creates no new payment link', () => {
    vi.stubEnv(READY, 'https://buy.stripe.com/test_ready')
    const html = renderToStaticMarkup(<PricingPage />)
    expect(html).toContain('href="/signatures"')
    expect(html).toContain('href="/cards/order"')
    expect(html).not.toMatch(/buy\.stripe\.com|checkout\.stripe/)
  })
  it('is canonical and never names the restoration sister companies', () => {
    expect(pricingMeta.alternates?.canonical).toBe('https://unite-group.in/pricing')
    expect(renderToStaticMarkup(<PricingPage />)).not.toMatch(/Disaster Recovery|NRPG|RestoreAssist|CARSI|PI CEO/)
  })
})

describe('/signatures (UNI-3017)', () => {
  const html = renderToStaticMarkup(<SignaturesPage />)
  it('prices the add-on at $22 each and introduces Margot', () => {
    expect(text(html)).toContain('$22 each')
    expect(html).toContain('Margot')
    expect(html).toContain('data-signature-sample')
    expect(sigMeta.alternates?.canonical).toBe('https://unite-group.in/signatures')
  })
})

describe('public routing (UNI-3017)', () => {
  const next = readFileSync(join(root, 'next.config.mjs'), 'utf8')
  it('serves exactly /pricing and /signatures without a login, and nothing beneath them', () => {
    expect(isPublicPath('/pricing')).toBe(true)
    expect(isPublicPath('/signatures')).toBe(true)
    for (const p of ['/pricing/secret', '/signatures/x', '/pricingx']) expect(isPublicPath(p), p).toBe(false)
  })
  it('redirects /privacy, /signup and /auth/signup instead of a 404', () => {
    expect(next).toContain("{ source: '/privacy', destination: '/privacy-policy', permanent: false }")
    expect(next).toContain("{ source: '/signup', destination: '/pricing', permanent: false }")
    expect(next).toContain("{ source: '/auth/signup', destination: '/pricing', permanent: false }")
  })
})
