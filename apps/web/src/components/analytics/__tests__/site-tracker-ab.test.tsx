import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render } from '@testing-library/react'

let pathname = '/cards'
vi.mock('next/navigation', () => ({ usePathname: () => pathname }))

import { SiteTracker, assignCardsVariant, trackCardsExposure } from '../site-tracker'
import { assignVariant, parseVariantLabel } from '@/lib/experiments/cards-ab'

const beacon = vi.fn((_url: string, _body: Blob) => true)
const fetchMock = vi.fn(() => Promise.resolve(new Response(null, { status: 204 })))

function setNavigator(props: Record<string, unknown>) {
  for (const [k, v] of Object.entries(props)) Object.defineProperty(window.navigator, k, { value: v, configurable: true })
}

async function sentEvents(): Promise<any[]> {
  window.dispatchEvent(new Event('pagehide'))
  const out: any[] = []
  for (const [, blob] of beacon.mock.calls) out.push(...JSON.parse(await blob.text()))
  return out
}

/** A participant id whose deterministic arm is `arm`. */
function idFor(arm: 'A' | 'B'): string {
  for (let i = 0; i < 1000; i++) if (assignVariant(`p${i}`) === arm) return `p${i}`
  throw new Error('no id found')
}

beforeEach(() => {
  pathname = '/cards'
  beacon.mockClear()
  fetchMock.mockClear()
  setNavigator({ sendBeacon: beacon, doNotTrack: null, globalPrivacyControl: undefined })
  vi.stubGlobal('fetch', fetchMock)
  window.sessionStorage.clear()
  vi.stubEnv('NEXT_PUBLIC_CARDS_AB_ENABLED', '1')
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('cards A/B: assignment', () => {
  it('assigns from the tracker session id and persists it for the tab', () => {
    window.sessionStorage.setItem('ug_sid', idFor('B'))
    expect(assignCardsVariant()).toBe('B')
    expect(window.sessionStorage.getItem('ug_cards_ab')).toBe('B')
    expect(assignCardsVariant()).toBe('B')
  })

  it('is always control and stores nothing while the flag is off', () => {
    vi.stubEnv('NEXT_PUBLIC_CARDS_AB_ENABLED', '')
    window.sessionStorage.setItem('ug_sid', idFor('B'))
    expect(assignCardsVariant()).toBe('A')
    expect(window.sessionStorage.getItem('ug_cards_ab')).toBeNull()
  })

  it('respects Do Not Track: control, nothing stored, nothing sent', async () => {
    setNavigator({ doNotTrack: '1' })
    expect(assignCardsVariant()).toBe('A')
    expect(window.sessionStorage.getItem('ug_cards_ab')).toBeNull()
    expect(window.sessionStorage.getItem('ug_sid')).toBeNull()
    trackCardsExposure()
    render(<SiteTracker />)
    expect(await sentEvents()).toEqual([])
  })

  it('respects Global Privacy Control the same way', () => {
    setNavigator({ globalPrivacyControl: true })
    expect(assignCardsVariant()).toBe('A')
    expect(window.sessionStorage.getItem('ug_cards_ab')).toBeNull()
  })
})

describe('cards A/B: sessionStorage reads work but writes are refused', () => {
  it.each(['A', 'B'] as const)('events still carry the arm (%s) from memory', async (arm) => {
    window.sessionStorage.setItem('ug_sid', idFor(arm))
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota', 'QuotaExceededError')
    })
    try {
      const { container } = render(
        <div>
          <SiteTracker />
          <a href="/cards/order" data-track="cta" data-track-label="cards-explainer-order">order</a>
        </div>,
      )
      expect(assignCardsVariant()).toBe(arm)
      trackCardsExposure()
      fireEvent.click(container.querySelector('a')!)
      const events = await sentEvents()
      for (const type of ['card_view', 'cta_click']) {
        const e = events.find((x) => x.event_type === type)
        expect(parseVariantLabel(e?.label)?.variant).toBe(arm)
      }
    } finally {
      vi.restoreAllMocks()
    }
  })
})

describe('cards A/B: events carry the arm', () => {
  it('records one exposure (card_view) carrying experiment and arm, with no participant id', async () => {
    window.sessionStorage.setItem('ug_sid', idFor('B'))
    render(<SiteTracker />)
    assignCardsVariant()
    trackCardsExposure()
    const events = await sentEvents()
    const exposures = events.filter((e) => e.event_type === 'card_view')
    expect(exposures).toHaveLength(1)
    expect(parseVariantLabel(exposures[0].label)).toMatchObject({ variant: 'B', base: 'cards_ab_exposure' })
    // the only identifier on the wire is the existing random per-tab session id, never the arm-derived key
    expect(JSON.stringify(exposures[0])).not.toMatch(/@|email|phone/i)
  })

  it('a CTA click on /cards is attributable: cta_click with its own label and the arm', async () => {
    window.sessionStorage.setItem('ug_sid', idFor('B'))
    const { container } = render(
      <div>
        <SiteTracker />
        <a href="/cards/order" data-track="cta" data-track-label="cards-explainer-order">order</a>
      </div>,
    )
    assignCardsVariant()
    fireEvent.click(container.querySelector('a')!)
    const click = (await sentEvents()).find((e) => e.event_type === 'cta_click')
    expect(parseVariantLabel(click.label)).toEqual({
      base: 'cards-explainer-order',
      experiment: expect.any(String),
      variant: 'B',
    })
  })

  it('the order page keeps the same arm from storage, so order intent links to the same assignment', async () => {
    window.sessionStorage.setItem('ug_sid', idFor('A'))
    assignCardsVariant()
    pathname = '/cards/order'
    const { container } = render(
      <div>
        <SiteTracker />
        <a href="#choose" data-track="cta" data-track-label="order-hero-choose">choose</a>
      </div>,
    )
    fireEvent.click(container.querySelector('a')!)
    const events = await sentEvents()
    for (const e of events) expect(parseVariantLabel(e.label)?.variant).toBe('A')
    expect(events.map((e) => e.event_type)).toContain('cta_click')
  })

  it('pages outside the experiment are never tagged', async () => {
    window.sessionStorage.setItem('ug_sid', idFor('B'))
    assignCardsVariant()
    pathname = '/pricing'
    render(<SiteTracker />)
    const events = await sentEvents()
    expect(events).toHaveLength(1)
    expect(events[0].label).toBeUndefined()
  })
})

describe('video: autoplay is not engagement', () => {
  function renderVideo(autoplay: boolean) {
    const { container } = render(
      <div>
        <SiteTracker />
        <video data-track="video" data-track-label="edition-signature" {...(autoplay ? { 'data-track-autoplay': 'true' } : {})} />
      </div>,
    )
    const video = container.querySelector('video')!
    fireEvent.play(video)
    return video
  }

  it('a programmatic autoplay does not count as video_play', async () => {
    renderVideo(true)
    expect((await sentEvents()).filter((e) => e.event_type === 'video_play')).toEqual([])
  })

  it('a user-initiated play still counts, with the actual edition label', async () => {
    renderVideo(false)
    const plays = (await sentEvents()).filter((e) => e.event_type === 'video_play')
    expect(plays).toHaveLength(1)
    expect(plays[0].label).toBe('edition-signature')
  })
})
