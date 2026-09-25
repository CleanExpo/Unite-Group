// src/components/command-centre/email-accounts/EmailAccountsRing.tsx
//
// Ring (donut) summary of the email-account roster (UNI-2772). Pure SVG, no
// hooks, no chart library, server-safe. It charts ONLY the three counts the
// tile already has from its read (connected / needs re-auth / not connected);
// the caller decides whether a read is trustworthy enough to draw at all.
//
// One pure function (`computeRingSegments`) turns counts into arc lengths and
// start offsets along the circumference; the SVG only paints what it returns.
// Zero accounts returns null, so there is never an empty or fake ring.

import type { EmailAccountState } from '@/lib/command-centre/email-accounts'

export type RingCounts = { connected: number; needsReauth: number; notConnected: number }

export const RING = { size: 72, stroke: 9, radius: 30, gap: 3 } as const

const STATUSES: { status: EmailAccountState; key: keyof RingCounts; label: string; fill: string; text: string }[] = [
  { status: 'connected', key: 'connected', label: 'Connected', fill: 'var(--deck-go, #2dbb57)', text: 'var(--tile-green-txt, #34d399)' },
  { status: 'needs_reauth', key: 'needsReauth', label: 'Needs re-auth', fill: 'var(--deck-amber, #f4820f)', text: 'var(--deck-amber-text, #b45309)' },
  { status: 'not_connected', key: 'notConnected', label: 'Not connected', fill: 'var(--deck-abort, #e5484d)', text: 'var(--deck-abort-text, #d02f35)' },
]

export function computeRingSegments(counts: RingCounts) {
  const total = counts.connected + counts.needsReauth + counts.notConnected
  if (total <= 0) return null
  const circumference = 2 * Math.PI * RING.radius
  const drawn = STATUSES.filter((s) => counts[s.key] > 0)
  // A single status is a closed circle; otherwise one gap follows each arc.
  const gap = drawn.length > 1 ? RING.gap : 0
  const usable = circumference - gap * drawn.length
  let cursor = 0
  const segments = drawn.map((s) => {
    const length = (usable * counts[s.key]) / total
    const seg = { status: s.status, count: counts[s.key], length, offset: cursor, fill: s.fill }
    cursor += length + gap
    return seg
  })
  return { circumference, total, segments }
}

export function EmailAccountsRing({ counts }: { counts: RingCounts }) {
  const g = computeRingSegments(counts)
  if (!g) return null
  const c = RING.size / 2
  return (
    <div data-testid="email-accounts-ring" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      <svg
        viewBox={`0 0 ${RING.size} ${RING.size}`}
        width={RING.size}
        height={RING.size}
        role="img"
        aria-label={`${counts.connected} of ${g.total} email accounts connected`}
        style={{ display: 'block', flex: 'none' }}
      >
        <g transform={`rotate(-90 ${c} ${c})`}>
          {g.segments.map((s) => (
            <circle
              key={s.status}
              data-testid={`email-ring-seg-${s.status}`}
              cx={c}
              cy={c}
              r={RING.radius}
              fill="none"
              stroke={s.fill}
              strokeWidth={RING.stroke}
              strokeDasharray={`${s.length} ${g.circumference - s.length}`}
              strokeDashoffset={-s.offset}
            />
          ))}
        </g>
        <text
          data-testid="email-ring-centre"
          x={c}
          y={c - 3}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={14}
          fontWeight={600}
          fill="var(--deck-text, #e6f7ff)"
        >
          {`${counts.connected}/${g.total}`}
        </text>
        <text x={c} y={c + 11} textAnchor="middle" dominantBaseline="middle" fontSize={8} fill="var(--deck-muted)">
          working
        </text>
      </svg>
      <ul data-testid="email-ring-legend" style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 4, fontSize: 11 }}>
        {STATUSES.map((s) => (
          <li key={s.status} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span aria-hidden style={{ width: 8, height: 8, borderRadius: 2, background: s.fill }} />
            <span style={{ color: s.text }}>{s.label}</span>
            <span style={{ color: 'var(--deck-text, #e6f7ff)', fontVariantNumeric: 'tabular-nums', marginLeft: 'auto', paddingLeft: 10 }}>
              {counts[s.key]}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
