'use client'

// ActivityRow — single activity-feed row (monospace, tight, reverse-chrono).
// Severity vocabulary: running → ink; signal → cyan pip + ink; hush → ink-hush.

import type { ActivityDatum, ActivityOrigin } from './activity-data'
import styles from '../command-center.module.css'

export interface ActivityRowProps {
  data: ActivityDatum
}

const TIME_FMT = new Intl.DateTimeFormat('en-AU', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'Australia/Brisbane',
})

// Short label per origin — kept terse to fit the monospace source chip.
const ORIGIN_LABEL: Record<ActivityOrigin, string> = {
  linear: 'linear',
  github: 'github',
  evidence: 'evidence',
  provider: 'provider',
  cc: 'cc',
}

// Source chip — the "where did this come from" pip. Custom inline SVG glyph
// (no icon library) over the existing --cc-* token vocabulary.
function SourceChip({ origin }: { origin: ActivityOrigin }) {
  return (
    <span
      className="inline-flex items-center gap-1 uppercase tracking-[0.12em]"
      style={{ color: 'var(--cc-ink-hush)' }}
      data-activity-origin={origin}
      title={`Source: ${ORIGIN_LABEL[origin]}`}
    >
      <svg width="7" height="7" viewBox="0 0 7 7" aria-hidden focusable="false">
        <rect x="0.5" y="0.5" width="6" height="6" fill="none" stroke="var(--cc-grid)" />
        <circle cx="3.5" cy="3.5" r="1.25" fill="var(--cc-signal)" />
      </svg>
      <span>{ORIGIN_LABEL[origin]}</span>
    </span>
  )
}

export function ActivityRow({ data }: ActivityRowProps) {
  const isSignal = data.severity === 'signal'
  const isHush = data.severity === 'hush'

  const tsLabel = (() => {
    try {
      return TIME_FMT.format(new Date(data.ts))
    } catch {
      return '--:--'
    }
  })()

  const rowStyle: React.CSSProperties = {
    gridTemplateColumns:
      '3.25rem minmax(4.5rem, 0.9fr) minmax(4.75rem, 0.85fr) minmax(6rem, 1.5fr) minmax(4.5rem, auto) 0.75rem',
    background: 'transparent',
    borderBottom: '1px solid var(--cc-grid)',
    color: isHush ? 'var(--cc-ink-hush)' : 'var(--cc-ink)',
  }

  const body = (
    <>
      <span style={{ color: 'var(--cc-ink-dim)', fontVariantNumeric: 'tabular-nums' }}>
        {tsLabel}
      </span>
      <span
        className="uppercase tracking-[0.14em] truncate"
        style={{ color: isHush ? 'var(--cc-ink-hush)' : 'var(--cc-ink)' }}
      >
        {data.agent}
      </span>
      <span className="truncate" style={{ color: 'var(--cc-ink-dim)' }}>
        {data.verb}
      </span>
      <span className="truncate">{data.target}</span>
      <span className="flex justify-start font-mono text-[10px]">
        <SourceChip origin={data.origin} />
      </span>
      <span
        aria-hidden
        className={isSignal ? styles.breathe : undefined}
        style={{
          display: 'inline-block',
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: isSignal ? 'var(--cc-signal)' : 'transparent',
        }}
      />
    </>
  )

  if (data.url) {
    return (
      <a
        href={data.url}
        target="_blank"
        rel="noopener noreferrer"
        className="grid items-center gap-2 px-3 py-1.5 font-mono text-[11px] sm:gap-3 sm:px-4"
        style={{ ...rowStyle, textDecoration: 'none' }}
        data-cc-severity={data.severity}
        data-testid={`activity-row-link-${data.id}`}
        aria-label={`${tsLabel} ${data.agent} ${data.verb} ${data.target}`}
      >
        {body}
      </a>
    )
  }

  return (
    <div
      className="grid items-center gap-2 px-3 py-1.5 font-mono text-[11px] sm:gap-3 sm:px-4"
      style={rowStyle}
      data-cc-severity={data.severity}
      aria-label={`${tsLabel} ${data.agent} ${data.verb} ${data.target}`}
    >
      {body}
    </div>
  )
}
