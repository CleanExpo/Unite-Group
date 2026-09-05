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
import { parseMarkdownTable, topRows } from '@/lib/command-centre/markdown'
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

export { ActionQueueTile } from './ActionQueueTileView'
