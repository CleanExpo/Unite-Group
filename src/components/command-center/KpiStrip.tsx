'use client';

// KpiStrip — Zone 2 of /command-center.
//
// Five tiles across, equal-width on desktop, two-up on narrower viewports.
// PR-1 ships with placeholder values; PR-2 binds to /api/empire/* +
// /api/pi-ceo/health per [[command-center-redesign-proposal-2026-05-14]].

import { KpiTile } from './KpiTile';

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
}: KpiStripProps) {
  const slaLabel = ccwSla === 'green' ? 'GREEN' : ccwSla === 'amber' ? 'AMBER' : 'RED';
  const slaState: 'running' | 'signal' = ccwSla === 'red' ? 'signal' : 'running';
  const mandatesState: 'running' | 'signal' = blockedMandates > 0 ? 'signal' : 'running';

  return (
    <section
      className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5"
      style={{
        background: 'var(--cc-bg)',
        borderBottom: '1px solid var(--cc-grid)',
        gap: '1px',
      }}
      aria-label="Top-line operating metrics"
    >
      <KpiTile
        label="ARR"
        prefix="$"
        value={arrCents / 100}
        format={(n) => toAud(n * 100)}
        delta="open · no paying client yet"
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
    </section>
  );
}
