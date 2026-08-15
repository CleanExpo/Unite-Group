// src/lib/command-centre/registry-sync.ts
//
// The reader and writer for the capability registry tables (`cc_agents`,
// `cc_tools`, created in 20260604010000_cc_command_centre_phase2.sql).
//
// Before this module the two tables had no application code touching them at
// all — only the migration that created them. EPIC-000 Stage 3 requires an
// agent to search the registry before building something new; an empty registry
// answers "nothing found" for every candidate, so the reuse-first rule inverted
// into build-new while the ceremony still looked correct (ARR-001 §3.1).
//
// The rows come from `capabilities.ts`, which reads the build-time manifest of
// what already exists on disk. Nothing here executes a tool or an agent — it
// records that they exist.
//
// Every row is founder-scoped. RLS on both tables is `founder_id = auth.uid()`
// and FORCEd, so a caller can only ever write its own rows; the explicit
// `founder_id` on each row is the application-side half of that defence.

import { createClient } from '@/lib/supabase/server'
import {
  getCapabilityManifest,
  toCcAgentRows,
  toCcToolRows,
  type CapabilityManifest,
  type CcAgentRow,
  type CcToolRow,
} from './capabilities'
import type { CommandCentreTool, ToolRiskClass, ToolSource } from './tools/catalogue'

interface SupabaseErrorLike {
  message: string
}

/** The narrow slice of the Supabase client this module uses. */
export interface RegistrySupabaseLike {
  from(table: string): {
    upsert(
      values: unknown,
      options?: { onConflict?: string },
    ): Promise<{ error: SupabaseErrorLike | null }>
    select(columns?: string): {
      eq(
        column: string,
        value: unknown,
      ): {
        eq(
          column: string,
          value: unknown,
        ): {
          order(
            column: string,
            opts: { ascending: boolean },
          ): Promise<{ data: unknown; error: SupabaseErrorLike | null }>
        }
      }
    }
  }
}

/**
 * Rows are written in batches so one oversized request cannot fail the whole
 * sync. 100 keeps each payload well inside PostgREST's default limits at the
 * current scale (~140 capabilities).
 */
const UPSERT_BATCH_SIZE = 100

export interface RegistrySyncResult {
  agents: number
  tools: number
  /** Non-fatal per-batch failures. A partial sync is reported, never hidden. */
  errors: string[]
}

function chunk<T>(items: T[], size: number): T[][] {
  const batches: T[][] = []
  for (let i = 0; i < items.length; i += size) batches.push(items.slice(i, i + size))
  return batches
}

async function upsertAll(
  db: RegistrySupabaseLike,
  table: string,
  conflictTarget: string,
  rows: Array<Record<string, unknown>>,
  errors: string[],
): Promise<number> {
  let written = 0
  for (const batch of chunk(rows, UPSERT_BATCH_SIZE)) {
    const { error } = await db.from(table).upsert(batch, { onConflict: conflictTarget })
    if (error) {
      errors.push(`${table}: ${error.message}`)
      continue
    }
    written += batch.length
  }
  return written
}

/**
 * Upsert the discovered capabilities into `cc_agents` / `cc_tools` for one
 * founder. Idempotent: re-running rewrites the same rows via the
 * `UNIQUE(founder_id, name)` / `UNIQUE(founder_id, tool_key)` constraints.
 *
 * Rows that disappear from the manifest are deliberately left in place rather
 * than deleted — a capability vanishing from a partial checkout must not
 * silently drop registry history. Deactivating a stale row is a separate,
 * explicit act.
 */
export async function syncCapabilityRegistry(params: {
  founderId: string
  manifest?: CapabilityManifest
  client?: RegistrySupabaseLike
}): Promise<RegistrySyncResult> {
  const { founderId } = params
  if (!founderId) throw new Error('registry-sync: founderId is required')

  const manifest = params.manifest ?? (await getCapabilityManifest())
  const db = params.client ?? ((await createClient()) as unknown as RegistrySupabaseLike)
  const errors: string[] = []

  const agentRows = toCcAgentRows(manifest).map((row: CcAgentRow) => ({ ...row, founder_id: founderId }))
  const toolRows = toCcToolRows(manifest).map((row: CcToolRow) => ({ ...row, founder_id: founderId }))

  const agents = await upsertAll(db, 'cc_agents', 'founder_id,name', agentRows, errors)
  const tools = await upsertAll(db, 'cc_tools', 'founder_id,tool_key', toolRows, errors)

  return { agents, tools, errors }
}

interface CcToolSelectRow {
  tool_key: unknown
  source: unknown
  description: unknown
  risk_class: unknown
  approval_required: unknown
}

const TOOL_SOURCES: readonly ToolSource[] = ['hermes', 'mcp', 'project', 'codex', 'claude-code', 'local']
const RISK_CLASSES: readonly ToolRiskClass[] = ['read', 'write-local', 'write-shared', 'external', 'destructive']

/**
 * Read the founder's registered tools back out of `cc_tools`.
 *
 * Returns `[]` — never throws — when the table is empty or unreachable, so the
 * caller can fall back to the static catalogue and SAY that it did. An empty
 * array here means "the registry told us nothing", which is exactly the
 * condition that must stay visible rather than be papered over.
 */
export async function readRegistryTools(params: {
  founderId: string
  client?: RegistrySupabaseLike
}): Promise<CommandCentreTool[]> {
  const { founderId } = params
  if (!founderId) return []

  try {
    const db = params.client ?? ((await createClient()) as unknown as RegistrySupabaseLike)
    const { data, error } = await db
      .from('cc_tools')
      .select('tool_key, source, description, risk_class, approval_required')
      .eq('founder_id', founderId)
      .eq('active', true)
      .order('tool_key', { ascending: true })

    if (error || !Array.isArray(data)) return []

    return (data as CcToolSelectRow[])
      .filter((row) => typeof row.tool_key === 'string' && row.tool_key.trim() !== '')
      .map((row) => ({
        tool_key: row.tool_key as string,
        source: TOOL_SOURCES.includes(row.source as ToolSource) ? (row.source as ToolSource) : 'local',
        description: typeof row.description === 'string' ? row.description : '',
        risk_class: RISK_CLASSES.includes(row.risk_class as ToolRiskClass)
          ? (row.risk_class as ToolRiskClass)
          : 'external',
        approval_required: row.approval_required !== false,
        // Discovery remains list-only: registering a tool never makes it invocable.
        invocable: false as const,
      }))
  } catch {
    return []
  }
}
