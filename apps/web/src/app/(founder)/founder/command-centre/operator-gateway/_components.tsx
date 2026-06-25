// src/app/(founder)/founder/command-centre/operator-gateway/_components.tsx
//
// Design-system primitives for the Operator Execution Surface.
// Server-component-safe: no 'use client', no hooks, no event handlers.
// Centralises the bespoke GitHub-dark theme so the page carries semantic tone
// props instead of 134 scattered inline styles.

import type { AgentConnectionState } from '@/lib/operator-gateway/presence'

// ---------------------------------------------------------------------------
// Theme tokens — the single home for the GitHub-dark palette.
// ---------------------------------------------------------------------------

export const theme = {
  text: '#e6edf3',
  muted: '#8b949e',
  surface: '#0d1117',
  border: '#30363d',
  borderSoft: '#21262d',
  ok: '#3fb950',
  warn: '#d29922',
  warnAlt: '#f97316',
  bad: '#f85149',
  info: '#16a34a',
} as const

export type Tone = 'ok' | 'warn' | 'bad' | 'muted' | 'info'

// bg / fg / border per tone — used by Pill and tone-coloured text.
const toneSwatch: Record<Tone, { bg: string; fg: string; bd: string }> = {
  ok: { bg: '#12361f', fg: '#3fb950', bd: '#238636' },
  bad: { bg: '#3a1d1d', fg: '#f85149', bd: '#da3633' },
  warn: { bg: '#3a300f', fg: '#d29922', bd: '#9e6a03' },
  info: { bg: '#071b24', fg: '#16a34a', bd: '#00a3b5' },
  muted: { bg: '#161b22', fg: '#8b949e', bd: '#30363d' },
}

// ---------------------------------------------------------------------------
// Shared layout styles.
// ---------------------------------------------------------------------------

export const grid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
  gap: '1rem',
}

export const th: React.CSSProperties = {
  textAlign: 'left',
  fontSize: 12,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  color: theme.muted,
  padding: '0.45rem 0.6rem',
  borderBottom: `1px solid ${theme.border}`,
}

export const td: React.CSSProperties = {
  padding: '0.55rem 0.6rem',
  borderBottom: `1px solid ${theme.borderSoft}`,
  fontSize: 14,
  verticalAlign: 'top',
}

export const inputStyle: React.CSSProperties = {
  width: '100%',
  border: `1px solid ${theme.border}`,
  borderRadius: 2,
  background: '#fffdf7',
  color: theme.muted,
  padding: '0.65rem 0.75rem',
}

// ---------------------------------------------------------------------------
// connectionTone — maps a live agent connection state to a semantic tone.
// (Replaces the old connTone helper.)
// ---------------------------------------------------------------------------

export function connectionTone(state: AgentConnectionState): Tone {
  if (state === 'connected') return 'ok'
  if (state === 'stale') return 'warn'
  return 'bad'
}

// runtimeTone — maps a runtime-node status string to a semantic tone.
export function runtimeTone(status: string): Tone {
  if (status === 'active') return 'ok'
  if (status === 'design_only') return 'info'
  if (status === 'blocked_install') return 'warn'
  return 'bad'
}

// ---------------------------------------------------------------------------
// Pill — small status chip. Replaces the pill() helper + tone logic.
// ---------------------------------------------------------------------------

export function Pill({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  const { bg, fg, bd } = toneSwatch[tone]
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '0.12rem 0.5rem',
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 700,
        background: bg,
        color: fg,
        border: `1px solid ${bd}`,
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  )
}

// ---------------------------------------------------------------------------
// StatusRow — label + yes/no pill. Replaces the boolLabel lines.
//
//   safeWhenFalse=true  → "no" is the safe (green) answer (default)
//   safeWhenFalse=false → "yes" is the safe (green) answer
// ---------------------------------------------------------------------------

export function StatusRow({
  label,
  value,
  safeWhenFalse = true,
}: {
  label: string
  value: boolean
  safeWhenFalse?: boolean
}) {
  const safe = safeWhenFalse ? !value : value
  return (
    <p style={{ margin: '0.35rem 0', fontSize: 14 }}>
      {label}: <Pill tone={safe ? 'ok' : 'bad'}>{value ? 'yes' : 'no'}</Pill>
    </p>
  )
}

// ---------------------------------------------------------------------------
// Card — the standard dark panel.
// ---------------------------------------------------------------------------

export function Card({
  children,
  style,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      style={{
        background: theme.surface,
        border: `1px solid ${theme.border}`,
        borderRadius: 2,
        padding: '1rem 1.25rem',
        marginBottom: '1.25rem',
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  )
}

// ---------------------------------------------------------------------------
// SectionHeader — title + optional trailing slot (e.g. a status Pill).
// ---------------------------------------------------------------------------

export function SectionHeader({
  title,
  trailing,
  size = 18,
}: {
  title: string
  trailing?: React.ReactNode
  size?: number
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '0.75rem',
        flexWrap: 'wrap',
        marginBottom: '0.5rem',
      }}
    >
      <h2 style={{ fontSize: size, margin: 0 }}>{title}</h2>
      {trailing ?? null}
    </div>
  )
}

// ---------------------------------------------------------------------------
// MetricCard — a top-strip summary card.
// ---------------------------------------------------------------------------

export function MetricCard({
  label,
  value,
  tone,
  hint,
}: {
  label: string
  value: React.ReactNode
  tone: Tone
  hint?: string
}) {
  const accent = toneSwatch[tone].fg
  return (
    <div
      style={{
        background: theme.surface,
        border: `1px solid ${theme.border}`,
        borderLeft: `3px solid ${accent}`,
        borderRadius: 2,
        padding: '0.85rem 1rem',
      }}
    >
      <div
        style={{
          fontSize: 11,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          color: theme.muted,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 20, fontWeight: 700, color: accent, margin: '0.2rem 0' }}>
        {value}
      </div>
      {hint ? <div style={{ fontSize: 12, color: theme.muted }}>{hint}</div> : null}
    </div>
  )
}

// ---------------------------------------------------------------------------
// CollapsibleGroup — native <details>/<summary> progressive disclosure.
// No client JS; the browser owns the open/close state.
// ---------------------------------------------------------------------------

export function CollapsibleGroup({
  title,
  summary,
  tone = 'muted',
  defaultOpen = false,
  ariaLabel,
  children,
}: {
  title: string
  summary: React.ReactNode
  tone?: Tone
  defaultOpen?: boolean
  ariaLabel?: string
  children: React.ReactNode
}) {
  const accent = toneSwatch[tone].fg
  return (
    <details
      open={defaultOpen}
      aria-label={ariaLabel ?? title}
      style={{
        background: theme.surface,
        border: `1px solid ${theme.border}`,
        borderRadius: 2,
        marginBottom: '1rem',
      }}
    >
      <summary
        style={{
          listStyle: 'none',
          cursor: 'pointer',
          padding: '0.85rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem',
          flexWrap: 'wrap',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span aria-hidden style={{ color: theme.muted, fontSize: 12 }}>▸</span>
          <span style={{ fontSize: 16, fontWeight: 700 }}>{title}</span>
        </span>
        <span style={{ fontSize: 13, color: accent }}>{summary}</span>
      </summary>
      <div style={{ padding: '0 1.25rem 1.1rem', borderTop: `1px solid ${theme.borderSoft}` }}>
        {children}
      </div>
    </details>
  )
}
