import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  getUser: vi.fn(),
  createClient: vi.fn(),
}))

import { GET } from '../route'
import { getUser, createClient } from '@/lib/supabase/server'

let eqCalls: Array<[string, unknown]> = []

function makeSupabase(result: Record<string, unknown>) {
  const builder: Record<string, unknown> = {}
  const passthrough = () => builder
  builder.select = passthrough
  builder.order = passthrough
  builder.range = passthrough
  builder.gte = passthrough
  builder.lte = passthrough
  builder.eq = (col: string, val: unknown) => {
    eqCalls.push([col, val])
    return builder
  }
  builder.then = (resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve)
  return { from: () => builder }
}

function req(qs = '') {
  return new Request(`https://app.test/api/bookkeeper/transactions${qs}`)
}

beforeEach(() => {
  eqCalls = []
  vi.mocked(getUser).mockResolvedValue({ id: 'founder-1' } as never)
})

describe('GET /api/bookkeeper/transactions', () => {
  it('returns 401 when unauthenticated and never queries the database', async () => {
    vi.mocked(getUser).mockResolvedValue(null as never)
    const res = await GET(req())
    expect(res.status).toBe(401)
    expect(createClient).not.toHaveBeenCalled()
  })

  it('returns founder-scoped transactions on the happy path', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabase({
      data: [{
        id: 't1', run_id: 'r1', business_key: 'dr', xero_transaction_id: 'x1',
        transaction_date: '2026-06-01', description: 'Fuel', amount_cents: -5000,
        reconciliation_status: 'unmatched', confidence_score: '0.5', matched_invoice_id: null,
        matched_bill_id: null, tax_code: 'GST', gst_amount_cents: -454, tax_category: 'expense',
        is_deductible: true, deduction_category: 'vehicle', deduction_notes: null,
        approved_at: null, created_at: '2026-06-01T00:00:00Z',
      }],
      count: 1, error: null,
    }) as never)

    const res = await GET(req('?page=1&pageSize=50'))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.total).toBe(1)
    expect(json.transactions).toHaveLength(1)
    expect(json.transactions[0].businessKey).toBe('dr')
    expect(eqCalls).toContainEqual(['founder_id', 'founder-1'])
  })

  it('returns 500 (not a silent empty list) when the query errors', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabase({
      data: null, count: null, error: { message: 'boom' },
    }) as never)

    const res = await GET(req())
    const json = await res.json()
    expect(res.status).toBe(500)
    expect(json.error).toBe('Failed to load transactions')
    expect(json.error).not.toContain('boom')
  })
})
