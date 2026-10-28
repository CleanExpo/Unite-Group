// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { EDITION_YOUTUBE_IDS, EDITIONS, youtubeIdFor } from '../editions'
import { LivingFilm } from '../living-film'

beforeEach(() => {
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined)
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {})
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('edition YouTube ids', () => {
  it('ships empty: no id is ever guessed', () => {
    expect(Object.keys(EDITION_YOUTUBE_IDS)).toHaveLength(0)
    for (const e of EDITIONS) expect(youtubeIdFor(e.name)).toBeNull()
  })

  it('accepts only 11-character YouTube ids', () => {
    expect(youtubeIdFor('ink', { ink: 'abcdefghijk' })).toBe('abcdefghijk')
    expect(youtubeIdFor('ink', { ink: 'abc' })).toBeNull()
    expect(youtubeIdFor('ink', { ink: 'abcdefghij"' })).toBeNull()
  })
})

describe('LivingFilm', () => {
  it('embeds a youtube-nocookie player, muted and looping, when an id is set', () => {
    const r = render(<LivingFilm src="/x.mp4" label="Ink" youtubeId="abcdefghijk" />)
    const f = r.container.querySelector('iframe') as HTMLIFrameElement
    expect(f.src).toContain('https://www.youtube-nocookie.com/embed/abcdefghijk?')
    expect(f.src).toContain('mute=1')
    expect(f.src).toContain('loop=1')
    expect(r.container.querySelector('video')).toBeNull()
  })

  it('plays the hosted film when no id is set', () => {
    const r = render(<LivingFilm src="/x.mp4" poster="/x.jpg" label="Ink" />)
    const v = r.container.querySelector('video') as HTMLVideoElement
    expect(v.getAttribute('src')).toBe('/x.mp4')
    expect(v.loop).toBe(true)
  })
})
