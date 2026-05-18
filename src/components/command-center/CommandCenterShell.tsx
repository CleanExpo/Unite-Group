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

import { GlobalStatusBar, type GlobalStatusBarProps } from './GlobalStatusBar';
import { KpiStrip, type KpiStripProps } from './KpiStrip';
import { AgentTopology } from './topology/AgentTopology';
import { Business360Grid, type Business360GridProps } from './business-360/Business360Grid';
import { ActivityLog, type ActivityLogProps } from './activity/ActivityLog';
import { MargotVoicePanel } from './voice/MargotVoicePanel';
import { HermesControlPanel } from './control-panel/HermesControlPanel';

export interface CommandCenterShellProps {
  /**
   * Optional KPI props injected by the server-rendered page. When provided,
   * KpiStrip renders in `live` mode; otherwise it stays in `seed` mode.
   */
  kpiInitial?: KpiStripProps;
  /**
   * Optional GlobalStatusBar props injected by the server-rendered page.
   * When provided, the bar's SourceBadge flips to `live`.
   */
  globalStatusInitial?: GlobalStatusBarProps;
  /**
   * Optional ActivityLog props injected by the server-rendered page. When
   * provided, the activity feed renders agent_actions instead of the seed.
   */
  activityInitial?: ActivityLogProps;
  /**
   * Optional Business360Grid props injected by the server-rendered page.
   * When provided, the grid renders live snapshots and the badge flips
   * to `live`.
   */
  business360Initial?: Business360GridProps;
}

export function CommandCenterShell({
  kpiInitial,
  globalStatusInitial,
  activityInitial,
  business360Initial,
}: CommandCenterShellProps = {}) {
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background: 'var(--cc-bg)',
        color: 'var(--cc-ink)',
      }}
    >
      <GlobalStatusBar {...globalStatusInitial} />
      <KpiStrip {...kpiInitial} />

      <main className="flex-1 grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex min-w-0 flex-col">
          <AgentTopology />
          <HermesControlPanel />
        </div>

        <aside
          className="command-center-side-rail flex flex-col"
        >
          <MargotVoicePanel />
          <Business360Grid {...business360Initial} />
          <ActivityLog {...activityInitial} />
        </aside>
      </main>

      <footer
        className="flex min-h-8 flex-col gap-1 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.22em] sm:flex-row sm:items-center sm:justify-between sm:px-6"
        style={{
          background: 'var(--cc-bg)',
          borderTop: '1px solid var(--cc-grid)',
          color: 'var(--cc-ink-hush)',
        }}
      >
        <span>
          zones 1-5 live · CRM control layer active
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
