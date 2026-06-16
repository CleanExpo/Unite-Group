'use client';

import { useEffect, useState } from 'react';
import { DegradedDataBanner } from '../DegradedDataBanner';
import { SourceBadge, type SourceMode } from '../SourceBadge';
import type { ProviderUsage, ProviderState } from '@/lib/mission-control/provider-usage';

type ProviderUsagePayload = {
  source: string;
  generatedAt: string;
  providers: ProviderUsage[];
  summary: {
    total: number;
    configured: number;
    available: number;
    watching: number;
    near_limit: number;
    blocked: number;
    unknown: number;
  };
};

const STATE_LABELS: Record<ProviderState, string> = {
  available: 'available',
  watching: 'watching',
  near_limit: 'near limit',
  blocked: 'blocked',
  unknown: 'unknown',
};

function stateColor(state: ProviderState) {
  if (state === 'available') return 'var(--cc-ink)';
  if (state === 'watching') return 'var(--cc-ink-dim)';
  if (state === 'near_limit') return '#f59e0b';
  if (state === 'blocked') return 'var(--cc-signal)';
  return 'var(--cc-ink-hush)';
}

function badgeMode(payload: ProviderUsagePayload | null, loading: boolean): SourceMode {
  if (loading) return 'loading';
  if (!payload) return 'degraded';
  return 'live';
}

function usageLabel(provider: ProviderUsage) {
  if (provider.usagePct !== null) return `${provider.usagePct}%`;
  if (provider.usageSource === 'env') return 'configured';
  return 'no meter';
}

export function ProviderUsageCockpit({ initialPayload }: { initialPayload?: ProviderUsagePayload }) {
  const [payload, setPayload] = useState<ProviderUsagePayload | null>(initialPayload ?? null);
  const [loading, setLoading] = useState(!initialPayload);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialPayload) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const res = await fetch('/api/command-center/provider-usage', { cache: 'no-store' });
        if (!res.ok) throw new Error(`provider_usage_http_${res.status}`);
        const body = (await res.json()) as ProviderUsagePayload;
        if (cancelled) return;
        setPayload(body);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setPayload(null);
        setError(err instanceof Error ? err.message : 'provider_usage_fetch_failed');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [initialPayload]);

  const providers = payload?.providers ?? [];
  const summary = payload?.summary;
  const blocked = summary ? summary.blocked + summary.unknown : 0;

  return (
    <section
      aria-label="AI provider usage cockpit"
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
            AI Provider Cockpit
          </span>
          <h2 className="text-xl font-semibold leading-tight" style={{ color: 'var(--cc-ink)' }}>
            Plan capacity and routing readiness
          </h2>
          <SourceBadge
            mode={badgeMode(payload, loading)}
            label={payload ? `${summary?.configured ?? 0}/${summary?.total ?? 0} meters connected` : 'provider usage requesting'}
            lastUpdatedAt={payload?.generatedAt}
          />
        </div>

        <div
          className="grid grid-cols-3 gap-px overflow-hidden border"
          style={{ borderColor: 'var(--cc-grid)', background: 'var(--cc-grid)' }}
          aria-label="Provider readiness summary"
        >
          <SummaryCell label="READY" value={summary?.available ?? 0} />
          <SummaryCell label="WATCH" value={(summary?.watching ?? 0) + (summary?.near_limit ?? 0)} />
          <SummaryCell label="BLOCKED" value={blocked} alert={blocked > 0} />
        </div>
      </header>

      {error && <DegradedDataBanner source="Provider Usage" reason={error} />}

      <div
        className="grid grid-cols-1 md:grid-cols-5"
        style={{ gap: 1, background: 'var(--cc-grid)' }}
      >
        {providers.map((provider) => (
          <ProviderMeter key={provider.id} provider={provider} />
        ))}
        {!loading && providers.length === 0 && (
          <div className="px-6 py-5 text-sm" style={{ color: 'var(--cc-ink-dim)' }}>
            Provider usage has no readable state yet.
          </div>
        )}
      </div>
    </section>
  );
}

function SummaryCell({ label, value, alert = false }: { label: string; value: number; alert?: boolean }) {
  return (
    <div className="min-w-24 px-4 py-3" style={{ background: 'var(--cc-bg-soft)' }}>
      <div
        className="font-mono text-[10px] uppercase tracking-[0.18em]"
        style={{ color: 'var(--cc-ink-hush)' }}
      >
        {label}
      </div>
      <div
        className="font-mono text-2xl leading-none"
        style={{ color: alert ? 'var(--cc-signal)' : 'var(--cc-ink)' }}
      >
        {value}
      </div>
    </div>
  );
}

function ProviderMeter({ provider }: { provider: ProviderUsage }) {
  const color = stateColor(provider.state);
  const pct = provider.usagePct ?? (provider.configured ? 35 : 0);
  const opacity = provider.usagePct === null ? 0.34 : 1;

  return (
    <article
      className="flex min-h-48 flex-col justify-between gap-4 px-5 py-4"
      style={{ background: 'var(--cc-bg-soft)' }}
    >
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-mono text-sm uppercase tracking-[0.16em]" style={{ color: 'var(--cc-ink)' }}>
            {provider.label}
          </h3>
          <span
            aria-hidden
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: color,
              boxShadow: provider.state === 'blocked' ? `0 0 0 4px color-mix(in srgb, ${color} 18%, transparent)` : undefined,
            }}
          />
        </div>
        <p className="text-xs" style={{ color: 'var(--cc-ink-dim)' }}>
          {provider.plan}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <div className="h-2 overflow-hidden" style={{ background: 'var(--cc-grid)' }}>
          <div
            className="h-full"
            style={{
              width: `${pct}%`,
              background: color,
              opacity,
            }}
          />
        </div>
        <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.14em]">
          <span style={{ color }}>{STATE_LABELS[provider.state]}</span>
          <span style={{ color: 'var(--cc-ink-hush)' }}>{usageLabel(provider)}</span>
        </div>
      </div>

      <div className="space-y-2 text-xs leading-relaxed" style={{ color: 'var(--cc-ink-dim)' }}>
        <p>{provider.bestUse}</p>
        <p className="font-mono text-[10px] uppercase tracking-[0.14em]" style={{ color: 'var(--cc-ink-hush)' }}>
          {provider.usageSource} · reset {provider.resetCadence}
        </p>
        {provider.missingRequirement && (
          <p style={{ color: 'var(--cc-signal)' }}>{provider.missingRequirement}</p>
        )}
      </div>
    </article>
  );
}
