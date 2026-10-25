import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import ThanksPage from '../page'

const render = async (params: Record<string, string | string[] | undefined>) =>
  renderToStaticMarkup(await ThanksPage({ searchParams: Promise.resolve(params) }))

// A buyer can land here with a session id (after Stripe) or without one (stale link). Neither may be a dead end.
describe('/cards/thanks: a way on from every state', () => {
  it.each([
    ['with a session id', { session_id: 'cs_test_a1' }],
    ['without a session id', {}],
  ])('links home and to contact %s', async (_label, params) => {
    const html = await render(params)
    expect(html).toMatch(/<a[^>]*href="\/"[^>]*>/)
    expect(html).toMatch(/<a[^>]*href="mailto:contact@unite-group\.in"[^>]*>/)
  })

  it('keeps the receipt instruction when there is no session id', async () => {
    expect(await render({})).toContain('reply to your payment receipt email')
  })
})
