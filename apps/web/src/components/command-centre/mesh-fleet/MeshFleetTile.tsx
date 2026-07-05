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

  return (
    <section
      data-testid="mesh-fleet-tile"
      aria-label="Mesh Fleet"
      style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ color: 'var(--deck-text)', fontSize: 14, fontWeight: 700, margin: 0 }}>Mesh Fleet</h3>
        <SourceBadge
          mode={mode}
          label={configured ? `${machines.length} machines · ${shipCount} ships` : 'not configured'}
        />
      </div>

      {!loading && !configured && !fetchError && (
        <p style={{ color: 'var(--deck-muted)', fontSize: 12, margin: 0 }}>
          Mesh fleet not configured — PI_CEO_API_URL / PI_CEO_API_KEY missing in this environment.
        </p>
      )}

      {degradedReason && <DegradedDataBanner source="Mesh Fleet" reason={degradedReason} />}

      {configured && machines.length > 0 && (
        <div>
          {machines.map((m) => (
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
        </div>
      )}

      {configured && machines.length === 0 && !loading && !degradedReason && (
        <p style={{ color: 'var(--deck-muted)', fontSize: 12, margin: 0 }}>No machines reporting yet.</p>
      )}
    </section>
  )
}
