'use client'

import { useRef, useState } from 'react'

import { AI_LABEL, type Edition } from '../editions'
import s from './order.module.css'

/**
 * One edition's film in a dark frame: poster at rest, the clip on request, paused at the
 * edition's stopAt so it rests on the logo. preload="none" keeps the page to posters until asked.
 */
export function Film({ edition, aspect = edition.aspect }: { edition: Edition; aspect?: Edition['aspect'] }) {
  const video = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)

  function toggle() {
    const v = video.current
    if (!v) return
    if (playing) {
      v.pause()
      setPlaying(false)
      return
    }
    if (v.currentTime >= edition.stopAt) v.currentTime = 0
    void v.play().then(() => setPlaying(true), () => setPlaying(false))
  }

  const poster = aspect === edition.aspect ? edition.poster : (edition.pickerPoster ?? edition.poster)

  return (
    <figure style={{ margin: 0 }}>
      <div className={s.filmFrame} style={{ aspectRatio: aspect }} data-film={edition.name}>
        <video
          data-track="video"
          data-track-label={`order-film-${edition.name}`}
          data-track-stop-at={edition.stopAt}
          key={edition.name}
          ref={video}
          src={edition.video}
          poster={poster}
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
          className={s.filmVideo}
        />
        <button type="button" onClick={toggle} aria-pressed={playing} className={s.playButton}>
          <svg viewBox="0 0 16 16" aria-hidden className={s.playIcon}>
            {playing ? <path d="M4 3h3v10H4zM9 3h3v10H9z" /> : <path d="M4 2.5v11l9-5.5z" />}
          </svg>
          {playing ? 'Pause' : `Play ${edition.label}`}
        </button>
      </div>
      <figcaption className={s.aiLabel}>{AI_LABEL}</figcaption>
    </figure>
  )
}
