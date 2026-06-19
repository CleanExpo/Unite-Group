import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('@/lib/integrations/xero', () => ({ isXeroConfigured: vi.fn().mockReturnValue(false) }))
vi.mock('@/lib/integrations/google-oauth', () => ({ isGoogleConfigured: vi.fn().mockReturnValue(false) }))

import { getUser } from '@/lib/supabase/server'
import { GET } from '../route'

describe('GET /api/health/connectors', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when unauthorized', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('returns connector list and summary', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body.connectors)).toBe(true)
    expect(body.connectors.length).toBeGreaterThan(0)
    expect(typeof body.summary.total).toBe('number')
    expect(typeof body.summary.configured).toBe('number')
  })
})
