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
  current_task?: string
}

interface MeshFleetResponse {
  configured: boolean
  machines: MeshMachine[]
  shipCount: number
  source: string
  error?: string
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
  const mode = sourceMode(loading, data, fetchError)
  const degradedReason = fetchError ?? (data && data.error) ?? null

  // Founder feedback 14/07/2026 — the summary strip shows fleet health only
  // (machine / ship counts + stale count); raw machine hostnames sit behind
  // the shared DeckDetails disclosure. Founder-only page, so the collapsed
  // identifier layer is de-clutter, not a security boundary.
  const staleCount = machines.filter((m) => m.is_stale).length
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
          !loading && configured && machines.length > 0
            ? staleCount > 0
              ? `${staleCount} stale heartbeat${staleCount === 1 ? '' : 's'}`
              : 'all heartbeats fresh'
            : undefined
        }
        badge={
          <SourceBadge
            mode={mode}
            label={configured ? `${machines.length} machines · ${shipCount} ships` : 'not configured'}
          />
        }
      >
      {!loading && !configured && !fetchError && (
        <p style={{ color: 'var(--deck-muted)', fontSize: 12, margin: 0 }}>
          Mesh fleet not configured — PI_CEO_API_URL / PI_CEO_API_KEY missing in this environment.
        </p>
      )}

      {configured && machines.length > 0 && (
        <div>
          {shownMachines.map((m) => (
            <div
              key={m.host}
              data-testid={`mesh-machine-${m.host}`}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 8,
                padding: '6px 0',
                borderBottom: '1px solid var(--deck-line)',
                fontSize: 12,
              }}
            >
              <span style={{ color: 'var(--deck-text)' }}>
                {m.host}
                {m.state && <span style={{ color: 'var(--deck-muted)' }}> · {m.state}</span>}
                {m.current_task && <span style={{ color: 'var(--deck-muted)' }}> · {m.current_task}</span>}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                  data-testid={`mesh-badge-${m.host}`}
                  style={{
                    color: m.is_stale ? 'var(--deck-abort-text)' : 'var(--deck-text)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    fontSize: 11,
                  }}
                >
                  {m.is_stale ? 'stale' : 'fresh'}
                </span>
                <span style={{ color: 'var(--deck-muted)' }}>{formatLastSeen(m.last_seen)}</span>
              </span>
            </div>
          ))}
          <DeckMoreLine total={machines.length} shown={shownMachines.length} />
        </div>
      )}

      {configured && machines.length === 0 && !loading && !degradedReason && (
        <p style={{ color: 'var(--deck-muted)', fontSize: 12, margin: 0 }}>No machines reporting yet.</p>
      )}
      </DeckDetails>
    </section>
  )
}
