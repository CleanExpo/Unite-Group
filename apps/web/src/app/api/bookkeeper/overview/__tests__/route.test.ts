import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  getUser: vi.fn(),
  createClient: vi.fn(),
}))

import { GET } from '../route'
import { getUser, createClient } from '@/lib/supabase/server'

// Records every .eq() call across all chains so we can assert founder scoping.
let eqCalls: Array<[string, unknown]> = []

// Builder whose terminal awaits (and .maybeSingle()) consume results in call order.
function makeSupabase(results: Array<Record<string, unknown>>) {
  const queue = [...results]
  const next = () => (queue.length ? queue.shift()! : { data: null, count: null, error: null })
  const builder: Record<string, unknown> = {}
  const passthrough = () => builder
  builder.select = passthrough
  builder.order = passthrough
  builder.limit = passthrough
  builder.in = passthrough
  builder.gte = passthrough
  builder.lte = passthrough
  builder.eq = (col: string, val: unknown) => {
    eqCalls.push([col, val])
    return builder
  }
  builder.maybeSingle = () => Promise.resolve(next())
  builder.then = (resolve: (v: unknown) => unknown) => Promise.resolve(next()).then(resolve)
  return { from: () => builder }
}

const RUN_ROW = {
  id: 'run-1', status: 'completed', started_at: '2026-06-01T00:00:00Z',
  completed_at: '2026-06-01T01:00:00Z', total_transactions: 10, auto_reconciled: 8,
  flagged_for_review: 1, failed_count: 0, gst_collected_cents: 100, gst_paid_cents: 40,
  net_gst_cents: 60,
}

beforeEach(() => {
  eqCalls = []
  vi.mocked(getUser).mockResolvedValue({ id: 'founder-1' } as never)
})

describe('GET /api/bookkeeper/overview', () => {
  it('returns 401 when unauthenticated and never queries the database', async () => {
    vi.mocked(getUser).mockResolvedValue(null as never)
    const res = await GET()
    expect(res.status).toBe(401)
    expect(createClient).not.toHaveBeenCalled()
  })

  it('returns founder-scoped totals on the happy path', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabase([
      { data: RUN_ROW, error: null },
      { count: 3, error: null },
      { count: 2, error: null },
      { count: 10, error: null },
      { data: [{ amount_cents: 5000 }, { amount_cents: -2000 }], error: null },
    ]) as never)

    const res = await GET()
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.totals.pendingReconciliation).toBe(3)
    expect(json.totals.pendingApproval).toBe(2)
    expect(json.totals.totalTransactions12m).toBe(10)
    expect(json.totals.totalDeductibleCents).toBe(7000)
    // Every query fenced by the authenticated founder id.
    expect(eqCalls).toContainEqual(['founder_id', 'founder-1'])
    // Honest no-error case: no _queryErrors key.
    expect(json._queryErrors).toBeUndefined()
  })

  it('surfaces _queryErrors instead of silently reporting clean zeros on a query failure', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabase([
      { data: null, error: { message: 'boom' } },
      { count: 0, error: null },
      { count: 0, error: null },
      { count: 0, error: null },
      { data: [], error: null },
    ]) as never)

    const res = await GET()
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(Array.isArray(json._queryErrors)).toBe(true)
    expect(json._queryErrors.join(' ')).toContain('boom')
  })

  it('returns null for each totals field whose query failed (null ≠ zero)', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabase([
      { data: RUN_ROW, error: null },
      { count: null, error: { message: 'recon-fail' } },
      { count: null, error: { message: 'approval-fail' } },
      { count: null, error: { message: 'total-fail' } },
      { data: null, error: { message: 'deductible-fail' } },
    ]) as never)

    const res = await GET()
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.totals.pendingReconciliation).toBeNull()
    expect(json.totals.pendingApproval).toBeNull()
    expect(json.totals.totalTransactions12m).toBeNull()
    expect(json.totals.totalDeductibleCents).toBeNull()
    expect(Array.isArray(json._queryErrors)).toBe(true)
    expect(json._queryErrors).toHaveLength(4)
  })
})
