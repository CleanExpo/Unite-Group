'use client'

import { useRef, useState } from 'react'

import s from './edition-tile.module.css'
import { AI_LABEL, type Edition } from './editions'

/**
 * One edition: poster at rest, its 4 s clip on hover or tap. Clips use preload="none"
 * so eleven tiles cost eleven posters, not 14 MB of video, until someone asks to watch.
 */
export function EditionTile({ edition }: { edition: Edition }) {
  const video = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)

  // Read at event time so a visitor who changes the setting mid-visit is respected.
  const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

  function play() {
    const v = video.current
    if (!v) return
    if (v.currentTime >= edition.stopAt) v.currentTime = 0
    void v.play().then(() => setPlaying(true), () => setPlaying(false))
  }

  function stop() {
    const v = video.current
    if (!v) return
    v.pause()
    v.currentTime = 0
    setPlaying(false)
  }

  return (
    <article data-edition={edition.name} className={s.tile}>
      <button
        type="button"
        onMouseEnter={() => {
          if (!reducedMotion()) play()
        }}
        onMouseLeave={stop}
        onClick={() => (playing ? stop() : play())}
        aria-pressed={playing}
        aria-label={`${playing ? 'Stop' : 'Play'} the ${edition.label} clip`}
        className={s.playButton}
        style={{ aspectRatio: edition.aspect }}
      >
        <video
          data-track="video"
          data-track-label={`edition-${edition.name}`}
          data-track-stop-at={edition.stopAt}
          ref={video}
          src={edition.video}
          poster={edition.poster}
          preload="none"
          muted
          playsInline
          onTimeUpdate={(e) => {
            if (e.currentTarget.currentTime >= edition.stopAt) {
              e.currentTarget.pause()
              setPlaying(false)
            }
          }}
          onEnded={() => setPlaying(false)}
          className={s.video}
        />
        {!playing && (
          <span
            aria-hidden
            className={s.badge}
          >
            <svg viewBox="0 0 16 16" className={s.icon} fill="currentColor">
              <path d="M4 2.5v11l9-5.5z" />
            </svg>
          </span>
        )}
      </button>
      <div className={s.meta}>
        <h3 className={s.label}>{edition.label}</h3>
        <a
          href={`/cards/order?edition=${edition.name}`}
          data-track="cta"
          data-track-label="cards-edition-order"
          className={s.choose}
        >
          Choose this
        </a>
      </div>
      <p className={s.line}>{edition.line}</p>
      <p className={s.ai}>{AI_LABEL}</p>
    </article>
  )
}
