'use client'

import { useEffect, useRef, type ReactNode } from 'react'

import t from './story.module.css'

/**
 * Wraps the six shards. The server markup is the finished U (data-shards="assembled"), so no script and reduced
 * motion lose nothing. Where the browser supports `animation-timeline: view()` the stylesheet assembles the shards
 * as the visitor scrolls and this does nothing. Where it does not, and motion is allowed, the shards start apart
 * and an IntersectionObserver lets them fall into the U once the block is in view.
 */
export function ShardAssembly({ children }: { children: ReactNode }) {
  const box = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = box.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    if (CSS.supports('animation-timeline: view()')) return
    // Already on screen when the page loads: leave it assembled rather than flashing it apart.
    if (el.getBoundingClientRect().top < window.innerHeight * 0.6) return
    el.dataset.shards = 'apart'
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.dataset.shards = 'assembled'
          io.disconnect()
        }
      },
      { threshold: 0.35 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <div ref={box} className={t.u} data-u data-shards="assembled">
      {children}
    </div>
  )
}
