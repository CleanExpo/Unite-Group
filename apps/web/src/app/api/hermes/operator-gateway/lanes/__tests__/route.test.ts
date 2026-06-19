import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('@/lib/operator-gateway/lanes', () => ({
  getOperatorLanes: vi.fn().mockReturnValue([{ id: 'lane-1', name: 'Research' }]),
}))

import { getUser } from '@/lib/supabase/server'
import { GET } from '../route'

describe('GET /api/hermes/operator-gateway/lanes', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when unauthorized', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('returns operator lanes on success', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.lanes).toHaveLength(1)
    expect(body.noApiKeyMode).toBe(true)
  })
})
