'use client';

import { useEffect, useMemo, useState } from 'react';
import { DegradedDataBanner } from '../DegradedDataBanner';
import { SourceBadge, type SourceMode } from '../SourceBadge';
import {
  buildLiveAgentOperations,
  type LiveAgentOperations,
  type OperationNode,
  type OperationNodeState,
  type OperationShip,
  type OperationWorkItem,
} from '@/lib/mission-control/live-agent-operations';
import type { Fleet } from '@/lib/mesh/read-fleet';

const POLL_MS = 10_000;

const STATE_LABELS: Record<OperationNodeState, string> = {
  working: 'working',
  idle: 'idle',
  blocked: 'blocked',
  offline: 'offline',
};

function stateColor(state: OperationNodeState) {
  if (state === 'working') return 'var(--cc-ink)';
  if (state === 'idle') return 'var(--cc-ink-dim)';
  if (state === 'blocked') return 'var(--cc-signal)';
  return 'var(--cc-ink-hush)';
}

function sourceMode(payload: LiveAgentOperations | null, loading: boolean, error: string | null): SourceMode {
  if (loading) return 'loading';
  if (error || !payload?.ok) return 'degraded';
  return 'live';
}

function formatAgo(iso: string | null) {
  if (!iso) return 'not seen';
  const parsed = Date.parse(iso);
  if (Number.isNaN(parsed)) return 'unknown';
  const seconds = Math.max(0, Math.round((Date.now() - parsed) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)}h ago`;
  return `${Math.round(seconds / 86400)}d ago`;
}

export function LiveAgentOperationsMap({ initialFleet }: { initialFleet?: Fleet }) {
  const initialPayload = useMemo(
    () => (initialFleet ? buildLiveAgentOperations(initialFleet) : null),
    [initialFleet],
  );
  const [payload, setPayload] = useState<LiveAgentOperations | null>(initialPayload);
  const [loading, setLoading] = useState(!initialPayload);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const res = await fetch('/api/mesh/fleet', { cache: 'no-store' });
        if (!res.ok) throw new Error(`fleet_http_${res.status}`);
        const fleet = (await res.json()) as Fleet;
        if (cancelled) return;
        setPayload(buildLiveAgentOperations(fleet));
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'fleet_fetch_failed');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    const id = window.setInterval(load, POLL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  const summary = payload?.summary;
  const degradedReason = error ?? payload?.error ?? null;

  return (
    <section
      aria-label="Live agent operations map"
      className="flex flex-col"
      style={{
        background: 'var(--cc-bg-soft)',
        borderTop: '1px solid var(--cc-grid)',
      }}
    >
      <header
        className="flex flex-col gap-4 px-6 py-5 xl:flex-row xl:items-end xl:justify-between"
        style={{
          background: 'var(--cc-bg)',
          borderBottom: '1px solid var(--cc-grid)',
        }}
      >
        <div className="flex flex-col gap-2">
          <span
            className="font-mono text-[11px] uppercase tracking-[0.22em]"
            style={{ color: 'var(--cc-ink-dim)' }}
          >
            Live Agent Operations
          </span>
          <h2 className="text-xl font-semibold leading-tight" style={{ color: 'var(--cc-ink)' }}>
            Mesh, Linear, build, and ship state
          </h2>
          <SourceBadge
            mode={sourceMode(payload, loading, error)}
            label={summary ? `${summary.machines} nodes · ${summary.activeAgents} agents` : 'fleet requesting'}
            lastUpdatedAt={payload?.generatedAt}
          />
        </div>

        <div
          className="grid grid-cols-2 gap-px overflow-hidden border md:grid-cols-4"
          style={{ borderColor: 'var(--cc-grid)', background: 'var(--cc-grid)' }}
          aria-label="Live agent operations summary"
        >
          <SummaryCell label="Agents" value={summary?.activeAgents ?? 0} />
          <SummaryCell label="Claims" value={summary?.openClaims ?? 0} />
          <SummaryCell label="Blocked" value={summary?.blockedClaims ?? 0} alert={(summary?.blockedClaims ?? 0) > 0} />
          <SummaryCell label="Ships" value={summary?.recentShips ?? 0} />
        </div>
      </header>

      {degradedReason && <DegradedDataBanner source="Live Agent Operations" reason={degradedReason} />}

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_24rem]" style={{ gap: 1, background: 'var(--cc-grid)' }}>
        <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3" style={{ gap: 1, background: 'var(--cc-grid)' }}>
          {(payload?.nodes ?? []).map((node) => (
            <OperationNodeCard key={node.id} node={node} />
          ))}
          {!loading && (payload?.nodes.length ?? 0) === 0 && (
            <div className="px-6 py-5 text-sm" style={{ background: 'var(--cc-bg-soft)', color: 'var(--cc-ink-dim)' }}>
              No mesh nodes are reporting into Mission Control yet.
            </div>
          )}
        </div>

        <aside className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-1" style={{ gap: 1, background: 'var(--cc-grid)' }}>
          <NextActionCard action={payload?.nextAction ?? 'Waiting for the fleet snapshot'} />
          <WorkQueueCard items={payload?.workQueue ?? []} />
          <ShipFeedCard ships={payload?.shipFeed ?? []} />
        </aside>
      </div>
    </section>
  );
}

function SummaryCell({ label, value, alert = false }: { label: string; value: number; alert?: boolean }) {
  return (
    <div className="min-w-24 px-4 py-3" style={{ background: 'var(--cc-bg-soft)' }}>
      <div className="font-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: 'var(--cc-ink-hush)' }}>
        {label}
      </div>
      <div className="font-mono text-2xl leading-none" style={{ color: alert ? 'var(--cc-signal)' : 'var(--cc-ink)' }}>
        {value}
      </div>
    </div>
  );
}

function OperationNodeCard({ node }: { node: OperationNode }) {
  const color = stateColor(node.state);
  const utilization = node.utilizationPct ?? 0;

  return (
    <article className="flex min-h-56 flex-col justify-between gap-5 px-5 py-4" style={{ background: 'var(--cc-bg-soft)' }}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="break-words font-mono text-sm uppercase tracking-[0.16em]" style={{ color: 'var(--cc-ink)' }}>
            {node.label}
          </h3>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em]" style={{ color: 'var(--cc-ink-hush)' }}>
            seen {formatAgo(node.lastSeen)}
          </p>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-[0.14em]" style={{ color }}>
          {STATE_LABELS[node.state]}
        </span>
      </div>

      <div className="space-y-2">
        <div className="h-2 overflow-hidden" style={{ background: 'var(--cc-grid)' }}>
          <div className="h-full" style={{ width: `${utilization}%`, background: color, opacity: node.utilizationPct === null ? 0.25 : 1 }} />
        </div>
        <div className="flex justify-between font-mono text-[10px] uppercase tracking-[0.14em]" style={{ color: 'var(--cc-ink-hush)' }}>
          <span>{node.activeAgents} active</span>
          <span>{node.openClaims} claims</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {node.runtimeLabels.map((runtime) => (
          <span
            key={runtime}
            className="border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em]"
            style={{ borderColor: 'var(--cc-grid)', color: 'var(--cc-ink-dim)' }}
          >
            {runtime}
          </span>
        ))}
        {node.runtimeLabels.length === 0 && (
          <span className="font-mono text-[10px] uppercase tracking-[0.12em]" style={{ color: 'var(--cc-ink-hush)' }}>
            no runtime
          </span>
        )}
      </div>

      <div className="space-y-2">
        {node.currentTasks.slice(0, 2).map((task) => (
          <p key={task} className="line-clamp-2 text-xs leading-relaxed" style={{ color: 'var(--cc-ink-dim)' }}>
            {task}
          </p>
        ))}
        {node.currentTasks.length === 0 && (
          <p className="text-xs leading-relaxed" style={{ color: 'var(--cc-ink-hush)' }}>
            Waiting for assigned work.
          </p>
        )}
      </div>
    </article>
  );
}

function NextActionCard({ action }: { action: string }) {
  return (
    <div className="px-5 py-4" style={{ background: 'var(--cc-bg-soft)' }}>
      <span className="font-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: 'var(--cc-ink-hush)' }}>
        Next action
      </span>
      <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--cc-ink)' }}>
        {action}
      </p>
    </div>
  );
}

function WorkQueueCard({ items }: { items: OperationWorkItem[] }) {
  return (
    <div className="px-5 py-4" style={{ background: 'var(--cc-bg-soft)' }}>
      <span className="font-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: 'var(--cc-ink-hush)' }}>
        Linear claims
      </span>
      <div className="mt-3 space-y-3">
        {items.slice(0, 6).map((item) => (
          <div key={item.id} className="grid grid-cols-[5rem_1fr] gap-3 text-xs">
            <span className="font-mono uppercase tracking-[0.12em]" style={{ color: item.blocked ? 'var(--cc-signal)' : 'var(--cc-ink)' }}>
              {item.id}
            </span>
            <span className="min-w-0" style={{ color: 'var(--cc-ink-dim)' }}>
              {item.owner} · {item.state}
              {item.branch ? ` · ${item.branch}` : ''}
            </span>
          </div>
        ))}
        {items.length === 0 && (
          <p className="text-xs" style={{ color: 'var(--cc-ink-hush)' }}>
            No open claims.
          </p>
        )}
      </div>
    </div>
  );
}

function ShipFeedCard({ ships }: { ships: OperationShip[] }) {
  return (
    <div className="px-5 py-4" style={{ background: 'var(--cc-bg-soft)' }}>
      <span className="font-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: 'var(--cc-ink-hush)' }}>
        Recent ships
      </span>
      <div className="mt-3 space-y-3">
        {ships.map((ship) => (
          <div key={ship.id} className="text-xs leading-relaxed">
            <div className="flex justify-between gap-3 font-mono text-[10px] uppercase tracking-[0.12em]">
              <span style={{ color: 'var(--cc-ink)' }}>{ship.repo}</span>
              <span style={{ color: 'var(--cc-ink-hush)' }}>{formatAgo(ship.shippedAt)}</span>
            </div>
            <p className="line-clamp-2" style={{ color: 'var(--cc-ink-dim)' }}>
              {ship.subject}
            </p>
          </div>
        ))}
        {ships.length === 0 && (
          <p className="text-xs" style={{ color: 'var(--cc-ink-hush)' }}>
            No recent ship events.
          </p>
        )}
      </div>
    </div>
  );
}
