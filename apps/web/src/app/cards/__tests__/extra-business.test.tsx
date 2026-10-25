// @vitest-environment jsdom
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { OrderView } from '../order/order-view'

const ADDON = 'https://buy.stripe.com/test_extra'
const html = () => renderToStaticMarkup(createElement(OrderView, { edition: null, referrer: null }))
const tierSlice = (h: string, id: string) => {
  const start = h.indexOf(`data-tier="${id}"`)
  expect(start).toBeGreaterThan(-1)
  return h.slice(start, h.indexOf('</article>', start))
}

const env = (opts: { ready?: boolean; custom?: boolean; extra?: string }) => {
  if (opts.ready) vi.stubEnv('STRIPE_PAYMENT_LINK_CARD_READY', 'https://buy.stripe.com/test_ready')
  if (opts.custom) vi.stubEnv('STRIPE_PAYMENT_LINK_CARD_CUSTOM', 'https://buy.stripe.com/test_custom')
  if (opts.extra) vi.stubEnv('STRIPE_PAYMENT_LINK_CARD_EXTRA_BUSINESS', opts.extra)
}

afterEach(() => {
  cleanup()
  vi.unstubAllEnvs()
})

describe('extra business add-on placement', () => {
  it('renders inside the custom tier only, not the ready tier', () => {
    env({ ready: true, custom: true, extra: ADDON })
    const h = html()
    expect(tierSlice(h, 'custom')).toContain('Add another business, AUD 199 each, GST included')
    expect(tierSlice(h, 'ready')).not.toContain('Add another business')
    expect(tierSlice(h, 'ready')).not.toContain('extra business')
  })

  it('leaves the markup untouched when the env is unset', () => {
    env({ ready: true, custom: true })
    const h = html()
    expect(h).not.toMatch(/extra/i)
    expect(h).not.toContain('Add another business')
    vi.stubEnv('STRIPE_PAYMENT_LINK_CARD_EXTRA_BUSINESS', '')
    expect(html()).toBe(h)
  })

  it('shows no control when the custom tier is unset', () => {
    env({ ready: true, extra: ADDON })
    const h = html()
    expect(h).not.toContain('Add another business')
    expect(h).not.toContain('data-tier="custom"')
  })

  it('shows no control when the link is not a Stripe Payment Link', () => {
    env({ ready: true, custom: true, extra: 'https://example.com/pay' })
    expect(html()).not.toContain('Add another business')
  })
})

describe('extra business stepper', () => {
  const mount = async () => {
    const { ExtraBusiness } = await import('../order/extra-business')
    render(createElement(ExtraBusiness, { link: ADDON, priceAud: 199, maxQuantity: 5 }))
  }
  const plus = () => screen.getByRole('button', { name: 'One more extra business' })
  const minus = () => screen.getByRole('button', { name: 'One fewer extra business' })

  it('starts at 0 with no payment link and minus disabled', async () => {
    await mount()
    expect(screen.queryByRole('link')).toBeNull()
    expect(minus()).toHaveProperty('disabled', true)
    expect(plus()).toHaveProperty('disabled', false)
  })

  it('two clicks of plus show the add-on link and the total', async () => {
    await mount()
    fireEvent.click(plus())
    fireEvent.click(plus())
    const link = screen.getByRole('link', { name: 'Pay for 2 extra businesses' })
    expect(link.getAttribute('href')).toBe(ADDON)
    expect(link.getAttribute('target')).toBe('_blank')
    expect(link.getAttribute('rel')).toBe('noopener noreferrer')
    expect(link.getAttribute('data-track-label')).toBe('order-extra-business')
    expect(document.body.textContent).toContain('2 extra businesses: AUD 398, GST included.')
  })

  it('uses the singular for one', async () => {
    await mount()
    fireEvent.click(plus())
    expect(screen.getByRole('link', { name: 'Pay for 1 extra business' })).toBeTruthy()
    expect(document.body.textContent).toContain('1 extra business: AUD 199, GST included.')
  })

  it('disables plus at 5 and minus steps back down to 0 and hides the link', async () => {
    await mount()
    for (let i = 0; i < 7; i++) fireEvent.click(plus())
    expect(screen.getByRole('link', { name: 'Pay for 5 extra businesses' })).toBeTruthy()
    expect(plus()).toHaveProperty('disabled', true)
    for (let i = 0; i < 5; i++) fireEvent.click(minus())
    expect(minus()).toHaveProperty('disabled', true)
    expect(screen.queryByRole('link')).toBeNull()
  })
})
