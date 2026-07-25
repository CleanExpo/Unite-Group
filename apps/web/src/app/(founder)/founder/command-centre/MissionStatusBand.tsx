'use client'

// src/app/(founder)/founder/command-centre/MissionStatusBand.tsx
//
// UNI-2378 wave 2 — the calm command deck went agent-first, but the founder's
// ask is a page that READS like a real mission control: the fleet and the AI
// agents visibly working, status-first, at a glance — without re-cluttering the
// deck with the dense Operations tiles.
//
// This band is that at-a-glance layer. Two cards, both fed by data sources that
// already exist (No-Invaders: no new mock, no invented numbers):
//   - Fleet   ← /api/command-centre/mesh-fleet          (Railway Pi-CEO mesh
//               heartbeats: which machines report, fresh vs stale, ships in
//               flight, and each node's SAFE state enum). The individual nodes
//               (MacBook / Mac-mini / Windows) list under the summary.
//   - Agents  ← /api/command-centre/live-agent-operations (founder-scoped
//               Supabase tasks + sessions → active agent sessions in flight,
//               open / blocked task counts, ships today, and the next action).
//
// Honesty rules honoured (two independent-review rounds, 25/07/2026):
//   - The mesh-fleet route returns HTTP 200 even for its degraded contract
//     (source upstream_error | timeout | error, with zeroed data). A generic
//     `isSuccess` predicate therefore classifies the semantic result, not just
//     the HTTP status: a degraded body is treated as a FAILURE — prior live
//     values are retained (never overwritten with zeroes) and `hadData` is not
//     set, so the note reads "unavailable — no live data" on a cold failure and
//     only "may be stale" once a real success has actually landed.
//   - The AI-agents headline uses the payload's own summary.activeSessions, NOT
//     a re-derivation from node state (node state gives 'blocked' precedence, so
//     re-deriving 'working' would drop owners who have a live session AND a
//     blocked task).
//   - The Fleet nodes render only the route's SAFE fields (host, is_stale,
//     last_seen, bounded `state` enum). The upstream free-text `current_task` is
//     deliberately stripped by the route's SafeMeshMachine contract and is NEVER
//     read here. Per-agent task detail lives on the Operations deck.
//   - There is NO static seed here, and the section header makes no blanket
//     "live" claim; each card's SourceBadge carries the real source state.
//
// Colour is reserved for the status signal only (go / caution / abort); every
// other surface stays neutral gunmetal, matching command-deck.module.css. The
// dense tiles remain on the Operations deck — this is the summary, not a copy.

import { useEffect, useRef, useState } from 'react'
import { SourceBadge, type SourceMode } from '@/components/command-centre/SourceBadge'

const POLL_MS = 15000
const NODE_CAP = 3

type Signal = 'go' | 'caution' | 'abort' | 'idle'

const SIGNAL_FILL: Record<Signal, string> = {
  go: 'var(--deck-go, #2dbb57)',
  caution: 'var(--deck-amber, #f4820f)',
  abort: 'var(--deck-abort, #e5484d)',
  idle: 'var(--cc-ink-hush, rgba(207,224,236,0.45))',
}

// Mirrors the route's SafeMeshMachine contract — host / last_seen / is_stale
// and the bounded state enum. `current_task` is intentionally absent: the route
// strips it, so it can never reach this component.
type MeshState = 'working' | 'idle' | 'offline' | 'stale' | 'unknown'

interface MeshMachine {
  host: string
  last_seen: string
  is_stale: boolean
  state?: MeshState
}

interface MeshFleetResponse {
  configured: boolean
  machines: MeshMachine[]
  shipCount: number
  source: string
  error?: string
}

const MESH_ERROR_SOURCES = new Set(['upstream_error', 'timeout', 'error'])

interface OperationsSummary {
  agents: number
  activeSessions: number
  openTasks: number
  blockedTasks: number
  approvalRequired: number
  recentShips: number
}

interface OperationsResponse {
  summary: OperationsSummary
  nextAction: string
}

interface Feed<T> {
  data: T | null
  loading: boolean
  /** Reason string when the latest attempt failed (HTTP or semantic); null when
   *  the latest attempt succeeded. */
  error: string | null
  /** True once at least one SUCCESSFUL fetch has landed, so a later failure is
   *  reported as "may be stale" rather than "no data". */
  hadData: boolean
}

// `isSuccess` lets a caller reject an HTTP-200 body that is semantically a
// failure (the mesh route's degraded contract). On failure we keep the prior
// `data` and leave `hadData` untouched; on success we replace both.
function useJson<T>(url: string, opts: { isSuccess?: (body: T) => string | null } = {}): Feed<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const hadData = useRef(false)
  const isSuccess = opts.isSuccess

  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | null = null

    async function load() {
      try {
        const res = await fetch(url, { cache: 'no-store' })
        if (!res.ok) throw new Error(`http_${res.status}`)
        const body = (await res.json()) as T
        const semanticError = isSuccess ? isSuccess(body) : null
        if (cancelled) return
        if (semanticError) {
          // 200 but degraded contract: retain prior live data, flag the failure.
          setError(semanticError)
        } else {
          setData(body)
          hadData.current = true
          setError(null)
        }
      } catch (err) {
        if (cancelled) return
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
  }, [url, isSuccess])

  return { data, loading, error, hadData: hadData.current }
}

function meshSuccess(body: MeshFleetResponse): string | null {
  return MESH_ERROR_SOURCES.has(body.source) ? (body.error ?? body.source) : null
}

function formatAgo(iso: string): string {
  const parsed = Date.parse(iso)
  if (Number.isNaN(parsed)) return 'unknown'
  const seconds = Math.max(0, Math.round((Date.now() - parsed) / 1000))
  if (seconds < 60) return `${seconds}s ago`
  if (seconds < 3600) return `${Math.round(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.round(seconds / 3600)}h ago`
  return `${Math.round(seconds / 86400)}d ago`
}

function StatusDot({ signal }: { signal: Signal }) {
  return (
    <span
      aria-hidden
      style={{
        display: 'inline-block',
        width: 9,
        height: 9,
        borderRadius: '50%',
        background: SIGNAL_FILL[signal],
        boxShadow: signal === 'idle' ? 'none' : `0 0 8px ${SIGNAL_FILL[signal]}`,
      }}
    />
  )
}

const CARD_STYLE: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
  padding: '14px 16px',
  borderRadius: 2,
  border: '1px solid var(--deck-line, rgba(255,255,255,0.10))',
  background: 'var(--deck-panel, #1c2230)',
  minWidth: 0,
}

const EYEBROW: React.CSSProperties = {
  fontFamily: 'var(--font-jbmono, monospace)',
  fontSize: 10,
  textTransform: 'uppercase',
  letterSpacing: '0.18em',
  color: 'var(--deck-muted, #a6afbc)',
}

const BIGNUM: React.CSSProperties = {
  fontFamily: 'var(--font-jbmono, monospace)',
  fontSize: 30,
  lineHeight: 1,
  fontWeight: 600,
  color: 'var(--deck-text, #f0f3f7)',
}

const SUBLINE: React.CSSProperties = {
  fontFamily: 'var(--font-jbmono, monospace)',
  fontSize: 11,
  color: 'var(--deck-muted, #a6afbc)',
}

// Honest degraded note for a source with NO static seed: distinguishes a hard
// failure (nothing real to show) from a retained-but-stale prior live value.
function DegradedNote({ source, stale, reason }: { source: string; stale: boolean; reason: string }) {
  return (
    <span
      role="alert"
      data-testid={`mission-degraded-${stale ? 'stale' : 'down'}`}
      style={{
        fontFamily: 'var(--font-jbmono, monospace)',
        fontSize: 11,
        color: stale ? 'var(--deck-amber-text, #b45309)' : 'var(--deck-abort-text, #e5484d)',
      }}
    >
      {stale
        ? `${source} last refresh failed — values may be stale (${reason})`
        : `${source} unavailable — no live data (${reason})`}
    </span>
  )
}

function FleetCard() {
  const { data, loading, error, hadData } = useJson<MeshFleetResponse>('/api/command-centre/mesh-fleet', {
    isSuccess: meshSuccess,
  })

  const configured = data?.configured ?? false
  const machines = data?.machines ?? []
  const staleCount = machines.filter((m) => m.is_stale).length
  const freshCount = machines.length - staleCount
  const shipCount = data?.shipCount ?? 0

  const failed = !!error
  // Cold failure — a failure with no prior successful read to fall back on.
  const cold = failed && !hadData
  const mode: SourceMode = loading ? 'loading' : failed || !configured ? 'degraded' : 'live'

  const signal: Signal = loading || cold || !configured
    ? 'idle'
    : machines.length === 0
      ? 'idle'
      : staleCount === 0
        ? 'go'
        : freshCount > 0
          ? 'caution'
          : 'abort'

  const reason = error ?? 'upstream'

  return (
    <div style={CARD_STYLE} data-testid="mission-fleet-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <span style={EYEBROW}>Fleet</span>
        <SourceBadge mode={mode} label={configured ? 'pi-ceo mesh' : failed ? 'unreachable' : 'not configured'} />
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <StatusDot signal={signal} />
        <span style={BIGNUM} data-testid="mission-fleet-count">
          {loading ? '··' : cold ? '--' : String(machines.length).padStart(2, '0')}
        </span>
        <span style={SUBLINE}>machines</span>
      </div>

      {!cold && (
        <span style={SUBLINE} data-testid="mission-fleet-summary">
          {!loading && !configured && !failed
            ? 'mesh not wired in this environment'
            : `${freshCount} fresh · ${staleCount} stale · ${shipCount} ship${shipCount === 1 ? '' : 's'} in flight`}
        </span>
      )}

      {failed && <DegradedNote source="Mesh Fleet" stale={hadData} reason={reason} />}

      {configured && machines.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {machines.slice(0, NODE_CAP).map((m) => (
            <div
              key={m.host}
              data-testid={`mission-node-${m.host}`}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 8,
                fontFamily: 'var(--font-jbmono, monospace)',
                fontSize: 11,
                color: 'var(--deck-text, #f0f3f7)',
              }}
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {m.host}
                {m.state && <span style={{ color: 'var(--deck-muted)' }}> · {m.state}</span>}
              </span>
              <span
                style={{
                  color: m.is_stale ? 'var(--deck-abort-text, #e5484d)' : 'var(--deck-muted)',
                  whiteSpace: 'nowrap',
                }}
              >
                {m.is_stale ? 'stale' : formatAgo(m.last_seen)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function AgentsCard() {
  const { data, loading, error, hadData } = useJson<OperationsResponse>('/api/command-centre/live-agent-operations')

  const summary = data?.summary
  // Honesty: headline is the payload's own activeSessions count (running/paused
  // sessions), NOT a re-derivation from node state — see file header note.
  const active = summary?.activeSessions ?? 0
  const failed = !!error
  const cold = failed && !hadData
  const mode: SourceMode = loading ? 'loading' : failed ? 'degraded' : 'live'

  const signal: Signal = loading || cold || !summary
    ? 'idle'
    : summary.blockedTasks > 0 && active === 0
      ? 'abort'
      : summary.blockedTasks > 0
        ? 'caution'
        : active > 0
          ? 'go'
          : 'idle'

  return (
    <div style={CARD_STYLE} data-testid="mission-agents-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <span style={EYEBROW}>AI Agents</span>
        <SourceBadge mode={mode} label={summary ? `${summary.agents} on deck` : failed ? 'unreachable' : 'no session'} />
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <StatusDot signal={signal} />
        <span style={BIGNUM} data-testid="mission-agents-active">
          {loading ? '··' : cold || !summary ? '--' : String(active).padStart(2, '0')}
        </span>
        <span style={SUBLINE}>active sessions</span>
      </div>

      {!cold && (
        <span style={SUBLINE} data-testid="mission-agents-summary">
          {loading || !summary
            ? 'reading operations…'
            : `${summary.openTasks} open · ${summary.blockedTasks} blocked · ${summary.recentShips} shipped`}
        </span>
      )}

      {failed && <DegradedNote source="Agent Operations" stale={hadData} reason={reason(error)} />}

      {!loading && !failed && data?.nextAction && (
        <span
          data-testid="mission-agents-next"
          style={{
            fontFamily: 'var(--font-jbmono, monospace)',
            fontSize: 11,
            color: 'var(--deck-text, #f0f3f7)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          ▸ {data.nextAction}
        </span>
      )}
    </div>
  )
}

function reason(error: string | null): string {
  return error ?? 'unavailable'
}

export function MissionStatusBand() {
  return (
    <div
      data-testid="mission-status-band"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: 12,
      }}
    >
      <FleetCard />
      <AgentsCard />
    </div>
  )
}
