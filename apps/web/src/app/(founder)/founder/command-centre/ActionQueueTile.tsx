// src/app/(founder)/founder/command-centre/ActionQueueTile.tsx
//
// Lane 16 — CRM Command-Centre tile: Action Queue.
//
// Server component. UNI-2340 slice 4: the top 5 rows now come from Linear
// (top open issues assigned to the founder, by priority) — the local
// SENIOR_PM_NEXT_ACTION_QUEUE.md fossil from a retired supervisor is a
// dev-only fallback for when LINEAR_API_KEY isn't configured.
//
// Read-only. If Linear isn't configured AND the local file is missing,
// render a clear "Linear not connected" state — never fabricate data.

import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { parseMarkdownTable, findColumnIndex, topRows } from '@/lib/command-centre/markdown'
import { fetchActionQueue, mapActionQueueToRows } from '@/lib/command-centre/founder-workboard'

function defaultPath(): string {
  const home = process.env.HOME || process.env.USERPROFILE || ''
  return path.join(home, '2nd-brain', '.agentic_nexus', 'SENIOR_PM_NEXT_ACTION_QUEUE.md')
}

export interface ActionQueueTileData {
  queue_path: string
  scanned_at: string
  total_rows: number
  shown_rows: number
  rows: string[][]
  headers: string[]
  read_error: string | null
}

/**
 * Server-side loader. NEVER throws; returns a structured result with
 * read_error populated. Cloud-first: Linear (works on Vercel); the local
 * 2nd-brain file is the dev fallback used ONLY when LINEAR_API_KEY isn't
 * configured (mirrors the dashboard-health cloud-first predicate in
 * page.tsx). A configured-but-failing Linear call surfaces its own honest
 * error rather than silently falling back to a stale local file.
 */
export async function loadActionQueueData(
  queuePath: string = defaultPath(),
  n: number = 5,
  now: () => Date = () => new Date(),
): Promise<ActionQueueTileData> {
  const linear = await fetchActionQueue()
  if (linear.ok === 'not_configured') {
    return loadActionQueueDataFromFile(queuePath, n, now)
  }
  if (!linear.ok) {
    return {
      queue_path: 'linear:viewer.assignedIssues',
      scanned_at: now().toISOString(),
      total_rows: 0,
      shown_rows: 0,
      rows: [],
      headers: [],
      read_error: `Linear: ${linear.error}`,
    }
  }
  const { headers, rows } = mapActionQueueToRows(linear.issues)
  return {
    queue_path: 'Linear — issues assigned to founder',
    scanned_at: now().toISOString(),
    total_rows: linear.issues.length,
    shown_rows: rows.length,
    rows,
    headers,
    read_error: null,
  }
}

/** Dev-only fallback: the legacy local markdown-file reader. */
async function loadActionQueueDataFromFile(
  queuePath: string,
  n: number,
  now: () => Date,
): Promise<ActionQueueTileData> {
  try {
    const raw = await readFile(queuePath, 'utf-8')
    const t = parseMarkdownTable(raw)
    if (!t) {
      return {
        queue_path: queuePath,
        scanned_at: now().toISOString(),
        total_rows: 0,
        shown_rows: 0,
        rows: [],
        headers: [],
        read_error: 'No parseable markdown table found in the file',
      }
    }
    const rows = topRows(t, n)
    return {
      queue_path: queuePath,
      scanned_at: now().toISOString(),
      total_rows: t.rows.length,
      shown_rows: rows.length,
      rows,
      headers: t.headers,
      read_error: null,
    }
  } catch (err: unknown) {
    const reason = err instanceof Error ? err.message : String(err)
    return {
      queue_path: queuePath,
      scanned_at: now().toISOString(),
      total_rows: 0,
      shown_rows: 0,
      rows: [],
      headers: [],
      read_error: reason,
    }
  }
}

export function ActionQueueTile({ data }: { data: ActionQueueTileData }) {
  if (data.read_error) {
    const localOnly = /ENOENT|no such file/i.test(data.read_error)
    return (
      <p
        data-testid="action-queue-tile-error"
        style={{ color: localOnly ? 'var(--color-text-muted)' : '#fb923c', fontSize: '0.85rem', margin: 0 }}
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
        style={{ color: '#9bb0c1', fontSize: '0.85rem', margin: 0 }}
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
  const cols = [idxNum, idxAction, idxOwner, idxStop].filter((i) => i >= 0)
  const colHeaders = cols.map((i) => data.headers[i]!)
  const colRows = data.rows.map((r) => cols.map((i) => r[i] ?? ''))

  return (
    <div data-testid="action-queue-tile">
      <div
        style={{
          color: '#6f879b',
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
          <tr style={{ color: '#6f879b', textAlign: 'left' }}>
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
                    color: j === 1 ? '#e6f7ff' : '#9bb0c1',
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
