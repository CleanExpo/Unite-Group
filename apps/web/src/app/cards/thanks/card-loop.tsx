'use client'

import { LivingFilm } from '../living-film'

/**
 * The receipt's moving card: the full Constellation edition film, looped, so the stars join into the U and the
 * wordmark shows. Poster frame while it loads or if autoplay is blocked; under reduced motion the poster drifts
 * gently instead of playing (never a still rectangle).
 */
export const CARD_LOOP_SRC = '/cards/media/edition-constellation.mp4'
export const CARD_LOOP_POSTER = '/cards/media/edition-constellation-poster.jpg'

export function CardLoop({ className }: { className?: string }) {
  return (
    <div className={className}>
      <LivingFilm src={CARD_LOOP_SRC} poster={CARD_LOOP_POSTER} label="Constellation edition film" />
    </div>
  )
}
