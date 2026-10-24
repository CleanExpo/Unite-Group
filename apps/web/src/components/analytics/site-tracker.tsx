'use client'

// First-party, cookie-free site analytics (UNI-3001). Mounted once in the root layout; it only
// reports on the public pages listed in TRACKED_PATHS, so founder pages are never measured.
// Sends nothing when the visitor has Do Not Track or Global Privacy Control on.
// Stores nothing but a random per-tab session id in sessionStorage (no cookies, no fingerprinting).

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { SITE_EVENT_LIMITS, isTrackedPath, type SiteEventType } from '@/lib/analytics/site-events'

const ENDPOINT = '/api/events'
const SESSION_KEY = 'ug_sid'
const FLUSH_DELAY_MS = 2000

type QueuedEvent = {
  event_type: SiteEventType
  path: string
  label?: string
  referrer?: string
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  session_id?: string
}

/** True when the visitor asked not to be measured. */
export function trackingOptedOut(): boolean {
  if (typeof navigator === 'undefined') return true
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean; msDoNotTrack?: string }
  const win = window as Window & { doNotTrack?: string }
  return (
    nav.doNotTrack === '1' ||
    nav.doNotTrack === 'yes' ||
    win.doNotTrack === '1' ||
    nav.msDoNotTrack === '1' ||
    nav.globalPrivacyControl === true
  )
}

let memorySession: string | null = null

function sessionId(): string {
  try {
    const existing = window.sessionStorage.getItem(SESSION_KEY)
    if (existing) return existing
    const fresh = randomId()
    window.sessionStorage.setItem(SESSION_KEY, fresh)
    return fresh
  } catch {
    memorySession ??= randomId()
    return memorySession
  }
}

function randomId(): string {
  const bytes = new Uint8Array(12)
  window.crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

function cut(value: string | null | undefined, max: number): string | undefined {
  const trimmed = value?.trim()
  return trimmed ? trimmed.slice(0, max) : undefined
}

let queue: QueuedEvent[] = []
let timer: ReturnType<typeof setTimeout> | null = null

function send(batch: QueuedEvent[]) {
  const body = JSON.stringify(batch)
  try {
    if (typeof navigator.sendBeacon === 'function') {
      if (navigator.sendBeacon(ENDPOINT, new Blob([body], { type: 'application/json' }))) return
    }
  } catch {
    // fall through to fetch
  }
  try {
    void fetch(ENDPOINT, {
      method: 'POST',
      body,
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
      credentials: 'omit',
    }).catch(() => undefined)
  } catch {
    // analytics must never break the page
  }
}

function flush() {
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
  while (queue.length > 0) send(queue.splice(0, SITE_EVENT_LIMITS.maxBatch))
}

function track(event: Omit<QueuedEvent, 'session_id'>) {
  if (trackingOptedOut()) return
  queue.push({ ...event, session_id: sessionId() })
  if (queue.length >= SITE_EVENT_LIMITS.maxBatch) flush()
  else if (!timer) timer = setTimeout(flush, FLUSH_DELAY_MS)
}

function labelOf(el: Element): string | undefined {
  return cut(el.getAttribute('data-track-label'), SITE_EVENT_LIMITS.label)
}

export function SiteTracker() {
  const pathname = usePathname()
  const pathRef = useRef(pathname)
  pathRef.current = pathname

  // page_view on every route change
  useEffect(() => {
    if (!pathname || !isTrackedPath(pathname) || trackingOptedOut()) return
    const params = new URLSearchParams(window.location.search)
    track({
      event_type: 'page_view',
      path: pathname,
      referrer: cut(document.referrer, 2048),
      utm_source: cut(params.get('utm_source'), SITE_EVENT_LIMITS.utm),
      utm_medium: cut(params.get('utm_medium'), SITE_EVENT_LIMITS.utm),
      utm_campaign: cut(params.get('utm_campaign'), SITE_EVENT_LIMITS.utm),
    })
  }, [pathname])

  // clicks, videos, flush on leave
  useEffect(() => {
    if (trackingOptedOut()) return
    const here = () => pathRef.current || window.location.pathname
    const playing = new WeakSet<Element>()

    const onClick = (e: MouseEvent) => {
      const target = e.target instanceof Element ? e.target : null
      if (!target || !isTrackedPath(here())) return
      const cta = target.closest('[data-track="cta"]')
      if (cta) track({ event_type: 'cta_click', path: here(), label: labelOf(cta) })
      const anchor = target.closest('a[href]')
      if (anchor) {
        try {
          const url = new URL((anchor as HTMLAnchorElement).href, window.location.href)
          if ((url.protocol === 'http:' || url.protocol === 'https:') && url.origin !== window.location.origin) {
            // host only: the destination path and query are never recorded
            track({ event_type: 'outbound_click', path: here(), label: url.hostname.slice(0, SITE_EVENT_LIMITS.label) })
          }
        } catch {
          // malformed href: ignore
        }
      }
    }

    const onVideo = (type: 'video_play' | 'video_complete') => (e: Event) => {
      const el = e.target instanceof Element ? e.target : null
      if (!el || !el.matches('video[data-track="video"]') || !isTrackedPath(here())) return
      // Looping videos (the hero loop is script-started, not user-initiated) are decoration, not engagement: never report them as plays or completes.
      if ((el as HTMLVideoElement).loop) return
      if (type === 'video_play') {
        if (playing.has(el)) return
        playing.add(el)
      } else {
        playing.delete(el)
      }
      track({ event_type: type, path: here(), label: labelOf(el) })
    }
    const onPlay = onVideo('video_play')
    const onEnded = onVideo('video_complete')
    const onHidden = () => {
      if (document.visibilityState === 'hidden') flush()
    }

    document.addEventListener('click', onClick, true)
    document.addEventListener('play', onPlay, true)
    document.addEventListener('ended', onEnded, true)
    document.addEventListener('visibilitychange', onHidden)
    window.addEventListener('pagehide', flush)
    return () => {
      document.removeEventListener('click', onClick, true)
      document.removeEventListener('play', onPlay, true)
      document.removeEventListener('ended', onEnded, true)
      document.removeEventListener('visibilitychange', onHidden)
      window.removeEventListener('pagehide', flush)
    }
  }, [])

  return null
}
