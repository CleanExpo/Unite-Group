// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { EditionTile } from '../edition-tile'
import { EDITIONS } from '../editions'

const css = (f: string) => readFileSync(join(__dirname, '..', f), 'utf8')

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

const tile = () => {
  render(<EditionTile edition={EDITIONS[1]} />)
  return screen.getByRole('button', { name: /play the/i })
}

describe('/cards tiles autoplay on view', () => {
  function stubIO() {
    const cbs: Array<(e: Array<{ isIntersecting: boolean }>) => void> = []
    vi.stubGlobal('IntersectionObserver', class {
      constructor(cb: (e: Array<{ isIntersecting: boolean }>) => void) { cbs.push(cb) }
      observe() {}
      disconnect() {}
    })
    return (isIntersecting: boolean) => act(() => cbs.forEach((cb) => cb([{ isIntersecting }])))
  }

  it('plays when the tile scrolls into view and motion is not reduced', () => {
    mockMotion(false)
    const show = stubIO()
    tile()
    show(true)
    expect(play).toHaveBeenCalledTimes(1)
  })

  it('keeps looping when the clip ends while the tile is in view', () => {
    mockMotion(false)
    const show = stubIO()
    const el = tile()
    show(true)
    expect(play).toHaveBeenCalledTimes(1)
    const v = (el.tagName === 'VIDEO' ? el : el.querySelector('video')) as HTMLVideoElement
    fireEvent.ended(v)
    expect(play).toHaveBeenCalledTimes(2)
  })

  it('does not autoplay in view under reduced motion', () => {
    mockMotion(true)
    const show = stubIO()
    tile()
    show(true)
    expect(play).not.toHaveBeenCalled()
  })
})

describe('/cards reduced motion', () => {
  it('hover does not start a clip when the visitor prefers reduced motion', () => {
    mockMotion(true)
    fireEvent.mouseEnter(tile())
    expect(play).not.toHaveBeenCalled()
  })

  it('hover starts a clip when motion is not reduced', () => {
    mockMotion(false)
    fireEvent.mouseEnter(tile())
    expect(play).toHaveBeenCalledTimes(1)
  })

  it('an explicit click still plays under reduced motion', () => {
    mockMotion(true)
    fireEvent.click(tile())
    expect(play).toHaveBeenCalledTimes(1)
  })

  it('every /cards CSS module carries a prefers-reduced-motion: reduce block', () => {
    for (const f of ['showroom.module.css', 'edition-tile.module.css']) {
      expect(css(f), f).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)/)
    }
  })

  it('the tile badge, the only transition on a tile, is switched off under reduced motion', () => {
    const block = /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{([\s\S]*?)\n\}/.exec(css('edition-tile.module.css'))?.[1] ?? ''
    expect(block).toMatch(/\.badge\s*\{[^}]*transition:\s*none/)
  })
})

describe('/cards tile meta row (CSS rule only; the 320 px proof is a screenshot)', () => {
  it('the label and Choose-this row is allowed to wrap', () => {
    const rule = /\.meta\s*\{([^}]*)\}/.exec(css('edition-tile.module.css'))?.[1] ?? ''
    expect(rule).toMatch(/flex-wrap:\s*wrap/)
  })
})
