'use client'

import { useEffect, useRef, useState } from 'react'

import s from './living-film.module.css'

/**
 * A living card film: the hosted edition MP4 with its poster, muted, inline and looping, played only while it
 * is on screen (IntersectionObserver) so a page of cards costs nothing off screen. Where the browser blocks
 * autoplay, the poster shows. Under reduced motion the film does not autoplay; the poster drifts gently
 * instead, so the card is never a static rectangle. A YouTube id, when one is configured, is embedded instead.
 */
export function LivingFilm({
  src,
  poster,
  label,
  youtubeId,
  className,
}: {
  src: string
  poster?: string
  label: string
  youtubeId?: string | null
  className?: string
}) {
  const video = useRef<HTMLVideoElement>(null)
  const [reduced, setReduced] = useState(false)
  // nothing autoplays from server HTML: motion starts only once the client has checked reduced motion
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const mq = typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null
    const apply = () => setReduced(mq?.matches ?? false)
    apply()
    setReady(true)
    mq?.addEventListener?.('change', apply)
    return () => mq?.removeEventListener?.('change', apply)
  }, [])

  useEffect(() => {
    const v = video.current
    if (!v) return
    // read now as well as from state: the first effect runs before the state above has caught up
    const prefersReduced = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced || prefersReduced) {
      v.pause()
      return
    }
    const play = () => void v.play()?.catch(() => {})
    if (typeof IntersectionObserver !== 'function') {
      play()
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) play()
          else v.pause()
        }
      },
      { threshold: 0.25 },
    )
    io.observe(v)
    return () => io.disconnect()
  }, [reduced])

  if (youtubeId && ready && !reduced) {
    const q = `autoplay=1&mute=1&loop=1&playlist=${youtubeId}&controls=0&playsinline=1&rel=0`
    return (
      <div className={`${s.frame} ${className ?? ''}`} data-living-film="youtube">
        <iframe
          className={s.media}
          src={`https://www.youtube-nocookie.com/embed/${youtubeId}?${q}`}
          title={label}
          allow="autoplay; encrypted-media; picture-in-picture"
          loading="lazy"
        />
      </div>
    )
  }

  return (
    <div className={`${s.frame} ${reduced ? s.gentle : ''} ${className ?? ''}`} data-living-film="video">
      <video
        ref={video}
        className={s.media}
        src={src}
        poster={poster}
        aria-label={label}
        data-still={reduced ? 'true' : 'false'}
        muted
        loop
        playsInline
        preload="metadata"
      />
    </div>
  )
}
