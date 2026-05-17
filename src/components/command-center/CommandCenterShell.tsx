'use client';

// CommandCenterShell — the five-zone layout container for /command-center.
//
// PR-1 shipped Zones 1 + 2 LIVE.
// PR-2 shipped Zone 3 — the agent-topology centrepiece.
// PR-3 (this commit) lands Zones 4 + 5 (Business 360 + Activity Log).
//
// Per [[command-center-redesign-proposal-2026-05-14]] layout spec:
//   Zone 1 — Global Status Bar (top, h-12)
//   Zone 2 — KPI strip (below banner, grid of 5)
//   Zone 3 — Working canvas (agent topology) — LIVE (PR-2)
//   Zone 4 — Business 360 — LIVE (PR-3)
//   Zone 5 — Live activity log — LIVE (PR-3)

import { GlobalStatusBar } from './GlobalStatusBar';
import { KpiStrip } from './KpiStrip';
import { AgentTopology } from './topology/AgentTopology';
import { Business360Grid } from './business-360/Business360Grid';
import { ActivityLog } from './activity/ActivityLog';
import { MargotVoicePanel } from './voice/MargotVoicePanel';
import { HermesControlPanel } from './control-panel/HermesControlPanel';

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
        <div className="flex min-w-0 flex-col">
          <AgentTopology />
          <HermesControlPanel />
        </div>

        <aside
          className="flex flex-col"
          style={{ borderLeft: '1px solid var(--cc-grid)' }}
        >
          <MargotVoicePanel />
          <Business360Grid />
          <ActivityLog />
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
          zones 1-5 live · PR-1 + PR-2 + PR-3 shipped
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
