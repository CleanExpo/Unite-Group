'use client'

// src/components/command-centre/capability-registry/CapabilityRegistryTile.tsx
// Founder capability-registry tile for the Mission Control deck. Shows what the
// build discovered on disk, what is actually registered in cc_tools, when it
// was last synced, and any display-name collisions — then offers the founder
// the sync action.
//
// Structure deliberately mirrors CostAllocationTile (same fetch/loading/error
// shape, same SourceBadge honesty vocabulary) rather than introducing a second
// admin surface.
//
// The sync is founder-initiated on purpose. The build does not write to the
// registry: population would otherwise be a production mutation firing on every
// deploy, including previews, with no founder in the loop, and a service-role
// write would bypass the founder_id RLS that is the table's only tenancy
// control.

import { useCallback, useEffect, useState } from 'react'
import { SourceBadge, type SourceMode } from '../SourceBadge'

interface Collision {
  name: string
  paths: string[]
}

interface RegistryStatus {
  discovered: { agents: number; skills: number; mcp_servers: number }
  registered_tools: number
  last_sync: string | null
  collisions: Collision[]
  sync_required: boolean
}

function formatSync(iso: string | null): string {
  if (!iso) return 'never'
  const parsed = new Date(iso)
  if (Number.isNaN(parsed.getTime())) return 'unknown'
  return parsed.toLocaleString('en-AU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Australia/Brisbane',
  })
}

export function CapabilityRegistryTile() {
  const [data, setData] = useState<RegistryStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/command-centre/registry/sync')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setData(await res.json())
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'load failed')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const runSync = useCallback(async () => {
    setSyncing(true)
    setSyncResult(null)
    try {
      const res = await fetch('/api/command-centre/registry/sync', { method: 'POST' })
      const body = await res.json()
      if (!res.ok) {
        // 503 = empty manifest, 207 = partial write. Both are reported as
        // written, never smoothed into a success message.
        setSyncResult(body?.error ?? `sync failed (HTTP ${res.status})`)
      } else {
        setSyncResult(
          `wrote ${body.written?.agents ?? 0} agents, ${body.written?.tools ?? 0} tools` +
            (body.errors?.length ? ` — ${body.errors.length} partial failure(s)` : ''),
        )
      }
      await load()
    } catch (e) {
      setSyncResult(e instanceof Error ? e.message : 'sync failed')
    } finally {
      setSyncing(false)
    }
  }, [load])

  // Registered rows are the only evidence the registry is usable. A populated
  // manifest with zero registered tools is exactly the state that makes every
  // reuse-before-build search return nothing.
  const mode: SourceMode = loading
    ? 'loading'
    : error
      ? 'degraded'
      : data && data.registered_tools > 0
        ? 'live'
        : 'degraded'

  const discovered = data
    ? data.discovered.agents + data.discovered.skills + data.discovered.mcp_servers
    : 0

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <h3
          style={{
            color: 'var(--deck-text)',
            fontSize: 14,
            fontWeight: 700,
            margin: 0,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}
        >
          Capability registry
        </h3>
        <SourceBadge mode={mode} label="Registry" />
      </div>

      {error && <p style={{ color: 'var(--deck-abort-text)', fontSize: 12, margin: 0 }}>{error}</p>}

      {data && (
        <>
          <p style={{ color: 'var(--deck-muted)', fontSize: 12, margin: 0 }}>
            {discovered} discovered on disk ({data.discovered.agents} agents, {data.discovered.skills} skills,{' '}
            {data.discovered.mcp_servers} MCP) · {data.registered_tools} registered in cc_tools · last sync{' '}
            {formatSync(data.last_sync)}
          </p>

          {data.sync_required && (
            <p style={{ color: 'var(--deck-abort-text)', fontSize: 12, margin: 0 }}>
              Registry is empty — reuse-before-build searches will find nothing until it is synced.
            </p>
          )}

          {data.collisions.length > 0 && (
            <p style={{ color: 'var(--deck-muted)', fontSize: 12, margin: 0 }}>
              {data.collisions.length} display-name collision(s) registered under distinct keys:{' '}
              {data.collisions.map((c) => c.name).join(', ')}
            </p>
          )}

          <button
            type="button"
            onClick={runSync}
            disabled={syncing}
            style={{
              alignSelf: 'flex-start',
              background: 'transparent',
              border: '1px solid var(--deck-line)',
              borderRadius: 2,
              color: 'var(--deck-text)',
              cursor: syncing ? 'default' : 'pointer',
              fontSize: 12,
              padding: '4px 10px',
            }}
          >
            {syncing ? 'Syncing…' : 'Sync registry'}
          </button>

          {syncResult && (
            <p style={{ color: 'var(--deck-muted)', fontSize: 12, margin: 0 }}>{syncResult}</p>
          )}
        </>
      )}
    </section>
  )
}
