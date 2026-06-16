'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { SourceBadge, type SourceMode } from '../SourceBadge';
import { DegradedDataBanner } from '../DegradedDataBanner';

type ProbeStatus = 'live' | 'degraded' | 'missing';

type AddonProbe = {
  status: ProbeStatus;
  metric: string;
  note: string;
};

type HermesDashboardWrapperPayload = {
  source: string;
  generatedAt: string;
  docsContract: {
    mode: string;
    dashboardExtensionPath: string;
    missionControlPattern: string;
    subscriptionProxy: string;
    addons?: string;
  };
  dashboard: {
    status: ProbeStatus;
    processCount: number;
    url: string;
    note: string;
  };
  cron: {
    status: ProbeStatus;
    gatewayRunning: boolean;
    activeJobs: number;
    nextRunAt?: string;
    note: string;
  };
  kanban: {
    status: ProbeStatus;
    currentBoard: string;
    taskCount: number;
    counts: Record<string, number>;
    note: string;
  };
  context: {
    status: ProbeStatus;
    secondBrain: {
      path: string;
      markdownFiles: number;
      canonical: boolean;
    };
    legacyObsidian: {
      path: string;
      markdownFiles: number;
      note: string;
    };
    tailscale: {
      status: ProbeStatus;
      onlinePeers: number;
      note: string;
    };
  };
  addons?: {
    status: ProbeStatus;
    goals: AddonProbe;
    codeExecution: AddonProbe;
    hooks: AddonProbe;
    batchProcessing: AddonProbe;
  };
};

type HermesDashboardWrapperProps = {
  initialPayload?: HermesDashboardWrapperPayload;
};

function badgeMode(payload: HermesDashboardWrapperPayload | null, loading: boolean): SourceMode {
  if (loading) return 'loading';
  if (!payload) return 'degraded';
  if (payload.dashboard.status === 'live' && payload.kanban.status === 'live') return 'live';
  return 'degraded';
}

function statusLabel(status: ProbeStatus) {
  if (status === 'live') return 'LIVE';
  if (status === 'missing') return 'MISSING';
  return 'DEGRADED';
}

function statusColor(status: ProbeStatus) {
  if (status === 'live') return 'var(--cc-ink)';
  if (status === 'missing') return 'var(--cc-signal)';
  return '#f59e0b';
}

function formatCountMap(counts: Record<string, number>) {
  const entries = Object.entries(counts).filter(([, value]) => value > 0);
  if (entries.length === 0) return 'no tasks';
  return entries.map(([key, value]) => `${key} ${value}`).join(' · ');
}

function formatNextRun(raw: string | undefined): string | null {
  if (!raw) return null;
  // The cron status output looks like "2026-06-11 08:00:00 AEST" or an ISO
  // string like "2026-06-11T08:00:45.123Z". Strip the seconds, the optional
  // ".fff" milliseconds, and any trailing timezone ("AEST", "Z", "+10:00")
  // so the card always shows a compact "YYYY-MM-DD HH:MM" / "YYYY-MM-DDTHH:MM".
  const cleaned = raw
    .replace(/:\d{2}(?=\s|\.|Z|[+-]\d|$)/g, '')
    .replace(/\.\d+(?=Z|[+-]\d|$)/g, '')
    .replace(/\s+[A-Z]{2,5}$/, '')
    .replace(/[Zz]$/, '')
    .replace(/[+-]\d{2}:?\d{2}$/, '')
    .trim();
  return cleaned || raw.trim();
}

function readinessSnapshot(payload: HermesDashboardWrapperPayload | null, loading: boolean) {
  if (loading || !payload) {
    return {
      percent: 0,
      live: 0,
      degraded: 0,
      missing: 0,
      label: 'Local probe map warming up',
    };
  }

  const checks: ProbeStatus[] = [
    payload.dashboard.status,
    payload.cron.status,
    payload.cron.gatewayRunning ? 'live' : 'degraded',
    payload.kanban.status,
    payload.context.status,
    payload.addons?.status ?? 'missing',
  ];

  const live = checks.filter((status) => status === 'live').length;
  const degraded = checks.filter((status) => status === 'degraded').length;
  const missing = checks.filter((status) => status === 'missing').length;
  const weighted = checks.reduce((total, status) => {
    if (status === 'live') return total + 1;
    if (status === 'degraded') return total + 0.4;
    return total;
  }, 0);

  return {
    percent: Math.round((weighted / checks.length) * 100),
    live,
    degraded,
    missing,
    label: payload.cron.gatewayRunning
      ? 'Local Hermes wrapper is read-only and connected to live probes.'
      : 'Local Hermes wrapper is read-only; cron runner is degraded until gateway is running.',
  };
}

function statusTone(status: ProbeStatus) {
  if (status === 'live') return 'var(--cc-ink)';
  if (status === 'missing') return 'var(--cc-signal)';
  return '#d97706';
}

export function HermesDashboardWrapper({ initialPayload }: HermesDashboardWrapperProps = {}) {
  const [payload, setPayload] = useState<HermesDashboardWrapperPayload | null>(initialPayload ?? null);
  const [loading, setLoading] = useState(!initialPayload);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialPayload) return;

    let cancelled = false;
    async function loadWrapperStatus() {
      try {
        const res = await fetch('/api/command-center/hermes-dashboard', { cache: 'no-store' });
        if (!res.ok) throw new Error(`hermes_dashboard_http_${res.status}`);
        const body = (await res.json()) as HermesDashboardWrapperPayload;
        if (cancelled) return;
        setPayload(body);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'hermes_dashboard_fetch_failed');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadWrapperStatus();
    return () => {
      cancelled = true;
    };
  }, [initialPayload]);

  const mode = badgeMode(payload, loading);
  const sourceLabel = payload
    ? `Dashboard ${payload.dashboard.processCount} · Kanban ${payload.kanban.currentBoard}`
    : loading
      ? 'local probes pending'
      : 'local probes unavailable';
  const readiness = readinessSnapshot(payload, loading);

  return (
    <section
      className="flex flex-col"
      style={{
        background: 'var(--cc-bg-soft)',
        borderTop: '1px solid var(--cc-grid)',
      }}
      aria-label="Hermes Dashboard Mission Control wrapper"
    >
      <header
        className="flex flex-col gap-3 px-6 py-5 lg:flex-row lg:items-end lg:justify-between"
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
            Hermes Dashboard Wrapper
          </span>
          <h2 className="text-xl font-semibold leading-tight" style={{ color: 'var(--cc-ink)' }}>
            Mission Control agent operations layer
          </h2>
          <SourceBadge mode={mode} label={sourceLabel} lastUpdatedAt={payload?.generatedAt} />
        </div>
        <a
          href={payload?.dashboard.url ?? 'http://127.0.0.1:9119'}
          target="_blank"
          rel="noreferrer"
          className="rounded-sm border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em]"
          style={{ borderColor: 'var(--cc-grid)', color: 'var(--cc-ink)' }}
        >
          Open local Hermes dashboard
        </a>
      </header>

      {error && <DegradedDataBanner source="Hermes Dashboard" reason={error} />}
      {payload && !payload.cron.gatewayRunning && (
        <DegradedDataBanner source="Hermes Cron" reason={payload.cron.note} />
      )}

      <ReadinessOverview readiness={readiness} />

      <div className="grid grid-cols-1 lg:grid-cols-4" style={{ gap: 1, background: 'var(--cc-grid)' }}>
        <WrapperCard
          title="Dashboard"
          status={payload?.dashboard.status ?? (loading ? 'degraded' : 'missing')}
          metric={loading ? 'probing' : `${payload?.dashboard.processCount ?? 0} process(es)`}
          detail={payload?.dashboard.note ?? 'Local dashboard process probe pending.'}
        />
        <WrapperCard
          title="Cron + Gateway"
          status={payload?.cron.status ?? (loading ? 'degraded' : 'missing')}
          metric={loading ? 'probing' : `${payload?.cron.activeJobs ?? 0} active jobs`}
          detail={payload?.cron.note ?? 'Cron scheduler probe pending.'}
        >
          {payload?.cron.nextRunAt && formatNextRun(payload.cron.nextRunAt) && (
            <span
              className="mt-3 inline-flex items-center gap-2 self-start rounded-sm px-2 py-1 font-mono text-[10px] uppercase tracking-[0.16em]"
              style={{
                color: payload.cron.gatewayRunning ? 'var(--cc-ink-dim)' : 'var(--cc-signal)',
                border: `1px solid ${payload.cron.gatewayRunning ? 'var(--cc-grid)' : 'var(--cc-signal)'}`,
              }}
              aria-label={`Cron next scheduled run: ${formatNextRun(payload.cron.nextRunAt)}${payload.cron.gatewayRunning ? '' : ' (gateway not running — will not fire)'}`}
            >
              {payload.cron.gatewayRunning ? 'next run' : 'scheduled (not firing)'}{' '}
              <span style={{ color: payload.cron.gatewayRunning ? 'var(--cc-ink-hush)' : 'var(--cc-signal)' }}>
                {formatNextRun(payload.cron.nextRunAt)}
              </span>
            </span>
          )}
        </WrapperCard>
        <WrapperCard
          title="Kanban Board"
          status={payload?.kanban.status ?? (loading ? 'degraded' : 'missing')}
          metric={loading ? 'probing' : `${payload?.kanban.taskCount ?? 0} tasks`}
          detail={payload ? `${payload.kanban.currentBoard} · ${formatCountMap(payload.kanban.counts)}` : 'Kanban probe pending.'}
        >
          {payload && <KanbanDistribution counts={payload.kanban.counts} total={payload.kanban.taskCount} />}
        </WrapperCard>
        <WrapperCard
          title="Context Mesh"
          status={payload?.context.status ?? (loading ? 'degraded' : 'missing')}
          metric={loading ? 'probing' : `${payload?.context.secondBrain.markdownFiles ?? 0} notes`}
          detail={payload ? `Tailscale ${payload.context.tailscale.onlinePeers} online peers · canonical 2nd-brain` : 'Obsidian/Tailscale probe pending.'}
        />
      </div>

      <div className="px-6 py-4" style={{ borderTop: '1px solid var(--cc-grid)' }}>
        <p className="font-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: 'var(--cc-ink-dim)' }}>
          Capability matrix
        </p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-4" style={{ gap: 1, background: 'var(--cc-grid)' }}>
        <WrapperCard
          title="Persistent Goals"
          status={payload?.addons?.goals?.status ?? (loading ? 'degraded' : 'missing')}
          metric={loading ? 'probing' : payload?.addons?.goals?.metric ?? 'not reported'}
          detail={payload?.addons?.goals?.note ?? 'Persistent /goal probe pending.'}
        />
        <WrapperCard
          title="Code Execution"
          status={payload?.addons?.codeExecution?.status ?? (loading ? 'degraded' : 'missing')}
          metric={loading ? 'probing' : payload?.addons?.codeExecution?.metric ?? 'not reported'}
          detail={payload?.addons?.codeExecution?.note ?? 'execute_code readiness probe pending.'}
        />
        <WrapperCard
          title="Event Hooks"
          status={payload?.addons?.hooks?.status ?? (loading ? 'degraded' : 'missing')}
          metric={loading ? 'probing' : payload?.addons?.hooks?.metric ?? 'not reported'}
          detail={payload?.addons?.hooks?.note ?? 'Gateway hook manifest probe pending.'}
        />
        <WrapperCard
          title="Batch Processing"
          status={payload?.addons?.batchProcessing?.status ?? (loading ? 'degraded' : 'missing')}
          metric={loading ? 'probing' : payload?.addons?.batchProcessing?.metric ?? 'not reported'}
          detail={payload?.addons?.batchProcessing?.note ?? 'Batch runner probe pending.'}
        />
      </div>

      <div className="grid gap-4 px-6 py-5 lg:grid-cols-[1fr_1fr]" style={{ borderTop: '1px solid var(--cc-grid)' }}>
        <div className="font-mono text-[11px] leading-relaxed" style={{ color: 'var(--cc-ink-hush)' }}>
          <p className="uppercase tracking-[0.18em]" style={{ color: 'var(--cc-ink-dim)' }}>
            Integration contract
          </p>
          <ul className="mt-2 space-y-1">
            <li>Mode: {payload?.docsContract.mode ?? 'read-only wrapper'}</li>
            <li>Extension path: {payload?.docsContract.dashboardExtensionPath ?? '~/.hermes/plugins/&lt;name&gt;/dashboard/'}</li>
            <li>Proxy: {payload?.docsContract.subscriptionProxy ?? 'optional raw-model passthrough only'}</li>
          </ul>
        </div>
        <div className="font-mono text-[11px] leading-relaxed" style={{ color: 'var(--cc-ink-hush)' }}>
          <p className="uppercase tracking-[0.18em]" style={{ color: 'var(--cc-ink-dim)' }}>
            Path to complete wrapper
          </p>
          <ol className="mt-2 list-decimal space-y-1 pl-4">
            <li>Keep Mission Control read-only until gateway cron loop is green.</li>
            <li>Expose Kanban boards/tasks and cron health as local cards first.</li>
            <li>Use Hermes dashboard plugins for deeper tabs, not a secrets-bearing iframe.</li>
            <li>Feed context from canonical 2nd-brain over Tailscale-safe local paths.</li>
          </ol>
        </div>
      </div>
    </section>
  );
}

function ReadinessOverview({
  readiness,
}: {
  readiness: ReturnType<typeof readinessSnapshot>;
}) {
  return (
    <div
      className="grid gap-4 px-6 py-5 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)]"
      style={{
        background: 'var(--cc-bg)',
        borderBottom: '1px solid var(--cc-grid)',
      }}
    >
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: 'var(--cc-ink-dim)' }}>
          Readiness overview
        </p>
        <p className="mt-2 text-3xl font-semibold tracking-[-0.03em]" style={{ color: 'var(--cc-ink)' }}>
          {readiness.percent}% ready
        </p>
      </div>
      <div className="flex flex-col justify-end gap-3">
        <div
          className="h-2 overflow-hidden rounded-full"
          aria-label="Hermes wrapper readiness meter"
          style={{ background: 'var(--cc-grid)' }}
        >
          <div
            className="h-full rounded-full"
            style={{
              width: `${readiness.percent}%`,
              background: readiness.percent >= 90 ? 'var(--cc-ink)' : '#d97706',
            }}
          />
        </div>
        <div className="flex flex-col gap-1 font-mono text-[11px] leading-relaxed sm:flex-row sm:items-center sm:justify-between">
          <span style={{ color: 'var(--cc-ink-dim)' }}>
            Live {readiness.live} · Degraded {readiness.degraded} · Missing {readiness.missing}
          </span>
          <span style={{ color: 'var(--cc-ink-hush)' }}>{readiness.label}</span>
        </div>
      </div>
    </div>
  );
}

function KanbanDistribution({ counts, total }: { counts: Record<string, number>; total: number }) {
  const entries = Object.entries(counts).filter(([, value]) => value > 0);
  if (entries.length === 0 || total <= 0) return null;

  return (
    <div className="mt-4" aria-label="Kanban distribution">
      <p className="font-mono text-[10px] uppercase tracking-[0.16em]" style={{ color: 'var(--cc-ink-dim)' }}>
        Kanban distribution
      </p>
      <div className="mt-2 flex h-2 overflow-hidden rounded-full" style={{ background: 'var(--cc-grid)' }}>
        {entries.map(([key, value]) => (
          <span
            key={key}
            title={`${key} ${value}`}
            style={{
              width: `${Math.max(6, (value / total) * 100)}%`,
              background: key === 'blocked' ? 'var(--cc-signal)' : key === 'done' ? 'var(--cc-ink)' : 'var(--cc-grid-strong)',
            }}
          />
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-2 font-mono text-[10px]" style={{ color: 'var(--cc-ink-hush)' }}>
        {entries.map(([key, value]) => (
          <span key={key}>{key} {value}</span>
        ))}
      </div>
    </div>
  );
}

function WrapperCard({
  title,
  status,
  metric,
  detail,
  children,
}: {
  title: string;
  status: ProbeStatus;
  metric: string;
  detail: string;
  children?: ReactNode;
}) {
  return (
    <article className="flex min-h-36 flex-col justify-between p-5" style={{ background: 'var(--cc-bg-soft)' }}>
      <div className="flex items-start justify-between gap-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: 'var(--cc-ink-dim)' }}>
          {title}
        </p>
        <span className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em]" style={{ color: statusColor(status) }}>
          <span
            aria-label="source-map status dot"
            className="h-[7px] w-[7px] rounded-full"
            style={{ background: statusTone(status), animation: status === 'live' ? 'cc-alert-pulse 2.5s ease-in-out infinite' : undefined }}
          />
          {statusLabel(status)}
        </span>
      </div>
      <p className="mt-4 text-2xl font-semibold tracking-[-0.02em]" style={{ color: 'var(--cc-ink)' }}>
        {metric}
      </p>
      <p className="mt-2 font-mono text-[11px] leading-relaxed" style={{ color: 'var(--cc-ink-hush)' }}>
        {detail}
      </p>
      {children}
    </article>
  );
}

export type { HermesDashboardWrapperPayload };
