// Shared test fake: a stateful SupabaseLike that enforces UNIQUE(founder_id,
// external_ref) on cc_tasks and PRIMARY KEY(id) on cc_task_events the way
// Postgres does — a second insert on the same key raises 23505, which is the
// exact condition createTaskOnce and appendTaskEventOnce recover from.
//
// Lifted from voice-mission-bridge.test.ts so the founder-chat mission capture
// (W1a AC-2) runs its concurrency proof behind the REAL createTaskOnce too.
// insert(...).select().single() resolves synchronously relative to the caller,
// so two Promise.all callers on one key see the first row before the second
// insert is checked — the same ordering the unique index gives.

import { CC_TASK_EVENTS_TABLE, CC_TASKS_TABLE, type SupabaseLike } from '../tasks'

type Row = Record<string, unknown>
type Result = { data: unknown; error: { code?: string; message: string } | null }

export interface UniqueEnforcingDbOptions {
  /**
   * Optional per-insert override. Return a result (or a never-settling promise)
   * to replace the default behaviour for that insert; return undefined to fall
   * through to the unique-enforcing default.
   */
  onInsert?: (table: string, values: Row) => Promise<Result> | undefined
  /** Optional override for filtered reads (single / in / maybeSingle). */
  onSelect?: (table: string) => Promise<Result> | undefined
}

export function makeUniqueEnforcingDb(options: UniqueEnforcingDbOptions = {}) {
  const rows: Row[] = []
  const events: Row[] = []
  const inserts: Array<{ table: string; values: Row }> = []
  const selects: Array<{ table: string; columns?: string; filters: Array<[string, unknown]>; inFilters: Array<[string, unknown[]]> }> = []
  let seq = 0

  const client = {
    from(table: string) {
      const store = table === CC_TASK_EVENTS_TABLE ? events : rows
      return {
        insert(values: unknown) {
          const v = values as Row
          inserts.push({ table, values: v })
          const override = options.onInsert?.(table, v)
          // cc_task_events' only uniqueness is PRIMARY KEY(id); callers supply a
          // deterministic id, so a repeat insert must collide here exactly as
          // Postgres would.
          const eventPkClash =
            table === CC_TASK_EVENTS_TABLE && v.id != null && store.some((r) => r.id === v.id)
          const duplicate =
            table === CC_TASKS_TABLE &&
            v.external_ref != null &&
            rows.some((r) => r.founder_id === v.founder_id && r.external_ref === v.external_ref)
          return {
            select() {
              return {
                single: () => {
                  if (override) return override
                  if (eventPkClash) {
                    return Promise.resolve({
                      data: null,
                      error: { code: '23505', message: 'duplicate key value violates cc_task_events_pkey' },
                    })
                  }
                  if (duplicate) {
                    return Promise.resolve({
                      data: null,
                      error: { code: '23505', message: 'duplicate key value violates unique constraint' },
                    })
                  }
                  const row = {
                    id: (v.id as string) ?? `${table}-${++seq}`,
                    created_at: '2026-07-28T00:00:00.000Z',
                    updated_at: '2026-07-28T00:00:00.000Z',
                    metadata: {},
                    ...v,
                  }
                  store.push(row)
                  return Promise.resolve({ data: row, error: null })
                },
              }
            },
          }
        },
        update() {
          throw new Error('update not used by this path')
        },
        select(columns?: string) {
          const filters: Array<[string, unknown]> = []
          const inFilters: Array<[string, unknown[]]> = []
          selects.push({ table, columns, filters, inFilters })
          const matching = () =>
            store.filter(
              (r) =>
                filters.every(([c, v]) => r[c] === v) &&
                inFilters.every(([c, vs]) => vs.includes(r[c])),
            )
          const chain = {
            eq(column: string, value: unknown) {
              filters.push([column, value])
              return chain
            },
            in(column: string, values: unknown[]) {
              inFilters.push([column, values])
              return chain
            },
            single: () => {
              const override = options.onSelect?.(table)
              if (override) return override
              const match = matching()[0]
              return Promise.resolve(
                match
                  ? { data: match, error: null }
                  : { data: null, error: { code: 'PGRST116', message: 'no rows' } },
              )
            },
            maybeSingle: () => {
              const override = options.onSelect?.(table)
              if (override) return override
              return Promise.resolve({ data: matching()[0] ?? null, error: null })
            },
            order: () => chain,
            limit: () => Promise.resolve({ data: rows, error: null }),
            then(resolve: (value: Result) => unknown, reject?: (reason: unknown) => unknown) {
              const override = options.onSelect?.(table)
              return (override ?? Promise.resolve({ data: matching(), error: null })).then(resolve, reject)
            },
          }
          return chain as never
        },
      }
    },
  } as unknown as SupabaseLike

  return { client, rows, events, inserts, selects }
}
