import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import CardsShowroomPage from '../page'
import CardOrderPage from '../order/page'
import { OrderView } from '../order/order-view'
import { buildCardEnquiryBody } from '../order/enquiry-form'
import { ENQUIRY_FORM_ID } from '../order/order-buy'
import { AI_LABEL, EDITIONS, cleanRef, resolveEdition } from '../editions'

const NAMES = ['signature', 'blueprint', 'forge', 'constellation', 'ink', 'rewind', 'skyline', 'origami', 'portal', 'magnet']

const showroom = () => renderToStaticMarkup(createElement(CardsShowroomPage))
const order = (edition: string | null, referrer: string | null = null) =>
  renderToStaticMarkup(createElement(OrderView, { edition, referrer }))

const checkedEditions = (html: string) => [...html.matchAll(/<input[^>]*name="edition"[^>]*>/g)].filter((m) => m[0].includes('checked')).map((m) => /value="([^"]+)"/.exec(m[0])?.[1])

describe('/cards showroom', () => {
  it('shows the signature reveal and all nine editions, each with its poster, clip and AI label', () => {
    const html = showroom()
    for (const name of NAMES) {
      const start = html.indexOf(`data-edition="${name}"`)
      expect(start, name).toBeGreaterThan(-1)
      const tile = html.slice(start, html.indexOf('</article>', start))
      const e = EDITIONS.find((x) => x.name === name)!
      expect(tile).toContain(`poster="${e.poster}"`)
      expect(tile).toContain(`src="${e.video}"`)
      expect(tile).toContain('preload="metadata"')
      expect(tile).toContain(AI_LABEL)
      expect(tile).toContain(e.line)
      expect(tile).toContain(`href="/cards/order?edition=${name}"`)
    }
    expect(html.match(/data-edition="/g)).toHaveLength(10)
  })

  it('serves every clip and poster from the local copy, never a CDN', () => {
    const publicDir = join(__dirname, '..', '..', '..', '..', 'public')
    for (const e of EDITIONS) {
      for (const file of [e.video, e.poster]) {
        expect(file.startsWith('/cards/media/'), file).toBe(true)
        expect(existsSync(join(publicDir, file)), file).toBe(true)
      }
    }
    expect(showroom()).not.toMatch(/cloudfront|higgsfield\.ai/i)
  })
})

describe('/cards/order', () => {
  it('says plainly that orders are not taken online, and offers no payment', () => {
    const html = order(null)
    expect(html).toContain('data-state="orders-offline"')
    expect(html).toContain('We’re not taking orders online yet.')
    expect(html).not.toMatch(/stripe|checkout|\$\d/i)
  })

  const tier = (html: string, id: string) => {
    const start = html.indexOf(`data-tier="${id}"`)
    return start < 0 ? null : html.slice(start, html.indexOf('</article>', start))
  }

  it('offers both tiers, each with its own price and Stripe link, once both links are configured', () => {
    vi.stubEnv('STRIPE_PAYMENT_LINK_CARD_READY', 'https://buy.stripe.com/test_ready')
    vi.stubEnv('STRIPE_PAYMENT_LINK_CARD_CUSTOM', 'https://buy.stripe.com/test_custom')
    try {
      const html = order(null)
      expect(html).toContain('data-state="orders-online"')
      expect(html).not.toContain('data-state="orders-offline"')
      const ready = tier(html, 'ready')!
      expect(ready).toContain('$249')
      expect(ready).toContain('href="https://buy.stripe.com/test_ready"')
      expect(ready).not.toContain('test_custom')
      const custom = tier(html, 'custom')!
      expect(custom).toContain('$449')
      expect(custom).toContain('href="https://buy.stripe.com/test_custom"')
      expect(custom).not.toContain('test_ready')
      expect(html).toContain('GST included')
      // The enquiry form stays for people who want to talk first.
      expect(html).toContain('name="edition"')
    } finally {
      vi.unstubAllEnvs()
    }
  })

  it('shows only the tier whose link is set, never a price without a way to pay', () => {
    vi.stubEnv('STRIPE_PAYMENT_LINK_CARD_READY', 'https://buy.stripe.com/test_ready')
    try {
      const html = order(null)
      expect(tier(html, 'ready')).not.toBeNull()
      expect(tier(html, 'custom')).toBeNull()
      expect(html).not.toContain('$449')
    } finally {
      vi.unstubAllEnvs()
    }
  })

  it('refuses a link that is not an https Stripe Payment Link, and stays enquiry-only', () => {
    for (const bad of ['https://evil.example/pay', 'http://buy.stripe.com/test_card123', 'not a url', '   ']) {
      vi.stubEnv('STRIPE_PAYMENT_LINK_CARD_READY', bad)
      vi.stubEnv('STRIPE_PAYMENT_LINK_CARD_CUSTOM', bad)
      try {
        const html = order(null)
        expect(html, bad).toContain('data-state="orders-offline"')
        expect(html, bad).not.toMatch(/stripe|\$\d/i)
      } finally {
        vi.unstubAllEnvs()
      }
    }
  })

  it('opens with the chosen edition already selected', async () => {
    expect(checkedEditions(order('forge'))).toEqual(['forge'])
    // Through the real page entry, as the card links to it.
    const page = await CardOrderPage({ searchParams: Promise.resolve({ edition: 'Origami', ref: 'phill-mcgurk' }) })
    expect(checkedEditions(renderToStaticMarkup(page))).toEqual(['origami'])
  })

  it('gives every opener tile a 9:16 poster, so the square signature is never cropped or boxed', () => {
    const html = order(null)
    const publicDir = join(__dirname, '..', '..', '..', '..', 'public')
    for (const e of EDITIONS) {
      const src = e.aspect === '9/16' ? e.poster : e.pickerPoster
      expect(src, `${e.name} needs a 9:16 picker poster`).toBeDefined()
      expect(existsSync(join(publicDir, src!)), src).toBe(true)
      const img = new RegExp(`<img[^>]*src="${src}"[^>]*>`).exec(html)?.[0] ?? ''
      expect(img, e.name + ' tile shows its 9:16 poster').not.toBe('')
    }
  })

  it('ignores unknown or malformed editions instead of guessing', async () => {
    for (const value of ['bogus', '', '<script>', 'forge2', undefined]) {
      const page = await CardOrderPage({ searchParams: Promise.resolve({ edition: value }) })
      expect(checkedEditions(renderToStaticMarkup(page)), String(value)).toEqual([])
    }
  })
})

describe('resolveEdition / cleanRef', () => {
  it('accepts every catalogued name, case-insensitively, and the first of repeated params', () => {
    for (const name of NAMES) expect(resolveEdition(name.toUpperCase())?.name).toBe(name)
    expect(resolveEdition(['ink', 'forge'])?.name).toBe('ink')
  })

  it('rejects anything not in the catalogue', () => {
    for (const value of ['bogus', ' ink2', '../ink', 'signature-x', undefined, []]) {
      expect(resolveEdition(value)).toBeNull()
    }
  })

  it('reduces ?ref= to the card’s own safe alphabet', () => {
    expect(cleanRef('phill-mcgurk')).toBe('phill-mcgurk')
    expect(cleanRef('<b>x</b>')).toBe('bxb')
    expect(cleanRef('')).toBeNull()
    expect(cleanRef('a'.repeat(80))).toHaveLength(60)
  })
})

describe('buildCardEnquiryBody', () => {
  function form(fields: Record<string, string>) {
    const data = new FormData()
    for (const [k, v] of Object.entries(fields)) data.set(k, v)
    return data
  }

  it('sends the existing /api/leads contract: name, email, edition interest, card referrer', () => {
    expect(
      buildCardEnquiryBody(
        form({ first_name: ' Sam ', email: 'sam@example.com.au', company: 'Sam Cafe', website: 'sam.com.au', edition: 'forge', message: 'Need 3 cards' }),
        'phill-mcgurk',
      ),
    ).toMatchObject({
      first_name: 'Sam',
      email: 'sam@example.com.au',
      company: 'Sam Cafe',
      interests: 'living-card:forge',
      message: 'Website: sam.com.au\nNeed 3 cards',
      referral_source: 'cards:phill-mcgurk',
      business_key: 'unite-cards',
      marketing_consent: false,
    })
  })

  it('carries the edition chosen in the film strip into the enquiry, though the radios sit outside the form', () => {
    document.body.innerHTML = order('forge')
    const enquiry = document.getElementById(ENQUIRY_FORM_ID)
    expect(enquiry).toBeInstanceOf(HTMLFormElement)
    const data = new FormData(enquiry as HTMLFormElement)
    expect(data.get('edition')).toBe('forge')
    expect(buildCardEnquiryBody(data, null).interests).toBe('living-card:forge')
    document.body.innerHTML = ''
  })

  it('works with no edition and no referrer', () => {
    expect(buildCardEnquiryBody(form({ first_name: 'A', email: 'a@b.co', marketing_consent: 'on' }), null)).toMatchObject({
      interests: 'living-card',
      referral_source: 'cards',
      marketing_consent: true,
    })
  })
})
