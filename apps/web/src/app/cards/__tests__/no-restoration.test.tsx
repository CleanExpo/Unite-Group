import { readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { CardsStrip } from '@/components/public/cards-strip'
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

/** Every page.tsx under app/cards, found on disk, as a path relative to app/cards. */
const discoverPages = () => {
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
  return pages.sort()
}

type RouteCase = { params?: Record<string, string>; shows: string | RegExp }

/**
 * The inputs each card page is rendered with, and text proving the render really happened. A new card page
 * fails the guard until it has an entry here; the scan then renders it from its own module.
 */
const ROUTES: Record<string, RouteCase[]> = {
  'page.tsx': [{ shows: 'data-edition="' }],
  'order/page.tsx': [
    { params: {}, shows: 'name="edition"' },
    { params: { edition: 'restoration' }, shows: 'name="edition"' },
  ],
  'terms/page.tsx': [{ shows: PAYMENT_ENTITY }],
  'thanks/page.tsx': [
    { params: {}, shows: 'Thank you' },
    { params: { session_id: 'cs_test_a1B2c3' }, shows: 'Thank you' },
  ],
}

/** Imports the page at `path` itself, so the module rendered is always the one the path names. */
const renderRoute = async (path: string, params?: Record<string, string>) => {
  const mod = await import(/* @vite-ignore */ `../${path}`)
  const props = params ? { searchParams: Promise.resolve(params) } : {}
  return { page: html(await mod.default(props)), meta: JSON.stringify(mod.metadata ?? null) }
}

// An unregistered page still gets one bare render and scan; the inventory leg fails it regardless.
const ROUTE_CASES = discoverPages().flatMap((path) =>
  (ROUTES[path] ?? [{ shows: '' }]).flatMap((c) => [false, true].map((on) => ({ path, on, ...c }))),
)

describe('public card routes carry no restoration or sister-business content', () => {
  it('the route registry lists exactly the pages under /cards, each with at least one render', () => {
    expect(discoverPages()).toEqual(Object.keys(ROUTES).sort())
    for (const [path, cases] of Object.entries(ROUTES)) expect(cases.length, path).toBeGreaterThan(0)
  })

  it.each(ROUTE_CASES)('/cards/$path params=$params online=$on', async ({ path, params, shows, on }) => {
    if (on) online()
    const { page, meta } = await renderRoute(path, params)
    if (typeof shows === 'string') expect(page, 'positive control: the page rendered').toContain(shows)
    else expect(page.match(shows), 'positive control: the page rendered').not.toBeNull()
    expect(scan(page)).toBeNull()
    expect(scan(meta)).toBeNull()
  })

  it('the edition list itself', () => {
    expect(EDITIONS.length, 'positive control: editions were read').toBeGreaterThan(5)
    for (const e of EDITIONS) expect(scan(JSON.stringify(e)), e.name).toBeNull()
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
