'use client';

// ActivityRow — single Zone 5 log row.
//
// Layout (single line, monospace, tight):
//   [ts]  [AGENT]    [verb hush]   [target ink]      [severity pip]
//   18:42  MARGOT    synthesised   pricing memo       ●
//
// Severity vocabulary matches KpiTile / BusinessTile:
//   running → ink, no pip
//   signal  → candy-red pip + ink, no glow on row (row glow is too noisy at
//             20-row density — keep the signal-paint reserved for the pip)
//   hush    → ink-hush row, no pip

import type { ActivityDatum } from './activity-data';

export interface ActivityRowProps {
  data: ActivityDatum;
}

const TIME_FMT = new Intl.DateTimeFormat('en-AU', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'Australia/Brisbane',
});

export function ActivityRow({ data }: ActivityRowProps) {
  const isSignal = data.severity === 'signal';
  const isHush = data.severity === 'hush';

  const tsLabel = (() => {
    try {
      return TIME_FMT.format(new Date(data.ts));
    } catch {
      return '--:--';
    }
  })();

  const rowStyle: React.CSSProperties = {
    gridTemplateColumns: '3.25rem minmax(4.5rem, 0.9fr) minmax(4.75rem, 0.85fr) minmax(7rem, 1.7fr) 0.75rem',
    background: 'transparent',
    borderBottom: '1px solid var(--cc-grid)',
    color: isHush ? 'var(--cc-ink-hush)' : 'var(--cc-ink)',
  };

  const body = (
    <>
      <span
        style={{
          color: 'var(--cc-ink-dim)',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {tsLabel}
      </span>
      <span
        className="uppercase tracking-[0.14em] truncate"
        style={{ color: isHush ? 'var(--cc-ink-hush)' : 'var(--cc-ink)' }}
      >
        {data.agent}
      </span>
      <span
        className="truncate"
        style={{ color: 'var(--cc-ink-dim)' }}
      >
        {data.verb}
      </span>
      <span className="truncate">{data.target}</span>
      <span
        aria-hidden
        style={{
          display: 'inline-block',
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: isSignal ? 'var(--cc-signal)' : 'transparent',
          animation: isSignal
            ? 'cc-breathe var(--cc-pulse-duration) ease-in-out infinite'
            : 'none',
        }}
      />
    </>
  );

  if (data.url) {
    return (
      <a
        href={data.url}
        target="_blank"
        rel="noopener noreferrer"
        className="grid items-center gap-2 px-3 py-1.5 font-mono text-[11px] sm:gap-3 sm:px-4"
        style={{ ...rowStyle, textDecoration: 'none' }}
        data-cc-severity={data.severity}
        data-testid={`activity-row-link-${data.id}`}
        aria-label={`${tsLabel} ${data.agent} ${data.verb} ${data.target}`}
      >
        {body}
      </a>
    );
  }

  return (
    <div
      className="grid items-center gap-2 px-3 py-1.5 font-mono text-[11px] sm:gap-3 sm:px-4"
      style={rowStyle}
      data-cc-severity={data.severity}
      aria-label={`${tsLabel} ${data.agent} ${data.verb} ${data.target}`}
    >
      {body}
    </div>
  );
}
