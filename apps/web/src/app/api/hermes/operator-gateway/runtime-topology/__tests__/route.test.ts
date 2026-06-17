import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  getUser: vi.fn(),
}))

import { getUser } from '@/lib/supabase/server'
import { GET } from '../route'

const mockGetUser = vi.mocked(getUser)

describe('GET /api/hermes/operator-gateway/runtime-topology', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('is founder/session guarded', async () => {
    mockGetUser.mockResolvedValue(null)

    const res = await GET()

    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: 'Unauthorised' })
  })

  it('returns the multi-CLI topology without enabling production execution', async () => {
    mockGetUser.mockResolvedValue({ id: 'founder-1' } as never)

    const res = await GET()
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.source).toBe('static_multi_cli_runtime_topology')
    expect(json.founderOnly).toBe(true)
    expect(json.operatorDashboardNode).toBe('phill_main_cli_dashboard')
    expect(json.noSharedCredentials).toBe(true)
    expect(json.noApiKeyMode).toBe(true)
    expect(json.productionExecutionEnabled).toBe(false)
    expect(json.browserAutomationRequiresMainOperator).toBe(true)
    expect(json.openGates).toContain('install_and_login_minimax_cli_or_mcp')
  })

  it('returns sanitized JSON for unexpected loader errors', async () => {
    mockGetUser.mockRejectedValue(new Error('raw runtime internals'))

    const res = await GET()
    const json = await res.json()

    expect(res.status).toBe(500)
    expect(json).toEqual({ error: 'Failed to load runtime topology' })
    expect(JSON.stringify(json)).not.toContain('raw runtime internals')
  })
})
