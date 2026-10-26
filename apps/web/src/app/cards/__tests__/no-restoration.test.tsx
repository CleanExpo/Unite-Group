import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { CardsStrip } from '@/components/public/cards-strip'
import CardsShowroomPage, { metadata } from '../page'
import { OrderView } from '../order/order-view'
import { EDITIONS, resolveEdition } from '../editions'
import { PAYMENT_ENTITY_LINE } from '../payment-entity'

/**
 * Phill's hard rule (26/10/2026): the Unite-Group website never shows his own businesses or restoration,
 * training, CARSI, Disaster Recovery, NRPG or RestoreAssist content. These are the public card surfaces.
 * The one allowed mention is the legal payment-entity line, which stays true until card payments move to a
 * Unite-Group entity; it is removed before the scan, by its exact text, so nothing else can hide behind it.
 */
const BANNED = /restor|disaster recovery|nrpg|restoreassist|synthex|trade hall|carsi/i

const scan = (html: string) => {
  const text = html.split(PAYMENT_ENTITY_LINE).join('')
  return BANNED.exec(text)?.[0] ?? null
}

const online = () => {
  vi.stubEnv('STRIPE_PAYMENT_LINK_CARD_READY', 'https://buy.stripe.com/test_ready')
  vi.stubEnv('STRIPE_PAYMENT_LINK_CARD_CUSTOM', 'https://buy.stripe.com/test_custom')
}

afterEach(() => vi.unstubAllEnvs())

const order = (edition: string | null) => renderToStaticMarkup(createElement(OrderView, { edition, referrer: null }))

describe('card pages carry no restoration or sister-business content', () => {
  it('the edition list itself', () => {
    expect(EDITIONS.length, 'positive control: editions were read').toBeGreaterThan(5)
    for (const e of EDITIONS) expect(scan(JSON.stringify(e)), e.name).toBeNull()
  })

  it('/cards showroom, including its metadata', () => {
    const html = renderToStaticMarkup(createElement(CardsShowroomPage))
    expect(html, 'positive control: the showroom rendered its tiles').toContain('data-edition="')
    expect(scan(html)).toBeNull()
    expect(scan(JSON.stringify(metadata))).toBeNull()
  })

  it.each([false, true])('/cards/order with payment links online=%s', (on) => {
    if (on) online()
    const html = order(null)
    expect(html, 'positive control: the picker rendered').toContain('name="edition"')
    expect(scan(html)).toBeNull()
  })

  it('/cards/order?edition=restoration picks nothing and shows nothing restoration', () => {
    expect(resolveEdition('restoration')).toBeNull()
    expect(scan(order('restoration'))).toBeNull()
  })

  it('the home page film strip', () => {
    const html = renderToStaticMarkup(createElement(CardsStrip))
    expect(html, 'positive control: the strip rendered its tiles').toContain('data-gallery-tile="')
    expect(scan(html)).toBeNull()
  })

  it('the scan still sees a banned word next to the allowed payment line', () => {
    expect(scan(`${PAYMENT_ENTITY_LINE} Our CARSI course`)).toBe('CARSI')
    expect(scan(PAYMENT_ENTITY_LINE)).toBeNull()
  })
})
