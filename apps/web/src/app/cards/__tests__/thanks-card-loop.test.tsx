// @vitest-environment jsdom
import { cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { CARD_LOOP_END, CARD_LOOP_SRC, CardLoop } from '../thanks/card-loop'

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
  it('holds the film still under reduced motion: no autoplay, never played', () => {
    mockMotion(true)
    const v = video()
    expect(v.autoplay).toBe(false)
    expect(v.dataset.still).toBe('true')
    expect(play).not.toHaveBeenCalled()
  })

  it('plays the loop when motion is not reduced', () => {
    mockMotion(false)
    const v = video()
    expect(v.autoplay).toBe(true)
    expect(play).toHaveBeenCalled()
  })

  it('loops only the opening of the Constellation film, before the wordmark, with no poster', () => {
    mockMotion(false)
    const v = video()
    expect(CARD_LOOP_SRC).toBe('/cards/media/edition-constellation.mp4')
    expect(CARD_LOOP_END).toBeLessThan(2.2)
    expect(v.getAttribute('src')).toBe(`${CARD_LOOP_SRC}#t=0,${CARD_LOOP_END}`)
    expect(v.hasAttribute('poster')).toBe(false)
    expect(v.muted).toBe(true)
  })
})

describe('CardLoop when the film fails (UNI-3058)', () => {
  it('hides itself on a media error so the host still face shows', () => {
    const v = video()
    expect(v.hidden).toBe(false)
    fireEvent.error(v)
    expect(v.hidden).toBe(true)
    expect(v.dataset.failed).toBe('true')
  })
  it('marks itself playing only on a real playing event, never when play() is rejected', async () => {
    const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockRejectedValue(new DOMException('blocked', 'NotAllowedError'))
    const v = video()
    await Promise.resolve()
    await Promise.resolve()
    expect(v.dataset.playing).toBeUndefined()
    fireEvent.playing(v)
    expect(v.dataset.playing).toBe('true')
    play.mockRestore()
  })
})
