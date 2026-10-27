'use client'

import { useRef } from 'react'

/**
 * The receipt's moving card: the Constellation edition film, looped over its first 1.8 s only, so it shows the
 * stars joining into the U and never reaches the wordmark that fades in at about 2.2 s. No poster: every
 * edition poster carries the wordmark.
 */
export const CARD_LOOP_SRC = '/cards/media/edition-constellation.mp4'
export const CARD_LOOP_END = 1.8

export function CardLoop({ className }: { className?: string }) {
  const video = useRef<HTMLVideoElement>(null)
  return (
    <video
      ref={video}
      className={className}
      src={`${CARD_LOOP_SRC}#t=0,${CARD_LOOP_END}`}
      autoPlay
      muted
      playsInline
      preload="auto"
      onTimeUpdate={() => {
        const v = video.current
        if (v && v.currentTime >= CARD_LOOP_END) v.currentTime = 0
      }}
      onEnded={() => {
        const v = video.current
        if (v) {
          v.currentTime = 0
          void v.play().catch(() => {})
        }
      }}
      onPause={() => {
        const v = video.current
        if (v && v.currentTime >= CARD_LOOP_END - 0.1) {
          v.currentTime = 0
          void v.play().catch(() => {})
        }
      }}
    />
  )
}
