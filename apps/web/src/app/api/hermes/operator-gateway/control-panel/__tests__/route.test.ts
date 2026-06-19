import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('@/lib/operator-gateway/control-panel', () => ({
  getControlPanelView: vi.fn().mockReturnValue({ version: '0.16', modules: [] }),
}))

import { getUser } from '@/lib/supabase/server'
import { GET } from '../route'

describe('GET /api/hermes/operator-gateway/control-panel', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when unauthorized', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('returns control panel view on success', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.version).toBe('0.16')
  })
})
