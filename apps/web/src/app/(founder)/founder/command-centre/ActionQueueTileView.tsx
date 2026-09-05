import type { ActionQueueTileData } from './ActionQueueTile'
import { findColumnIndex } from '@/lib/command-centre/markdown'

export function ActionQueueTile({ data }: { data: ActionQueueTileData }) {
  if (data.read_error) {
    const localOnly = /ENOENT|no such file/i.test(data.read_error)
    return (
      <p
        data-testid="action-queue-tile-error"
        style={{ color: localOnly ? 'var(--color-text-muted)' : 'var(--tile-amber-txt, #fb923c)', fontSize: '0.85rem', margin: 0 }}
      >
        {localOnly
          ? "Linear not connected (LINEAR_API_KEY not set) — and the local 2nd-brain vault fallback isn't available in this environment."
          : `Could not read action queue: ${data.read_error}`}
      </p>
    )
  }
  if (data.rows.length === 0) {
    return (
      <p
        data-testid="action-queue-tile-empty"
        style={{ color: 'var(--tile-ink-dim, #9bb0c1)', fontSize: '0.85rem', margin: 0 }}
      >
        No actions queued at <code>{data.queue_path}</code>
      </p>
    )
  }

  // Pick the columns we want to surface. The real file has 8 columns;
  // we collapse to the 4 most useful: # / Action / Owner / Stop gate.
  const idxNum = findColumnIndex(data.headers, '#')
  const idxAction = findColumnIndex(data.headers, 'action')
  const idxOwner = findColumnIndex(data.headers, 'owner')
  const idxStop = findColumnIndex(data.headers, 'stop')
  // Linear-sourced headers (UNI-2340 review fix): Priority is the point of the
  // re-source — render it (and Updated) when present; file-fallback lacks them.
  const idxPriority = findColumnIndex(data.headers, 'priority')
  const idxUpdated = findColumnIndex(data.headers, 'updated')
  const cols = [idxNum, idxAction, idxOwner, idxStop, idxPriority, idxUpdated].filter((i) => i >= 0)
  const colHeaders = cols.map((i) => data.headers[i]!)
  const colRows = data.rows.map((r) => cols.map((i) => r[i] ?? ''))

  return (
    <div data-testid="action-queue-tile">
      <div
        style={{
          color: 'var(--tile-ink-hush, #6f879b)',
          fontSize: '0.72rem',
          marginBottom: '0.3rem',
        }}
      >
        {data.shown_rows} of {data.total_rows} actions
      </div>
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: '0.78rem',
        }}
      >
        <thead>
          <tr style={{ color: 'var(--tile-ink-hush, #6f879b)', textAlign: 'left' }}>
            {colHeaders.map((h, i) => (
              <th key={i} style={{ padding: '0.2rem 0.4rem', fontWeight: 500 }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {colRows.map((r, i) => (
            <tr key={i}>
              {r.map((c, j) => (
                <td
                  key={j}
                  style={{
                    padding: '0.2rem 0.4rem',
                    color: j === 1 ? 'var(--tile-ink, #e6f7ff)' : 'var(--tile-ink-dim, #9bb0c1)',
                  }}
                >
                  {c || '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
