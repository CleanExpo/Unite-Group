'use client';

import { useEffect, useState } from 'react';
import {
  ADD_ON_GATES,
  CONTROL_WORKSTREAMS,
  type AddOnGate,
  type ControlRyg,
  type ControlStatus,
  type ControlWorkstream,
} from './control-panel-data';
import { mapAddOnResult, type AddOnOutcome } from './add-on-result';
import { SourceBadge } from '../SourceBadge';
import { DegradedDataBanner } from '../DegradedDataBanner';

type LiveControlWorkstream = ControlWorkstream & {
  crmTaskId?: string;
  crmTaskStatus?: string;
  lastUpdated?: string;
};

type ControlPanelPayload = {
  source: string;
  taskCount: number;
  generatedAt: string;
  summary: Record<ControlRyg, number> & {
    approvalRequired?: number;
  };
  workstreams: LiveControlWorkstream[];
  addOns: AddOnGate[];
};

const STATUS_LABELS: Record<ControlStatus, string> = {
  live: 'live',
  building: 'building',
  gated: 'gated',
  planned: 'planned',
};

const RYG_LABELS: Record<ControlRyg, string> = {
  green: 'GREEN',
  yellow: 'YELLOW',
  red: 'RED',
};

function statusColor(status: ControlStatus, ryg?: ControlRyg) {
  if (ryg === 'red' || status === 'gated') return 'var(--cc-signal)';
  if (status === 'live') return 'var(--cc-ink)';
  if (status === 'building') return 'var(--cc-ink-dim)';
  return 'var(--cc-ink-hush)';
}

function stateLabel(status: ControlStatus, ryg?: ControlRyg) {
  if (ryg) return `${RYG_LABELS[ryg]} / ${STATUS_LABELS[status]}`;
  return STATUS_LABELS[status];
}

type HermesControlPanelProps = {
  initialPayload?: ControlPanelPayload;
};

export function HermesControlPanel({ initialPayload }: HermesControlPanelProps = {}) {
  const [payload, setPayload] = useState<ControlPanelPayload | null>(initialPayload ?? null);
  const [sourceState, setSourceState] = useState<'loading' | 'live' | 'fallback'>(
    initialPayload?.source.startsWith('crm:') ? 'live' : initialPayload ? 'fallback' : 'loading',
  );
  const [fallbackReason, setFallbackReason] = useState<string | null>(
    initialPayload && !initialPayload.source.startsWith('crm:')
      ? `server returned source=${initialPayload.source}`
      : null,
  );
  const [localAddOns, setLocalAddOns] = useState<AddOnGate[] | null>(initialPayload?.addOns ?? null);
  const [pendingAddOnId, setPendingAddOnId] = useState<string | null>(null);
  const [addOnOutcome, setAddOnOutcome] = useState<AddOnOutcome | null>(null);

  useEffect(() => {
    if (initialPayload) return;

    let cancelled = false;

    async function loadControlPanel() {
      try {
        const res = await fetch('/api/command-center/control-panel', { cache: 'no-store' });
        if (!res.ok) throw new Error(`control_panel_http_${res.status}`);
        const body = (await res.json()) as ControlPanelPayload;
        if (cancelled) return;
        setPayload(body);
        setLocalAddOns(body.addOns);
        if (body.source.startsWith('crm:')) {
          setSourceState('live');
          setFallbackReason(null);
        } else {
          setSourceState('fallback');
          setFallbackReason(`server returned source=${body.source}`);
        }
      } catch (err) {
        if (cancelled) return;
        setPayload(null);
        setSourceState('fallback');
        setFallbackReason(
          err instanceof Error ? err.message : 'control_panel_fetch_failed',
        );
      }
    }

    void loadControlPanel();

    return () => {
      cancelled = true;
    };
  }, [initialPayload]);

  async function requestAddOnGate(addOn: AddOnGate) {
    setPendingAddOnId(addOn.id);
    setAddOnOutcome(null);

    let status: number | null = null;
    let body: unknown = null;
    try {
      const res = await fetch('/api/command-center/control-panel/add-ons', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ addOnId: addOn.id }),
      });
      status = res.status;
      body = await res.json().catch(() => null);
    } catch {
      // fetch() threw — status stays null → taxonomy classifies as network.
    }

    const outcome = mapAddOnResult(status, body, addOn.label);
    setAddOnOutcome(outcome);
    if (outcome.ok && outcome.crmTaskId) {
      setLocalAddOns((current) =>
        (current ?? payload?.addOns ?? ADD_ON_GATES).map((item) =>
          item.id === addOn.id
            ? {
                ...item,
                state: 'gated',
                crmTaskId: outcome.crmTaskId,
                crmTaskStatus: outcome.crmTaskStatus,
              }
            : item,
        ),
      );
    }
    setPendingAddOnId(null);
  }

  const workstreams = payload?.workstreams ?? CONTROL_WORKSTREAMS;
  const addOns = localAddOns ?? payload?.addOns ?? ADD_ON_GATES;
  const green = payload?.summary.green ?? workstreams.filter((item) => item.ryg === 'green').length;
  const yellow = payload?.summary.yellow ?? workstreams.filter((item) => item.ryg === 'yellow').length;
  const red = payload?.summary.red ?? workstreams.filter((item) => item.ryg === 'red').length;
  const approvalRequired = payload?.summary.approvalRequired ?? 0;
  const badgeMode =
    sourceState === 'live'
      ? 'live'
      : sourceState === 'loading'
        ? 'loading'
        : 'degraded';
  const badgeLabel =
    sourceState === 'live'
      ? `CRM · ${payload?.taskCount ?? 0} tasks`
      : sourceState === 'loading'
        ? 'CRM · requesting'
        : 'CRM unreachable · seed plan';

  return (
    <section
      className="flex flex-col"
      style={{
        background: 'var(--cc-bg-soft)',
        borderTop: '1px solid var(--cc-grid)',
      }}
      aria-label="Hermes CEO Control Panel"
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
            Hermes CEO Control Panel
          </span>
          <h2
            className="text-xl font-semibold leading-tight"
            style={{ color: 'var(--cc-ink)' }}
          >
            Unite CRM operating spine
          </h2>
          <SourceBadge
            mode={badgeMode}
            label={badgeLabel}
            lastUpdatedAt={payload?.generatedAt}
          />
        </div>

        <div
          className="grid grid-cols-2 gap-px overflow-hidden border sm:grid-cols-4"
          style={{ borderColor: 'var(--cc-grid)', background: 'var(--cc-grid)' }}
          aria-label="Portfolio RYG and approval summary"
        >
          <SummaryCell label="GREEN" value={green} tone="green" />
          <SummaryCell label="YELLOW" value={yellow} tone="yellow" />
          <SummaryCell label="RED" value={red} tone="red" />
          <SummaryCell label="APPROVAL REQUIRED" value={approvalRequired} tone="red" />
        </div>
      </header>

      {sourceState === 'fallback' && (
        <DegradedDataBanner
          source="Unite CRM"
          reason={fallbackReason ?? undefined}
        />
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_20rem]" style={{ gap: 1, background: 'var(--cc-grid)' }}>
        <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 1, background: 'var(--cc-grid)' }}>
          {workstreams.map((item) => (
            <WorkstreamRow key={item.id} item={item} />
          ))}
        </div>

        <aside
          className="flex flex-col"
          style={{ background: 'var(--cc-bg-soft)' }}
          aria-label="Add-on registry approval gates"
        >
          <div
            className="px-5 py-4"
            style={{ borderBottom: '1px solid var(--cc-grid)' }}
          >
            <span
              className="font-mono text-[10px] uppercase tracking-[0.22em]"
              style={{ color: 'var(--cc-ink-dim)' }}
            >
              Add-on registry
            </span>
            <p
              className="mt-2 font-mono text-[11px] leading-relaxed"
              style={{ color: 'var(--cc-ink-hush)' }}
            >
              Approval first. CRM remains source of truth.
            </p>
            {addOnOutcome && (
              <div
                role={addOnOutcome.ok ? 'status' : 'alert'}
                data-outcome-kind={addOnOutcome.kind}
                className="mt-3 flex flex-col gap-1 font-mono text-[11px] leading-relaxed"
                aria-live="polite"
              >
                <span
                  className="font-semibold"
                  style={{ color: addOnOutcome.ok ? 'var(--cc-ink)' : 'var(--cc-signal)' }}
                >
                  {addOnOutcome.title}
                </span>
                <span style={{ color: 'var(--cc-ink-dim)' }}>
                  {addOnOutcome.message}
                </span>
                <span style={{ color: 'var(--cc-ink)' }}>
                  {addOnOutcome.nextAction}
                </span>
              </div>
            )}
          </div>

          {addOns.map((item) => (
            <AddOnRow
              key={item.id}
              item={item}
              pending={pendingAddOnId === item.id}
              onRequest={requestAddOnGate}
            />
          ))}
        </aside>
      </div>
    </section>
  );
}

function SummaryCell({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: ControlRyg;
}) {
  const color = tone === 'red' ? 'var(--cc-signal)' : 'var(--cc-ink)';

  return (
    <div
      className="min-w-24 px-4 py-3"
      style={{ background: 'var(--cc-bg-soft)' }}
    >
      <span
        className="block font-mono text-[10px] uppercase tracking-[0.18em]"
        style={{ color: tone === 'red' ? 'var(--cc-signal)' : 'var(--cc-ink-hush)' }}
      >
        {label}
      </span>
      <span
        className="mt-1 block font-mono text-2xl leading-none"
        style={{ color, fontVariantNumeric: 'tabular-nums' }}
      >
        {value}
      </span>
    </div>
  );
}

function WorkstreamRow({ item }: { item: LiveControlWorkstream }) {
  const color = statusColor(item.status, item.ryg);
  const isSignal = item.ryg === 'red' || item.status === 'gated';
  const crmTaskEvidence = item.crmTaskId
    ? `CRM task ${item.crmTaskId}${item.crmTaskStatus ? ` · ${item.crmTaskStatus}` : ''}`
    : null;

  return (
    <article
      className="relative flex min-h-[12rem] flex-col gap-3 px-5 py-4"
      style={{
        background: 'var(--cc-bg-soft)',
        borderLeft: `2px solid ${color}`,
      }}
      data-cc-state={item.status}
      aria-label={`${item.label}: ${stateLabel(item.status, item.ryg)}`}
    >
      {isSignal && (
        <span
          aria-hidden
          style={{
            position: 'absolute',
            top: 10,
            right: 10,
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: 'var(--cc-signal)',
            animation: 'cc-breathe var(--cc-pulse-duration) ease-in-out infinite',
          }}
        />
      )}

      <header className="flex flex-col gap-1">
        <span
          className="font-mono text-[10px] uppercase tracking-[0.18em]"
          style={{ color: 'var(--cc-ink-hush)' }}
        >
          {item.id} / {item.lane}
        </span>
        <h3
          className="text-sm font-semibold leading-snug"
          style={{ color: 'var(--cc-ink)' }}
        >
          {item.label}
        </h3>
      </header>

      <div className="grid gap-2 font-mono text-[11px] leading-relaxed">
        <MetaLine label="state" value={stateLabel(item.status, item.ryg)} color={color} />
        <MetaLine label="owner" value={item.owner} />
        <MetaLine label="depends" value={item.dependency} />
        <MetaLine label="gate" value={item.gate} color={isSignal ? 'var(--cc-signal)' : undefined} />
      </div>

      <p
        className="mt-auto font-mono text-[11px] leading-relaxed"
        style={{ color: 'var(--cc-ink-dim)' }}
      >
        {item.nextAction}
      </p>
      {crmTaskEvidence && (
        <span
          className="font-mono text-[10px] uppercase tracking-[0.14em]"
          style={{ color: 'var(--cc-ink-dim)' }}
        >
          {crmTaskEvidence}
        </span>
      )}
    </article>
  );
}

function AddOnRow({
  item,
  pending,
  onRequest,
}: {
  item: AddOnGate;
  pending: boolean;
  onRequest: (item: AddOnGate) => void;
}) {
  const color = statusColor(item.state);
  const isSignal = item.state === 'gated';
  const hasTask = !!item.crmTaskId;
  const canRequest = item.state !== 'live' && !hasTask;

  return (
    <div
      className="relative flex flex-col gap-2 px-5 py-4"
      style={{
        borderBottom: '1px solid var(--cc-grid)',
        borderLeft: `2px solid ${color}`,
      }}
      aria-label={`${item.label}: ${STATUS_LABELS[item.state]}`}
    >
      {isSignal && (
        <span
          aria-hidden
          style={{
            position: 'absolute',
            top: 10,
            right: 10,
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: 'var(--cc-signal)',
          }}
        />
      )}
      <span
        className="font-mono text-[10px] uppercase tracking-[0.18em]"
        style={{ color: 'var(--cc-ink-hush)' }}
      >
        {item.category} / {STATUS_LABELS[item.state]}
      </span>
      <span
        className="font-mono text-[12px] uppercase tracking-[0.12em]"
        style={{ color: 'var(--cc-ink)' }}
      >
        {item.label}
      </span>
      <span
        className="font-mono text-[11px] leading-relaxed"
        style={{ color: isSignal ? 'var(--cc-signal)' : 'var(--cc-ink-dim)' }}
      >
        {item.approval}
      </span>
      {hasTask && (
        <span
          className="font-mono text-[10px] uppercase tracking-[0.14em]"
          style={{ color: 'var(--cc-ink-dim)' }}
        >
          CRM task {item.crmTaskId}
        </span>
      )}
      {canRequest && (
        <button
          type="button"
          onClick={() => onRequest(item)}
          disabled={pending}
          className="mt-1 min-h-11 w-fit border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] transition-opacity disabled:cursor-wait disabled:opacity-60"
          style={{
            borderColor: 'var(--cc-grid)',
            color: 'var(--cc-ink)',
            background: 'var(--cc-bg)',
          }}
        >
          {pending ? 'Filing CRM task…' : 'Request approval task in Unite CRM'}
        </button>
      )}
    </div>
  );
}

function MetaLine({
  label,
  value,
  color = 'var(--cc-ink-dim)',
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="grid grid-cols-[4.5rem_1fr] gap-3">
      <span
        className="uppercase tracking-[0.16em]"
        style={{ color: 'var(--cc-ink-hush)' }}
      >
        {label}
      </span>
      <span style={{ color }}>{value}</span>
    </div>
  );
}
