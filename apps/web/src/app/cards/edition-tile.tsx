'use client'

import { useEffect, useRef, useState } from 'react'

import s from './edition-tile.module.css'
import { AI_LABEL, type Edition } from './editions'

/**
 * One edition: its clip loops on its own while the tile is on screen (IntersectionObserver), and on hover or
 * tap. Under reduced motion nothing autoplays (hover is ignored too); a tap still plays. If autoplay is
 * blocked, the poster stays. Clips use preload="metadata",
 * and only tiles on screen play, so off-screen tiles cost a poster and a few KB.
 */
export function EditionTile({ edition }: { edition: Edition }) {
  const video = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)
  const inView = useRef(false)
  const userStopped = useRef(false)

  // Read at event time so a visitor who changes the setting mid-visit is respected.
  const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

  function play() {
    const v = video.current
    if (!v) return
    if (v.currentTime >= edition.stopAt) v.currentTime = 0
    void v.play().then(() => setPlaying(true), () => setPlaying(false))
  }

  useEffect(() => {
    const v = video.current
    if (!v || typeof IntersectionObserver !== 'function') return
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          inView.current = e.isIntersecting
          if (e.isIntersecting) {
            if (!reducedMotion() && !userStopped.current) play()
          } else if (!v.paused) {
            v.pause()
            setPlaying(false)
          }
        }
      },
      { threshold: 0.4 },
    )
    io.observe(v)
    return () => io.disconnect()
    // play/reducedMotion read refs at call time; observe once per tile
  }, [])

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
        onMouseLeave={() => {
          if (!inView.current || reducedMotion()) stop()
        }}
        onClick={() => {
          if (playing) {
            userStopped.current = true
            stop()
          } else {
            userStopped.current = false
            play()
          }
        }}
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
          preload="metadata"
          muted
          playsInline
          onTimeUpdate={(e) => {
            const v = e.currentTarget
            if (v.currentTime < edition.stopAt) return
            if (inView.current && !reducedMotion() && !userStopped.current) {
              v.currentTime = 0
            } else {
              v.pause()
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
