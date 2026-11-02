import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const getPublishedCard = vi.fn()
const getCardReviewLink = vi.fn()
const logReviewEvent = vi.fn()
const afterFns: Array<() => Promise<void>> = []
vi.mock('@/lib/card/published', async (orig) => ({ ...(await orig<typeof import('@/lib/card/published')>()), getPublishedCard: (...a: unknown[]) => getPublishedCard(...a) }))
vi.mock('@/lib/card/review-store', () => ({
  getCardReviewLink: (...a: unknown[]) => getCardReviewLink(...a),
  logReviewEvent: (...a: unknown[]) => logReviewEvent(...a),
}))
vi.mock('next/navigation', () => ({ notFound: () => { throw new Error('NEXT_NOT_FOUND') } }))
vi.mock('next/headers', () => ({ headers: async () => new Headers({ 'user-agent': 'Mozilla/5.0 (iPhone)' }) }))
vi.mock('next/server', () => ({ after: (fn: () => Promise<void>) => { afterFns.push(fn) } }))

import CardPage from '../[slug]/page'
import { CardView } from '../[slug]/card-view'

const card = { slug: 'sam', displayName: 'Sam Smith', roleTitle: null, businessName: 'Sam Co', email: 'sam@example.com', phone: null, serviceArea: null }
const props = (r?: string) => ({ params: Promise.resolve({ slug: 'sam' }), searchParams: Promise.resolve(r ? { r } : {}) })
const READY = { state: 'ready', url: 'https://search.google.com/local/writereview?placeid=ChIJN1t_tDeuEmsRUsoyG83frY4' }

beforeEach(() => {
  getPublishedCard.mockReset().mockResolvedValue(card)
  getCardReviewLink.mockReset()
  logReviewEvent.mockReset().mockResolvedValue(true)
  afterFns.length = 0
})

describe('Google review button on the public card', () => {
  it('shows the button, linked to our redirect (never straight to Google), when the card has a Place ID', async () => {
    getCardReviewLink.mockResolvedValue(READY)
    const html = renderToStaticMarkup(await CardPage(props()))
    expect(html).toContain('Leave us a Google review')
    expect(html).toContain('href="/c/sam/review"')
    expect(html).not.toContain('search.google.com')
    expect(html).not.toContain('<script')
  })

  it('hides the button with no Place ID, and when the read failed (the card itself still renders)', async () => {
    for (const state of [{ state: 'none' }, { state: 'unavailable' }]) {
      getCardReviewLink.mockResolvedValue(state)
      const html = renderToStaticMarkup(await CardPage(props()))
      expect(html).toContain('Sam Smith')
      expect(html).not.toContain('data-review-button')
    }
  })

  it('?r=1 puts the button first and highlights it, without redirecting', async () => {
    getCardReviewLink.mockResolvedValue(READY)
    const plain = renderToStaticMarkup(await CardPage(props()))
    const qr = renderToStaticMarkup(await CardPage(props('1')))
    expect(plain.indexOf('data-review-button')).toBeGreaterThan(plain.indexOf('Save contact'))
    expect(qr.indexOf('data-review-button')).toBeLessThan(qr.indexOf('Save contact'))
    expect(qr).toMatch(/class="[^"]*reviewHighlight[^"]*"[^>]*data-review-button/)
    expect(plain).not.toContain('reviewHighlight')
  })

  it('counts a button view (and a QR open for ?r=1) after the response, with no personal data', async () => {
    getCardReviewLink.mockResolvedValue(READY)
    await CardPage(props('1'))
    for (const fn of afterFns) await fn()
    expect(logReviewEvent.mock.calls.map((c) => c[0])).toEqual([
      { slug: 'sam', kind: 'button_view', uaClass: 'mobile' },
      { slug: 'sam', kind: 'qr_review_open', uaClass: 'mobile' },
    ])
  })

  it('no gating: the button is never inside or after a feedback or enquiry form', () => {
    const html = renderToStaticMarkup(CardView({ card, reviewOpen: true, enquiryOpen: true }))
    const button = html.indexOf('data-review-button')
    const form = html.indexOf('<form')
    expect(button).toBeGreaterThan(-1)
    expect(form).toBeGreaterThan(button)
    expect(html.slice(0, button)).not.toMatch(/happy|how did we go|rate us|feedback/i)
  })
})
