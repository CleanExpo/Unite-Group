import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  getUser: vi.fn(),
}))
vi.mock('@/lib/bookkeeper/export', () => ({
  getInvoicesForExport: vi.fn(),
  toInvoicesCsv: vi.fn(),
  quarterSlug: vi.fn(),
}))

import { getUser } from '@/lib/supabase/server'
import { getInvoicesForExport, toInvoicesCsv, quarterSlug } from '@/lib/bookkeeper/export'
import { GET } from '../route'

function req(qs: string) {
  return new Request(`https://app.test/api/bookkeeper/export/invoices${qs}`)
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getUser).mockResolvedValue({ id: 'founder-1' } as never)
})

describe('GET /api/bookkeeper/export/invoices', () => {
  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null as never)
    const res = await GET(req('?business=dr&from=2025-07-01&to=2025-09-30'))
    expect(res.status).toBe(401)
  })

  it('returns 400 for an unknown business', async () => {
    const res = await GET(req('?business=nope&from=2025-07-01&to=2025-09-30'))
    expect(res.status).toBe(400)
  })

  it('streams a CSV with the correct filename', async () => {
    vi.mocked(getInvoicesForExport).mockResolvedValue({ source: 'mock', rows: [] } as never)
    vi.mocked(quarterSlug).mockReturnValue('Q1-FY2025-26')
    vi.mocked(toInvoicesCsv).mockReturnValue('# source: mock — NOT real financials\nfoo\n')

    const res = await GET(req('?business=dr&from=2025-07-01&to=2025-09-30'))

    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Disposition')).toBe('attachment; filename="Invoices-dr-Q1-FY2025-26-mock.csv"')
  })
})
