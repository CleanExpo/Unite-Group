import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render } from '@testing-library/react'

let pathname = '/cards'
vi.mock('next/navigation', () => ({ usePathname: () => pathname }))

import { SiteTracker } from '../site-tracker'

const beacon = vi.fn((_url: string, _body: Blob) => true)
const fetchMock = vi.fn(() => Promise.resolve(new Response(null, { status: 204 })))

function setNavigator(props: Record<string, unknown>) {
  for (const [k, v] of Object.entries(props)) Object.defineProperty(window.navigator, k, { value: v, configurable: true })
}

async function sentEvents(): Promise<any[]> {
  window.dispatchEvent(new Event('pagehide')) // flush
  const out: any[] = []
  for (const [, blob] of beacon.mock.calls) out.push(...JSON.parse(await blob.text()))
  for (const call of fetchMock.mock.calls as unknown as Array<[string, { body: string }]>) out.push(...JSON.parse(call[1].body))
  return out
}

beforeEach(() => {
  pathname = '/cards'
  beacon.mockClear()
  fetchMock.mockClear()
  setNavigator({ sendBeacon: beacon, doNotTrack: null, globalPrivacyControl: undefined })
  vi.stubGlobal('fetch', fetchMock)
  window.sessionStorage.clear()
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('SiteTracker', () => {
  it('sends a page_view with a random session id, and uses no cookie', async () => {
    render(<SiteTracker />)
    const events = await sentEvents()
    expect(events).toHaveLength(1)
    expect(events[0]).toMatchObject({ event_type: 'page_view', path: '/cards' })
    expect(events[0].session_id).toMatch(/^[0-9a-f]{24}$/)
    expect(window.sessionStorage.getItem('ug_sid')).toBe(events[0].session_id)
    expect(document.cookie).toBe('')
  })

  it('sends nothing when Do Not Track is set', async () => {
    setNavigator({ doNotTrack: '1' })
    const { container } = render(
      <div>
        <SiteTracker />
        <a href="/cards/order" data-track="cta" data-track-label="x">go</a>
      </div>,
    )
    fireEvent.click(container.querySelector('a')!)
    expect(await sentEvents()).toEqual([])
    expect(beacon).not.toHaveBeenCalled()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('sends nothing when Global Privacy Control is set', async () => {
    setNavigator({ globalPrivacyControl: true })
    render(<SiteTracker />)
    expect(await sentEvents()).toEqual([])
  })

  it('does not report founder pages', async () => {
    pathname = '/founder/command-centre'
    render(<SiteTracker />)
    expect(await sentEvents()).toEqual([])
  })

  it('reports cta_click by data-track-label and outbound_click by host only', async () => {
    const { container } = render(
      <div>
        <SiteTracker />
        <a href="/cards/order" data-track="cta" data-track-label="hero-order">order</a>
        <a href="https://example.org/secret/path?token=1">out</a>
      </div>,
    )
    const [cta, out] = Array.from(container.querySelectorAll('a'))
    fireEvent.click(cta)
    fireEvent.click(out)
    const events = await sentEvents()
    expect(events.find((e) => e.event_type === 'cta_click')).toMatchObject({ label: 'hero-order', path: '/cards' })
    const outbound = events.find((e) => e.event_type === 'outbound_click')
    expect(outbound.label).toBe('example.org')
    expect(JSON.stringify(events)).not.toContain('secret')
  })

  it('completes a film at its configured stop point (before native ended), once per play, and again on replay', async () => {
    const { container } = render(
      <div>
        <SiteTracker />
        <video data-track="video" data-track-label="signature" data-track-stop-at="4.4" />
      </div>,
    )
    const v = container.querySelector('video')!
    let time = 0
    Object.defineProperty(v, 'currentTime', { get: () => time, set: (n: number) => (time = n), configurable: true })

    // play, run to the stop point; the component pauses there instead of reaching "ended"
    fireEvent(v, new Event('play'))
    time = 2
    fireEvent(v, new Event('timeupdate'))
    time = 4.4
    fireEvent(v, new Event('timeupdate'))
    fireEvent(v, new Event('timeupdate')) // repeated updates at the stop point do not repeat the completion
    fireEvent(v, new Event('pause'))

    // replay: the component rewinds, then plays again
    time = 0
    fireEvent(v, new Event('play'))
    time = 4.5
    fireEvent(v, new Event('timeupdate'))
    fireEvent(v, new Event('pause'))

    // a third play that is abandoned part-way: a play, but no completion
    time = 0
    fireEvent(v, new Event('play'))
    time = 1
    fireEvent(v, new Event('timeupdate'))

    const types = (await sentEvents()).map((e) => e.event_type) // sentEvents also fires pagehide
    expect(types.filter((t) => t === 'video_play')).toHaveLength(3)
    expect(types.filter((t) => t === 'video_complete')).toHaveLength(2)
  })

  it('does not double count a completion when ended follows the stop point', async () => {
    const { container } = render(
      <div>
        <SiteTracker />
        <video data-track="video" data-track-label="a" data-track-stop-at="3" />
      </div>,
    )
    const v = container.querySelector('video')!
    let time = 0
    Object.defineProperty(v, 'currentTime', { get: () => time, set: (n: number) => (time = n), configurable: true })
    fireEvent(v, new Event('play'))
    time = 3
    fireEvent(v, new Event('timeupdate'))
    fireEvent(v, new Event('ended'))
    const types = (await sentEvents()).map((e) => e.event_type)
    expect(types.filter((t) => t === 'video_complete')).toHaveLength(1)
  })

  it('never reports a looping (autoplay-style) video as a play or complete', async () => {
    const { container } = render(
      <div>
        <SiteTracker />
        <video data-track="video" data-track-label="hero-loop" loop muted />
      </div>,
    )
    const loop = container.querySelector('video')!
    fireEvent(loop, new Event('play'))
    fireEvent(loop, new Event('ended'))
    const types = (await sentEvents()).map((e) => e.event_type)
    expect(types).toEqual(['page_view'])
  })

  it('reports video_play once per play and video_complete on end', async () => {
    const { container } = render(
      <div>
        <SiteTracker />
        <video data-track="video" data-track-label="edition-a" />
        <video />
      </div>,
    )
    const [tracked, untracked] = Array.from(container.querySelectorAll('video'))
    fireEvent(tracked, new Event('play'))
    fireEvent(tracked, new Event('play'))
    fireEvent(untracked, new Event('play'))
    fireEvent(tracked, new Event('ended'))
    const types = (await sentEvents()).map((e) => e.event_type)
    expect(types.filter((t) => t === 'video_play')).toHaveLength(1)
    expect(types.filter((t) => t === 'video_complete')).toHaveLength(1)
  })
})
