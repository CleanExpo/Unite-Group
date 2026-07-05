import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  getUser: vi.fn(),
  createClient: vi.fn(),
}))
vi.mock('@/lib/bookkeeper/export', () => ({
  getBASSummaryForExport: vi.fn(),
  toBASCsv: vi.fn(),
  quarterSlug: vi.fn(),
}))

import { getUser, createClient } from '@/lib/supabase/server'
import { getBASSummaryForExport, toBASCsv, quarterSlug } from '@/lib/bookkeeper/export'
import { GET } from '../route'

function req(qs: string) {
  return new Request(`https://app.test/api/bookkeeper/export/bas${qs}`)
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getUser).mockResolvedValue({ id: 'founder-1' } as never)
  vi.mocked(createClient).mockResolvedValue({} as never)
})

describe('GET /api/bookkeeper/export/bas', () => {
  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null as never)
    const res = await GET(req('?business=dr&from=2025-07-01&to=2025-09-30'))
    expect(res.status).toBe(401)
  })

  it('returns 400 for an unknown business', async () => {
    const res = await GET(req('?business=nope&from=2025-07-01&to=2025-09-30'))
    expect(res.status).toBe(400)
  })

  it('returns 400 when from/to are missing or invalid', async () => {
    const res = await GET(req('?business=dr&from=not-a-date&to=2025-09-30'))
    expect(res.status).toBe(400)
  })

  it('streams a CSV with the correct filename and content-type', async () => {
    vi.mocked(getBASSummaryForExport).mockResolvedValue({ source: 'mock' } as never)
    vi.mocked(quarterSlug).mockReturnValue('Q1-FY2025-26')
    vi.mocked(toBASCsv).mockReturnValue('# source: mock — NOT real financials\nfoo\n')

    const res = await GET(req('?business=dr&from=2025-07-01&to=2025-09-30'))

    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('text/csv; charset=utf-8')
    expect(res.headers.get('Content-Disposition')).toBe('attachment; filename="BAS-dr-Q1-FY2025-26-mock.csv"')
    expect(await res.text()).toBe('# source: mock — NOT real financials\nfoo\n')
  })
})
