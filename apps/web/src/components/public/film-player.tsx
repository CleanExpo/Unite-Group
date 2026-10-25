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
export function FilmPlayer({ film, priority = false, className = '', fade = false, controls = 'top' }: { film: Film; priority?: boolean; className?: string; fade?: boolean; controls?: 'top' | 'bottom' }) {
  const [motion, setMotion] = useState(false)
  const [seen, setSeen] = useState(false)
  const [failed, setFailed] = useState(false)
  const [state, setState] = useState<State>('poster')
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

  // Mount the film only once it is half in view; then play it once.
  useEffect(() => {
    const el = root.current
    if (!motion || failed || seen || !el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setSeen(true)
      },
      { threshold: 0.4 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [motion, failed, seen])

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
    v.currentTime = 0
    run(v)
  }
  function toggle() {
    const v = video.current
    if (!v) return
    if (state === 'playing') {
      v.pause()
      setState('paused')
    } else if (state === 'paused') run(v)
  }

  return (
    <div
      ref={root}
      data-film
      data-film-state={live ? state : 'poster'}
      data-controls={controls}
      className={`${f.film} ${className}`}
      style={{ '--film-ratio': `${film.width} / ${film.height}` } as CSSProperties}
    >
      <div className={f.media} data-fade={fade || undefined}>
        <img
          className={f.layer}
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
            onEnded={() => setState('held')}
          >
            {sources.map((src, i) => (
              <source key={src.src} src={src.src} type={src.type} onError={i === sources.length - 1 ? () => setFailed(true) : undefined} />
            ))}
          </video>
        )}
      </div>
      {live && (
        <div className={f.controls}>
          <button type="button" onClick={replay}>
            Replay
          </button>
          <button type="button" onClick={toggle} disabled={state === 'held' || state === 'poster'} aria-pressed={state === 'paused'}>
            {state === 'paused' ? 'Play' : 'Pause'}
          </button>
        </div>
      )}
    </div>
  )
}
