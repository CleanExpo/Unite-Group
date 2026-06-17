// Test helper (not a test file): a minimal in-memory fake of the Supabase
// client surface that the pi_run_queue persistence adapter uses. It models the
// real `from(...).select().eq('founder_id', id).order()` read and the
// `from(...).upsert(row, { onConflict: 'founder_id,queue_id' })` write, deduping
// on (founder_id, queue_id) — so route tests get genuine persistence + founder
// isolation across calls, simulating durability across a serverless cold start.

interface Row {
  founder_id: string
  queue_id: string
  status: string
  item: unknown
  updated_at: string
}

export function makeFakeRunQueueDb() {
  const rows: Row[] = []

  const client = {
    from(_table: string) {
      let founderFilter: string | undefined
      const builder: Record<string, unknown> = {
        select: () => builder,
        order: () => builder,
        eq: (col: string, val: string) => {
          if (col === 'founder_id') founderFilter = val
          return builder
        },
        then: (resolve: (v: { data: unknown; error: null }) => unknown) => {
          const data = rows
            .filter((r) => founderFilter === undefined || r.founder_id === founderFilter)
            .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
            .map((r) => ({ item: r.item }))
          return Promise.resolve({ data, error: null }).then(resolve)
        },
        upsert: (row: Row) => ({
          then: (resolve: (v: { error: null }) => unknown) => {
            const idx = rows.findIndex(
              (r) => r.founder_id === row.founder_id && r.queue_id === row.queue_id,
            )
            if (idx >= 0) rows[idx] = { ...rows[idx], ...row }
            else rows.push({ ...row })
            return Promise.resolve({ error: null }).then(resolve)
          },
        }),
      }
      return builder
    },
  }

  return { client, rows }
}
