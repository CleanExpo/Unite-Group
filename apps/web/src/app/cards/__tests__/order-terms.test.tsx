import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { OrderView } from '../order/order-view'

const fixture = (n: string) => readFileSync(join(__dirname, 'fixtures', n), 'utf8')
const render = (edition: string | null, referrer: string | null) =>
  renderToStaticMarkup(createElement(OrderView, { edition, referrer }))

/**
 * CSS-module class names carry a hash of the stylesheet; compare shapes, not hashes. The baselines were
 * captured from origin/main when the footer still said 'ABN pending'; the ABN fallback is a separate, tested
 * change (company.test.ts), so the old label is mapped to the new one here.
 */
const norm = (h: string) =>
  h
    .replace(/_([A-Za-z]+)_[0-9a-f]{6}/g, '_$1')
    .replaceAll('ABN pending', 'ABN 95 691 477 844')
    // Site analytics (UNI-3001) adds data-track* attributes to CTAs and films; they are not part of this baseline.
    .replace(/ data-track(?:-[a-z-]+)?="[^"]*"/g, '')

/** The one terms addition, in the buy box. */
const TERMS_ADDITION =
  '<p class="_chosen">By paying you agree to our order terms. <a href="/cards/terms" class="_navLink">Order terms</a></p>'
/** The CARSI Pty Ltd payment line under each Order button (UNI-3017). */
const PAYMENT_ADDITION = /<p class="_payEntity">[^<]*<\/p>/g
/** The shared APP 5 notice, inside the enquiry form directly before the submit button. */
const NOTICE_ADDITION = /<p[^>]*data-collection-notice="card-enquiry"[^>]*>[\s\S]*?<\/p>/

const online = () => {
  vi.stubEnv('STRIPE_PAYMENT_LINK_CARD_READY', 'https://buy.stripe.com/test_ready')
  vi.stubEnv('STRIPE_PAYMENT_LINK_CARD_CUSTOM', 'https://buy.stripe.com/test_custom')
}

afterEach(() => vi.unstubAllEnvs())

const CASES: Array<[string, boolean, string | null, string | null]> = [
  ['order-baseline-offline.html', false, null, null],
  ['order-baseline-offline-forge.html', false, 'forge', 'abc'],
  ['order-baseline-online.html', true, null, null],
  ['order-baseline-online-forge.html', true, 'forge', 'abc'],
]

describe('/cards/order terms link', () => {
  it.each(CASES)('shows exactly one Order terms link and the agreement line (%s)', (_f, on, edition, ref) => {
    if (on) online()
    const html = render(edition, ref)
    expect(html.match(/href="\/cards\/terms"/g)).toHaveLength(1)
    expect(norm(html)).toContain(TERMS_ADDITION)
  })

  it.each(CASES)('is otherwise identical to the page on origin/main (%s)', (f, on, edition, ref) => {
    if (on) online()
    const html = norm(render(edition, ref))
    const stripped = html.replace(TERMS_ADDITION, '').replace(NOTICE_ADDITION, '').replace(PAYMENT_ADDITION, '')
    expect(stripped).toBe(norm(fixture(f)))
  })

  it('puts the terms line inside the buy box, after the tiers and offline panel', () => {
    online()
    const html = render(null, null)
    const box = html.indexOf('data-buy-box')
    const tiers = html.indexOf('data-tier="custom"')
    const terms = html.indexOf('href="/cards/terms"')
    const facts = html.indexOf('<dl')
    expect(box).toBeLessThan(tiers)
    expect(tiers).toBeLessThan(terms)
    expect(terms).toBeLessThan(facts)
  })

  it('leaves the payment links exactly as configured', () => {
    online()
    const html = render(null, null)
    expect(html).toContain('href="https://buy.stripe.com/test_ready"')
    expect(html).toContain('href="https://buy.stripe.com/test_custom"')
  })
})

describe('/cards/order collection notice', () => {
  it('sits inside the enquiry form, directly before the submit button, with a link to the privacy policy', () => {
    const html = render(null, null)
    const form = html.slice(html.indexOf('<form'), html.indexOf('</form>'))
    const notice = form.match(NOTICE_ADDITION)?.[0] ?? ''
    expect(notice).not.toBe('')
    expect(notice).toContain('href="/privacy-policy"')
    expect(form.indexOf(notice)).toBeLessThan(form.search(/<button[^>]*type="submit"/))
    expect(form.slice(form.indexOf(notice) + notice.length)).toMatch(/^<div><button[^>]*type="submit"/)
  })
})
