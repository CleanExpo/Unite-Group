// Test-only in-memory Supabase stand-in for the campaign publish insert race
// (UNI-2326).
//
// The unique key it enforces on social_posts is read from the migration file,
// never from the code under test, so the fake cannot agree with a bug in the
// route's conflict target. Like Postgres, it enforces that key on EVERY write
// (plain insert and upsert), and it refuses an ON CONFLICT target that matches
// no unique constraint (Postgres error 42P10).
//
// `assetReadsBeforeWrite` holds every social_posts write until that many
// campaign_assets reads have happened, so a test can force two requests to
// both read "no draft yet" before either writes: the exact race.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

export const CAMPAIGN_DEDUPE_MIGRATION = join(
  __dirname, '..', '..',
  'supabase', 'migrations', '20261107120000_campaign_publish_dedupe.sql',
)

/** Columns of every UNIQUE (...) constraint the migration declares. */
export function migrationUniqueColumns(): string[][] {
  const sql = readFileSync(CAMPAIGN_DEDUPE_MIGRATION, 'utf8').replace(/--.*$/gm, '')
  return [...sql.matchAll(/UNIQUE\s*\(([^)]*)\)/gi)].map((m) =>
    m[1].split(',').map((c) => c.trim()),
  )
}

type Row = Record<string, unknown>
type Filter = { col: string; kind: 'eq' | 'in' | 'is'; val: unknown }
type Result = { data: unknown; error: { code?: string; message: string } | null }

export interface CampaignStoreOptions {
  /** Hold social_posts writes until this many campaign_assets reads (default 1). */
  assetReadsBeforeWrite?: number
  /** Unique keys on social_posts. Default: read from the migration. [] = migration not applied. */
  socialPostUniqueKeys?: string[][]
  /** Fail this many campaign_assets updates before succeeding (default 0). */
  failAssetUpdates?: number
}

export interface CampaignStore {
  client: { from: (table: string) => unknown }
  tables: Record<string, Row[]>
  calls: {
    inserts: Row[]
    upserts: Array<{ row: Row; opts: Record<string, unknown> }>
    updates: Array<{ table: string; patch: Row; filters: Filter[] }>
  }
}

export function makeCampaignStore(
  seed: { campaign_assets: Row[]; campaigns: Row[] },
  options: CampaignStoreOptions = {},
): CampaignStore {
  const tables: Record<string, Row[]> = {
    campaign_assets: seed.campaign_assets.map((r) => ({ ...r })),
    campaigns: seed.campaigns.map((r) => ({ ...r })),
    social_posts: [],
  }
  const uniqueKeys = options.socialPostUniqueKeys ?? migrationUniqueColumns()
  const calls: CampaignStore['calls'] = { inserts: [], upserts: [], updates: [] }
  const readsNeeded = options.assetReadsBeforeWrite ?? 1
  let assetReads = 0
  let failUpdates = options.failAssetUpdates ?? 0
  let seq = 0
  let release: () => void = () => {}
  const enoughReads = new Promise<void>((resolve) => { release = resolve })

  const conflicts = (row: Row): boolean =>
    uniqueKeys.some((cols) =>
      cols.every((c) => row[c] !== null && row[c] !== undefined) &&
      tables.social_posts.some((existing) => cols.every((c) => existing[c] === row[c])),
    )

  const sameColumns = (a: string[], b: string[]) =>
    a.length === b.length && a.every((c) => b.includes(c))

  async function exec(state: {
    table: string; op: string; filters: Filter[]; payload: Row | null; opts: Record<string, unknown>
  }): Promise<Result> {
    await Promise.resolve()
    const rows = tables[state.table] ?? (tables[state.table] = [])
    const match = (r: Row) => state.filters.every((f) =>
      f.kind === 'in' ? (f.val as unknown[]).includes(r[f.col]) : r[f.col] === f.val)

    if (state.op === 'select') {
      const out = rows.filter(match).map((r) => ({ ...r }))
      if (state.table === 'campaign_assets') {
        assetReads++
        if (assetReads >= readsNeeded) release()
      }
      return { data: out, error: null }
    }

    if (state.op === 'insert' || state.op === 'upsert') {
      if (state.table === 'social_posts' && readsNeeded > 0) await enoughReads
      const row: Row = { id: `post-${++seq}`, ...state.payload }
      if (state.op === 'insert') {
        calls.inserts.push({ ...state.payload })
        if (state.table === 'social_posts' && conflicts(row)) {
          return { data: null, error: { code: '23505', message: 'duplicate key value violates unique constraint' } }
        }
        rows.push(row)
        return { data: [{ ...row }], error: null }
      }
      calls.upserts.push({ row: { ...state.payload }, opts: { ...state.opts } })
      const target = String(state.opts.onConflict ?? '').split(',').map((c) => c.trim())
      if (!uniqueKeys.some((cols) => sameColumns(cols, target))) {
        return {
          data: null,
          error: { code: '42P10', message: 'there is no unique or exclusion constraint matching the ON CONFLICT specification' },
        }
      }
      if (state.opts.ignoreDuplicates !== true) throw new Error('fake supports ignoreDuplicates upserts only')
      if (conflicts(row)) return { data: [], error: null }
      rows.push(row)
      return { data: [{ ...row }], error: null }
    }

    if (state.op === 'update') {
      calls.updates.push({ table: state.table, patch: { ...state.payload }, filters: [...state.filters] })
      if (state.table === 'campaign_assets' && failUpdates > 0) {
        failUpdates--
        return { data: null, error: { message: 'injected link failure' } }
      }
      for (const r of rows.filter(match)) Object.assign(r, state.payload)
      return { data: null, error: null }
    }

    throw new Error(`fake does not support op ${state.op}`)
  }

  function from(table: string) {
    const state = { table, op: 'select', filters: [] as Filter[], payload: null as Row | null, opts: {} as Record<string, unknown> }
    const builder: Record<string, unknown> = {}
    const chain = (fn: () => void) => () => { fn(); return builder }
    builder.select = () => builder
    builder.insert = (p: Row) => chain(() => { state.op = 'insert'; state.payload = p })()
    builder.upsert = (p: Row, o?: Record<string, unknown>) =>
      chain(() => { state.op = 'upsert'; state.payload = p; state.opts = o ?? {} })()
    builder.update = (p: Row) => chain(() => { state.op = 'update'; state.payload = p })()
    builder.eq = (col: string, val: unknown) => chain(() => state.filters.push({ col, kind: 'eq', val }))()
    builder.in = (col: string, val: unknown[]) => chain(() => state.filters.push({ col, kind: 'in', val }))()
    builder.is = (col: string, val: unknown) => chain(() => state.filters.push({ col, kind: 'is', val }))()
    builder.single = async () => {
      const r = await exec(state)
      if (r.error) return r
      const list = r.data as Row[]
      return list.length === 1
        ? { data: list[0], error: null }
        : { data: null, error: { code: 'PGRST116', message: `expected 1 row, got ${list.length}` } }
    }
    builder.maybeSingle = async () => {
      const r = await exec(state)
      if (r.error) return r
      const list = r.data as Row[]
      return { data: list[0] ?? null, error: null }
    }
    builder.then = (resolve: (v: Result) => unknown, reject?: (e: unknown) => unknown) =>
      exec(state).then(resolve, reject)
    return builder
  }

  return { client: { from }, tables, calls }
}
