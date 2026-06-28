'use client'

// WorkPacketLane — UNI-2147 Mission Control UI lane.
//
// Visualises execution packets grouped by status (the PacketStatus machine in
// src/lib/command-centre/work-packet.ts) and exposes the guarded transitions as
// per-card actions. The lane fetches the packet list from
//   GET  /api/command-centre/work-packet            → { packets: WorkPacket[] }
// and drives transitions via
//   POST /api/command-centre/work-packet/{id}/transition  body: PacketEvent
// refetching the list after each successful transition. Honours the
// command-centre source-of-truth contract: SourceBadge pip + DegradedDataBanner
// on a failed fetch, so seed/empty/live states are never silently conflated.

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { PacketEvent, PacketStatus, WorkPacket } from '@/lib/command-centre/work-packet'
import { SourceBadge, type SourceMode } from '../SourceBadge'
import { DegradedDataBanner } from '../DegradedDataBanner'

const POLL_MS = 20000

const COLUMN_ORDER: PacketStatus[] = [
  'draft',
  'routed',
  'running',
  'blocked',
  'awaiting_approval',
  'completed',
]

const COLUMN_LABELS: Record<PacketStatus, string> = {
  draft: 'Draft',
  routed: 'Routed',
  running: 'Running',
  blocked: 'Blocked',
  awaiting_approval: 'Awaiting approval',
  completed: 'Completed',
}

const OWNER_LABELS: Record<WorkPacket['nextActionOwner'], string> = {
  hermes: 'Hermes',
  'pi-ceo': 'Pi-CEO',
  senior_agent: 'Senior agent',
  phill: 'Phill',
  external_provider: 'External',
}

// Each action maps a button to the PacketEvent the transition endpoint expects.
interface PacketAction {
  key: string
  label: string
  event: PacketEvent
}

/** Status-appropriate actions. Approve is surfaced only for awaiting_approval. */
function actionsFor(status: PacketStatus): PacketAction[] {
  switch (status) {
    case 'draft':
      return [{ key: 'route', label: 'Route', event: { type: 'route' } }]
    case 'routed':
      return [
        { key: 'start', label: 'Start', event: { type: 'start' } },
        { key: 'block', label: 'Block', event: { type: 'block' } },
      ]
    case 'running':
      return [
        { key: 'complete', label: 'Complete', event: { type: 'complete' } },
        { key: 'block', label: 'Block', event: { type: 'block' } },
      ]
    case 'blocked':
      return [{ key: 'unblock', label: 'Unblock', event: { type: 'unblock' } }]
    case 'awaiting_approval':
      return [{ key: 'approve', label: 'Approve', event: { type: 'approve', by: 'phill' } }]
    case 'completed':
      return []
  }
}

function sourceMode(loaded: boolean, loading: boolean, error: string | null): SourceMode {
  if (loading && !loaded) return 'loading'
  if (error) return 'degraded'
  return 'live'
}

interface ListResponse {
  packets?: WorkPacket[]
}

/** Accept either { packets: [...] } or a bare array, defensively. */
function readPackets(body: unknown): WorkPacket[] {
  if (Array.isArray(body)) return body as WorkPacket[]
  const packets = (body as ListResponse | null)?.packets
  return Array.isArray(packets) ? packets : []
}

export function WorkPacketLane() {
  const [packets, setPackets] = useState<WorkPacket[]>([])
  const [loaded, setLoaded] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pendingId, setPendingId] = useState<string | null>(null)

  const loadPackets = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/command-centre/work-packet', { cache: 'no-store' })
      if (!res.ok) throw new Error(`work_packet_http_${res.status}`)
      const body = (await res.json()) as unknown
      setPackets(readPackets(body))
      setError(null)
      setLoaded(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'work_packet_fetch_failed')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      await loadPackets()
      if (cancelled) return
    })()
    const id = window.setInterval(loadPackets, POLL_MS)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [loadPackets])

  const runTransition = useCallback(
    async (packetId: string, event: PacketEvent) => {
      setPendingId(packetId)
      try {
        const res = await fetch(`/api/command-centre/work-packet/${encodeURIComponent(packetId)}/transition`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          cache: 'no-store',
          body: JSON.stringify(event),
        })
        if (!res.ok) throw new Error(`work_packet_transition_http_${res.status}`)
        await loadPackets()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'work_packet_transition_failed')
      } finally {
        setPendingId(null)
      }
    },
    [loadPackets],
  )

  const columns = useMemo(() => {
    const grouped = new Map<PacketStatus, WorkPacket[]>()
    for (const status of COLUMN_ORDER) grouped.set(status, [])
    for (const packet of packets) {
      const bucket = grouped.get(packet.status)
      if (bucket) bucket.push(packet)
    }
    return COLUMN_ORDER.map((status) => ({ status, items: grouped.get(status) ?? [] }))
  }, [packets])

  const approvalCount = useMemo(
    () => packets.filter((packet) => packet.status === 'awaiting_approval').length,
    [packets],
  )
  const isEmpty = loaded && packets.length === 0

  return (
    <section
      className="flex flex-col"
      style={{ background: 'var(--cc-bg-soft)', borderTop: '1px solid var(--cc-grid)' }}
      aria-label="Work Packet Lane"
    >
      <header
        className="flex flex-col gap-3 px-6 py-5 lg:flex-row lg:items-end lg:justify-between"
        style={{ background: 'var(--cc-bg)', borderBottom: '1px solid var(--cc-grid)' }}
      >
        <div className="flex flex-col gap-2">
          <span className="font-mono text-[11px] uppercase tracking-[0.22em]" style={{ color: 'var(--cc-ink-dim)' }}>
            Work Packets
          </span>
          <h2 className="text-xl font-semibold leading-tight" style={{ color: 'var(--cc-ink)' }}>
            Execution packets by status
          </h2>
          <SourceBadge
            mode={sourceMode(loaded, loading, error)}
            label={`${packets.length} packet${packets.length === 1 ? '' : 's'} · ${approvalCount} awaiting approval`}
          />
        </div>
      </header>

      {error && <DegradedDataBanner source="Work Packet Lane" reason={error} />}

      <div
        className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6"
        style={{ gap: 1, background: 'var(--cc-grid)' }}
      >
        {columns.map((column) => (
          <PacketColumn
            key={column.status}
            status={column.status}
            items={column.items}
            pendingId={pendingId}
            onTransition={runTransition}
          />
        ))}
      </div>

      {isEmpty && (
        <div className="px-6 py-5 text-sm" style={{ background: 'var(--cc-bg-soft)', color: 'var(--cc-ink-dim)' }}>
          No work packets have been generated yet.
        </div>
      )}
    </section>
  )
}

function PacketColumn({
  status,
  items,
  pendingId,
  onTransition,
}: {
  status: PacketStatus
  items: WorkPacket[]
  pendingId: string | null
  onTransition: (packetId: string, event: PacketEvent) => void
}) {
  const alert = status === 'awaiting_approval' || status === 'blocked'
  return (
    <div className="flex min-h-40 flex-col" style={{ background: 'var(--cc-bg-soft)' }} aria-label={`Column ${status}`}>
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: '1px solid var(--cc-grid)' }}
      >
        <span
          className="font-mono text-[10px] uppercase tracking-[0.18em]"
          style={{ color: alert ? 'var(--cc-signal)' : 'var(--cc-ink-dim)' }}
        >
          {COLUMN_LABELS[status]}
        </span>
        <span
          className="font-mono text-[10px] tabular-nums"
          style={{ color: 'var(--cc-ink-hush)' }}
        >
          {items.length}
        </span>
      </div>

      <div className="flex flex-col gap-px" style={{ background: 'var(--cc-grid)' }}>
        {items.map((packet) => (
          <PacketCard
            key={packet.id}
            packet={packet}
            pending={pendingId === packet.id}
            onTransition={onTransition}
          />
        ))}
        {items.length === 0 && (
          <p className="px-4 py-3 font-mono text-[10px] uppercase tracking-[0.14em]" style={{ color: 'var(--cc-ink-hush)', background: 'var(--cc-bg-soft)' }}>
            empty
          </p>
        )}
      </div>
    </div>
  )
}

function PacketCard({
  packet,
  pending,
  onTransition,
}: {
  packet: WorkPacket
  pending: boolean
  onTransition: (packetId: string, event: PacketEvent) => void
}) {
  const actions = actionsFor(packet.status)
  return (
    <article
      data-packet-id={packet.id}
      className="flex flex-col gap-3 px-4 py-3"
      style={{ background: 'var(--cc-bg-soft)' }}
    >
      <h3 className="text-sm font-medium leading-snug" style={{ color: 'var(--cc-ink)' }}>
        {packet.outcome}
      </h3>

      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[10px] uppercase tracking-[0.12em]" style={{ color: 'var(--cc-ink-hush)' }}>
        <span style={{ color: 'var(--cc-ink-dim)' }}>{packet.projectKey}</span>
        {packet.clientId && (
          <>
            <span aria-hidden>·</span>
            <span>client {packet.clientId}</span>
          </>
        )}
        <span aria-hidden>·</span>
        <span>{packet.lane.replace(/_/g, ' ')}</span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <OwnerBadge owner={packet.nextActionOwner} />
        {packet.approvalRequired && <ApprovalMarker approved={Boolean(packet.approvedBy)} />}
      </div>

      {actions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {actions.map((action) => (
            <button
              key={action.key}
              type="button"
              disabled={pending}
              onClick={() => onTransition(packet.id, action.event)}
              className="inline-flex items-center gap-1.5 rounded-sm border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] transition-opacity disabled:opacity-40"
              style={{
                borderColor: action.key === 'approve' ? 'var(--cc-signal)' : 'var(--cc-grid)',
                color: action.key === 'approve' ? 'var(--cc-signal)' : 'var(--cc-ink-dim)',
                background: 'var(--cc-bg)',
              }}
            >
              <ActionIcon kind={action.key} />
              {action.label}
            </button>
          ))}
        </div>
      )}
    </article>
  )
}

function OwnerBadge({ owner }: { owner: WorkPacket['nextActionOwner'] }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-sm border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em]"
      style={{ borderColor: 'var(--cc-grid)', color: 'var(--cc-ink-dim)' }}
    >
      <OwnerIcon />
      {OWNER_LABELS[owner]}
    </span>
  )
}

function ApprovalMarker({ approved }: { approved: boolean }) {
  const color = approved ? 'var(--cc-ink)' : 'var(--cc-signal)'
  return (
    <span
      data-approval-required
      className="inline-flex items-center gap-1.5 rounded-sm border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em]"
      style={{ borderColor: color, color }}
      aria-label={approved ? 'Approval granted' : 'Approval required'}
    >
      <ShieldIcon />
      {approved ? 'approved' : 'approval required'}
    </span>
  )
}

// ── Inline custom SVG icons (no lucide) ──────────────────────────────────────

function OwnerIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 16 16" fill="none" aria-hidden focusable="false">
      <circle cx="8" cy="5" r="2.6" stroke="currentColor" strokeWidth="1.3" />
      <path d="M3 13c0-2.4 2.2-3.8 5-3.8S13 10.6 13 13" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

function ShieldIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 16 16" fill="none" aria-hidden focusable="false">
      <path d="M8 1.5l5 2v4c0 3.4-2.2 5.6-5 7-2.8-1.4-5-3.6-5-7v-4l5-2z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M5.7 8l1.6 1.6L10.4 6.4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ActionIcon({ kind }: { kind: string }) {
  if (kind === 'approve') {
    return (
      <svg width="10" height="10" viewBox="0 0 16 16" fill="none" aria-hidden focusable="false">
        <path d="M3 8.5l3 3 7-7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }
  if (kind === 'block') {
    return (
      <svg width="10" height="10" viewBox="0 0 16 16" fill="none" aria-hidden focusable="false">
        <circle cx="8" cy="8" r="5.6" stroke="currentColor" strokeWidth="1.4" />
        <path d="M4 4l8 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    )
  }
  if (kind === 'complete') {
    return (
      <svg width="10" height="10" viewBox="0 0 16 16" fill="none" aria-hidden focusable="false">
        <rect x="2.5" y="2.5" width="11" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
        <path d="M5.5 8l1.8 1.8L10.8 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }
  // route / start / unblock → forward chevron
  return (
    <svg width="10" height="10" viewBox="0 0 16 16" fill="none" aria-hidden focusable="false">
      <path d="M5 3l6 5-6 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
