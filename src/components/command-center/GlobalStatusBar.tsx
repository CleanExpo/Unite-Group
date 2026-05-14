'use client';

// GlobalStatusBar — Zone 1 of /command-center.
//
// Layout: [Wordmark] ── [Mission Clock] ──── [Agents alive · Alerts · Build]
//
// Static-data placeholders for PR-1 foundations. PR-2 wires real counts
// from /api/pi-ceo/health + /api/empire/senior-agents. Per the
// [[command-center-redesign-proposal-2026-05-14]] data-binding list.

import { MissionClock } from './MissionClock';

export interface GlobalStatusBarProps {
  agentsAlive?: number;
  alerts?: number;
  buildSha?: string;
}

export function GlobalStatusBar({
  agentsAlive = 12,
  alerts = 0,
  buildSha = 'main',
}: GlobalStatusBarProps) {
  return (
    <header
      className="flex items-center justify-between px-6 h-12"
      style={{
        background: 'var(--cc-bg)',
        borderBottom: '1px solid var(--cc-grid)',
      }}
      role="banner"
    >
      <div className="flex items-center gap-6">
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
        className="flex items-center gap-5 font-mono text-[11px] uppercase tracking-[0.18em]"
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
