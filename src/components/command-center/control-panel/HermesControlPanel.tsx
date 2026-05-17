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

type ControlPanelPayload = {
  source: string;
  taskCount: number;
  generatedAt: string;
  summary: Record<ControlRyg, number>;
  workstreams: ControlWorkstream[];
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

export function HermesControlPanel() {
  const [payload, setPayload] = useState<ControlPanelPayload | null>(null);
  const [sourceState, setSourceState] = useState<'loading' | 'live' | 'fallback'>('loading');

  useEffect(() => {
    let cancelled = false;

    async function loadControlPanel() {
      try {
        const res = await fetch('/api/command-center/control-panel', { cache: 'no-store' });
        if (!res.ok) throw new Error('control_panel_fetch_failed');
        const body = (await res.json()) as ControlPanelPayload;
        if (cancelled) return;
        setPayload(body);
        setSourceState(body.source.startsWith('crm:') ? 'live' : 'fallback');
      } catch {
        if (cancelled) return;
        setPayload(null);
        setSourceState('fallback');
      }
    }

    void loadControlPanel();

    return () => {
      cancelled = true;
    };
  }, []);

  const workstreams = payload?.workstreams ?? CONTROL_WORKSTREAMS;
  const addOns = payload?.addOns ?? ADD_ON_GATES;
  const green = payload?.summary.green ?? workstreams.filter((item) => item.ryg === 'green').length;
  const yellow = payload?.summary.yellow ?? workstreams.filter((item) => item.ryg === 'yellow').length;
  const red = payload?.summary.red ?? workstreams.filter((item) => item.ryg === 'red').length;
  const sourceLabel =
    sourceState === 'live'
      ? `CRM live · ${payload?.taskCount ?? 0} tasks`
      : sourceState === 'loading'
        ? 'loading CRM'
        : 'fallback plan data';

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
          <span
            className="font-mono text-[10px] uppercase tracking-[0.18em]"
            style={{
              color: sourceState === 'live' ? 'var(--cc-ink-dim)' : 'var(--cc-signal)',
            }}
          >
            {sourceLabel}
          </span>
        </div>

        <div
          className="grid grid-cols-3 gap-px overflow-hidden border"
          style={{ borderColor: 'var(--cc-grid)', background: 'var(--cc-grid)' }}
          aria-label="Portfolio RYG summary"
        >
          <SummaryCell label="GREEN" value={green} tone="green" />
          <SummaryCell label="YELLOW" value={yellow} tone="yellow" />
          <SummaryCell label="RED" value={red} tone="red" />
        </div>
      </header>

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
          </div>

          {addOns.map((item) => (
            <AddOnRow key={item.id} item={item} />
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

function WorkstreamRow({ item }: { item: ControlWorkstream }) {
  const color = statusColor(item.status, item.ryg);
  const isSignal = item.ryg === 'red' || item.status === 'gated';

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
    </article>
  );
}

function AddOnRow({ item }: { item: AddOnGate }) {
  const color = statusColor(item.state);
  const isSignal = item.state === 'gated';

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
