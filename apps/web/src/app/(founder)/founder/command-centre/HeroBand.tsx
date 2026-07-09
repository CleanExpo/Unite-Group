// src/app/(founder)/founder/command-centre/HeroBand.tsx
//
// UNI-2339 slice 1 — canvas shell hero band ("Morning, Phill" + today's
// priorities). Server component. Sources the SAME ActionQueueTileData
// already loaded once in page.tsx for ActionQueueTile — no duplicate
// fetch. Honest states mirror ActionQueueTile's Linear-not-connected copy
// verbatim (RA-1109).

import type { ActionQueueTileData } from './ActionQueueTile'
import shell from './shell.module.css'

/** Time-of-day greeting from server time, rendered in AEST (matches the
 *  rest of the deck's Australia/Brisbane convention — see LiveClock,
 *  EvidenceStreamTile). */
export function greetingFor(now: () => Date = () => new Date()): 'Morning' | 'Afternoon' | 'Evening' {
  const hour = Number(
    new Intl.DateTimeFormat('en-AU', {
      timeZone: 'Australia/Brisbane',
      hour: 'numeric',
      hour12: false,
    }).format(now()),
  )
  if (hour < 12) return 'Morning'
  if (hour < 18) return 'Afternoon'
  return 'Evening'
}

export function HeroBand({
  data,
  now = () => new Date(),
}: {
  data: ActionQueueTileData
  now?: () => Date
}) {
  const greet = greetingFor(now)
  const hasError = Boolean(data.read_error)
  const localOnly = hasError && /ENOENT|no such file/i.test(data.read_error as string)
  const count = data.shown_rows

  const sub = hasError
    ? localOnly
      ? "Linear not connected (LINEAR_API_KEY not set) — and the local 2nd-brain vault fallback isn't available in this environment."
      : `Could not read action queue: ${data.read_error}`
    : count === 0
      ? `No actions queued at ${data.queue_path}.`
      : `${count} of ${data.total_rows} actions need you today.`

  return (
    <div className={`${shell.canvasScope} ${shell.hero}`} data-testid="hero-band">
      <div className={shell.heroGreet}>
        <div className={shell.eyebrow}>Founder command · Unite-Group Nexus</div>
        <h1 className={shell.heroTitle}>
          {greet}, Phill.
          {!hasError && count > 0 && (
            <>
              {' '}
              <em className={shell.heroEm}>
                {count} {count === 1 ? 'priority needs' : 'priorities need'}
              </em>{' '}
              you.
            </>
          )}
        </h1>
        <p className={shell.heroSub} data-testid="hero-band-status">
          {sub}
        </p>
      </div>
    </div>
  )
}
