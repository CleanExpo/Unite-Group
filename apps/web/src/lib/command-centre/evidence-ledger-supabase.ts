// src/lib/command-centre/evidence-ledger-supabase.ts
//
// UNI-2227 / UNI-2340 — cloud read path for the founder Live Evidence Stream
// tile.
//
// The local-filesystem reader (evidence-stream.ts) tails
// `~/2nd-brain/.agentic_nexus/evidence/evidence_ledger.jsonl` — permanently
// empty on Vercel serverless. This module reads the same recent-evidence
// shape from the Supabase `evidence_ledger` table (one row per event,
// inserted by the vault writer via service_role — see
// src/lib/obsidian/evidence.ts) and maps it into the tile's existing
// EvidenceStreamResult contract, so the tile renders identically whichever
// substrate fed it.
//
// Honesty rules (NorthStar): a query failure returns `ok:false` with the
// reason — the caller decides whether to fall back to the local tail. This
// module never fabricates entries on failure.

import { createClient } from '@/lib/supabase/server'
import type { EvidenceEntry, EvidenceStreamResult } from './evidence-stream'

/** Cap on rows read from the cloud ledger, newest first. */
const DEFAULT_CAP = 50

export interface EvidenceLedgerRow {
  id: string
  kind: string
  summary: string
  detail: Record<string, unknown> | null
  evidence_path: string | null
  created_at: string | null
}

/** Pull the first non-null string value from a record at any of the given keys. */
function pickString(rec: Record<string, unknown> | null, keys: string[]): string | null {
  if (!rec) return null
  for (const k of keys) {
    const v = rec[k]
    if (typeof v === 'string' && v.length > 0) return v
  }
  return null
}

/** Pull the first non-null object value from a record at any of the given keys. */
function pickObject(rec: Record<string, unknown> | null, keys: string[]): Record<string, unknown> | null {
  if (!rec) return null
  for (const k of keys) {
    const v = rec[k]
    if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
      return v as Record<string, unknown>
    }
  }
  return null
}

/**
 * Pure mapper: evidence_ledger rows → the tile's EvidenceStreamResult
 * contract. Expects `rows` already newest-first (the query orders by
 * created_at desc); caps to `cap` entries. `droppedCount` (rows the loader
 * filtered out as malformed) is surfaced via `malformed_lines` so a cloud
 * read never silently hides bad rows.
 */
export function summariseEvidenceLedgerRows(
  rows: EvidenceLedgerRow[],
  now: () => Date = () => new Date(),
  cap: number = DEFAULT_CAP,
  droppedCount = 0,
): EvidenceStreamResult {
  const capped = rows.slice(0, cap)
  const entries: EvidenceEntry[] = capped.map((row, idx) => {
    const detail = row.detail ?? {}
    return {
      // Newest gets the highest number — mirrors the tail-file convention
      // where more recent lines have a higher line number.
      line_index: capped.length - idx,
      raw: `supabase://evidence_ledger/${row.id}`,
      parsed: { id: row.id, kind: row.kind, summary: row.summary, evidence_path: row.evidence_path, ...detail },
      parse_error: null,
      timestamp: row.created_at,
      event: row.summary,
      event_type: row.kind,
      repo: pickString(detail, ['repo']),
      head_ref: pickString(detail, ['head_ref']),
      head_sha: pickString(detail, ['head_sha']),
      pr_url: pickString(detail, ['pr_url']),
      merge_commit: pickString(detail, ['merge_commit']),
      safety: pickObject(detail, ['safety']),
    }
  })

  return {
    ledger_path: 'supabase://evidence_ledger',
    scanned_at: now().toISOString(),
    total_lines: capped.length + droppedCount,
    parsed_lines: entries.length,
    malformed_lines: droppedCount,
    entries,
  }
}

interface EvidenceLedgerQueryClient {
  from(table: string): {
    select(cols: string): {
      order(col: string, opts: { ascending: boolean }): {
        limit(n: number): Promise<{ data: unknown; error: { message: string } | null }>
      }
    }
  }
}

export type EvidenceLedgerLoad =
  | { ok: true; result: EvidenceStreamResult }
  | { ok: false; reason: string }

function isEvidenceLedgerRow(r: unknown): r is EvidenceLedgerRow {
  if (!r || typeof r !== 'object') return false
  const row = r as Record<string, unknown>
  return typeof row.id === 'string' && typeof row.kind === 'string' && typeof row.summary === 'string'
}

/**
 * Load the cloud Evidence Stream, newest first, capped at 50 rows.
 * `ok:false` (table missing, RLS, network) lets the caller fall back to the
 * local-ledger tail honestly — this function never fabricates an
 * empty-but-healthy result on failure.
 */
export async function loadEvidenceLedgerFromSupabase(
  client?: EvidenceLedgerQueryClient,
  now: () => Date = () => new Date(),
): Promise<EvidenceLedgerLoad> {
  try {
    // Structural cast per the approvals.ts pattern — evidence_ledger is not
    // in the generated Database types yet; the interface pins exactly what
    // we use.
    const db = client ?? ((await createClient()) as unknown as EvidenceLedgerQueryClient)
    const { data, error } = await db
      .from('evidence_ledger')
      .select('id,kind,summary,detail,evidence_path,created_at')
      .order('created_at', { ascending: false })
      .limit(DEFAULT_CAP)
    if (error) return { ok: false, reason: error.message }
    if (!Array.isArray(data)) return { ok: false, reason: 'non-array response' }
    const rows = data.filter(isEvidenceLedgerRow)
    const droppedCount = data.length - rows.length
    return { ok: true, result: summariseEvidenceLedgerRows(rows, now, DEFAULT_CAP, droppedCount) }
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : 'query failed' }
  }
}
