// @vitest-environment jsdom
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { CARD_EXTRA_BUSINESS, OrderView } from '../../order/order-view'
import { IntakeForm } from '../intake-form'

afterEach(() => {
  cleanup()
  vi.unstubAllEnvs()
})

describe('/cards/thanks staff-card line (UNI-3146)', () => {
  it('says one card per person and states the real staff-card price', () => {
    const { container } = render(createElement(IntakeForm, { reference: 'cs_test_a1' }))
    expect(container.textContent).toContain(`One card per person; staff cards are A$${CARD_EXTRA_BUSINESS.priceAud} each`)
  })

  it('links to the option on the order page, in a new tab so the half-filled form survives', () => {
    render(createElement(IntakeForm, { reference: 'cs_test_a1' }))
    const link = screen.getByRole('link', { name: /staff cards are/ })
    expect(link.getAttribute('href')).toBe('/cards/order#extra-business')
    expect(link.getAttribute('target')).toBe('_blank')
  })

  it('the link lands on a real element on the order page', () => {
    vi.stubEnv('STRIPE_PAYMENT_LINK_CARD_CUSTOM', 'https://buy.stripe.com/test_custom')
    vi.stubEnv('STRIPE_PAYMENT_LINK_CARD_EXTRA_BUSINESS', 'https://buy.stripe.com/test_extra')
    const html = renderToStaticMarkup(createElement(OrderView, { edition: null, referrer: null }))
    expect(html).toContain('id="extra-business"')
  })
})
