'use client';

// KpiStrip — Zone 2 of /command-center.
//
// Five tiles across, equal-width on desktop, two-up on narrower viewports.
// PR-1 ships with placeholder values; PR-2 binds to /api/empire/* +
// /api/pi-ceo/health per [[command-center-redesign-proposal-2026-05-14]].

import { KpiTile } from './KpiTile';
import { SourceBadge } from './SourceBadge';

export interface KpiStripProps {
  /** Total ARR across portfolio, in AUD cents. */
  arrCents?: number;
  /** Open pipeline ARR, in AUD cents. */
  pipelineCents?: number;
  /** Today's LLM-spend dollars (post-cost-strategy migration this should hover near $0). */
  costUsdToday?: number;
  /** Count of mandates currently `blocked-on-you` for Phill. */
  blockedMandates?: number;
  /** CCW client SLA state — 'green' | 'amber' | 'red'. */
  ccwSla?: 'green' | 'amber' | 'red';
  /**
   * When set, the SourceBadge flips from `seed` to `live`. The server-rendered
   * Command Center page passes this after reading the businesses table.
   */
  arrSourceLiveAt?: string;
  /** Count of portfolio businesses with overall_health < 60. Live when set. */
  atRiskCount?: number;
}

const toAud = (cents: number) =>
  `${(cents / 100).toLocaleString('en-AU', {
    maximumFractionDigits: 0,
  })}`;

const toUsd = (n: number) =>
  n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function KpiStrip({
  arrCents = 0,
  pipelineCents = 25_000_000,
  costUsdToday = 0.05,
  blockedMandates = 0,
  ccwSla = 'green',
  arrSourceLiveAt,
  atRiskCount,
}: KpiStripProps) {
  const slaLabel = ccwSla === 'green' ? 'GREEN' : ccwSla === 'amber' ? 'AMBER' : 'RED';
  const slaState: 'running' | 'signal' = ccwSla === 'red' ? 'signal' : 'running';
  const mandatesState: 'running' | 'signal' = blockedMandates > 0 ? 'signal' : 'running';
  const arrIsLive = !!arrSourceLiveAt;

  return (
    <section
      className="flex flex-col"
      style={{
        background: 'var(--cc-bg)',
        borderBottom: '1px solid var(--cc-grid)',
      }}
      aria-label="Top-line operating metrics"
    >
      <div
        className="flex items-center justify-between px-5 py-2"
        style={{ borderBottom: '1px solid var(--cc-grid)' }}
      >
        <span
          className="font-mono text-[10px] uppercase tracking-[0.22em]"
          style={{ color: 'var(--cc-ink-dim)' }}
        >
          Zone 2 · KPI Strip
        </span>
        {arrIsLive ? (
          <SourceBadge
            mode="live"
            label={
              typeof atRiskCount === 'number'
                ? `businesses · ${atRiskCount} at risk`
                : 'businesses'
            }
            lastUpdatedAt={arrSourceLiveAt}
          />
        ) : (
          <SourceBadge mode="seed" label="static · awaits /api/empire/* + /api/pi-ceo/health" />
        )}
      </div>
      <div
        className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5"
        style={{ gap: '1px', background: 'var(--cc-grid)' }}
      >
      <KpiTile
        label="ARR"
        prefix="$"
        value={arrCents / 100}
        format={(n) => toAud(n * 100)}
        delta={
          arrIsLive
            ? typeof atRiskCount === 'number' && atRiskCount > 0
              ? `live · ${atRiskCount} at risk`
              : 'live · portfolio total'
            : 'open · no paying client yet'
        }
        state={arrCents > 0 ? 'running' : 'hush'}
      />
      <KpiTile
        label="Pipeline"
        prefix="$"
        value={pipelineCents / 100}
        format={(n) => toAud(n * 100)}
        delta="Duncan (deposit pending) · CCW · Ivi"
      />
      <KpiTile
        label="Cost / day (USD)"
        prefix="$"
        value={costUsdToday}
        format={toUsd}
        delta="Max-first cascade · 85% on Ollama"
        state="running"
      />
      <KpiTile
        label="Blocked on you"
        value={blockedMandates}
        delta={
          blockedMandates > 0
            ? 'review the mandates panel'
            : 'queue clear'
        }
        state={mandatesState}
      />
      <KpiTile
        label="CCW SLA"
        value={slaLabel}
        delta="Toby on holidays · resume 26 May"
        state={slaState}
      />
      </div>
    </section>
  );
}
