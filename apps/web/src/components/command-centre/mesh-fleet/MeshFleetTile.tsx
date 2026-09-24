'use client'

// src/components/command-centre/mesh-fleet/MeshFleetTile.tsx
//
// UNI-2305 — Mesh Fleet tile. Founder command-centre view of the Railway
// Pi-CEO mesh: which machines are reporting, whether their heartbeat is
// fresh or stale, and the ships-in-flight count. Reads its own data from
// /api/command-centre/mesh-fleet (no secrets ever reach this component).

import { useEffect, useState } from 'react'
import { SourceBadge, type SourceMode } from '../SourceBadge'
import { DegradedDataBanner } from '../DegradedDataBanner'
import { DeckDetails, DeckMoreLine, DECK_LIST_CAP } from '../DeckDetails'

interface MeshMachine {
  host: string
  last_seen: string
  is_stale: boolean
  state?: string
  cpu_pct?: number
  mem_pct?: number
  load1?: number
  agent_runtimes?: string[]
  active_agents?: number
}

interface MeshClaim {
  linear_id: string
  machine: string | null
  branch: string | null
  state: string
}

interface MeshFleetResponse {
  configured: boolean
  machines: MeshMachine[]
  shipCount: number
  claims?: MeshClaim[]
  source: string
  error?: string
}

// Heartbeats go stale after 60s (mesh_fleet view). A machine silent for 10
// minutes is treated as switched off — shown "offline", not as an error.
const OFFLINE_AFTER_MS = 10 * 60 * 1000
// A heartbeat stamped more than 2 minutes in the future is a clock or data
// fault, not proof of life — shown "unknown", never "online".
const CLOCK_SKEW_MS = 2 * 60 * 1000

function machineStatus(m: MeshMachine): 'online' | 'stale' | 'offline' | 'unknown' {
  const age = Date.now() - Date.parse(m.last_seen)
  if (m.state === 'offline' || !(age < OFFLINE_AFTER_MS)) return 'offline'
  if (age < -CLOCK_SKEW_MS) return 'unknown'
  return m.is_stale ? 'stale' : 'online'
}

// A missing metric is "—", never 0.
function metric(value: number | undefined, suffix = ''): string {
  return typeof value === 'number' && Number.isFinite(value) ? `${Math.round(value * 10) / 10}${suffix}` : '—'
}

function formatLastSeen(iso: string): string {
  const parsed = Date.parse(iso)
  if (Number.isNaN(parsed)) return 'unknown'
  const formatted = new Intl.DateTimeFormat('en-AU', {
    timeZone: 'Australia/Brisbane',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(parsed))
  return `${formatted} AEST`
}

function sourceMode(loading: boolean, data: MeshFleetResponse | null, fetchError: string | null): SourceMode {
  if (loading) return 'loading'
  if (fetchError || !data || !data.configured) return 'degraded'
  if (data.source === 'upstream_error' || data.source === 'timeout' || data.source === 'error') return 'degraded'
  return 'live'
}

export function MeshFleetTile() {
  const [data, setData] = useState<MeshFleetResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      try {
        const res = await fetch('/api/command-centre/mesh-fleet', { cache: 'no-store' })
        if (!res.ok) throw new Error(`mesh_fleet_http_${res.status}`)
        const body = (await res.json()) as MeshFleetResponse
        if (cancelled) return
        setData(body)
        setFetchError(null)
      } catch (err) {
        if (cancelled) return
        setFetchError(err instanceof Error ? err.message : 'mesh_fleet_fetch_failed')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [])

  const configured = data?.configured ?? false
  const machines = data?.machines ?? []
  const shipCount = data?.shipCount ?? 0
  const claims = data?.claims ?? []
  const mode = sourceMode(loading, data, fetchError)
  const degradedReason = fetchError ?? (data && data.error) ?? null
  // Upstream read failed (not merely unconfigured): never show an empty list or zero counts.
  const notConnected = !loading && (Boolean(fetchError) || (configured && mode === 'degraded'))

  // Founder feedback 14/07/2026 — the summary strip shows fleet health only
  // (machine / ship counts + stale count); raw machine hostnames sit behind
  // the shared DeckDetails disclosure. Founder-only page, so the collapsed
  // identifier layer is de-clutter, not a security boundary.
  // The collapsed strip derives from the SAME status as each badge, so a
  // future-dated, offline or stale heartbeat can never read "all fresh".
  const notOnline = (['stale', 'offline', 'unknown'] as const)
    .map((status) => ({ status, count: machines.filter((m) => machineStatus(m) === status).length }))
    .filter(({ count }) => count > 0)
  const shownMachines = machines.slice(0, DECK_LIST_CAP)

  return (
    <section
      data-testid="mesh-fleet-tile"
      aria-label="Mesh Fleet"
      style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
    >
      {degradedReason && <DegradedDataBanner source="Mesh Fleet" reason={degradedReason} />}

      <DeckDetails
        title="Mesh Fleet"
        stats={
          !loading && configured && !notConnected && machines.length > 0
            ? notOnline.length > 0
              ? notOnline.map(({ status, count }) => `${count} ${status}`).join(' · ')
              : 'all heartbeats fresh'
            : undefined
        }
        badge={
          <SourceBadge
            mode={mode}
            label={
              notConnected
                ? 'NOT CONNECTED'
                : configured
                  ? `${machines.length} machines · ${shipCount} ships`
                  : 'not configured'
            }
          />
        }
      >
      {!loading && !configured && !fetchError && (
        <p style={{ color: 'var(--deck-muted)', fontSize: 12, margin: 0 }}>
          Mesh fleet not configured — PI_CEO_API_URL / PI_CEO_API_KEY missing in this environment.
        </p>
      )}

      {notConnected && (
        <p data-testid="mesh-not-connected" style={{ color: 'var(--deck-abort-text)', fontSize: 12, margin: 0 }}>
          NOT CONNECTED — the mesh fleet could not be read, so no machine data is shown.
        </p>
      )}

      {configured && !notConnected && machines.length > 0 && (
        <div>
          {shownMachines.map((m) => {
            const status = machineStatus(m)
            return (
              <div
                key={m.host}
                data-testid={`mesh-machine-${m.host}`}
                style={{ padding: '6px 0', borderBottom: '1px solid var(--deck-line)', fontSize: 12 }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: 'var(--deck-text)' }}>
                    {m.host}
                    {m.state && <span style={{ color: 'var(--deck-muted)' }}> · {m.state}</span>}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span
                      data-testid={`mesh-badge-${m.host}`}
                      style={{
                        color: status === 'online' ? 'var(--deck-text)' : 'var(--deck-abort-text)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        fontSize: 11,
                      }}
                    >
                      {status}
                    </span>
                    <span style={{ color: 'var(--deck-muted)' }}>{formatLastSeen(m.last_seen)}</span>
                  </span>
                </div>
                <div data-testid={`mesh-metrics-${m.host}`} style={{ color: 'var(--deck-muted)', marginTop: 2 }}>
                  CPU {metric(m.cpu_pct, '%')} · Mem {metric(m.mem_pct, '%')} · Load {metric(m.load1)} · Agents{' '}
                  {metric(m.active_agents)} · Runtimes{' '}
                  {m.agent_runtimes && m.agent_runtimes.length > 0 ? m.agent_runtimes.join(', ') : '—'}
                </div>
              </div>
            )
          })}
          <DeckMoreLine total={machines.length} shown={shownMachines.length} />
        </div>
      )}

      {configured && !notConnected && claims.length > 0 && (
        <div data-testid="mesh-claims">
          {claims.slice(0, DECK_LIST_CAP).map((c) => (
            <div
              key={c.linear_id}
              data-testid={`mesh-claim-${c.linear_id}`}
              style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '4px 0', fontSize: 12 }}
            >
              <span style={{ color: 'var(--deck-text)' }}>{c.linear_id}</span>
              <span style={{ color: 'var(--deck-muted)' }}>
                {c.machine ?? '—'} · {c.branch ?? '—'} · {c.state}
              </span>
            </div>
          ))}
          <DeckMoreLine total={claims.length} shown={Math.min(claims.length, DECK_LIST_CAP)} />
        </div>
      )}

      {configured && machines.length === 0 && !loading && !degradedReason && (
        <p style={{ color: 'var(--deck-muted)', fontSize: 12, margin: 0 }}>No machines reporting yet.</p>
      )}
      </DeckDetails>
    </section>
  )
}
