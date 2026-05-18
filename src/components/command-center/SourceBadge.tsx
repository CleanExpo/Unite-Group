// SourceBadge — universal data-source metadata pip for Command Center panels.
//
// Per UNI-2024 the audit found the cockpit credibility breaks because panel
// tiles don't tell the operator whether the value they're looking at is
// fresh from a system of record, a static seed, mid-fetch, or a stale fall-
// back. This badge is the single rendering primitive every panel embeds —
// matched by a SourceMode union so panels can't invent rogue values.
//
// Sources of truth, by mode:
//   - 'live'      — values come from an API request that succeeded in this
//                   session. Show the source label + a relative timestamp.
//   - 'seed'      — values come from a hand-curated TS seed in this repo
//                   ([[command-center-redesign-proposal-2026-05-14]] PR-1/2/3).
//                   Operators should treat numbers as illustrative only.
//   - 'loading'   — request in flight; no value to trust yet.
//   - 'degraded'  — request attempted, fetch failed (or non-2xx); we are
//                   rendering a fallback seed. Operators are warned.

export type SourceMode = 'live' | 'seed' | 'loading' | 'degraded';

export interface SourceBadgeProps {
  /** Classification of the underlying data. */
  mode: SourceMode;
  /** Short human label, e.g. "CRM · 7 tasks" or "seed v1". */
  label: string;
  /** ISO timestamp of the last data refresh. Only rendered for 'live'. */
  lastUpdatedAt?: string;
}

const MODE_LABEL: Record<SourceMode, string> = {
  live: 'live',
  seed: 'seed',
  loading: 'loading',
  degraded: 'degraded',
};

function colorFor(mode: SourceMode): string {
  if (mode === 'live') return 'var(--cc-ink)';
  if (mode === 'degraded') return 'var(--cc-signal)';
  return 'var(--cc-ink-hush)';
}

function formatTimestamp(iso: string): string | null {
  const parsed = Date.parse(iso);
  if (Number.isNaN(parsed)) return null;
  const now = Date.now();
  const deltaSec = Math.max(0, Math.round((now - parsed) / 1000));
  if (deltaSec < 60) return `${deltaSec}s ago`;
  if (deltaSec < 3600) return `${Math.round(deltaSec / 60)}m ago`;
  if (deltaSec < 86400) return `${Math.round(deltaSec / 3600)}h ago`;
  return `${Math.round(deltaSec / 86400)}d ago`;
}

export function SourceBadge({
  mode,
  label,
  lastUpdatedAt,
}: SourceBadgeProps) {
  const color = colorFor(mode);
  const stamp = mode === 'live' && lastUpdatedAt ? formatTimestamp(lastUpdatedAt) : null;
  return (
    <span
      data-source-mode={mode}
      className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em]"
      style={{ color: 'var(--cc-ink-hush)' }}
      aria-label={`Source: ${MODE_LABEL[mode]}. ${label}${stamp ? `. Updated ${stamp}.` : ''}`}
    >
      <span
        aria-hidden
        style={{
          display: 'inline-block',
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: color,
        }}
      />
      <span style={{ color }}>{MODE_LABEL[mode]}</span>
      <span>·</span>
      <span style={{ color: 'var(--cc-ink-dim)' }}>{label}</span>
      {stamp && (
        <>
          <span>·</span>
          <span style={{ color: 'var(--cc-ink-hush)' }}>{stamp}</span>
        </>
      )}
    </span>
  );
}
