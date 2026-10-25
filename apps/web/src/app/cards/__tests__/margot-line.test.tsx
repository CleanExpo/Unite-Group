import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

import CardsShowroomPage from '../page'
import { OrderView } from '../order/order-view'
import { SiteFooter } from '@/components/public/site-footer'

const pages = {
  '/cards': () => renderToStaticMarkup(createElement(CardsShowroomPage)),
  '/cards/order': () => renderToStaticMarkup(createElement(OrderView, { edition: null, referrer: null })),
  'shared footer': () => renderToStaticMarkup(createElement(SiteFooter)),
}

afterEach(() => vi.unstubAllEnvs())

describe.each(Object.entries(pages))('%s Margot phone line', (_name, render) => {
  it.each([undefined, '', '   ', 'not-a-number', '0400 000 000'])('shows no Margot and no tel: when the env is %j', (value) => {
    if (value !== undefined) vi.stubEnv('MARGOT_PHONE_NUMBER', value)
    else vi.stubEnv('MARGOT_PHONE_NUMBER', '')
    const html = render()
    expect(html).not.toContain('Margot')
    expect(html).not.toContain('tel:')
  })

  it('shows the line with the number once a valid number is set', () => {
    vi.stubEnv('MARGOT_PHONE_NUMBER', '+61400000000')
    const html = render()
    expect(html).toContain('href="tel:+61400000000"')
    expect(html).toContain('Call Margot (AI assistant)')
    expect(html).toContain('Answered by our AI assistant. Messages go to our team by email.')
  })
})
