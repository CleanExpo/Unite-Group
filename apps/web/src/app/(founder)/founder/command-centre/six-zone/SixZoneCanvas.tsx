'use client'

// src/app/(founder)/founder/command-centre/six-zone/SixZoneCanvas.tsx
//
// Six-zone canvas — one compact grid, one live zone, five signposts.
//
//   Zone 1 (live)  ← /api/command-centre/local-host-status. The only zone that
//                    carries values: host name plus the four local signals the
//                    route reports (Hermes, Ollama/Gemma, external storage, mesh
//                    heartbeat), each with its explicit ready/degraded/unknown
//                    state and the observation's freshness.
//   Zones 2-6      ← links ONLY, into decks that already exist (Operations and
//                    its real Evidence-stream / Agent-fleet panels, Knowledge,
//                    Providers). They carry no numbers of their own.
//
// No-Invaders honesty rules:
//   - Every state rendered here comes from the route's own `state` field. There
//     is no derivation, no seed, and no fallback value: a failed fetch renders
//     'unknown' for all four signals and says so, it never shows a stale ready.
//   - `configured: false` (local adapter off) is reported as-is — the route's
//     unknown signals are surfaced verbatim, not dressed as degraded.
//   - Freshness is the route's own `observedAt`; when it is absent or the fetch
//     has never succeeded, freshness reads "no observation".
//
// Register matches the command deck (shell.module.css canvas tokens + the deck's
// mono/eyebrow type), so this is the same cockpit, not a new look.

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { SourceBadge, type SourceMode } from '@/components/command-centre/SourceBadge'
import shell from '../shell.module.css'

const POLL_MS = 15000

type SignalState = 'ready' | 'degraded' | 'unknown'

interface HostSignal {
  id: string
  label: string
  state: SignalState
  detail: string
}

interface LocalHostStatus {
  configured: boolean
  observedAt: string
  host: string | null
  signals: HostSignal[]
}

// The four signals the route always returns, in route order. Used only to render
// honest 'unknown' placeholders when there is no payload at all — the labels are
// replaced by the route's own labels the moment a payload lands.
const SIGNAL_FALLBACK: HostSignal[] = [
  { id: 'hermes', label: 'Hermes', state: 'unknown', detail: 'no reading' },
  { id: 'ollama', label: 'Ollama / Gemma', state: 'unknown', detail: 'no reading' },
  { id: 'storage', label: 'External storage', state: 'unknown', detail: 'no reading' },
  { id: 'mesh_heartbeat', label: 'Mesh heartbeat', state: 'unknown', detail: 'no reading' },
]

const STATE_COLOUR: Record<SignalState, string> = {
  ready: 'var(--green-txt, #34d399)',
  degraded: 'var(--amber-txt, #f0a94c)',
  unknown: 'var(--ink-hush, #6d7887)',
}

// Zones 2-6 — signposts only. Every href is a route that exists today; the
// Evidence and Fleet zones deep-link the Operations deck's real panel anchors.
const ZONE_LINKS = [
  {
    id: 'operations',
    name: 'Operations',
    href: '/founder/command-centre/operations',
    meta: 'queue · approvals · health',
    swatch: '#34d399',
  },
  {
    id: 'evidence',
    name: 'Evidence',
    href: '/founder/command-centre/operations#evidence-stream',
    meta: 'evidence stream panel',
    swatch: '#22d3ee',
  },
  {
    id: 'fleet',
    name: 'Fleet',
    href: '/founder/command-centre/operations#agent-fleet',
    meta: 'agent fleet panel',
    swatch: '#fbbf24',
  },
  {
    id: 'knowledge',
    name: 'Knowledge',
    href: '/founder/command-centre/knowledge',
    meta: 'wiki base · capability bus',
    swatch: '#6366f1',
  },
  {
    id: 'providers',
    name: 'Providers',
    href: '/founder/command-centre/providers',
    meta: 'integration manifests',
    swatch: '#f97316',
  },
] as const

function formatAgo(iso: string | null): string {
  if (!iso) return 'no observation'
  const parsed = Date.parse(iso)
  if (Number.isNaN(parsed)) return 'no observation'
  const seconds = Math.max(0, Math.round((Date.now() - parsed) / 1000))
  if (seconds < 60) return `observed ${seconds}s ago`
  if (seconds < 3600) return `observed ${Math.round(seconds / 60)}m ago`
  if (seconds < 86400) return `observed ${Math.round(seconds / 3600)}h ago`
  return `observed ${Math.round(seconds / 86400)}d ago`
}

const EYEBROW: React.CSSProperties = {
  fontFamily: 'var(--font-jbmono, monospace)',
  fontSize: 10,
  textTransform: 'uppercase',
  letterSpacing: '0.18em',
  color: 'var(--ink-dim, #a6afbc)',
}

const MONO_SM: React.CSSProperties = {
  fontFamily: 'var(--font-jbmono, monospace)',
  fontSize: 11,
  color: 'var(--ink-dim, #a6afbc)',
}

function HostZone() {
  const [data, setData] = useState<LocalHostStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | null = null

    async function load() {
      try {
        const res = await fetch('/api/command-centre/local-host-status', { cache: 'no-store' })
        if (!res.ok) throw new Error(`http_${res.status}`)
        const body = (await res.json()) as LocalHostStatus
        if (cancelled) return
        setData(body)
        setError(null)
      } catch (err) {
        if (cancelled) return
        // Drop the payload: a failed read must not leave a stale 'ready' on screen.
        setData(null)
        setError(err instanceof Error ? err.message : 'fetch_failed')
      } finally {
        if (!cancelled) {
          setLoading(false)
          timer = setTimeout(load, POLL_MS)
        }
      }
    }

    void load()
    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [])

  const signals = data?.signals?.length ? data.signals : SIGNAL_FALLBACK
  const mode: SourceMode = loading ? 'loading' : error || !data?.configured ? 'degraded' : 'live'
  const badgeLabel = error ? 'unreachable' : data?.configured ? 'local adapter' : 'adapter not enabled'

  // `1 / -1` spans whatever columns .launchGrid's auto-fill resolved to. `span 2`
  // would create an IMPLICIT second column — and horizontal overflow — whenever
  // the grid collapses to a single track on a narrow deck.
  return (
    <div
      className={`${shell.canvasScope} ${shell.launchTile}`}
      style={{ '--swatch': '#2dbb57', gridColumn: '1 / -1' } as React.CSSProperties}
      data-testid="six-zone-host"
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <span style={EYEBROW}>Zone 1 · Local Host</span>
        <SourceBadge mode={mode} label={badgeLabel} />
      </div>

      <span className={shell.launchName} data-testid="six-zone-host-name">
        {loading ? '··' : (data?.host ?? 'host unknown')}
      </span>

      <span style={MONO_SM} data-testid="six-zone-host-freshness">
        {loading ? 'reading local host…' : formatAgo(data?.observedAt ?? null)}
      </span>

      {error && (
        <span
          role="alert"
          data-testid="six-zone-host-error"
          style={{ ...MONO_SM, color: 'var(--red-300, #e03333)' }}
        >
          local host status unavailable — no live data ({error})
        </span>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 2 }}>
        {signals.map((signal) => (
          <div
            key={signal.id}
            data-testid={`six-zone-signal-${signal.id}`}
            data-state={signal.state}
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, ...MONO_SM }}
          >
            <span style={{ color: 'var(--ink, #f0f3f7)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {signal.label}
            </span>
            <span style={{ display: 'inline-flex', gap: 6, alignItems: 'baseline', minWidth: 0 }}>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{signal.detail}</span>
              <span style={{ color: STATE_COLOUR[signal.state], textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {signal.state}
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function SixZoneCanvas({
  work,
}: {
  work: { queued: number; blocked: number; source: string; nextAction: string | null; error: boolean }
}) {
  return (
    <div className={shell.launchGrid} data-testid="six-zone-canvas">
      <HostZone />

      {ZONE_LINKS.map((zone, index) => (
        <Link
          key={zone.id}
          href={zone.href}
          className={`${shell.canvasScope} ${shell.launchTile}`}
          style={{ '--swatch': zone.swatch, textDecoration: 'none' } as React.CSSProperties}
          data-testid={`six-zone-link-${zone.id}`}
        >
          <span style={EYEBROW}>Zone {index + 2}</span>
          <span className={shell.launchName}>{zone.name}</span>
          <span className={shell.launchMeta}>
            {zone.id === 'operations'
              ? work.error
                ? 'queue receipt unavailable — open Operations'
                : `${work.queued} queued · ${work.blocked} blocked · ${work.source}`
              : zone.meta}
          </span>
          {zone.id === 'operations' && !work.error && (
            <span style={MONO_SM}>{work.nextAction ? `next: ${work.nextAction}` : 'next action: none recorded'}</span>
          )}
          <span className={shell.launchLink}>↗ open</span>
        </Link>
      ))}
    </div>
  )
}
