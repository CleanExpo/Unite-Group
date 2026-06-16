'use client';

// ActivityLog — Zone 5 of /command-center.
//
// Auto-scrolling reverse-chrono feed. Shows up to 20 rows of recent agent
// activity. PR-3 ships with a static seed; later PR binds to
// /api/pi-ceo/activity (SSE or polled) per the redesign proposal.
//
// Behaviour:
//   - Newest event at the top
//   - Sticky header with row-count + state
//   - Scrollable region with a fixed ~480px height (cap to keep the
//     viewport balanced against Zone 4 next to it)
//
// Anti-AI-slop: no typewriter animation in PR-3 (that ships when the feed
// goes live — animating a static seed would be theatre). Reverse-chrono +
// monospace + Candy-Red-only severity pips is the lane.

import { useMemo } from 'react';
import { ActivityRow } from './ActivityRow';
import { ACTIVITY_DATA, type ActivityDatum } from './activity-data';
import { SourceBadge } from '../SourceBadge';

export interface ActivityLogProps {
  /** Override the seed — useful for live wiring later. */
  events?: ActivityDatum[];
  /** Max rows to render. Defaults to 20 per spec. */
  maxRows?: number;
  /**
   * When set, the SourceBadge flips from `seed` to `live`. The server-rendered
   * Command Center page passes this after reading agent_actions.
   */
  sourceLiveAt?: string;
}

export function ActivityLog({
  events = ACTIVITY_DATA,
  maxRows = 20,
  sourceLiveAt,
}: ActivityLogProps) {
  const isLive = !!sourceLiveAt;
  const sorted = useMemo(() => {
    return [...events]
      .sort((a, b) => (a.ts < b.ts ? 1 : -1))
      .slice(0, maxRows);
  }, [events, maxRows]);

  const signalCount = sorted.filter((e) => e.severity === 'signal').length;

  return (
    <section
      className="flex flex-col"
      style={{
        background: 'var(--cc-bg-soft)',
        borderTop: '1px solid var(--cc-grid)',
      }}
      aria-label="Live activity log"
    >
      <header
        className="flex items-center justify-between px-5 h-10"
        style={{
          background: 'var(--cc-bg)',
          borderBottom: '1px solid var(--cc-grid)',
        }}
      >
        <span
          className="font-mono text-[11px] uppercase tracking-[0.22em]"
          style={{ color: 'var(--cc-ink-dim)' }}
        >
          Zone 5 · Activity Log
        </span>
        <span
          className="font-mono text-[10px] uppercase tracking-[0.18em] flex items-center gap-3"
          style={{ color: 'var(--cc-ink-hush)' }}
        >
          {signalCount > 0 && (
            <span
              aria-hidden
              style={{
                display: 'inline-block',
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: 'var(--cc-signal)',
                animation:
                  'cc-breathe var(--cc-pulse-duration) ease-in-out infinite',
              }}
            />
          )}
          <span>
            {sorted.length} events
            {signalCount > 0 ? ` · ${signalCount} signal` : ''}
          </span>
          {isLive ? (
            <SourceBadge
              mode="live"
              label="agent_actions"
              lastUpdatedAt={sourceLiveAt}
            />
          ) : (
            <SourceBadge mode="seed" label="static · awaits /api/pi-ceo/activity" />
          )}
        </span>
      </header>

      <div
        className="overflow-y-auto"
        style={{ maxHeight: '480px', minHeight: '320px' }}
        role="log"
        aria-live="polite"
        aria-relevant="additions"
      >
        {sorted.map((event) => (
          <ActivityRow key={event.id} data={event} />
        ))}
      </div>
    </section>
  );
}
