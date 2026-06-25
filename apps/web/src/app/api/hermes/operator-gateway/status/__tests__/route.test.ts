import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn(), createClient: vi.fn() }))
vi.mock('@/lib/operator-gateway/lanes', () => ({
  getGatewayStatus: vi.fn().mockReturnValue({ active: 2, blocked: 0, noApiKeyMode: true }),
}))
vi.mock('@/lib/operator-gateway/presence', () => ({ getGatewayConnection: vi.fn() }))

import { getUser, createClient } from '@/lib/supabase/server'
import { getGatewayConnection } from '@/lib/operator-gateway/presence'
import { GET } from '../route'

describe('GET /api/hermes/operator-gateway/status', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when unauthorized', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await GET()
    expect(res.status).toBe(401)
    expect(getGatewayConnection).not.toHaveBeenCalled()
  })

  it('returns gateway status plus the live connection block on success', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const fakeClient = { from: vi.fn() }
    vi.mocked(createClient).mockResolvedValue(fakeClient as any)
    vi.mocked(getGatewayConnection).mockResolvedValue({
      state: 'connected',
      source: 'live_presence',
      agents: [],
      freshestAgeSeconds: 4,
      checkedAt: '2026-06-26T06:00:00.000Z',
    })

    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.active).toBe(2)
    expect(body.noApiKeyMode).toBe(true)
    expect(body.connection.state).toBe('connected')
    expect(body.connection.source).toBe('live_presence')
    // founder-scoped read uses the authenticated user's id
    expect(getGatewayConnection).toHaveBeenCalledWith(fakeClient, 'user-1')
  })

  it('surfaces an honest offline connection without failing the route', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    vi.mocked(createClient).mockResolvedValue({ from: vi.fn() } as any)
    vi.mocked(getGatewayConnection).mockResolvedValue({
      state: 'offline',
      source: 'not_provisioned',
      agents: [],
      freshestAgeSeconds: null,
      checkedAt: '2026-06-26T06:00:00.000Z',
      reason: 'relation "operator_agent_presence" does not exist',
    })

    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.connection.state).toBe('offline')
    expect(body.connection.source).toBe('not_provisioned')
  })
})
