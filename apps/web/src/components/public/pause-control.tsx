'use client'

import { useEffect, useState } from 'react'

import h from './hero.module.css'

/**
 * The visible pause control for the hero figure's motion (spec s10). It flips data-paused on the figure,
 * and the stylesheet does the rest. Under prefers-reduced-motion the motion is already off, so the button
 * says so and is disabled rather than offering a play that would do nothing.
 */
export function PauseControl({ targetId }: { targetId: string }) {
  const [paused, setPaused] = useState(false)
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(query.matches)
    const onChange = () => setReduced(query.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    document.getElementById(targetId)?.setAttribute('data-paused', String(paused))
  }, [paused, targetId])

  if (reduced) {
    return (
      <button type="button" className={h.pause} disabled>
        Motion is off (your device setting)
      </button>
    )
  }

  return (
    <button type="button" className={h.pause} aria-pressed={paused} onClick={() => setPaused((p) => !p)}>
      {paused ? 'Play the animation' : 'Pause the animation'}
    </button>
  )
}
