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

import { getUser } from '@/lib/supabase/server'
import { getProjects } from '@/lib/command-centre/registry'
import { loadProjectIntegrationStatuses } from '@/lib/command-centre/project-integrations'
import { GET } from '../route'

const mockGetUser = vi.mocked(getUser)
const mockGetProjects = vi.mocked(getProjects)
const mockLoadProjectIntegrationStatuses = vi.mocked(loadProjectIntegrationStatuses)

describe('GET /api/command-centre/project-integrations', () => {
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

  it('returns the manifest rollup for authenticated founders', async () => {
    mockGetUser.mockResolvedValue({ id: 'founder-1' } as never)
    const projects = [{ name: 'Dimitri-ITR', integration_status_url: 'https://dimitri/status' }]
    mockGetProjects.mockResolvedValue(projects as never)
    mockLoadProjectIntegrationStatuses.mockResolvedValue([
      {
        projectName: 'Dimitri-ITR',
        statusUrl: 'https://dimitri/status',
        ok: true,
        source: 'dimitri:connection-status',
        generatedAt: '2026-06-16T00:00:00.000Z',
        summary: { total: 1, connected: 1, ready: 0, mock: 0, blocked: 0, unknown: 0 },
        connections: [],
        error: null,
      },
    ] as never)

    const res = await GET()
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.source).toBe('command-centre:project-integrations')
    expect(body.count).toBe(1)
    expect(body.integrations[0].projectName).toBe('Dimitri-ITR')
    expect(mockLoadProjectIntegrationStatuses).toHaveBeenCalledWith(projects)
  })

  it('returns 500 when the registry fails', async () => {
    mockGetUser.mockResolvedValue({ id: 'founder-1' } as never)
    mockGetProjects.mockRejectedValue(new Error('registry missing') as never)

    const res = await GET()
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: 'registry missing' })
  })
})
