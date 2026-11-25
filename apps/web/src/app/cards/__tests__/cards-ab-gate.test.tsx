// @vitest-environment jsdom
import { StrictMode } from 'react'
import { act, cleanup, render } from '@testing-library/react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({ usePathname: () => '/cards' }))

import { SiteTracker } from '@/components/analytics/site-tracker'
import { assignVariant, parseVariantLabel } from '@/lib/experiments/cards-ab'
import CardsShowroomPage from '../page'
import { CardsAbGate } from '../cards-ab-gate'
import { ProductFirst } from '../product-first'

const beacon = vi.fn((_url: string, _body: Blob) => true)

function idFor(arm: 'A' | 'B'): string {
  for (let i = 0; i < 1000; i++) if (assignVariant(`p${i}`) === arm) return `p${i}`
  throw new Error('no id')
}

async function sent(): Promise<any[]> {
  window.dispatchEvent(new Event('pagehide'))
  const out: any[] = []
  for (const [, blob] of beacon.mock.calls) out.push(...JSON.parse(await blob.text()))
  return out
}

function mount(arm: 'A' | 'B', strict = false) {
  window.sessionStorage.setItem('ug_sid', idFor(arm))
  const tree = (
    <>
      <SiteTracker />
      <CardsAbGate control={<div data-testid="control">showroom</div>} treatment={<ProductFirst />} />
    </>
  )
  return render(strict ? <StrictMode>{tree}</StrictMode> : tree)
}

beforeEach(() => {
  beacon.mockClear()
  window.sessionStorage.clear()
  Object.defineProperty(window.navigator, 'sendBeacon', { value: beacon, configurable: true })
  Object.defineProperty(window.navigator, 'doNotTrack', { value: null, configurable: true })
  vi.stubEnv('NEXT_PUBLIC_CARDS_AB_ENABLED', '1')
})
afterEach(() => {
  cleanup()
  vi.unstubAllEnvs()
})

describe('CardsAbGate', () => {
  it('shows the showroom (A) to a participant assigned A, and records one exposure for A', async () => {
    const { queryByTestId, container } = mount('A')
    expect(queryByTestId('control')).not.toBeNull()
    expect(container.querySelector('[data-cards-variant="B"]')).toBeNull()
    const exposures = (await sent()).filter((e) => e.event_type === 'card_view')
    expect(exposures.map((e) => parseVariantLabel(e.label)?.variant)).toEqual(['A'])
  })

  it('swaps in the product-first page for a participant assigned B, with one exposure even under StrictMode', async () => {
    const { queryByTestId, container } = mount('B', true)
    await act(async () => {})
    expect(queryByTestId('control')).toBeNull()
    expect(container.querySelector('[data-cards-variant="B"]')).not.toBeNull()
    const exposures = (await sent()).filter((e) => e.event_type === 'card_view')
    expect(exposures.map((e) => parseVariantLabel(e.label)?.variant)).toEqual(['B'])
  })

  it('is a plain pass-through with no treatment: control, no storage, no events', async () => {
    window.sessionStorage.setItem('ug_sid', idFor('B'))
    const { queryByTestId } = render(
      <>
        <SiteTracker />
        <CardsAbGate control={<div data-testid="control">showroom</div>} />
      </>,
    )
    expect(queryByTestId('control')).not.toBeNull()
    expect(window.sessionStorage.getItem('ug_cards_ab')).toBeNull()
    expect((await sent()).filter((e) => e.event_type === 'card_view')).toEqual([])
  })

  it('honours Do Not Track: control, nothing stored, no exposure', async () => {
    Object.defineProperty(window.navigator, 'doNotTrack', { value: '1', configurable: true })
    const { queryByTestId } = mount('B')
    expect(queryByTestId('control')).not.toBeNull()
    expect(window.sessionStorage.getItem('ug_cards_ab')).toBeNull()
    expect(await sent()).toEqual([])
  })
})

describe('ProductFirst (variant B)', () => {
  const html = renderToStaticMarkup(<ProductFirst />)

  it('has one explainer the visitor starts, never autoplayed, from an existing film asset', () => {
    const doc = new DOMParser().parseFromString(html, 'text/html')
    const video = doc.querySelector('video')!
    expect(video.hasAttribute('controls')).toBe(true)
    expect(video.hasAttribute('autoplay')).toBe(false)
    expect(video.hasAttribute('loop')).toBe(false)
    expect(video.getAttribute('data-track')).toBe('video')
    expect(video.getAttribute('src')).toMatch(/^\/cards\/media\//)
    expect(doc.querySelectorAll('video')).toHaveLength(1)
  })

  it('has a prominent order CTA that is a tracked cta_click target', () => {
    const doc = new DOMParser().parseFromString(html, 'text/html')
    const cta = doc.querySelector('a[href="/cards/order"]')!
    expect(cta.getAttribute('data-track')).toBe('cta')
    expect(cta.getAttribute('data-track-label')).toBe('cards-explainer-order')
    expect(doc.querySelectorAll('h1')).toHaveLength(1)
  })

  it('never names the founder’s other businesses or their trades', () => {
    expect(html).not.toMatch(/restor|training|disaster\s*recovery|nrpg|restoreassist|synthex|trade\s*hall|carsi/i)
  })
})

describe('the page with the experiment flag off (the shipped default)', () => {
  it('is the current showroom: editions present, no variant B markup', () => {
    vi.stubEnv('NEXT_PUBLIC_CARDS_AB_ENABLED', '')
    const out = renderToStaticMarkup(<CardsShowroomPage />)
    expect(out).toContain('id="editions"')
    expect(out).not.toContain('data-cards-variant')
  })
})
