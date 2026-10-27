// @vitest-environment jsdom
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { act, cleanup, fireEvent, render } from '@testing-library/react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { Highlights } from '../highlights'
import { FilmPlayer } from '../film-player'
import { CARD_FILM, HERO_FILM } from '../film-config'
import { Hero } from '../hero'

const PUBLIC = join(__dirname, '..', '..', '..', '..', 'public')
const COMPONENTS = join(__dirname, '..')

// ---- browser stubs: motion preference, IntersectionObserver, media playback ----
let io: { cb: IntersectionObserverCallback; el: Element } | null = null
const play = vi.fn(() => Promise.resolve())
const pause = vi.fn()

function setup(reduce: boolean) {
  vi.stubGlobal('matchMedia', (q: string) => ({
    matches: reduce && q.includes('reduce'),
    media: q,
    addEventListener: () => {},
    removeEventListener: () => {},
  }))
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      cb: IntersectionObserverCallback
      constructor(cb: IntersectionObserverCallback) {
        this.cb = cb
      }
      observe(el: Element) {
        io = { cb: this.cb, el }
      }
      disconnect() {}
      unobserve() {}
    },
  )
  window.HTMLMediaElement.prototype.play = play
  window.HTMLMediaElement.prototype.pause = pause
}
const see = () => act(() => io!.cb([{ isIntersecting: true, target: io!.el } as IntersectionObserverEntry], {} as IntersectionObserver))

beforeEach(() => {
  io = null
  play.mockClear()
  pause.mockClear()
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const strip = (html: string) => html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()

describe('hero server markup: the words and the poster come before any video', () => {
  const html = renderToStaticMarkup(<Hero />)

  it('has the H1, the Unite-Group wordmark, the agency line and both CTAs as real HTML', () => {
    expect(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1].replace(/<[^>]*>/g, '')).toBe('Every business. One system.')
    expect(html).toMatch(/data-wordmark[^>]*>Unite-Group</)
    const text = strip(html)
    expect(text).toMatch(/An AI marketing agency, with Margot as its AI face/)
    expect(html).toMatch(/<a [^>]*href="#start"[^>]*>Where do you want to start\?</)
    expect(html).toMatch(/<a [^>]*href="#contact"[^>]*>Ask a question</)
  })

  it('has exactly one primary CTA and it goes to the chooser; the secondary stays the contact link', () => {
    const anchors = [...html.matchAll(/<a [^>]*>/g)].map((m) => m[0])
    expect(anchors).toHaveLength(2)
    const primary = anchors.filter((a) => !/ghost/.test(a))
    expect(primary).toHaveLength(1)
    expect(primary[0]).toContain('href="#start"')
    expect(primary[0]).toContain('data-track-label="home-hero-start"')
    expect(html).not.toMatch(/href="#group"/)
    const secondary = anchors.filter((a) => /ghost/.test(a))
    // The redesign moved the /grow link to the live home hero (home/home-page.tsx); landing.test checks it there.
    expect(secondary).toHaveLength(1)
    expect(secondary[0]).toContain('href="#contact"')
  })

  it('shows the finished-U poster as a sized, high-priority img and mounts no video on the server', () => {
    const img = html.match(/<img[^>]*>/)?.[0] ?? ''
    expect(img).toContain(`src="${HERO_FILM.poster}"`)
    expect(img).toContain(`width="${HERO_FILM.width}"`)
    expect(img).toContain(`height="${HERO_FILM.height}"`)
    expect(img).toMatch(/fetchPriority="high"|fetchpriority="high"/)
    expect(img).toMatch(/srcSet="[^"]*-768\.webp 768w/i)
    expect(img).toMatch(/sizes="\(max-width: 640px\) 450px, 100vw"/)
    expect(html).not.toMatch(/<video|\.mp4|\.webm/)
    expect(html).toContain('data-film-state="poster"')
  })

  it('is the dark band, not a card pitch, and carries no line-drawn lens or view toggle', () => {
    expect(html).toContain('data-mode="spotlight"')
    expect(html).not.toMatch(/\$\d|GST|living card|FIG\. 1|<svg|Assembled|Exploded|Inside|hero-figure/)
    expect(existsSync(join(COMPONENTS, 'hero-figure.tsx'))).toBe(false)
    expect(existsSync(join(COMPONENTS, 'pause-control.tsx'))).toBe(false)
  })
})

describe('the film: plays once when visible, holds on the poster frame, can be replayed and paused', () => {
  it('mounts a muted, inline, non-looping video with Replay and Pause controls when motion is allowed', () => {
    setup(false)
    const { container } = render(<FilmPlayer film={HERO_FILM} />)
    expect(container.querySelector('video')).toBeNull() // a film below the hero waits until it is in view
    see()
    const video = container.querySelector('video')!
    expect(video).not.toBeNull()
    expect(video.hasAttribute('loop')).toBe(false)
    expect(video.loop).toBe(false)
    expect(video.muted).toBe(true)
    expect(video.hasAttribute('playsinline') || video.playsInline).toBe(true)
    expect(video.hasAttribute('autoplay')).toBe(false)
    expect([...video.querySelectorAll('source')].map((s) => s.getAttribute('src'))).toEqual([HERO_FILM.webm, HERO_FILM.mp4])
    expect(container.querySelector('img')?.getAttribute('src')).toBe(HERO_FILM.poster)
    const buttons = [...container.querySelectorAll('button')].map((b) => b.textContent)
    expect(buttons).toEqual(['Replay', 'Pause'])
  })

  it('mounts the priority (hero) film at once when motion is allowed, without waiting to be seen', () => {
    setup(false)
    const { container } = render(<FilmPlayer film={HERO_FILM} priority />)
    expect(container.querySelector('video')).not.toBeNull()
  })

  it('never mounts the priority (hero) film when the visitor asks for reduced motion', () => {
    setup(true)
    const { container } = render(<FilmPlayer film={HERO_FILM} priority />)
    expect(container.querySelector('video')).toBeNull()
  })

  it('starts once when it scrolls into view, then holds', () => {
    setup(false)
    const { container } = render(<FilmPlayer film={HERO_FILM} />)
    expect(play).not.toHaveBeenCalled()
    see()
    expect(play).toHaveBeenCalledTimes(1)
    see()
    expect(play).toHaveBeenCalledTimes(1)
    const root = container.querySelector('[data-film]')!
    expect(container.querySelectorAll('video')).toHaveLength(1)
    fireEvent.ended(container.querySelector('video')!)
    expect(root.getAttribute('data-film-state')).toBe('held')
  })

  it('Replay restarts from the first frame and Pause toggles to Play', () => {
    setup(false)
    const { container, getByText } = render(<FilmPlayer film={HERO_FILM} />)
    see()
    const video = container.querySelector('video')!
    fireEvent.ended(video)
    video.currentTime = 3
    fireEvent.click(getByText('Replay'))
    expect(video.currentTime).toBe(0)
    expect(play).toHaveBeenCalledTimes(2)
    fireEvent.click(getByText('Pause'))
    expect(pause).toHaveBeenCalledTimes(1)
    expect(getByText('Play')).toBeTruthy()
  })

  it('shows the poster only under prefers-reduced-motion: no video, no controls', () => {
    setup(true)
    const { container } = render(<FilmPlayer film={HERO_FILM} />)
    expect(io).toBeNull() // no observer is even set up
    expect(container.querySelector('video')).toBeNull()
    expect(container.querySelector('button')).toBeNull()
    expect(container.querySelector('img')?.getAttribute('src')).toBe(HERO_FILM.poster)
    expect(container.querySelector('[data-film]')?.getAttribute('data-film-state')).toBe('poster')
    expect(play).not.toHaveBeenCalled()
  })

  it('leaves the poster in place when the film fails to load', () => {
    setup(false)
    const { container } = render(<FilmPlayer film={HERO_FILM} />)
    see()
    fireEvent.error(container.querySelector('video source:last-child')!)
    expect(container.querySelector('video')).toBeNull()
    expect(container.querySelector('img')?.getAttribute('src')).toBe(HERO_FILM.poster)
  })
})

describe('the film files', () => {
  const media = join(PUBLIC, 'landing', 'media')

  it('are exactly the film, its poster and two smaller copies of that poster, with no PNG master', () => {
    expect(readdirSync(media).sort()).toEqual([
      'unite-group-hero-u-assemble-16x9-web.mp4',
      'unite-group-hero-u-assemble-16x9.webm',
      'unite-group-hero-u-poster-16x9-1280.webp',
      'unite-group-hero-u-poster-16x9-768.webp',
      'unite-group-hero-u-poster-16x9.jpg',
    ])
    for (const p of HERO_FILM.posterSet ?? []) expect(existsSync(join(PUBLIC, p.src)), p.src).toBe(true)
    for (const f of [HERO_FILM.mp4, HERO_FILM.webm, HERO_FILM.poster]) expect(existsSync(join(PUBLIC, f)), f).toBe(true)
    expect(existsSync(join(PUBLIC, CARD_FILM.mp4)) && existsSync(join(PUBLIC, CARD_FILM.poster))).toBe(true)
  })

  it('are named in one place only, film-config.ts, and nothing else in the components names a video file', () => {
    for (const f of readdirSync(COMPONENTS).filter((n) => /\.(tsx?|css)$/.test(n) && n !== 'film-config.ts')) {
      expect(readFileSync(join(COMPONENTS, f), 'utf8'), f).not.toMatch(/['"`][^'"`]*\.(mp4|webm)['"`]|unite-group-hero-u-/)
    }
  })

  it('adds no image or video next to the components', () => {
    expect(readdirSync(COMPONENTS).filter((f) => /\.(png|jpe?g|webp|gif|mp4|webm|avif)$/i.test(f))).toEqual([])
  })
})

describe('the card film tile is not an empty box', () => {
  it('renders the U reveal poster as a sized img with the film player around it', () => {
    const html = renderToStaticMarkup(<Highlights />)
    expect(html).toContain('data-film')
    expect(html).toContain(`src="${CARD_FILM.poster}"`)
    expect(html).toContain(`width="${CARD_FILM.width}"`)
  })
})
