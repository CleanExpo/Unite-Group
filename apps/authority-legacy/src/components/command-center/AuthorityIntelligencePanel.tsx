'use client';

import { SourceBadge } from './SourceBadge';
import type { AuthorityIntelligenceResult } from '@/lib/empire/read-authority-intelligence';

export interface AuthorityIntelligencePanelProps extends Partial<AuthorityIntelligenceResult> {}

const SEED_APPROVAL_GATES = [
  'No public publishing without approval',
  'No community replies without approval',
  'No client contact, spend, deployment or merge without approval',
];

export function AuthorityIntelligencePanel({
  wrapperStatus = 'missing',
  materialSignals = 0,
  sourceErrorCount = 0,
  assetsAwaitingReview = 0,
  approvalGates = SEED_APPROVAL_GATES,
  nextRecommendedAction = 'Wire Authority Intelligence wiki_pages into Nexus before using it as an execution gate.',
  signals = [],
  fetchedAt,
}: AuthorityIntelligencePanelProps = {}) {
  const isLive = !!fetchedAt;
  const wrapperLabel = wrapperStatus === 'active'
    ? 'wrapper active'
    : wrapperStatus === 'draft'
      ? 'pilot only'
      : 'wrapper missing';

  return (
    <section
      className="flex flex-col"
      style={{
        background: 'var(--cc-bg-soft)',
        borderTop: '1px solid var(--cc-grid)',
      }}
      aria-label="Authority Intelligence"
    >
      <header
        className="flex items-center justify-between px-5 h-10"
        style={{
          background: 'var(--cc-bg)',
          borderBottom: '1px solid var(--cc-grid)',
        }}
      >
        <span
          className="font-mono text-[11px] uppercase tracking-[0.22em]"
          style={{ color: 'var(--cc-ink-dim)' }}
        >
          Authority Intelligence
        </span>
        <SourceBadge
          mode={isLive ? 'live' : 'seed'}
          label={isLive ? 'wiki_pages · wrapper' : 'seed · wrapper not live'}
          lastUpdatedAt={fetchedAt}
        />
      </header>

      <div className="grid grid-cols-3" style={{ gap: 1, background: 'var(--cc-grid)' }}>
        <Metric label="Signals" value={materialSignals.toString()} />
        <Metric label="Review" value={assetsAwaitingReview.toString()} />
        <Metric label="Source errors" value={sourceErrorCount.toString()} signal={sourceErrorCount > 0} />
      </div>

      <div className="space-y-4 px-5 py-4">
        <div>
          <p
            className="font-mono text-[10px] uppercase tracking-[0.18em]"
            style={{ color: 'var(--cc-ink-hush)' }}
          >
            Nexus wrapper
          </p>
          <p className="mt-1 text-sm font-semibold" style={{ color: 'var(--cc-ink)' }}>
            {wrapperLabel}
          </p>
          <p className="mt-1 text-xs leading-5" style={{ color: 'var(--cc-ink-dim)' }}>
            {nextRecommendedAction}
          </p>
        </div>

        <div>
          <p
            className="font-mono text-[10px] uppercase tracking-[0.18em]"
            style={{ color: 'var(--cc-ink-hush)' }}
          >
            Approval gates
          </p>
          <ul className="mt-2 space-y-1.5">
            {approvalGates.slice(0, 4).map((gate) => (
              <li key={gate} className="flex gap-2 text-xs leading-5" style={{ color: 'var(--cc-ink-dim)' }}>
                <span aria-hidden style={{ color: 'var(--cc-signal)' }}>•</span>
                <span>{gate}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p
            className="font-mono text-[10px] uppercase tracking-[0.18em]"
            style={{ color: 'var(--cc-ink-hush)' }}
          >
            Latest knowledge objects
          </p>
          <div className="mt-2 space-y-2">
            {signals.length > 0 ? signals.slice(0, 4).map((signal) => (
              <a
                key={signal.id}
                href={signal.href}
                className="block rounded-md px-3 py-2 transition hover:bg-white/5"
                style={{ border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <span className="block truncate text-xs font-medium" style={{ color: 'var(--cc-ink)' }}>
                  {signal.title}
                </span>
                <span className="mt-1 block font-mono text-[9px] uppercase tracking-[0.16em]" style={{ color: 'var(--cc-ink-hush)' }}>
                  {signal.status.replace(/-/g, ' ')}
                </span>
              </a>
            )) : (
              <p className="text-xs leading-5" style={{ color: 'var(--cc-ink-dim)' }}>
                No live Authority Intelligence records found. Seed gate remains visible so future work knows the wrapper is required.
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function Metric({ label, value, signal = false }: { label: string; value: string; signal?: boolean }) {
  return (
    <div className="px-4 py-3" style={{ background: 'var(--cc-bg-soft)' }}>
      <div className="font-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: 'var(--cc-ink-hush)' }}>
        {label}
      </div>
      <div className="mt-1 text-lg font-semibold" style={{ color: signal ? 'var(--cc-signal)' : 'var(--cc-ink)' }}>
        {value}
      </div>
    </div>
  );
}
