'use client'

import { useEffect, useState } from 'react'
import type {
  LiveAgentOperationsPayload,
  OperationNode,
  OperationNodeState,
  OperationShip,
  OperationWorkItem,
} from '@/lib/command-centre/live-agent-operations'
import { SourceBadge, type SourceMode } from '../SourceBadge'
import { DegradedDataBanner } from '../DegradedDataBanner'
import { StaleReadNotice } from '@/components/ui/StaleReadNotice'

const POLL_MS = 15000

const STATE_LABELS: Record<OperationNodeState, string> = {
  working: 'working',
  queued: 'queued',
  blocked: 'blocked',
  idle: 'idle',
}

// Text-only usage (state label) — AA-safe darkened signal.
function stateColor(state: OperationNodeState): string {
  if (state === 'working') return 'var(--cc-ink)'
  if (state === 'queued') return 'var(--cc-ink-dim)'
  if (state === 'blocked') return 'var(--cc-signal-text)'
  return 'var(--cc-ink-hush)'
}

function sourceMode(payload: LiveAgentOperationsPayload | null, loading: boolean, error: string | null): SourceMode {
  if (loading) return 'loading'
  if (error || !payload) return 'degraded'
  return 'live'
}

function formatAgo(iso: string | null): string {
  if (!iso) return 'not seen'
  const parsed = Date.parse(iso)
  if (Number.isNaN(parsed)) return 'unknown'
  const seconds = Math.max(0, Math.round((Date.now() - parsed) / 1000))
  if (seconds < 60) return `${seconds}s ago`
  if (seconds < 3600) return `${Math.round(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.round(seconds / 3600)}h ago`
  return `${Math.round(seconds / 86400)}d ago`
}

export function LiveAgentOperationsMap() {
  const [payload, setPayload] = useState<LiveAgentOperationsPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadOperations() {
      setLoading(true)
      try {
        const res = await fetch('/api/command-centre/live-agent-operations', { cache: 'no-store' })
        if (!res.ok) throw new Error(`live_agent_operations_http_${res.status}`)
        const body = (await res.json()) as LiveAgentOperationsPayload
        if (cancelled) return
        setPayload(body)
        setError(null)
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'live_agent_operations_fetch_failed')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadOperations()
    const id = window.setInterval(loadOperations, POLL_MS)

    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [])

  const summary = payload?.summary
  // A failed POLL leaves the previous payload on screen. That is the right
  // call — one flaky 15s poll should not blank the operations map — but the
  // node cards, work queue and ship feed below are then a photograph of an
  // earlier moment, not the fleet as it is now. Mark the whole region so the
  // founder (and the census) can tell the two apart.
  const staleRead = Boolean(error) && payload !== null

  return (
    <section
      className="flex flex-col"
      style={{ background: 'var(--cc-bg-soft)', borderTop: '1px solid var(--cc-grid)' }}
      aria-label="Live Agent Operations"
      data-stale-read={staleRead ? 'true' : undefined}
    >
      <header
        className="flex flex-col gap-3 px-6 py-5 lg:flex-row lg:items-end lg:justify-between"
        style={{ background: 'var(--cc-bg)', borderBottom: '1px solid var(--cc-grid)' }}
      >
        <div className="flex flex-col gap-2">
          <span
            className="font-mono text-[11px] uppercase tracking-[0.22em]"
            style={{ color: 'var(--cc-ink-dim)' }}
          >
            Live Agent Operations
          </span>
          <h2 className="text-xl font-semibold leading-tight" style={{ color: 'var(--cc-ink)' }}>
            Agents, queue, approvals, and ship state
          </h2>
          <SourceBadge
            mode={sourceMode(payload, loading, error)}
            // The badge label read straight off a RETAINED summary, so after a
            // failed poll it published "4 agents · 12 open tasks" as the
            // panel's headline. `degraded` in front of it does not make those
            // counts current.
            label={
              error
                ? 'operations read failed — counts not current'
                : summary
                  ? `${summary.agents} agents · ${summary.openTasks} open tasks`
                  : 'operations requesting'
            }
            lastUpdatedAt={payload?.generatedAt}
          />
        </div>

        <div
          className="grid grid-cols-2 gap-px overflow-hidden border sm:grid-cols-4"
          style={{ borderColor: 'var(--cc-grid)', background: 'var(--cc-grid)' }}
          aria-label="Live operations summary"
        >
          {/* Every cell resolves through `?? 0`, so a failed read painted a
              full set of zeroes — an idle, healthy fleet — beside the degraded
              banner. A count is a claim about the fleet and needs a successful
              read behind it. */}
          <SummaryCell label="ACTIVE" value={summary?.activeSessions ?? 0} degraded={Boolean(error)} />
          <SummaryCell label="QUEUE" value={summary?.openTasks ?? 0} degraded={Boolean(error)} />
          <SummaryCell label="GATES" value={summary?.approvalRequired ?? 0} alert={!error && (summary?.approvalRequired ?? 0) > 0} degraded={Boolean(error)} />
          <SummaryCell label="SHIPPED" value={summary?.recentShips ?? 0} degraded={Boolean(error)} />
        </div>
      </header>

      {error && <DegradedDataBanner source="Live Agent Operations" reason={error} />}
      {/* Read-only surface: there is nothing here to disable, so the notice
          does not pretend otherwise. */}
      {staleRead && <StaleReadNotice source="Live Agent Operations" />}

      <div
        className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_22rem]"
        style={{ gap: 1, background: 'var(--cc-grid)' }}
      >
        <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 1, background: 'var(--cc-grid)' }}>
          {(payload?.nodes ?? []).map((node) => (
            <OperationNodeCard key={node.id} node={node} />
          ))}
          {/* "No agent-owned work is active yet" claims the read succeeded and
              found nothing. After a failure `payload` is null, so this rendered
              beside the degraded banner and reported a calm, idle fleet that had
              simply never been read. Found by the strengthened No-Invaders
              census 11/08/2026. */}
          {!loading && !error && (payload?.nodes.length ?? 0) === 0 && (
            <div className="px-6 py-5 text-sm" style={{ background: 'var(--cc-bg-soft)', color: 'var(--cc-ink-dim)' }}>
              No agent-owned work is active yet.
            </div>
          )}
        </div>

        <aside className="flex flex-col" style={{ background: 'var(--cc-bg-soft)' }}>
          <NextActionCard action={payload?.nextAction ?? 'Waiting for command-centre operations data.'} />
          <WorkQueueCard items={payload?.workQueue ?? []} degraded={Boolean(error)} />
          <ShipFeedCard ships={payload?.shipFeed ?? []} degraded={Boolean(error)} />
        </aside>
      </div>
    </section>
  )
}

function SummaryCell({ label, value, alert = false, degraded = false }: { label: string; value: number; alert?: boolean; degraded?: boolean }) {
  return (
    <div className="min-w-24 px-4 py-3" style={{ background: 'var(--cc-bg-soft)' }}>
      <span className="block font-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: 'var(--cc-ink-hush)' }}>
        {label}
      </span>
      <span
        className="mt-1 block font-mono text-2xl leading-none"
        style={{ color: alert ? 'var(--cc-signal-text)' : 'var(--cc-ink)', fontVariantNumeric: 'tabular-nums' }}
      >
        {degraded ? '—' : value}
      </span>
    </div>
  )
}

function OperationNodeCard({ node }: { node: OperationNode }) {
  const color = stateColor(node.state)

  return (
    <article className="flex min-h-52 flex-col justify-between gap-4 px-5 py-4" style={{ background: 'var(--cc-bg-soft)' }}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="wrap-break-word font-mono text-sm uppercase tracking-[0.16em]" style={{ color: 'var(--cc-ink)' }}>
            {node.label}
          </h3>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em]" style={{ color: 'var(--cc-ink-hush)' }}>
            updated {formatAgo(node.lastUpdatedAt)}
          </p>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-[0.14em]" style={{ color }}>
          {STATE_LABELS[node.state]}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-px" style={{ background: 'var(--cc-grid)' }}>
        <NodeMetric label="sessions" value={node.activeSessions} />
        <NodeMetric label="tasks" value={node.openTasks} />
        <NodeMetric label="blocked" value={node.blockedTasks} alert={node.blockedTasks > 0} />
      </div>

      <div className="flex flex-wrap gap-2">
        {node.surfaces.map((surface) => (
          <span
            key={surface}
            className="border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em]"
            style={{ borderColor: 'var(--cc-grid)', color: 'var(--cc-ink-dim)' }}
          >
            {surface}
          </span>
        ))}
        {node.surfaces.length === 0 && (
          <span className="font-mono text-[10px] uppercase tracking-[0.12em]" style={{ color: 'var(--cc-ink-hush)' }}>
            no live session
          </span>
        )}
      </div>

      <div className="space-y-2">
        {node.currentTasks.map((task) => (
          <p key={task} className="line-clamp-2 text-xs leading-relaxed" style={{ color: 'var(--cc-ink-dim)' }}>
            {task}
          </p>
        ))}
        {node.currentTasks.length === 0 && (
          <p className="text-xs leading-relaxed" style={{ color: 'var(--cc-ink-hush)' }}>
            Waiting for the next assigned task.
          </p>
        )}
      </div>
    </article>
  )
}

function NodeMetric({ label, value, alert = false }: { label: string; value: number; alert?: boolean }) {
  return (
    <div className="px-3 py-2" style={{ background: 'var(--cc-bg)' }}>
      <span className="block font-mono text-[9px] uppercase tracking-[0.14em]" style={{ color: 'var(--cc-ink-hush)' }}>
        {label}
      </span>
      <span className="block font-mono text-lg leading-none" style={{ color: alert ? 'var(--cc-signal-text)' : 'var(--cc-ink)' }}>
        {value}
      </span>
    </div>
  )
}

function NextActionCard({ action }: { action: string }) {
  return (
    <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--cc-grid)' }}>
      <span className="font-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: 'var(--cc-ink-hush)' }}>
        Next action
      </span>
      <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--cc-ink)' }}>
        {action}
      </p>
    </div>
  )
}

// `degraded` suppresses "No open work", which after a failed read describes a
// queue that was never fetched rather than one that is genuinely clear.
function WorkQueueCard({ items, degraded = false }: { items: OperationWorkItem[]; degraded?: boolean }) {
  return (
    <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--cc-grid)' }}>
      <span className="font-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: 'var(--cc-ink-hush)' }}>
        Work queue
      </span>
      <div className="mt-3 space-y-3">
        {items.map((item) => (
          <div key={`${item.id}-${item.state}`} className="text-xs leading-relaxed">
            <div className="flex items-center justify-between gap-3 font-mono text-[10px] uppercase tracking-[0.12em]">
              <span style={{ color: item.approvalRequired ? 'var(--cc-signal-text)' : 'var(--cc-ink)' }}>{item.id}</span>
              <span style={{ color: 'var(--cc-ink-hush)' }}>{item.state}</span>
            </div>
            <p className="line-clamp-2" style={{ color: 'var(--cc-ink-dim)' }}>
              {item.owner} · {item.priority} · {item.title}
            </p>
          </div>
        ))}
        {items.length === 0 && !degraded && <p className="text-xs" style={{ color: 'var(--cc-ink-hush)' }}>No open work.</p>}
      </div>
    </div>
  )
}

// `degraded` suppresses the empty-state claim: after a failed read `shipFeed`
// falls back to [], and "No completed tasks yet" then reports a quiet week that
// was never actually read.
function ShipFeedCard({ ships, degraded = false }: { ships: OperationShip[]; degraded?: boolean }) {
  return (
    <div className="px-5 py-4">
      <span className="font-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: 'var(--cc-ink-hush)' }}>
        Recent ships
      </span>
      <div className="mt-3 space-y-3">
        {ships.map((ship) => (
          <div key={ship.id} className="text-xs leading-relaxed">
            <div className="flex items-center justify-between gap-3 font-mono text-[10px] uppercase tracking-[0.12em]">
              <span style={{ color: 'var(--cc-ink)' }}>{ship.owner}</span>
              <span style={{ color: 'var(--cc-ink-hush)' }}>{formatAgo(ship.completedAt)}</span>
            </div>
            <p className="line-clamp-2" style={{ color: 'var(--cc-ink-dim)' }}>
              {ship.surface ? `${ship.surface} · ` : ''}{ship.title}
            </p>
          </div>
        ))}
        {ships.length === 0 && !degraded && <p className="text-xs" style={{ color: 'var(--cc-ink-hush)' }}>No completed tasks yet.</p>}
      </div>
    </div>
  )
}
