import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('@/lib/command-centre/provider-usage', () => ({
  buildProviderCockpit: vi.fn().mockReturnValue({ providers: [], generatedAt: 'now' }),
  readProviderSignalsFromEnv: vi.fn().mockReturnValue([]),
}))

import { getUser } from '@/lib/supabase/server'
import { GET } from '../route'

describe('GET /api/command-center/provider-usage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when unauthorized', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('returns provider cockpit on success', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.providers).toBeDefined()
  })
})
