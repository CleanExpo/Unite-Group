'use client'

// Live mission clock (UTC) for the Command Deck status strip.
// Client-only; renders a stable placeholder until mounted to avoid hydration drift.

import { useEffect, useState } from 'react'

const BRISBANE_TIME = new Intl.DateTimeFormat('en-AU', {
  timeZone: 'Australia/Brisbane',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
})

function formatBrisbane(d: Date): string {
  return BRISBANE_TIME.format(d)
}

export function LiveClock({ className }: { className?: string }) {
  const [time, setTime] = useState<string>('--:--:--')

  useEffect(() => {
    const tick = () => setTime(formatBrisbane(new Date()))
    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [])

  return (
    <span className={className} aria-label="Mission time, Brisbane (AEST)" suppressHydrationWarning>
      {time}
    </span>
  )
}
