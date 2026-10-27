'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * The receipt's moving card: the Constellation edition film, looped over its first 1.8 s only, so it shows the
 * stars joining into the U and never reaches the wordmark that fades in at about 2.2 s. No poster: every
 * edition poster carries the wordmark. A visitor who prefers reduced motion gets the film held still on its
 * first frame (no autoplay, no loop).
 */
export const CARD_LOOP_SRC = '/cards/media/edition-constellation.mp4'
export const CARD_LOOP_END = 1.8

export function CardLoop({ className }: { className?: string }) {
  const video = useRef<HTMLVideoElement>(null)
  const [still, setStill] = useState(true)
  useEffect(() => {
    const mq = typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null
    const apply = () => {
      const reduced = mq?.matches ?? false
      setStill(reduced)
      const v = video.current
      if (!v) return
      if (reduced) {
        v.pause()
        v.currentTime = 0
      } else {
        void v.play()?.catch(() => {})
      }
    }
    apply()
    mq?.addEventListener?.('change', apply)
    return () => mq?.removeEventListener?.('change', apply)
  }, [])
  return (
    <video
      ref={video}
      className={className}
      src={`${CARD_LOOP_SRC}#t=0,${CARD_LOOP_END}`}
      autoPlay={!still}
      data-still={still ? 'true' : 'false'}
      muted
      playsInline
      preload="auto"
      onTimeUpdate={() => {
        const v = video.current
        if (v && v.currentTime >= CARD_LOOP_END) v.currentTime = 0
      }}
      onEnded={() => {
        const v = video.current
        if (v && !still) {
          v.currentTime = 0
          void v.play().catch(() => {})
        }
      }}
      onPause={() => {
        const v = video.current
        if (v && !still && v.currentTime >= CARD_LOOP_END - 0.1) {
          v.currentTime = 0
          void v.play().catch(() => {})
        }
      }}
    />
  )
}
