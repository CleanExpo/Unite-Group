'use client';

import { useEffect, useState } from 'react';

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
import { AgentTopology, type AgentTopologyProps } from './topology/AgentTopology';
import { Business360Grid, type Business360GridProps } from './business-360/Business360Grid';
import { ActivityLog, type ActivityLogProps } from './activity/ActivityLog';
import { MargotVoicePanel } from './voice/MargotVoicePanel';
import { HermesControlPanel } from './control-panel/HermesControlPanel';
import { DailyCrmDigestPanel } from './digest/DailyCrmDigestPanel';
import type { CommandCenterDailyDigestInitial } from './daily-digest-initial';

export interface CommandCenterShellProps {
  /**
   * Active route locale (e.g. 'en', 'fr'). Threaded down to client-side
   * CTAs that point at other locale-scoped routes (DataRoom pip, etc.)
   * so the founder never gets dropped out of their locale.
   */
  locale: string;
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
  /**
   * Optional AgentTopology props injected by the server-rendered page.
   * When provided, node states reflect the latest agent_actions; positions
   * + edges stay seed (intentional layout).
   */
  topologyInitial?: AgentTopologyProps;
  /**
   * Optional minimized CRM daily digest injected by the server-rendered page.
   * Full digest markdown must stay server-only.
   */
  dailyDigestInitial?: CommandCenterDailyDigestInitial;
}

export function CommandCenterShell({
  locale,
  kpiInitial,
  globalStatusInitial,
  activityInitial,
  business360Initial,
  dailyDigestInitial,
  topologyInitial,
}: CommandCenterShellProps) {
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background: 'var(--cc-bg)',
        color: 'var(--cc-ink)',
      }}
    >
      <GlobalStatusBar locale={locale} {...globalStatusInitial} />
      <KpiStrip {...kpiInitial} />

      <main className="flex-1 grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex min-w-0 flex-col">
          <AgentTopology {...topologyInitial} />
          <HermesControlPanel dailyDigestInitial={dailyDigestInitial} />
        </div>

        <aside
          className="command-center-side-rail flex flex-col"
          aria-label="Internal command-center task rail"
        >
          <SideRailHeader />
          <MargotVoicePanel />
          <Business360Grid locale={locale} {...business360Initial} />
          <DailyCrmDigestPanel {...dailyDigestInitial} />
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

const SIDE_RAIL_TASKS = [
  'Voice command',
  'Portfolio pulse',
  'CRM digest',
  'Agent activity',
];

function formatAestDateTime(now: Date) {
  const date = new Intl.DateTimeFormat('en-AU', {
    timeZone: 'Australia/Brisbane',
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  }).format(now);
  const time = new Intl.DateTimeFormat('en-AU', {
    timeZone: 'Australia/Brisbane',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(now);

  return { date, time };
}

function SideRailHeader() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const updateClock = () => setNow(new Date());
    const initialTimer = window.setTimeout(updateClock, 0);
    const timer = window.setInterval(updateClock, 1000);
    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(timer);
    };
  }, []);

  const stamp = now ? formatAestDateTime(now) : { date: 'Loading date', time: '--:--:--' };

  return (
    <section
      className="flex flex-col gap-4 p-5"
      style={{
        background: 'linear-gradient(180deg, rgba(17,20,27,0.98), rgba(10,12,16,0.96))',
        borderBottom: '1px solid var(--cc-grid)',
      }}
      aria-label="Internal task rail overview"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p
            className="font-mono text-[10px] uppercase tracking-[0.22em]"
            style={{ color: 'var(--cc-ink-hush)' }}
          >
            Internal ops rail
          </p>
          <h2 className="mt-1 text-base font-semibold leading-tight" style={{ color: 'var(--cc-ink)' }}>
            Today&apos;s task stack
          </h2>
        </div>
        <div
          className="shrink-0 text-right font-mono uppercase tracking-[0.16em]"
          style={{ color: 'var(--cc-ink-dim)' }}
          aria-live="polite"
        >
          <div className="text-[10px]" style={{ color: 'var(--cc-ink-hush)' }}>
            {stamp.date}
          </div>
          <div
            className="mt-1 text-[12px]"
            style={{ color: 'var(--cc-ink)', fontVariantNumeric: 'tabular-nums' }}
          >
            {stamp.time} AEST
          </div>
        </div>
      </div>

      <p className="text-xs leading-5" style={{ color: 'var(--cc-ink-dim)' }}>
        The live internal lane: voice decisions, portfolio health, CRM digest, and agent activity.
      </p>

      <div className="grid grid-cols-2 gap-2" aria-label="Internal task groups">
        {SIDE_RAIL_TASKS.map((task, index) => (
          <div
            key={task}
            className="rounded-md border px-2.5 py-2 font-mono text-[9px] uppercase tracking-[0.14em]"
            style={{
              borderColor: 'var(--cc-grid)',
              background: index === 0 ? 'var(--cc-signal-hush)' : 'rgba(255,255,255,0.02)',
              color: index === 0 ? 'var(--cc-ink)' : 'var(--cc-ink-dim)',
            }}
          >
            <span style={{ color: index === 0 ? 'var(--cc-signal)' : 'var(--cc-ink-hush)' }}>
              {String(index + 1).padStart(2, '0')}
            </span>{' '}
            {task}
          </div>
        ))}
      </div>
    </section>
  );
}

