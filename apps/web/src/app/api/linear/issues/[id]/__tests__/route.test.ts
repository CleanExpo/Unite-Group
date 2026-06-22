import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('@/lib/integrations/linear', () => ({
  fetchIssue: vi.fn(),
  issueToBusiness: vi.fn(),
}))
vi.mock('@/lib/businesses', () => ({
  BUSINESSES: [{ key: 'dr', name: 'Disaster Recovery', color: '#ff0000' }],
}))

import { getUser } from '@/lib/supabase/server'
import { fetchIssue, issueToBusiness } from '@/lib/integrations/linear'
import { GET } from '../route'

const ctx = (id: string) => ({ params: Promise.resolve({ id }) })

describe('GET /api/linear/issues/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(issueToBusiness).mockReturnValue('dr')
    vi.mocked(fetchIssue).mockResolvedValue({
      id: 'LIN-1',
      title: 'Test issue',
      team: { key: 'DR' },
    } as any)
  })

  it('returns 401 when unauthorized', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await GET(new Request('https://app.test/'), ctx('LIN-1'))
    expect(res.status).toBe(401)
  })

  it('returns 500 when fetchIssue throws', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    vi.mocked(fetchIssue).mockRejectedValue(new Error('Linear API error'))
    const res = await GET(new Request('https://app.test/'), ctx('LIN-1'))
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBe('Linear API error')
  })

  it('returns 200 with issue and business info', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const res = await GET(new Request('https://app.test/'), ctx('LIN-1'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.id).toBe('LIN-1')
    expect(body.businessKey).toBe('dr')
    expect(body.businessColor).toBe('#ff0000')
  })
})
