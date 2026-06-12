'use client';

// GlobalStatusBar — Zone 1 of /command-center.
//
// Layout: [Wordmark] ── [Mission Clock] ──── [Agents alive · Alerts · Build]
//
// Static-data placeholders for PR-1 foundations. PR-2 wires real counts
// from /api/pi-ceo/health + /api/empire/senior-agents. Per the
// [[command-center-redesign-proposal-2026-05-14]] data-binding list.

import Link from 'next/link';
import { MissionClock } from './MissionClock';
import { SourceBadge } from './SourceBadge';

export type DataRoomHealthState = 'ok' | 'stale' | 'missing';

export interface GlobalStatusBarProps {
  agentsAlive?: number;
  alerts?: number;
  buildSha?: string;
  /**
   * When set, the SourceBadge flips from `seed` to `live`. The server-rendered
   * Command Center page passes this after reading agent_actions.
   */
  sourceLiveAt?: string;
  /**
   * Condensed DataRoom freshness signal. When set, a "Data room" pip joins
   * the status strip; signal state escalates the alerts pulse without forcing
   * the founder to open /empire/data-room.
   */
  dataRoomHealth?: DataRoomHealthState;
}

interface GlobalStatusBarInternalProps extends GlobalStatusBarProps {
  /**
   * Active route locale. The shell injects this so the DataRoom pip points
   * at `/<locale>/empire/data-room` instead of hard-stamped `/en/`. Falls
   * back to 'en' so isolated unit tests can render without props.
   */
  locale?: string;
}

export function GlobalStatusBar({
  locale = 'en',
  agentsAlive = 12,
  alerts = 0,
  buildSha = 'main',
  sourceLiveAt,
  dataRoomHealth,
}: GlobalStatusBarInternalProps) {
  const isLive = !!sourceLiveAt;
  return (
    <header
      className="flex min-h-12 flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-0"
      style={{
        background: 'var(--cc-bg)',
        borderBottom: '1px solid var(--cc-grid)',
      }}
      role="banner"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-6">
        <span
          className="font-mono text-[11px] uppercase tracking-[0.22em]"
          style={{ color: 'var(--cc-ink)' }}
        >
          UNITE-GROUP <span style={{ color: 'var(--cc-ink-hush)' }}>/</span>{' '}
          <span style={{ color: 'var(--cc-signal)' }}>COMMAND CENTER</span>
        </span>
        <MissionClock />
      </div>

      <div
        className="flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-[11px] uppercase tracking-[0.18em]"
        style={{ color: 'var(--cc-ink-dim)' }}
      >
        <StatusPip
          label="Agents"
          value={`${agentsAlive} alive`}
          state={agentsAlive > 0 ? 'running' : 'hush'}
        />
        <StatusPip
          label="Alerts"
          value={String(alerts)}
          state={alerts > 0 ? 'signal' : 'hush'}
        />
        <StatusPip label="Build" value={buildSha.slice(0, 7)} state="hush" />
        {dataRoomHealth && (
          <Link
            href={`/${locale}/empire/data-room`}
            style={{ textDecoration: 'none' }}
            aria-label={`Data room: ${dataRoomHealth}. Open admin page.`}
            data-data-room-pip-link
          >
            <StatusPip
              label="Data room"
              value={dataRoomHealth}
              state={
                dataRoomHealth === 'missing'
                  ? 'signal'
                  : dataRoomHealth === 'stale'
                    ? 'signal'
                    : 'running'
              }
            />
          </Link>
        )}
        {isLive ? (
          <SourceBadge
            mode="live"
            label="agent_actions · last 24h"
            lastUpdatedAt={sourceLiveAt}
          />
        ) : (
          <SourceBadge mode="seed" label="static · PR-1 placeholders" />
        )}
      </div>
    </header>
  );
}

type PipState = 'running' | 'signal' | 'hush';

function StatusPip({
  label,
  value,
  state,
}: {
  label: string;
  value: string;
  state: PipState;
}) {
  const dotColor =
    state === 'signal' ? 'var(--cc-signal)' : state === 'running' ? 'var(--cc-ink)' : 'var(--cc-ink-hush)';
  const animation =
    state === 'signal' || state === 'running'
      ? 'cc-breathe var(--cc-pulse-duration) ease-in-out infinite'
      : 'none';

  return (
    <span className="flex items-center gap-2" aria-label={`${label}: ${value}`}>
      <span
        aria-hidden
        style={{
          display: 'inline-block',
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          background: dotColor,
          animation,
        }}
      />
      <span style={{ color: 'var(--cc-ink-hush)' }}>{label}</span>
      <span style={{ color: 'var(--cc-ink)' }}>{value}</span>
    </span>
  );
}
