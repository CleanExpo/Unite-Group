// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { CARD_LOOP_POSTER, CARD_LOOP_SRC, CardLoop } from '../thanks/card-loop'

function mockMotion(reduced: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: reduced && query.includes('prefers-reduced-motion: reduce'),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    onchange: null,
    dispatchEvent: () => false,
  }))
  window.matchMedia = globalThis.matchMedia
}

let play: ReturnType<typeof vi.spyOn>
beforeEach(() => {
  play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined)
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {})
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

const video = () => render(<CardLoop />).container.querySelector('video') as HTMLVideoElement

describe('/cards/thanks moving card', () => {
  it('server HTML never autoplays, even before the reduced-motion check runs', async () => {
    const { renderToStaticMarkup } = await import('react-dom/server')
    mockMotion(true)
    const html = renderToStaticMarkup(<CardLoop />)
    expect(html).not.toMatch(/autoplay/i)
  })

  it('under reduced motion does not autoplay but still moves (gentle drift on the poster)', () => {
    mockMotion(true)
    const r = render(<CardLoop />)
    const v = r.container.querySelector('video') as HTMLVideoElement
    expect(v.autoplay).toBe(false)
    expect(v.dataset.still).toBe('true')
    expect(play).not.toHaveBeenCalled()
    expect(v.getAttribute('poster')).toBe(CARD_LOOP_POSTER)
    expect(r.container.querySelector('[data-living-film]')?.className).toMatch(/gentle/)
  })

  it('autoplays the full Constellation film, muted, inline and looping, with a poster', () => {
    mockMotion(false)
    const v = video()
    expect(v.autoplay).toBe(false) // playback is started by the client effect, never by server HTML
    expect(play).toHaveBeenCalled()
    expect(v.getAttribute('src')).toBe(CARD_LOOP_SRC)
    expect(CARD_LOOP_SRC).toBe('/cards/media/edition-constellation.mp4')
    expect(v.loop).toBe(true)
    expect(v.muted).toBe(true)
    expect(v.hasAttribute('playsinline')).toBe(true)
    expect(v.getAttribute('poster')).toBe(CARD_LOOP_POSTER)
  })
})
