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

vi.mock('@/lib/integrations/linear', () => ({
  createIssue: vi.fn(),
}))

vi.mock('@/lib/command-centre/work-packet', () => ({
  createPacketLinearWork: vi.fn(),
}))

import { getUser } from '@/lib/supabase/server'
import { getProjects } from '@/lib/command-centre/registry'
import { loadProjectIntegrationStatuses } from '@/lib/command-centre/project-integrations'
import { buildProjectIntegrationWorkPackets } from '@/lib/command-centre/project-integration-work-packets'
import { createIssue } from '@/lib/integrations/linear'
import { createPacketLinearWork } from '@/lib/command-centre/work-packet'
import { GET, POST } from '../route'

const mockGetUser = vi.mocked(getUser)
const mockGetProjects = vi.mocked(getProjects)
const mockLoadProjectIntegrationStatuses = vi.mocked(loadProjectIntegrationStatuses)
const mockBuildProjectIntegrationWorkPackets = vi.mocked(buildProjectIntegrationWorkPackets)
const mockCreatePacketLinearWork = vi.mocked(createPacketLinearWork)

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

  it('POST creates dry-run Linear work by default', async () => {
    mockGetUser.mockResolvedValue({ id: 'founder-1' } as never)
    mockGetProjects.mockResolvedValue(projects as never)
    mockLoadProjectIntegrationStatuses.mockResolvedValue(integrations as never)
    mockBuildProjectIntegrationWorkPackets.mockReturnValue(packets as never)
    mockCreatePacketLinearWork.mockResolvedValue({
      packet: packets[0].packet,
      mode: 'dry-run',
      linearInput: { title: 'Unblock Synthex integration: Linear intake', teamKey: 'SYN' },
      created: null,
    } as never)

    const res = await POST(new Request('https://unite.test/api', { method: 'POST', body: '{}' }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.mode).toBe('dry-run')
    expect(body.count).toBe(1)
    expect(mockCreatePacketLinearWork).toHaveBeenCalledWith(
      packets[0].packet,
      { createIssue },
      { live: false },
    )
  })

  it('POST passes through the live flag while the lower-level double gate owns the actual write decision', async () => {
    mockGetUser.mockResolvedValue({ id: 'founder-1' } as never)
    mockGetProjects.mockResolvedValue(projects as never)
    mockLoadProjectIntegrationStatuses.mockResolvedValue(integrations as never)
    mockBuildProjectIntegrationWorkPackets.mockReturnValue(packets as never)
    mockCreatePacketLinearWork.mockResolvedValue({
      packet: packets[0].packet,
      mode: 'live',
      linearInput: { title: 'Unblock Synthex integration: Linear intake', teamKey: 'SYN' },
      created: { id: 'SYN-1', url: 'https://linear.app/x/SYN-1' },
    } as never)

    const res = await POST(new Request('https://unite.test/api', {
      method: 'POST',
      body: JSON.stringify({ live: true }),
    }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.mode).toBe('live')
    expect(mockCreatePacketLinearWork).toHaveBeenCalledWith(
      packets[0].packet,
      { createIssue },
      { live: true },
    )
  })
})
