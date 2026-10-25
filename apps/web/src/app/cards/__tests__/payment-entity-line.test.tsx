// @vitest-environment jsdom
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ExtraBusiness } from '../order/extra-business'
import { OrderView } from '../order/order-view'

/**
 * UNI-3017. Payment is processed by CARSI Pty Ltd (terms section 1.2), so that name appears on the checkout page
 * and the buyer's statement. Each pay button must say so beside it, not only inside the terms.
 */
const LINE = 'Payment is taken by our related company CARSI Pty Ltd, which appears on your statement.'

const html = () => renderToStaticMarkup(createElement(OrderView, { edition: null, referrer: null }))
const tierSlice = (h: string, id: string) => {
  const start = h.indexOf(`data-tier="${id}"`)
  expect(start).toBeGreaterThan(-1)
  return h.slice(start, h.indexOf('</article>', start))
}

afterEach(() => {
  cleanup()
  vi.unstubAllEnvs()
})

describe('payment entity line beside the pay buttons', () => {
  it('puts the line directly under each tier Order button', () => {
    vi.stubEnv('STRIPE_PAYMENT_LINK_CARD_READY', 'https://buy.stripe.com/test_ready')
    vi.stubEnv('STRIPE_PAYMENT_LINK_CARD_CUSTOM', 'https://buy.stripe.com/test_custom')
    const h = html()
    for (const id of ['ready', 'custom']) {
      const t = tierSlice(h, id)
      expect(t, id).toContain(LINE)
      expect(t.indexOf(LINE), id).toBeGreaterThan(t.indexOf('</a>'))
      expect(t.split(LINE).length - 1, id).toBe(1)
    }
  })

  it('shows no payment line when orders are not online (no pay button, so nothing to explain)', () => {
    expect(html()).not.toContain('CARSI Pty Ltd, which appears on your statement')
  })

  it('shows the line beside the extra-business pay link once it appears', () => {
    render(createElement(ExtraBusiness, { link: 'https://buy.stripe.com/test_extra', priceAud: 199, maxQuantity: 5 }))
    expect(screen.queryByText(LINE)).toBeNull()
    fireEvent.click(screen.getByLabelText('One more extra business'))
    expect(screen.getByText('Pay for 1 extra business')).toBeTruthy()
    expect(screen.getByText(LINE)).toBeTruthy()
  })
})
