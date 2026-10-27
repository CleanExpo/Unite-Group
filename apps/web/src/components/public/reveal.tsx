'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'

import r from './reveal.module.css'

type Motion = 'rise' | 'left' | 'right' | 'scale'

type Props = {
  children: ReactNode
  className?: string
  /** Stagger index for cascade delay (0–8) */
  delay?: number
  motion?: Motion
}

/** In-view entrance; respects reduced motion. */
export function Reveal({ children, className, delay = 0, motion = 'rise' }: Props) {
  const root = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = root.current
    if (!el) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (reduce.matches) {
      setVisible(true)
      return
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true)
          io.disconnect()
        }
      },
      { threshold: 0.08, rootMargin: '0px 0px -6% 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const motionClass =
    motion === 'left' ? r.left : motion === 'right' ? r.right : motion === 'scale' ? r.scale : r.rise

  return (
    <div
      ref={root}
      className={`${r.reveal} ${motionClass} ${visible ? r.in : ''} ${className ?? ''}`}
      style={{ '--reveal-delay': `${Math.min(delay, 8) * 65}ms` } as React.CSSProperties}
    >
      {children}
    </div>
  )
}
