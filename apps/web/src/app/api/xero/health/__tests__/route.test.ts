import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('@/lib/integrations/xero/health', () => ({ getXeroHealth: vi.fn() }))

import { getUser } from '@/lib/supabase/server'
import { getXeroHealth } from '@/lib/integrations/xero/health'
import { GET } from '../route'

describe('GET /api/xero/health', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('returns xero health status', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const health = { configured: true, businesses: { dr: { connected: true }, synthex: { connected: false } } }
    vi.mocked(getXeroHealth).mockReturnValue(health as any)

    const res = await GET()
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual(health)
  })

  it('returns 500 when getXeroHealth throws', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    vi.mocked(getXeroHealth).mockImplementation(() => { throw new Error('Health check error') })

    const res = await GET()
    expect(res.status).toBe(500)
    expect(await res.json()).toMatchObject({ error: 'Xero health check failed' })
  })
})
