'use client'

import { LivingFilm } from '../living-film'

/**
 * The receipt's moving card on /cards/thanks: the full Constellation edition film, looped, so the wordmark
 * shows. Poster until it plays; under reduced motion the poster drifts gently instead (see LivingFilm).
 * The home spotlight keeps its own 1.8 s CardLoop; this is only the receipt page.
 */
export const THANKS_FILM_SRC = '/cards/media/edition-constellation.mp4'
export const THANKS_FILM_POSTER = '/cards/media/edition-constellation-poster.jpg'

export function ThanksFilm({ className }: { className?: string }) {
  return (
    <div className={className}>
      <LivingFilm src={THANKS_FILM_SRC} poster={THANKS_FILM_POSTER} label="Constellation edition film" />
    </div>
  )
}
