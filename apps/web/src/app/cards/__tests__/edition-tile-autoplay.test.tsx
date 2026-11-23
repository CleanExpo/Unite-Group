// @vitest-environment jsdom
// UNI-3293: in production 823 of 1,584 /cards page views logged a video_play for edition-signature, because the
// hero tile starts itself on scroll and the tracker could not tell that from a visitor pressing play.
import { act, cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { EditionTile } from '../edition-tile'
import { EDITIONS } from '../editions'

let notify: (isIntersecting: boolean) => void = () => {}

beforeEach(() => {
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined)
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {})
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }))
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(cb: (entries: { isIntersecting: boolean }[]) => void) {
        notify = (isIntersecting) => cb([{ isIntersecting }])
      }
      observe() {}
      disconnect() {}
    },
  )
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('EditionTile autoplay classification', () => {
  it('marks a play the page started on scroll as autoplay, keeping the edition label', async () => {
    const { container } = render(<EditionTile edition={EDITIONS[0]} />)
    await act(async () => notify(true))
    const video = container.querySelector('video')!
    expect(video.getAttribute('data-track-autoplay')).toBe('true')
    expect(video.getAttribute('data-track-label')).toBe(`edition-${EDITIONS[0].name}`)
  })

  it('a visitor pressing the tile is user-initiated, not autoplay', async () => {
    const { container } = render(<EditionTile edition={EDITIONS[0]} />)
    const video = container.querySelector('video')!
    await act(async () => fireEvent.click(container.querySelector('button')!))
    expect(video.getAttribute('data-track-autoplay')).toBe('false')
  })

  it('a scroll callback landing after the visitor pressed play does not relabel that play as autoplay', async () => {
    const { container } = render(<EditionTile edition={EDITIONS[0]} />)
    const video = container.querySelector('video')!
    await act(async () => fireEvent.click(container.querySelector('button')!))
    await act(async () => notify(true))
    expect(video.getAttribute('data-track-autoplay')).toBe('false')
  })

  it('the visitor stopping the tile hands the origin back: a later scroll play is autoplay again', async () => {
    const { container } = render(<EditionTile edition={EDITIONS[1]} />)
    const video = container.querySelector('video')!
    const button = container.querySelector('button')!
    await act(async () => fireEvent.mouseEnter(button))
    await act(async () => fireEvent.mouseLeave(button))
    await act(async () => notify(true))
    expect(video.getAttribute('data-track-autoplay')).toBe('true')
  })

  it('hover is the visitor reaching for the tile: user-initiated', async () => {
    const { container } = render(<EditionTile edition={EDITIONS[1]} />)
    await act(async () => fireEvent.mouseEnter(container.querySelector('button')!))
    expect(container.querySelector('video')!.getAttribute('data-track-autoplay')).toBe('false')
  })
})
