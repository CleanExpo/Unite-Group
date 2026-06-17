import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  getUser: vi.fn(),
}))

import { getUser } from '@/lib/supabase/server'
import { GET } from '../route'

const mockGetUser = vi.mocked(getUser)

describe('GET /api/hermes/operator-gateway/compound-engineering', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('is founder/session guarded', async () => {
    mockGetUser.mockResolvedValue(null)

    const res = await GET()

    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: 'Unauthorised' })
  })

  it('returns compound engineering connector status without install or external execution', async () => {
    mockGetUser.mockResolvedValue({ id: 'founder-1' } as never)

    const res = await GET()
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.source).toBe('static_compound_engineering_connector_registry')
    expect(json.founderOnly).toBe(true)
    expect(json.connectorCount).toBeGreaterThanOrEqual(6)
    expect(json.upstream.pluginRepo).toBe('EveryInc/compound-engineering-plugin')
    expect(json.upstream.observedCapabilities.codexRequiresBunAgentInstall).toBe(true)
    expect(json.autoInstallEnabled).toBe(false)
    expect(json.externalExecutionEnabled).toBe(false)
    expect(json.noApiKeyMode).toBe(true)
    expect(json.nextRecommendedConnector).toBe('ce_setup_auditor')
  })

  it('returns sanitized JSON for unexpected loader errors', async () => {
    mockGetUser.mockRejectedValue(new Error('raw compound internals'))

    const res = await GET()
    const json = await res.json()

    expect(res.status).toBe(500)
    expect(json).toEqual({ error: 'Failed to load compound engineering connector status' })
    expect(JSON.stringify(json)).not.toContain('raw compound internals')
  })
})
