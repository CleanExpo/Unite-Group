// @vitest-environment jsdom
import { cleanup, fireEvent, render } from '@testing-library/react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { Hero } from '../hero'
import { HeroMedia } from '../hero-media'

function motion(reduce: boolean) {
  vi.stubGlobal('matchMedia', (q: string) => ({
    matches: reduce && q.includes('reduce'),
    media: q,
    addEventListener: () => {},
    removeEventListener: () => {},
  }))
}

const figure = <svg data-testid="figure" />

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('hero media preview', () => {
  it('renders the SVG figure on the server, with no media element', () => {
    const html = renderToStaticMarkup(<Hero />)
    expect(html).toContain('<svg')
    expect(html).toContain('data-media-state="figure-fallback"')
    expect(html).not.toMatch(/<video|<picture|\/home\/media/)
  })

  it('keeps the figure and mounts no video under prefers-reduced-motion', () => {
    motion(true)
    const { container } = render(<HeroMedia>{figure}</HeroMedia>)
    expect(container.querySelector('[data-testid="figure"]')).not.toBeNull()
    expect(container.querySelector('[hidden]')).toBeNull()
    expect(container.querySelector('video')).toBeNull()
    expect(container.querySelector('[data-hero-media]')?.getAttribute('data-media-state')).toBe('figure-fallback')
  })

  it('swaps in the poster picture and a lazy muted loop when motion is allowed', () => {
    motion(false)
    const { container } = render(<HeroMedia>{figure}</HeroMedia>)
    const sources = [...container.querySelectorAll('picture source')].map((s) => `${s.getAttribute('media')} ${s.getAttribute('srcset')}`)
    expect(sources).toEqual(['(max-width: 899px) /landing/media/unite-group-hero-exploded-9x16.webp'])
    expect(container.querySelector('picture img')?.getAttribute('src')).toBe('/landing/media/unite-group-hero-exploded-16x9-air.webp')
    const video = container.querySelector('video')!
    expect(video.muted).toBe(true)
    expect(video.loop).toBe(true)
    expect(video.getAttribute('preload')).toBe('none')
    expect(video.hasAttribute('autoplay')).toBe(false)
    expect(video.getAttribute('poster')).toBe('/landing/media/unite-group-hero-loop-poster-16x9.jpg')
    expect([...video.querySelectorAll('source')].map((s) => s.getAttribute('src'))).toEqual([
      '/landing/media/unite-group-hero-loop-16x9.webm',
      '/landing/media/unite-group-hero-loop-16x9.mp4',
    ])
    expect(container.querySelector('[hidden] [data-testid="figure"]')).not.toBeNull()
    expect(container.textContent).toContain('Pause the loop')
  })

  it('puts the figure back when the media is absent (poster fails to load)', () => {
    motion(false)
    const { container } = render(<HeroMedia>{figure}</HeroMedia>)
    fireEvent.error(container.querySelector('picture img')!)
    expect(container.querySelector('video')).toBeNull()
    expect(container.querySelector('[hidden]')).toBeNull()
    expect(container.querySelector('[data-testid="figure"]')).not.toBeNull()
  })
})
