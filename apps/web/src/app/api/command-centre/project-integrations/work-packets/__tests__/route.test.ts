import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  getUser: vi.fn(),
}))

vi.mock('@/lib/command-centre/registry', () => ({
  getProjects: vi.fn(),
}))

vi.mock('@/lib/command-centre/project-integrations', () => ({
  loadProjectIntegrationStatuses: vi.fn(),
}))

vi.mock('@/lib/command-centre/project-integration-work-packets', () => ({
  buildProjectIntegrationWorkPackets: vi.fn(),
}))

import { getUser } from '@/lib/supabase/server'
import { getProjects } from '@/lib/command-centre/registry'
import { loadProjectIntegrationStatuses } from '@/lib/command-centre/project-integrations'
import { buildProjectIntegrationWorkPackets } from '@/lib/command-centre/project-integration-work-packets'
import { GET } from '../route'

const mockGetUser = vi.mocked(getUser)
const mockGetProjects = vi.mocked(getProjects)
const mockLoadProjectIntegrationStatuses = vi.mocked(loadProjectIntegrationStatuses)
const mockBuildProjectIntegrationWorkPackets = vi.mocked(buildProjectIntegrationWorkPackets)

describe('GET /api/command-centre/project-integrations/work-packets', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    mockGetUser.mockResolvedValue(null as never)

    const res = await GET()

    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: 'Unauthorised' })
    expect(mockGetProjects).not.toHaveBeenCalled()
  })

  it('returns dry-run packet drafts for authenticated founders', async () => {
    mockGetUser.mockResolvedValue({ id: 'founder-1' } as never)
    const projects = [{ name: 'Synthex', integration_status_url: 'https://synthex.social/api/v1/connections/status' }]
    const integrations = [{
      projectName: 'Synthex',
      statusUrl: 'https://synthex.social/api/v1/connections/status',
      ok: true,
      source: 'synthex:connection-status',
      generatedAt: '2026-06-16T00:00:00.000Z',
      summary: { total: 1, connected: 0, ready: 0, mock: 0, blocked: 1, unknown: 0 },
      connections: [{ id: 'linear', label: 'Linear intake', state: 'blocked' }],
      error: null,
    }]
    const packets = [{
      projectName: 'Synthex',
      gapKind: 'blocked',
      connectionId: 'linear',
      connectionLabel: 'Linear intake',
      packet: { id: 'packet-1', outcome: 'Unblock Synthex integration: Linear intake' },
    }]
    mockGetProjects.mockResolvedValue(projects as never)
    mockLoadProjectIntegrationStatuses.mockResolvedValue(integrations as never)
    mockBuildProjectIntegrationWorkPackets.mockReturnValue(packets as never)

    const res = await GET()
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.source).toBe('command-centre:project-integration-work-packets')
    expect(body.count).toBe(1)
    expect(body.packets).toEqual(packets)
    expect(mockLoadProjectIntegrationStatuses).toHaveBeenCalledWith(projects)
    expect(mockBuildProjectIntegrationWorkPackets).toHaveBeenCalledWith(
      integrations,
      expect.objectContaining({ now: expect.any(String) }),
    )
  })

  it('returns 500 when packet generation fails', async () => {
    mockGetUser.mockResolvedValue({ id: 'founder-1' } as never)
    mockGetProjects.mockRejectedValue(new Error('registry unavailable') as never)

    const res = await GET()

    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: 'registry unavailable' })
  })
})
