'use client';

// MissionClock — Zone 1 component for /command-center.
// Renders live UTC + AEST in monospace, with a tick indicator that pulses
// each second. The pulse is the only "alive" cue in the shell — proves
// the surface is wired to a real clock, not a static screenshot.

import { useEffect, useState } from 'react';

function format(ts: Date, tz: 'UTC' | 'AEST'): string {
  // AEST is UTC+10 always (no DST in QLD/NSW within Brisbane offset window).
  const date = tz === 'UTC' ? ts : new Date(ts.getTime() + 10 * 60 * 60 * 1000);
  const hh = String(date.getUTCHours()).padStart(2, '0');
  const mm = String(date.getUTCMinutes()).padStart(2, '0');
  const ss = String(date.getUTCSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

export function MissionClock() {
  const [now, setNow] = useState<Date | null>(null);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- initial clock sync + interval timer for external time source
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // SSR pass renders a fixed placeholder so hydration doesn't mismatch.
  if (!now) {
    return (
      <div
        className="flex items-baseline gap-3 font-mono text-[11px] uppercase tracking-[0.18em]"
        style={{ color: 'var(--cc-ink-dim)' }}
      >
        <span style={{ color: 'var(--cc-ink-hush)' }}>UTC</span>
        <span style={{ color: 'var(--cc-ink)', minWidth: '6ch' }}>—:—:—</span>
        <span style={{ color: 'var(--cc-ink-hush)' }}>AEST</span>
        <span style={{ color: 'var(--cc-ink)', minWidth: '6ch' }}>—:—:—</span>
      </div>
    );
  }

  return (
    <div
      className="flex items-baseline gap-3 font-mono text-[11px] uppercase tracking-[0.18em]"
      style={{ color: 'var(--cc-ink-dim)' }}
    >
      <span style={{ color: 'var(--cc-ink-hush)' }}>UTC</span>
      <span
        style={{
          color: 'var(--cc-ink)',
          fontVariantNumeric: 'tabular-nums',
          minWidth: '6ch',
        }}
      >
        {format(now, 'UTC')}
      </span>
      <span
        aria-hidden
        style={{
          display: 'inline-block',
          width: '4px',
          height: '4px',
          borderRadius: '50%',
          background: 'var(--cc-signal)',
          animation: 'cc-breathe var(--cc-pulse-duration) ease-in-out infinite',
        }}
      />
      <span style={{ color: 'var(--cc-ink-hush)' }}>AEST</span>
      <span
        style={{
          color: 'var(--cc-ink)',
          fontVariantNumeric: 'tabular-nums',
          minWidth: '6ch',
        }}
      >
        {format(now, 'AEST')}
      </span>
    </div>
  );
}
