'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'

import h from './hero.module.css'

// PREVIEW ONLY: AI look-development renders, not approved by Phill (handover 25/10/2026).
export const HERO_MEDIA = {
  posterDesktop: '/landing/media/unite-group-hero-exploded-16x9-air.webp',
  posterMobile: '/landing/media/unite-group-hero-exploded-9x16.webp',
  loopWebm: '/landing/media/unite-group-hero-loop-16x9.webm',
  loopMp4: '/landing/media/unite-group-hero-loop-16x9.mp4',
  loopPoster: '/landing/media/unite-group-hero-loop-poster-16x9.jpg',
} as const

/**
 * The [data-hero-media] slot. The server renders the treatment A SVG figure (children) and nothing else, so
 * no-script, crawlers and reduced-motion get the figure. After mount, and only when motion is allowed, the
 * poster and a lazy muted loop replace it. A poster that fails to load puts the figure straight back.
 */
export function HeroMedia({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<'figure' | 'media'>('figure')
  const [playing, setPlaying] = useState(false)
  const [userPaused, setUserPaused] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  const video = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const apply = () => setMode(query.matches ? 'figure' : 'media')
    apply()
    query.addEventListener('change', apply)
    return () => query.removeEventListener('change', apply)
  }, [])

  // Start the loop only when it is in view and the page is idle.
  useEffect(() => {
    const el = box.current
    const v = video.current
    if (mode !== 'media' || !el || !v || userPaused || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) void v.play().then(() => setPlaying(true), () => setPlaying(false))
      else v.pause()
    })
    io.observe(el)
    return () => io.disconnect()
  }, [mode, userPaused])

  function toggle() {
    const v = video.current
    if (!v) return
    if (userPaused) {
      setUserPaused(false)
    } else {
      v.pause()
      setPlaying(false)
      setUserPaused(true)
    }
  }

  return (
    <div className={h.media} data-hero-media data-media-state={mode === 'media' ? 'preview-media' : 'figure-fallback'} ref={box}>
      <div hidden={mode === 'media'}>{children}</div>
      {mode === 'media' && (
        <div className={h.mediaObject}>
          <picture>
            <source media="(max-width: 899px)" srcSet={HERO_MEDIA.posterMobile} />
            <img
              className={h.blend}
              src={HERO_MEDIA.posterDesktop}
              alt="An optical assembly drawn in exploded view, copper and graphite on white"
              width={1920}
              height={1086}
              onError={() => setMode('figure')}
            />
          </picture>
          <video
            data-track="video"
            data-track-label="home-hero-loop"
            ref={video}
            className={`${h.blend} ${h.loop}`}
            muted
            loop
            playsInline
            preload="none"
            poster={HERO_MEDIA.loopPoster}
            aria-hidden="true"
            data-playing={playing}
          >
            <source src={HERO_MEDIA.loopWebm} type="video/webm" />
            <source src={HERO_MEDIA.loopMp4} type="video/mp4" />
          </video>
          <button type="button" className={h.pause} aria-pressed={userPaused} onClick={toggle}>
            {userPaused ? 'Play the loop' : 'Pause the loop'}
          </button>
        </div>
      )}
    </div>
  )
}
