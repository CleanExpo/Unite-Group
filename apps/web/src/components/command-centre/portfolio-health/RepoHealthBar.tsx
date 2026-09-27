// src/components/command-centre/portfolio-health/RepoHealthBar.tsx
//
// Per-repo stacked bar for the Portfolio Health tile (UNI-2772).
// Pure function + styled spans: no hooks, no chart library, server-safe.
//
// Honest source: the payload carries ONE count per repo — `failCountLast10`,
// the failed runs among the latest 10 (lib/command-centre/portfolio-health.ts).
// The rest of the window is "not failed" (success, cancelled, skipped, in
// flight), never labelled "passing". A repo whose read failed, or that has no
// runs, gets no bar at all: its zero-filled count is not a real zero.

export const RUN_WINDOW = 10

export type RepoRunCounts = {
  failCountLast10: number
  latestRunAt: string | null
  error?: string
}

export type SegmentKey = 'failed' | 'notFailed'

export type RunSegment = { key: SegmentKey; count: number; pct: number }

const LABEL: Record<SegmentKey, string> = { failed: 'Failed', notFailed: 'Not failed' }

const FILL: Record<SegmentKey, string> = {
  failed: 'var(--deck-abort, #e5484d)',
  notFailed: 'var(--deck-line, #2e3542)',
}

function round(n: number): number {
  return Math.round(n * 100) / 100
}

export function computeRunSegments(
  health: RepoRunCounts,
  total: number = RUN_WINDOW,
): { segments: RunSegment[]; total: number } | null {
  if (health.error || health.latestRunAt == null) return null
  const failed = health.failCountLast10
  if (!Number.isInteger(failed) || failed < 0 || failed > total || total <= 0) return null

  const counts: Array<[SegmentKey, number]> = [
    ['failed', failed],
    ['notFailed', total - failed],
  ]
  const present = counts.filter(([, count]) => count > 0)
  let used = 0
  const segments = present.map(([key, count], i) => {
    // The last segment takes the remainder so the widths always sum to 100%.
    const pct = i === present.length - 1 ? round(100 - used) : round((count / total) * 100)
    used += pct
    return { key, count, pct }
  })
  return { segments, total }
}

export function RepoHealthBar({ repo, health }: { repo: string; health: RepoRunCounts }) {
  const g = computeRunSegments(health)
  if (!g) return null
  const failed = g.segments.find((s) => s.key === 'failed')?.count ?? 0
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span
        data-testid={`portfolio-bar-${repo}`}
        role="img"
        aria-label={`${failed} of the last ${g.total} runs failed`}
        style={{ display: 'flex', width: 72, height: 6, borderRadius: 3, overflow: 'hidden', gap: 1 }}
      >
        {g.segments.map((s) => (
          <span
            key={s.key}
            data-testid={`portfolio-bar-${repo}-${s.key}`}
            style={{ display: 'block', width: `${s.pct}%`, height: '100%', background: FILL[s.key] }}
          />
        ))}
      </span>
      <span
        data-testid={`portfolio-bar-${repo}-total`}
        style={{ color: 'var(--deck-muted)', fontVariantNumeric: 'tabular-nums', minWidth: 14, textAlign: 'right' }}
      >
        {g.total}
      </span>
    </span>
  )
}

export function RepoHealthLegend() {
  return (
    <div
      data-testid="portfolio-bar-legend"
      style={{ display: 'flex', gap: 12, color: 'var(--deck-muted)', fontSize: 11 }}
    >
      {(Object.keys(LABEL) as SegmentKey[]).map((key) => (
        <span key={key} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span aria-hidden style={{ display: 'inline-block', width: 8, height: 6, borderRadius: 2, background: FILL[key] }} />
          {LABEL[key]}
        </span>
      ))}
      <span>· last {RUN_WINDOW} runs</span>
    </div>
  )
}
