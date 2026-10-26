'use client'

import { useEffect, useRef, useState, type CSSProperties } from 'react'

import type { Film } from './film-config'
import f from './film.module.css'

type State = 'poster' | 'playing' | 'paused' | 'held'

/**
 * A film that never gets in the way. The server renders the poster (a sized img) and nothing else, so the page
 * paints at once and a visitor with no script or with reduced motion sees the poster only. After mount, and only
 * when motion is allowed, a muted film is mounted. It plays ONCE, the first time it is half in view, then holds on
 * its last frame (the poster is that frame). Replay and Pause are real buttons. It never loops, never has sound,
 * and a film that fails to load leaves the poster in place.
 */
export function FilmPlayer({
  film,
  priority = false,
  className = '',
  fade = false,
  cover = false,
  controls = 'top',
  progress = false,
  visibleThreshold = 0.4,
  raisedControls = false,
}: {
  film: Film
  priority?: boolean
  className?: string
  fade?: boolean
  cover?: boolean
  controls?: 'top' | 'bottom'
  /** Thin playback track along the bottom edge (hero). */
  progress?: boolean
  visibleThreshold?: number
  /** Lift bottom controls above an overlapping copy panel (cinema hero). */
  raisedControls?: boolean
}) {
  const [motion, setMotion] = useState(false)
  const [seen, setSeen] = useState(false)
  const [failed, setFailed] = useState(false)
  const [state, setState] = useState<State>('poster')
  const [pct, setPct] = useState(0)
  const root = useRef<HTMLDivElement>(null)
  const video = useRef<HTMLVideoElement>(null)
  const started = useRef(false)

  // Motion is decided once the page has finished loading, so the film never competes with the poster for the network.
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const apply = () => setMotion(!query.matches)
    const onLoad = () => apply()
    if (document.readyState === 'complete') apply()
    else window.addEventListener('load', onLoad, { once: true })
    query.addEventListener('change', apply)
    return () => {
      window.removeEventListener('load', onLoad)
      query.removeEventListener('change', apply)
    }
  }, [])

  function run(v: HTMLVideoElement) {
    setState('playing')
    void v.play().catch(() => setState('poster'))
  }

  // LCP hero: start as soon as motion is allowed (no scroll gate).
  useEffect(() => {
    if (priority && motion && !failed) setSeen(true)
  }, [priority, motion, failed])

  // Mount the film only once it is half in view; then play it once.
  useEffect(() => {
    const el = root.current
    if (priority || !motion || failed || seen || !el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setSeen(true)
      },
      { threshold: visibleThreshold },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [motion, failed, seen, visibleThreshold])

  const live = motion && seen && !failed

  useEffect(() => {
    const v = video.current
    if (live && v && !started.current) {
      started.current = true
      run(v)
    }
  }, [live])

  const sources = [film.webm && { src: film.webm, type: 'video/webm' }, { src: film.mp4, type: 'video/mp4' }].filter(Boolean) as { src: string; type: string }[]

  function replay() {
    const v = video.current
    if (!v) return
    started.current = true
    setPct(0)
    v.currentTime = 0
    run(v)
  }
  function toggle() {
    const v = video.current
    if (!v) return
    if (state === 'playing') {
      v.pause()
      setState('paused')
    } else if (state === 'paused' || state === 'held') {
      if (state === 'held') {
        v.currentTime = 0
        setPct(0)
      }
      run(v)
    }
  }

  const onTime = () => {
    const v = video.current
    if (!v?.duration || !Number.isFinite(v.duration)) return
    setPct(Math.min(1, v.currentTime / v.duration))
  }

  return (
    <div
      ref={root}
      data-film
      data-film-state={live ? state : 'poster'}
      data-controls={controls}
      data-controls-raised={raisedControls || undefined}
      data-progress={progress || undefined}
      className={`${f.film} ${cover ? f.cover : ''} ${className}`}
      style={{ '--film-ratio': `${film.width} / ${film.height}`, '--film-pct': pct } as CSSProperties}
    >
      <div className={f.media} data-fade={fade || undefined}>
        <img
          className={f.poster}
          src={film.poster}
          srcSet={film.posterSet?.map((p) => `${p.src} ${p.w}w`).join(', ')}
          sizes={film.posterSet ? film.sizes : undefined}
          alt={film.alt}
          width={film.width}
          height={film.height}
          decoding="async"
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : undefined}
        />
        {live && (
          <video
            ref={video}
            className={`${f.layer} ${f.video}`}
            muted
            playsInline
            preload="metadata"
            aria-hidden="true"
            tabIndex={-1}
            onTimeUpdate={onTime}
            onEnded={() => {
              setState('held')
              setPct(1)
            }}
          >
            {sources.map((src, i) => (
              <source key={src.src} src={src.src} type={src.type} onError={i === sources.length - 1 ? () => setFailed(true) : undefined} />
            ))}
          </video>
        )}
      </div>
      {live && (
        <>
          {progress ? (
            <div className={f.track} aria-hidden="true">
              <div className={f.fill} />
            </div>
          ) : null}
          <div className={f.controls}>
            <button type="button" onClick={replay} aria-label="Replay film">
              Replay
            </button>
            <button
              type="button"
              onClick={toggle}
              disabled={state === 'poster'}
              aria-pressed={state === 'paused'}
              aria-label={state === 'paused' || state === 'held' ? 'Play film' : 'Pause film'}
            >
              {state === 'paused' || state === 'held' ? 'Play' : 'Pause'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
