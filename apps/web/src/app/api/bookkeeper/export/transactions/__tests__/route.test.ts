import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  getUser: vi.fn(),
  createClient: vi.fn(),
}))
vi.mock('@/lib/bookkeeper/export', () => ({
  getTransactionsForExport: vi.fn(),
  toTransactionsCsv: vi.fn(),
  quarterSlug: vi.fn(),
}))

import { getUser, createClient } from '@/lib/supabase/server'
import { getTransactionsForExport, toTransactionsCsv, quarterSlug } from '@/lib/bookkeeper/export'
import { GET } from '../route'

function req(qs: string) {
  return new Request(`https://app.test/api/bookkeeper/export/transactions${qs}`)
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getUser).mockResolvedValue({ id: 'founder-1' } as never)
  vi.mocked(createClient).mockResolvedValue({} as never)
})

describe('GET /api/bookkeeper/export/transactions', () => {
  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null as never)
    const res = await GET(req('?business=dr&from=2025-07-01&to=2025-09-30'))
    expect(res.status).toBe(401)
  })

  it('returns 400 for an unknown business', async () => {
    const res = await GET(req('?business=nope&from=2025-07-01&to=2025-09-30'))
    expect(res.status).toBe(400)
  })

  it('streams a CSV with the correct filename tagged by real source', async () => {
    vi.mocked(getTransactionsForExport).mockResolvedValue({ source: 'xero', rows: [] } as never)
    vi.mocked(quarterSlug).mockReturnValue('Q1-FY2025-26')
    vi.mocked(toTransactionsCsv).mockReturnValue('# source: xero\nfoo\n')

    const res = await GET(req('?business=dr&from=2025-07-01&to=2025-09-30'))

    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Disposition')).toBe('attachment; filename="Transactions-dr-Q1-FY2025-26-xero.csv"')
  })
})
