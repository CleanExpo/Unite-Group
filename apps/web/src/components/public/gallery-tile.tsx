'use client'

import { useEffect, useRef, useState } from 'react'

import t from './gallery.module.css'

type Props = { name: string; label: string; video: string; poster: string; href: string }

/**
 * One film in the gallery. The server renders the poster only. After mount, and only when motion is allowed, a muted
 * looping film is mounted: on a device with a pointer it plays while the tile is hovered or focused; on a touch device
 * it plays while the tile is mostly in view. Reduced motion never mounts a film; the poster stays. A film that fails
 * leaves the poster in place.
 */
export function GalleryTile({ name, label, video, poster, href }: Props) {
  const [motion, setMotion] = useState(false)
  const [hover, setHover] = useState(false)
  const [inView, setInView] = useState(false)
  const [failed, setFailed] = useState(false)
  const [canHover, setCanHover] = useState(true)
  const root = useRef<HTMLAnchorElement>(null)
  const player = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)')
    const pointer = window.matchMedia('(hover: hover)')
    const apply = () => {
      setMotion(!reduce.matches)
      setCanHover(pointer.matches)
    }
    const start = () => apply()
    if (document.readyState === 'complete') apply()
    else window.addEventListener('load', start, { once: true })
    reduce.addEventListener('change', apply)
    return () => {
      window.removeEventListener('load', start)
      reduce.removeEventListener('change', apply)
    }
  }, [])

  useEffect(() => {
    const el = root.current
    if (!motion || canHover || !el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.6 })
    io.observe(el)
    return () => io.disconnect()
  }, [motion, canHover])

  const live = motion && !failed && (canHover ? hover : inView)

  useEffect(() => {
    const v = player.current
    if (live && v) void v.play().catch(() => setFailed(true))
  }, [live])

  return (
    <a
      ref={root}
      href={href}
      className={t.tile}
      data-gallery-tile={name}
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
    >
      <img className={t.poster} src={poster} alt="" width={540} height={960} loading="lazy" decoding="async" />
      {live && (
        <video ref={player} className={t.video} muted loop playsInline preload="metadata" aria-hidden="true" tabIndex={-1} onError={() => setFailed(true)}>
          <source src={video} type="video/mp4" onError={() => setFailed(true)} />
        </video>
      )}
      <span className={t.ai}>AI-generated</span>
      <span className={t.name}>{label}</span>
    </a>
  )
}
