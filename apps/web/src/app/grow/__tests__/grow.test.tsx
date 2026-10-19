import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

import GrowPage from '../page'
import { buildLeadBody } from '../lead-form'
import { GROW_PACKAGES, paymentLinkFor, serializeJsonLd } from '../packages'

const render = () => renderToStaticMarkup(createElement(GrowPage))

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('/grow offer page', () => {
  it('shows all three packages with their monthly and setup prices, ex GST', () => {
    const html = render()
    for (const [id, monthly, setup] of [
      ['local-growth', '$397', '$495'],
      ['website-found', '$497', '$2,495'],
      ['lead-machine', '$995', '$3,995'],
    ]) {
      const card = html.slice(html.indexOf(`data-package="${id}"`), html.indexOf('</article>', html.indexOf(`data-package="${id}"`)))
      expect(card).toContain(monthly)
      expect(card).toContain(`plus ${setup} setup`)
    }
    expect(html).toContain('Prices in AUD, excluding GST.')
  })

  it('publishes an OfferCatalog with every package, prices marked ex GST', () => {
    const raw = /<script type="application\/ld\+json">(.*?)<\/script>/.exec(render())?.[1]
    const ld = JSON.parse(raw ?? 'null')
    expect(ld['@type']).toBe('OfferCatalog')
    expect(ld.itemListElement.map((o: { name: string }) => o.name)).toEqual(GROW_PACKAGES.map((p) => p.name))
    expect(ld.itemListElement[0].priceSpecification.every((s: { valueAddedTaxIncluded: boolean }) => s.valueAddedTaxIncluded === false)).toBe(true)
  })

  it('shows no pay button until a Stripe Payment Link is configured', () => {
    expect(render()).not.toContain('buy.stripe.com')
    expect(render()).not.toContain('Start Local Growth')
    vi.stubEnv('STRIPE_PAYMENT_LINK_LOCAL_GROWTH', 'https://buy.stripe.com/test_abc123')
    const html = render()
    expect(html).toContain('href="https://buy.stripe.com/test_abc123"')
    expect(html).toContain('Start Local Growth')
    expect(html).not.toContain('Start Lead Machine')
  })
})

describe('serializeJsonLd', () => {
  it('cannot close the script tag, and still round-trips', () => {
    const data = { name: '</script><script>alert(1)</script>', note: 'a < b' }
    const out = serializeJsonLd(data)
    expect(out).not.toContain('<')
    expect(JSON.parse(out)).toEqual(data)
  })

  it('is what the page embeds', () => {
    const raw = /<script type="application\/ld\+json">(.*?)<\/script>/.exec(render())?.[1] ?? ''
    expect(raw).not.toContain('<')
    expect(raw).toBe(serializeJsonLd(JSON.parse(raw)))
  })
})

describe('paymentLinkFor', () => {
  const pkg = GROW_PACKAGES[0]
  it.each([
    ['https://buy.stripe.com/abc', 'https://buy.stripe.com/abc'],
    ['  https://buy.stripe.com/abc  ', 'https://buy.stripe.com/abc'],
  ])('accepts %s', (value, expected) => {
    expect(paymentLinkFor(pkg, { [pkg.paymentLinkEnv]: value })).toBe(expected)
  })

  it.each([
    undefined,
    '',
    'http://buy.stripe.com/abc',
    'https://buy.stripe.com.evil.example/abc',
    'https://evil.example/buy.stripe.com',
    'https://user:pass@buy.stripe.com/abc',
    'javascript:alert(1)',
    'buy.stripe.com/abc',
  ])('rejects %s', (value) => {
    expect(paymentLinkFor(pkg, { [pkg.paymentLinkEnv]: value })).toBeNull()
  })
})

describe('buildLeadBody', () => {
  function form(fields: Record<string, string>) {
    const data = new FormData()
    for (const [k, v] of Object.entries(fields)) data.set(k, v)
    return data
  }

  it('sends the /api/leads contract: unite-smb business key, package interest, website in the message', () => {
    const body = buildLeadBody(
      form({ first_name: ' Sam ', email: 'sam@example.com.au', company: 'Sam Plumbing', website: 'samplumbing.com.au', package: 'website-found', message: 'Busy in winter' }),
      'tradeshow-melb',
    )
    expect(body).toMatchObject({
      first_name: 'Sam',
      email: 'sam@example.com.au',
      company: 'Sam Plumbing',
      interests: 'website-found',
      message: 'Website: samplumbing.com.au\nBusy in winter',
      referral_source: 'grow:tradeshow-melb',
      business_key: 'unite-smb',
      marketing_consent: false,
    })
  })

  it('records marketing consent only when the box is ticked', () => {
    expect(buildLeadBody(form({ first_name: 'A', email: 'a@b.co', marketing_consent: 'on' }), null)).toMatchObject({
      marketing_consent: true,
      referral_source: 'grow',
    })
  })
})
