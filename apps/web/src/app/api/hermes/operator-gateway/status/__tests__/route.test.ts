import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('@/lib/operator-gateway/lanes', () => ({
  getGatewayStatus: vi.fn().mockReturnValue({ active: 2, blocked: 0, noApiKeyMode: true }),
}))

import { getUser } from '@/lib/supabase/server'
import { GET } from '../route'

describe('GET /api/hermes/operator-gateway/status', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when unauthorized', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('returns gateway status on success', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.active).toBe(2)
    expect(body.noApiKeyMode).toBe(true)
  })
})
