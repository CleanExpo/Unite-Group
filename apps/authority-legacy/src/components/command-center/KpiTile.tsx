'use client';

// KpiTile — a single Zone 2 metric tile.
//
// Layout: [LABEL] (small caps, hush ink, ~10px tracking)
//         [VALUE] (large mono, primary ink) — animated when number
//         [TREND] (sparkline placeholder + delta) — wired in PR-3
//
// State conveys via the border + a corner pip:
//   - running  → border-hairline, hush pip
//   - signal   → border-signal, breathing red pip (escalation)
//   - hush     → tertiary ink, no pip
//
// Anti-AI-slop: NO gradient, NO glass-morphism, NO emoji icons.
//               Single accent (Candy Red) on near-black ground.

import { AnimatedCounter } from './AnimatedCounter';

export type KpiState = 'running' | 'signal' | 'hush';

export interface KpiTileProps {
  label: string;
  value: number | string;
  suffix?: string;
  prefix?: string;
  state?: KpiState;
  delta?: string;
  /** Override the default toLocaleString formatter for the animated counter. */
  format?: (n: number) => string;
}

export function KpiTile({
  label,
  value,
  suffix,
  prefix,
  state = 'running',
  delta,
  format,
}: KpiTileProps) {
  const borderColor =
    state === 'signal' ? 'var(--cc-signal)' : 'var(--cc-grid)';
  const valueColor =
    state === 'hush' ? 'var(--cc-ink-hush)' : 'var(--cc-ink)';

  return (
    <div
      className="relative px-5 py-4 flex flex-col gap-2"
      style={{
        background: 'var(--cc-bg-soft)',
        borderLeft: `2px solid ${borderColor}`,
        minWidth: 0,
      }}
      data-cc-state={state}
    >
      {state === 'signal' && (
        <span
          aria-hidden
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: 'var(--cc-signal)',
            animation: 'cc-breathe var(--cc-pulse-duration) ease-in-out infinite',
          }}
        />
      )}

      <span
        className="font-mono text-[10px] uppercase tracking-[0.22em]"
        style={{ color: 'var(--cc-ink-hush)' }}
      >
        {label}
      </span>

      <span
        className="font-mono text-2xl leading-none"
        style={{ color: valueColor, fontVariantNumeric: 'tabular-nums' }}
      >
        {prefix && <span style={{ color: 'var(--cc-ink-hush)' }}>{prefix}</span>}
        {typeof value === 'number' ? (
          <AnimatedCounter value={value} format={format} />
        ) : (
          value
        )}
        {suffix && (
          <span
            className="text-base ml-1"
            style={{ color: 'var(--cc-ink-dim)' }}
          >
            {suffix}
          </span>
        )}
      </span>

      {delta && (
        <span
          className="font-mono text-[11px]"
          style={{
            color:
              state === 'signal'
                ? 'var(--cc-signal)'
                : 'var(--cc-ink-dim)',
          }}
        >
          {delta}
        </span>
      )}
    </div>
  );
}
