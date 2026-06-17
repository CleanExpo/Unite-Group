import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  getUser: vi.fn(),
}))

import { getUser } from '@/lib/supabase/server'
import { GET } from '../route'

const mockGetUser = vi.mocked(getUser)

describe('GET /api/hermes/operator-gateway/runner-telemetry', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('is founder/session guarded', async () => {
    mockGetUser.mockResolvedValue(null)

    const res = await GET()

    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: 'Unauthorised' })
  })

  it('returns read-only telemetry without enabling dispatch', async () => {
    mockGetUser.mockResolvedValue({ id: 'founder-1' } as never)

    const res = await GET()
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.source).toBe('static_runner_monitor_telemetry')
    expect(json.founderOnly).toBe(true)
    expect(json.monitorCount).toBe(8)
    expect(json.dispatchEnabled).toBe(false)
    expect(json.liveRunnerEnabled).toBe(false)
    expect(json.productionExecutionEnabled).toBe(false)
    expect(json.noSharedCredentials).toBe(true)
    expect(json.telemetryEndpoint).toBe('/api/hermes/operator-gateway/runner-telemetry')
  })

  it('returns sanitized JSON for unexpected loader errors', async () => {
    mockGetUser.mockRejectedValue(new Error('raw telemetry internals'))

    const res = await GET()
    const json = await res.json()

    expect(res.status).toBe(500)
    expect(json).toEqual({ error: 'Failed to load runner telemetry' })
    expect(JSON.stringify(json)).not.toContain('raw telemetry internals')
  })
})
