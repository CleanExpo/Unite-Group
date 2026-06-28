'use client'

// ActivityLog — reverse-chrono activity feed. Renders up to `maxRows`.
// Ships empty by default (honest "0 events" + seed badge); a caller passes
// live `events` + `sourceLiveAt` when a real source is wired.

import { useMemo } from 'react'
import { ActivityRow } from './ActivityRow'
import { ACTIVITY_DATA, type ActivityDatum } from './activity-data'
import { SourceBadge } from '../SourceBadge'
import styles from '../command-centre.module.css'

export interface ActivityLogProps {
  /** Override the seed — used for live wiring. */
  events?: ActivityDatum[]
  /** Max rows to render. Defaults to 20. */
  maxRows?: number
  /** When set, the SourceBadge flips from `seed` to `live`. */
  sourceLiveAt?: string
}

export function ActivityLog({ events = ACTIVITY_DATA, maxRows = 20, sourceLiveAt }: ActivityLogProps) {
  const isLive = !!sourceLiveAt
  const sorted = useMemo(() => {
    return [...events].sort((a, b) => (a.ts < b.ts ? 1 : -1)).slice(0, maxRows)
  }, [events, maxRows])

  const signalCount = sorted.filter((e) => e.severity === 'signal').length

  return (
    <section
      className="flex flex-col"
      style={{ background: 'var(--cc-bg-soft)', borderTop: '1px solid var(--cc-grid)' }}
      aria-label="Live activity log"
    >
      <header
        className="flex items-center justify-between px-5 h-10"
        style={{ background: 'var(--cc-bg)', borderBottom: '1px solid var(--cc-grid)' }}
      >
        <span
          className="font-mono text-[11px] uppercase tracking-[0.22em]"
          style={{ color: 'var(--cc-ink-dim)' }}
        >
          Activity Log
        </span>
        <span
          className="font-mono text-[10px] uppercase tracking-[0.18em] flex items-center gap-3"
          style={{ color: 'var(--cc-ink-hush)' }}
        >
          {signalCount > 0 && (
            <span
              aria-hidden
              className={styles.breathe}
              style={{
                display: 'inline-block',
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: 'var(--cc-signal)',
              }}
            />
          )}
          <span>
            {sorted.length} events
            {signalCount > 0 ? ` · ${signalCount} signal` : ''}
          </span>
          {isLive ? (
            <SourceBadge mode="live" label="agent_actions" lastUpdatedAt={sourceLiveAt} />
          ) : (
            <SourceBadge mode="seed" label="static · awaits live activity source" />
          )}
        </span>
      </header>

      <div
        className="overflow-y-auto"
        style={{ maxHeight: '480px', minHeight: '320px' }}
        role="log"
        aria-live="polite"
        aria-relevant="additions"
      >
        {sorted.length > 0 ? (
          sorted.map((event) => <ActivityRow key={event.id} data={event} />)
        ) : (
          <p
            className="px-5 py-6 font-mono text-[11px] leading-relaxed"
            style={{ color: 'var(--cc-ink-hush)' }}
          >
            No activity events yet. This feed lights up once a live agent-activity source is wired.
          </p>
        )}
      </div>
    </section>
  )
}
