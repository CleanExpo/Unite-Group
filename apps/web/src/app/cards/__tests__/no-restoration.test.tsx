import { readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { CardsStrip } from '@/components/public/cards-strip'
import CardsShowroomPage, { metadata as showroomMeta } from '../page'
import CardOrderPage, { metadata as orderMeta } from '../order/page'
import CardTermsPage, { metadata as termsMeta } from '../terms/page'
import CardThanksPage, { metadata as thanksMeta } from '../thanks/page'
import { OrderView } from '../order/order-view'
import { EDITIONS, resolveEdition } from '../editions'
import { PAYMENT_ENTITY_LINE } from '../payment-entity'

/**
 * Phill's hard rule (26/10/2026): the Unite-Group website never shows his own businesses or restoration,
 * training, CARSI, Disaster Recovery, NRPG or RestoreAssist content. These are the public card routes.
 * The one allowed mention is CARSI Pty Ltd as the related company that takes card payments (founder decision
 * 26/10/2026). Only the legal phrase "our related company[,] CARSI Pty Ltd" is removed before the scan, so any
 * other CARSI mention, and every other banned word in the same sentence, still fails.
 */
const BANNED = /restor|training|disaster recovery|nrpg|restoreassist|synthex|trade hall|carsi/i
const PAYMENT_ENTITY = /\b[Oo]ur related company,? CARSI Pty Ltd\b/g

const scan = (html: string) => BANNED.exec(html.replace(PAYMENT_ENTITY, ''))?.[0] ?? null

const online = () => {
  vi.stubEnv('STRIPE_PAYMENT_LINK_CARD_READY', 'https://buy.stripe.com/test_ready')
  vi.stubEnv('STRIPE_PAYMENT_LINK_CARD_CUSTOM', 'https://buy.stripe.com/test_custom')
}

afterEach(() => vi.unstubAllEnvs())

const html = (node: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(node)
const order = (edition: string | null) => html(createElement(OrderView, { edition, referrer: null }))
const thanks = async (searchParams: Record<string, string>) =>
  html(await CardThanksPage({ searchParams: Promise.resolve(searchParams) }))

describe('public card routes carry no restoration or sister-business content', () => {
  it('covers every page under /cards, so a new card route must be added here', () => {
    const root = join(__dirname, '..')
    const pages: string[] = []
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const path = join(dir, name)
        if (name === '__tests__' || name === 'node_modules') continue
        if (statSync(path).isDirectory()) walk(path)
        else if (name === 'page.tsx') pages.push(relative(root, path).split('\\').join('/'))
      }
    }
    walk(root)
    expect(pages.sort()).toEqual(['order/page.tsx', 'page.tsx', 'terms/page.tsx', 'thanks/page.tsx'])
  })

  it('the edition list itself', () => {
    expect(EDITIONS.length, 'positive control: editions were read').toBeGreaterThan(5)
    for (const e of EDITIONS) expect(scan(JSON.stringify(e)), e.name).toBeNull()
  })

  it('/cards showroom', () => {
    const page = html(createElement(CardsShowroomPage))
    expect(page, 'positive control: the showroom rendered its tiles').toContain('data-edition="')
    expect(scan(page)).toBeNull()
  })

  it.each([false, true])('/cards/order with payment links online=%s', (on) => {
    if (on) online()
    const page = order(null)
    expect(page, 'positive control: the picker rendered').toContain('name="edition"')
    // Pay buttons, and the payment line under each, show only when the payment links are set.
    if (on) expect(page, 'positive control: the payment line rendered').toContain(PAYMENT_ENTITY_LINE)
    expect(scan(page)).toBeNull()
  })

  it('/cards/order?edition=restoration picks nothing and shows nothing restoration', () => {
    expect(resolveEdition('restoration')).toBeNull()
    expect(scan(order('restoration'))).toBeNull()
  })

  it('/cards/order page wrapper', async () => {
    const page = html(await CardOrderPage({ searchParams: Promise.resolve({ edition: 'restoration' }) }))
    expect(page).toContain('name="edition"')
    expect(scan(page)).toBeNull()
  })

  it('/cards/terms', () => {
    const page = html(createElement(CardTermsPage))
    expect(page.match(PAYMENT_ENTITY), 'positive control: the terms rendered the payment entity').not.toBeNull()
    expect(scan(page)).toBeNull()
  })

  it.each([{}, { session_id: 'cs_test_a1B2c3' }])('/cards/thanks %o', async (params) => {
    const page = await thanks(params)
    expect(page).toContain('Thank you')
    expect(scan(page)).toBeNull()
  })

  it('every card route\'s metadata', () => {
    for (const meta of [showroomMeta, orderMeta, termsMeta, thanksMeta]) expect(scan(JSON.stringify(meta))).toBeNull()
  })

  it('the home page film strip', () => {
    const strip = html(createElement(CardsStrip))
    expect(strip, 'positive control: the strip rendered its tiles').toContain('data-gallery-tile="')
    expect(scan(strip)).toBeNull()
  })

  it('the scan still sees banned words next to the allowed payment entity', () => {
    expect(scan(`${PAYMENT_ENTITY_LINE} Our CARSI course`)).toBe('CARSI')
    expect(scan('Payment is processed by our related company, CARSI Pty Ltd, a training provider.')).toBe('training')
    expect(scan('CARSI Pty Ltd runs the course.')).toBe('CARSI')
    expect(scan('<p title="restoration">x</p>')).toBe('restor')
    expect(scan('Book a training course')).toBe('training')
    expect(scan(PAYMENT_ENTITY_LINE)).toBeNull()
  })
})
