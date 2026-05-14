'use client';

// CommandCenterShell — the five-zone layout container for /command-center.
//
// PR-1 shipped Zones 1 + 2 LIVE.
// PR-2 (this commit) lands Zone 3 — the agent-topology centrepiece.
// Zones 4/5 remain labeled placeholders until PR-3.
//
// Per [[command-center-redesign-proposal-2026-05-14]] layout spec:
//   Zone 1 — Global Status Bar (top, h-12)
//   Zone 2 — KPI strip (below banner, grid of 5)
//   Zone 3 — Working canvas (agent topology) — LIVE (PR-2)
//   Zone 4 — Business 360 — PR-3
//   Zone 5 — Live activity log — PR-3

import { GlobalStatusBar } from './GlobalStatusBar';
import { KpiStrip } from './KpiStrip';
import { AgentTopology } from './topology/AgentTopology';

export function CommandCenterShell() {
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background: 'var(--cc-bg)',
        color: 'var(--cc-ink)',
      }}
    >
      <GlobalStatusBar />
      <KpiStrip />

      <main className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_22rem]">
        <AgentTopology />

        <aside
          className="flex flex-col"
          style={{ borderLeft: '1px solid var(--cc-grid)' }}
        >
          <ZonePlaceholder
            title="Zone 4 — Business 360"
            subtitle="Sparkline rows per portfolio brand. Ships PR-3."
            accentLabel="@visx/shape · @visx/scale"
            compact
          />
          <ZonePlaceholder
            title="Zone 5 — Live activity log"
            subtitle="Reverse-chron event stream. Ships PR-3."
            accentLabel="virtualised · typewriter · severity colour"
            compact
          />
        </aside>
      </main>

      <footer
        className="px-6 h-8 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.22em]"
        style={{
          background: 'var(--cc-bg)',
          borderTop: '1px solid var(--cc-grid)',
          color: 'var(--cc-ink-hush)',
        }}
      >
        <span>
          PR-2 zone 3 topology · zones 4/5 land in PR-3
        </span>
        <span>
          spec ·{' '}
          <span style={{ color: 'var(--cc-ink-dim)' }}>
            command-center-redesign-proposal-2026-05-14
          </span>
        </span>
      </footer>
    </div>
  );
}

function ZonePlaceholder({
  title,
  subtitle,
  accentLabel,
  compact,
}: {
  title: string;
  subtitle: string;
  accentLabel: string;
  compact?: boolean;
}) {
  return (
    <section
      className={`flex flex-col gap-3 ${compact ? 'p-5' : 'p-8'} flex-1`}
      style={{
        background: 'var(--cc-bg-soft)',
        borderTop: compact ? '1px solid var(--cc-grid)' : 'none',
        minHeight: compact ? '14rem' : '24rem',
      }}
      aria-label={title}
    >
      <span
        className="font-mono text-[11px] uppercase tracking-[0.22em]"
        style={{ color: 'var(--cc-ink-dim)' }}
      >
        {title}
      </span>
      <p className="text-sm" style={{ color: 'var(--cc-ink)' }}>
        {subtitle}
      </p>
      <span
        className="font-mono text-[10px] uppercase tracking-[0.18em] mt-auto"
        style={{ color: 'var(--cc-ink-hush)' }}
      >
        {accentLabel}
      </span>
    </section>
  );
}
