import { beforeEach, describe, expect, it, vi } from 'vitest'

const getCardReviewLink = vi.fn()
const logReviewEvent = vi.fn()
vi.mock('@/lib/card/review-store', () => ({
  getCardReviewLink: (...a: unknown[]) => getCardReviewLink(...a),
  logReviewEvent: (...a: unknown[]) => logReviewEvent(...a),
}))

import { GET } from '../route'

const GOOGLE = 'https://search.google.com/local/writereview?placeid=ChIJN1t_tDeuEmsRUsoyG83frY4'
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)'
const call = (url: string, ua: string | null = IPHONE, slug = 'sam') =>
  GET(new Request(url, { headers: ua ? { 'user-agent': ua, 'x-forwarded-for': '203.0.113.9', cookie: 'sb=secret' } : {} }), { params: Promise.resolve({ slug }) })

beforeEach(() => {
  getCardReviewLink.mockReset()
  logReviewEvent.mockReset().mockResolvedValue(true)
})

describe('/c/[slug]/review', () => {
  it('302s to the Google write-a-review page and is never cached', async () => {
    getCardReviewLink.mockResolvedValue({ state: 'ready', url: GOOGLE })
    const res = await call('https://unite-group.in/c/sam/review')
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toBe(GOOGLE)
    expect(res.headers.get('cache-control')).toBe('no-store')
    expect(getCardReviewLink).toHaveBeenCalledWith('sam')
  })

  it('logs one review_tap holding only the card, kind and device class (no IP, cookie or user agent)', async () => {
    getCardReviewLink.mockResolvedValue({ state: 'ready', url: GOOGLE })
    await call('https://unite-group.in/c/sam/review')
    expect(logReviewEvent).toHaveBeenCalledTimes(1)
    const [event] = logReviewEvent.mock.calls[0]
    expect(event).toEqual({ slug: 'sam', kind: 'review_tap', requestId: null, uaClass: 'mobile' })
    const flat = JSON.stringify(logReviewEvent.mock.calls)
    expect(flat).not.toContain('203.0.113.9')
    expect(flat).not.toContain('secret')
    expect(flat).not.toContain('iPhone')
  })

  it('a request link (?q=<uuid>) is logged as request_link_open with that id, and goes to the same Google page', async () => {
    getCardReviewLink.mockResolvedValue({ state: 'ready', url: GOOGLE })
    const id = '6f1e2d3c-4b5a-4987-8a7b-6c5d4e3f2a1b'
    const res = await call(`https://unite-group.in/c/sam/review?q=${id}`)
    expect(res.headers.get('location')).toBe(GOOGLE)
    expect(logReviewEvent.mock.calls[0][0]).toMatchObject({ kind: 'request_link_open', requestId: id })
  })

  it('a non-uuid ?q= is ignored rather than stored', async () => {
    getCardReviewLink.mockResolvedValue({ state: 'ready', url: GOOGLE })
    await call('https://unite-group.in/c/sam/review?q=sam@example.com')
    expect(logReviewEvent.mock.calls[0][0]).toMatchObject({ kind: 'review_tap', requestId: null })
  })

  it('link previewers are redirected but not counted', async () => {
    getCardReviewLink.mockResolvedValue({ state: 'ready', url: GOOGLE })
    const res = await call('https://unite-group.in/c/sam/review', 'WhatsApp/2.24')
    expect(res.status).toBe(302)
    expect(logReviewEvent).not.toHaveBeenCalled()
  })

  it('still redirects when the tap could not be recorded', async () => {
    getCardReviewLink.mockResolvedValue({ state: 'ready', url: GOOGLE })
    logReviewEvent.mockResolvedValue(false)
    expect((await call('https://unite-group.in/c/sam/review')).status).toBe(302)
  })

  it('404s for a card with no Place ID (or unknown / unpublished), with no event', async () => {
    getCardReviewLink.mockResolvedValue({ state: 'none' })
    const res = await call('https://unite-group.in/c/sam/review')
    expect(res.status).toBe(404)
    expect(res.headers.get('location')).toBeNull()
    expect(logReviewEvent).not.toHaveBeenCalled()
  })

  it('503s (not 404) when the card could not be read, so a fault never looks like "no link"', async () => {
    getCardReviewLink.mockResolvedValue({ state: 'unavailable' })
    const res = await call('https://unite-group.in/c/sam/review')
    expect(res.status).toBe(503)
    expect(logReviewEvent).not.toHaveBeenCalled()
  })
})
