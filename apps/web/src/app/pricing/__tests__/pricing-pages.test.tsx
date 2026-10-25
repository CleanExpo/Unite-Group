import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import PricingPage, { metadata as pricingMeta } from '@/app/pricing/page'
import SignaturesPage, { metadata as sigMeta } from '@/app/signatures/page'
import { isPublicPath } from '@/proxy'
import { CARD_FROM_AUD, SIGNATURE_ADDON, STARTER_PLAN } from '@/lib/public-pricing'

const text = (h: string) => h.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ')
const root = join(__dirname, '..', '..', '..', '..')

describe('/pricing (UNI-3017)', () => {
  const html = renderToStaticMarkup(<PricingPage />)
  it('shows Starter at $99 a month, signatures at $22 each and the card from $249', () => {
    expect(STARTER_PLAN.priceAud).toBe(99)
    expect(SIGNATURE_ADDON.priceAud).toBe(22)
    expect(CARD_FROM_AUD).toBe(249)
    const t = text(html)
    expect(t).toContain('$99 a month')
    expect(t).toContain('$22 each')
    expect(t).toContain('from $249')
  })
  it('links to the signatures page, the card and the existing card order page, and creates no new payment link', () => {
    expect(html).toContain('href="/signatures"')
    expect(html).toContain('href="/cards/order"')
    expect(html).not.toMatch(/buy\.stripe\.com|checkout\.stripe/)
  })
  it('is canonical and never names the restoration sister companies', () => {
    expect(pricingMeta.alternates?.canonical).toBe('https://unite-group.in/pricing')
    expect(html).not.toMatch(/Disaster Recovery|NRPG|RestoreAssist|CARSI|PI CEO/)
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
