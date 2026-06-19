import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('@/lib/integrations/linear', () => ({ fetchIssueCountByBusiness: vi.fn() }))

import { getUser } from '@/lib/supabase/server'
import { fetchIssueCountByBusiness } from '@/lib/integrations/linear'
import { GET } from '../route'

function req(qs = '') {
  return new Request(`https://app.test/api/linear/kpi${qs}`)
}

describe('GET /api/linear/kpi', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when unauthorized', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await GET(req())
    expect(res.status).toBe(401)
  })

  it('returns configured=false when LINEAR_API_KEY missing', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const res = await GET(req('?business=dr'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.configured).toBe(false)
    expect(body.activeCount).toBe(0)
  })

  it('returns count for business when configured', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    vi.stubEnv('LINEAR_API_KEY', 'lin_key')
    vi.mocked(fetchIssueCountByBusiness).mockResolvedValue({ dr: 5 } as any)
    const res = await GET(req('?business=dr'))
    const body = await res.json()
    expect(body.configured).toBe(true)
    expect(body.activeCount).toBe(5)
    vi.unstubAllEnvs()
  })
})
