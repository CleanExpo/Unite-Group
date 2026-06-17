import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  getUser: vi.fn(),
}))

import { getUser } from '@/lib/supabase/server'
import { GET } from '../route'

const mockGetUser = vi.mocked(getUser)

describe('GET /api/hermes/operator-gateway/compound-setup-packets', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('is founder/session guarded', async () => {
    mockGetUser.mockResolvedValue(null)

    const res = await GET()

    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: 'Unauthorised' })
  })

  it('returns Compound Engineering setup packets without enabling install or execution', async () => {
    mockGetUser.mockResolvedValue({ id: 'founder-1' } as never)

    const res = await GET()
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.source).toBe('static_compound_setup_packet_registry')
    expect(json.founderOnly).toBe(true)
    expect(json.packetCount).toBe(6)
    expect(json.projects).toEqual(expect.arrayContaining(['Unite-Group', 'RestoreAssist', 'Synthex', 'Pi-CEO']))
    expect(json.noAutoInstall).toBe(true)
    expect(json.noApiKeyMode).toBe(true)
    expect(json.externalExecutionEnabled).toBe(false)
    expect(json.nextPacketId).toBe('ce-setup-unite-group')
  })

  it('returns sanitized JSON for unexpected loader errors', async () => {
    mockGetUser.mockRejectedValue(new Error('raw setup packet internals'))

    const res = await GET()
    const json = await res.json()

    expect(res.status).toBe(500)
    expect(json).toEqual({ error: 'Failed to load compound setup packets' })
    expect(JSON.stringify(json)).not.toContain('raw setup packet internals')
  })
})
