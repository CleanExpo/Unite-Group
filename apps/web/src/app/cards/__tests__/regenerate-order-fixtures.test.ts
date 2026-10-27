import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, vi } from 'vitest'

import { SiteNav } from '@/components/public/site/site-nav'

import { OrderView } from '../order/order-view'

const fixtureDir = join(__dirname, 'fixtures')
const NAV_LOGO_PRELOAD = '<link rel="preload" as="image" href="/landing/logos/unite-group-nexus-mark.webp"/>'

const norm = (h: string) =>
  h
    .replace(/_([A-Za-z]+)_[0-9a-f]{6}/g, '_$1')
    .replaceAll('ABN pending', 'ABN 95 691 477 844')
    .replace(/ data-track(?:-[a-z-]+)?="[^"]*"/g, '')

const siteNav = () => norm(renderToStaticMarkup(createElement(SiteNav))).replace(NAV_LOGO_PRELOAD, '')

const TERMS =
  '<p class="_chosen">By paying you agree to our order terms. <a href="/cards/terms" class="_navLink">Order terms</a></p>'
const NOTICE = /<aside[^>]*data-collection-notice="card-enquiry"[^>]*>[\s\S]*?<\/aside>/
const PAYMENT = /<p class="_payEntity">[^<]*<\/p>/g

function strip(html: string) {
  return html
    .replace(NAV_LOGO_PRELOAD, '')
    .replace(siteNav(), '')
    .replace(TERMS, '')
    .replace(NOTICE, '')
    .replace(PAYMENT, '')
}

describe('regenerate order fixtures', () => {
  it.skipIf(!process.env.UPDATE_ORDER_FIXTURES)('writes order-baseline-*.html', () => {
    const cases: Array<[string, boolean, string | null, string | null]> = [
      ['order-baseline-offline.html', false, null, null],
      ['order-baseline-offline-forge.html', false, 'forge', 'abc'],
      ['order-baseline-online.html', true, null, null],
      ['order-baseline-online-forge.html', true, 'forge', 'abc'],
    ]
    for (const [file, online, edition, ref] of cases) {
      if (online) {
        vi.stubEnv('STRIPE_PAYMENT_LINK_CARD_READY', 'https://buy.stripe.com/test_ready')
        vi.stubEnv('STRIPE_PAYMENT_LINK_CARD_CUSTOM', 'https://buy.stripe.com/test_custom')
      } else {
        vi.unstubAllEnvs()
      }
      const html = strip(norm(renderToStaticMarkup(createElement(OrderView, { edition, referrer: ref }))))
      writeFileSync(join(fixtureDir, file), html, 'utf8')
    }
    vi.unstubAllEnvs()
  })
})
