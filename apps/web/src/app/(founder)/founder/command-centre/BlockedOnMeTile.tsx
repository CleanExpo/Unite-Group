// src/app/(founder)/founder/command-centre/BlockedOnMeTile.tsx
//
// Mission Control Day 1 — "Blocked on me".
//
// Server component. Every open row of FOUNDER-QUEUE.md with its age in
// days computed on read (Brisbane calendar), oldest on top, so the founder
// sees what is waiting on him without opening a file. Read-only. If the
// ledger cannot be read or has any unreadable line, render an honest
// unavailable state — never a shorter list that looks complete.

import { loadFounderQueue, type AgedFounderQueueRow } from '@/lib/command-centre/founder-queue'

export interface BlockedOnMeData {
  source: string
  checked_at: string
  total_rows: number
  rows: AgedFounderQueueRow[]
  oldest_id: string | null
  unaged: string[]
  read_error: string | null
}

/** Server-side loader. NEVER throws; a failed read lands in read_error. */
export async function loadBlockedOnMeData(now: () => Date = () => new Date()): Promise<BlockedOnMeData> {
  try {
    const result = await loadFounderQueue(now)
    if (!result.ok) {
      return {
        source: result.source,
        checked_at: result.checkedAt,
        total_rows: 0,
        rows: [],
        oldest_id: null,
        unaged: [],
        read_error: result.error,
      }
    }
    return {
      source: result.source,
      checked_at: result.checkedAt,
      total_rows: result.rows.length + result.unaged.length,
      rows: result.rows,
      oldest_id: result.rows[0]?.id ?? null,
      unaged: result.unaged,
      read_error: null,
    }
  } catch (err: unknown) {
    return {
      source: 'FOUNDER-QUEUE.md',
      checked_at: now().toISOString(),
      total_rows: 0,
      rows: [],
      oldest_id: null,
      unaged: [],
      read_error: err instanceof Error ? err.message : String(err),
    }
  }
}

const checkedAtStyle = {
  marginLeft: 'auto',
  fontSize: '0.66rem',
  color: 'var(--tile-ink-hush, #6f879b)',
  fontFamily: 'ui-monospace, SFMono-Regular, monospace',
} as const

export function BlockedOnMeTile({ data }: { data: BlockedOnMeData }) {
  if (data.read_error) {
    return (
      <p
        data-testid="blocked-on-me-tile-error"
        style={{ color: 'var(--tile-amber-txt, #fb923c)', fontSize: '0.85rem', margin: 0 }}
      >
        Founder queue unavailable: {data.read_error}
        <span style={checkedAtStyle}> checked {data.checked_at}</span>
      </p>
    )
  }
  if (data.rows.length === 0 && data.unaged.length === 0) {
    return (
      <p
        data-testid="blocked-on-me-tile-empty"
        style={{ color: 'var(--tile-green-txt, #34d399)', fontSize: '0.85rem', margin: 0 }}
      >
        Nothing is blocked on you — the open table is well-formed and empty.
        <span style={checkedAtStyle}> checked {data.checked_at}</span>
      </p>
    )
  }

  const oldest = data.rows[0]
  return (
    <div data-testid="blocked-on-me-tile">
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', color: 'var(--tile-amber-txt, #fb923c)', fontSize: '0.72rem', marginBottom: '0.3rem' }}>
        <span data-testid="blocked-on-me-summary">
          {data.total_rows} decision{data.total_rows === 1 ? '' : 's'} waiting on you
          {oldest ? ` · oldest ${oldest.id} at ${oldest.age_days} days` : ''}
        </span>
        <span style={checkedAtStyle}>checked {data.checked_at}</span>
      </div>
      <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '0.4rem' }}>
        {data.rows.map((row) => (
          <li
            key={row.id}
            data-testid="blocked-on-me-row"
            style={{
              border: '1px solid rgba(251, 146, 60, 0.25)',
              borderLeft: '3px solid #fb923c',
              padding: '0.4rem 0.6rem',
              background: 'var(--tile-card-bg, rgba(0,0,0,0.25))',
              borderRadius: '2px',
              fontSize: '0.78rem',
            }}
          >
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'baseline' }}>
              <span style={{ color: 'var(--tile-ink-hush, #6f879b)', fontFamily: 'ui-monospace, SFMono-Regular, monospace' }}>{row.id}</span>
              <span style={{ fontWeight: 600, color: 'var(--tile-ink, #e6f7ff)' }}>{row.decision}</span>
              <span style={{ marginLeft: 'auto', fontWeight: 700, color: row.age_days >= 30 ? 'var(--tile-amber-txt, #fb923c)' : 'var(--tile-ink-dim, #9bb0c1)' }}>
                {row.age_days} day{row.age_days === 1 ? '' : 's'}
              </span>
            </div>
            <div style={{ marginTop: '0.2rem', color: 'var(--tile-ink-dim, #9bb0c1)', fontSize: '0.72rem' }}>
              Blocks: {row.blocks || '—'} · Opened {row.opened}
            </div>
          </li>
        ))}
      </ol>
      {data.unaged.length > 0 && (
        <p data-testid="blocked-on-me-unaged" style={{ color: 'var(--tile-amber-txt, #fb923c)', fontSize: '0.72rem', margin: '0.4rem 0 0' }}>
          {data.unaged.length} row{data.unaged.length === 1 ? '' : 's'} with an unreadable date, not aged: {data.unaged.join('; ')}
        </p>
      )}
    </div>
  )
}
