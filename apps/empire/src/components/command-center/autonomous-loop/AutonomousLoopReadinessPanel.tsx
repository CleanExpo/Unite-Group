'use client';

import { useEffect, useState } from 'react';
import { DegradedDataBanner } from '../DegradedDataBanner';
import { SourceBadge, type SourceMode } from '../SourceBadge';
import type {
  LoopReadinessCheck,
  LoopReadinessPayload,
  LoopReadinessState,
} from '@/lib/mission-control/autonomous-loop-readiness';

function colorFor(state: LoopReadinessState) {
  if (state === 'ready') return 'var(--cc-ink)';
  if (state === 'warning') return '#f59e0b';
  return 'var(--cc-signal)';
}

function sourceMode(payload: LoopReadinessPayload | null, loading: boolean): SourceMode {
  if (loading) return 'loading';
  if (!payload) return 'degraded';
  return 'live';
}

export function AutonomousLoopReadinessPanel({
  initialPayload,
}: {
  initialPayload?: LoopReadinessPayload;
}) {
  const [payload, setPayload] = useState<LoopReadinessPayload | null>(initialPayload ?? null);
  const [loading, setLoading] = useState(!initialPayload);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialPayload) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const res = await fetch('/api/command-center/autonomous-loop-readiness', { cache: 'no-store' });
        if (!res.ok) throw new Error(`loop_readiness_http_${res.status}`);
        const body = (await res.json()) as LoopReadinessPayload;
        if (cancelled) return;
        setPayload(body);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setPayload(null);
        setError(err instanceof Error ? err.message : 'loop_readiness_fetch_failed');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [initialPayload]);

  const ready = payload?.checks.filter((check) => check.state === 'ready').length ?? 0;
  const total = payload?.checks.length ?? 0;
  const overall = payload?.overall ?? 'blocked';

  return (
    <section
      aria-label="Autonomous loop readiness"
      className="flex flex-col"
      style={{
        background: 'var(--cc-bg-soft)',
        borderTop: '1px solid var(--cc-grid)',
      }}
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
            Autonomous Loop
          </span>
          <h2 className="text-xl font-semibold leading-tight" style={{ color: 'var(--cc-ink)' }}>
            Continuous build readiness
          </h2>
          <SourceBadge
            mode={sourceMode(payload, loading)}
            label={payload ? `${ready}/${total} checks ready` : 'checking loop'}
            lastUpdatedAt={payload?.generatedAt}
          />
        </div>

        <div
          className="min-w-40 px-5 py-3"
          style={{
            background: 'var(--cc-bg-soft)',
            border: '1px solid var(--cc-grid)',
          }}
        >
          <div
            className="font-mono text-[10px] uppercase tracking-[0.18em]"
            style={{ color: 'var(--cc-ink-hush)' }}
          >
            State
          </div>
          <div className="font-mono text-2xl uppercase leading-none" style={{ color: colorFor(overall) }}>
            {overall}
          </div>
        </div>
      </header>

      {error && <DegradedDataBanner source="Autonomous Loop" reason={error} />}

      {payload && (
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_22rem]" style={{ gap: 1, background: 'var(--cc-grid)' }}>
          <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 1, background: 'var(--cc-grid)' }}>
            {payload.checks.map((check) => (
              <CheckRow key={check.id} check={check} />
            ))}
          </div>
          <aside className="flex flex-col gap-3 px-5 py-4" style={{ background: 'var(--cc-bg-soft)' }}>
            <span
              className="font-mono text-[10px] uppercase tracking-[0.18em]"
              style={{ color: 'var(--cc-ink-hush)' }}
            >
              Next action
            </span>
            <p className="text-sm leading-relaxed" style={{ color: colorFor(payload.overall) }}>
              {payload.nextAction}
            </p>
          </aside>
        </div>
      )}
    </section>
  );
}

function CheckRow({ check }: { check: LoopReadinessCheck }) {
  const color = colorFor(check.state);
  return (
    <div className="flex min-h-24 items-start gap-3 px-5 py-4" style={{ background: 'var(--cc-bg-soft)' }}>
      <span
        aria-hidden
        className="mt-1 inline-block h-2 w-2 shrink-0 rounded-full"
        style={{ background: color }}
      />
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-mono text-xs uppercase tracking-[0.16em]" style={{ color: 'var(--cc-ink)' }}>
            {check.label}
          </h3>
          {check.required && (
            <span className="font-mono text-[9px] uppercase tracking-[0.14em]" style={{ color }}>
              required
            </span>
          )}
        </div>
        <p className="mt-2 text-xs leading-relaxed" style={{ color: 'var(--cc-ink-dim)' }}>
          {check.detail}
        </p>
      </div>
    </div>
  );
}
