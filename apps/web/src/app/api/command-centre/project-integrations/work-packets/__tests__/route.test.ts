import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  getUser: vi.fn(),
  createClient: vi.fn(),
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

vi.mock('@/lib/command-centre/work-packet-store', () => ({
  listWorkPackets: vi.fn(),
  saveWorkPacket: vi.fn(),
}))

import { getUser, createClient } from '@/lib/supabase/server'
import { getProjects } from '@/lib/command-centre/registry'
import { loadProjectIntegrationStatuses } from '@/lib/command-centre/project-integrations'
import { buildProjectIntegrationWorkPackets } from '@/lib/command-centre/project-integration-work-packets'
import { createIssue } from '@/lib/integrations/linear'
import { createPacketLinearWork } from '@/lib/command-centre/work-packet'
import { listWorkPackets, saveWorkPacket } from '@/lib/command-centre/work-packet-store'
import { GET, POST } from '../route'

const mockGetUser = vi.mocked(getUser)
const mockCreateClient = vi.mocked(createClient)
const mockGetProjects = vi.mocked(getProjects)
const mockLoadProjectIntegrationStatuses = vi.mocked(loadProjectIntegrationStatuses)
const mockBuildProjectIntegrationWorkPackets = vi.mocked(buildProjectIntegrationWorkPackets)
const mockCreatePacketLinearWork = vi.mocked(createPacketLinearWork)
const mockListWorkPackets = vi.mocked(listWorkPackets)
const mockSaveWorkPacket = vi.mocked(saveWorkPacket)

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
  packet: {
    id: 'packet-1',
    outcome: 'Unblock Synthex integration: Linear intake',
    projectKey: 'synthex',
    clientId: null,
    lane: 'ops',
    riskLevel: 'medium',
    status: 'draft',
    nextActionOwner: 'hermes',
    approvalRequired: false,
    approvedBy: null,
    labels: ['pi-dev:autonomous', 'mesh:auto'],
    linearIssueId: null,
    evidencePath: null,
    createdAt: '2026-06-16T00:00:00.000Z',
  },
}]

describe('GET /api/command-centre/project-integrations/work-packets', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCreateClient.mockResolvedValue({ from: vi.fn() } as never)
    mockListWorkPackets.mockResolvedValue([] as never)
    mockSaveWorkPacket.mockImplementation(async (_db, _founderId, packet) => packet as never)
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

  it('POST creates dry-run Linear work and queues durable packets by default', async () => {
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
    expect(body.queue).toBe(true)
    expect(body.count).toBe(1)
    expect(body.queuedCount).toBe(1)
    expect(body.skippedExistingCount).toBe(0)
    expect(mockCreatePacketLinearWork).toHaveBeenCalledWith(
      packets[0].packet,
      { createIssue },
      { live: false },
    )
    expect(mockListWorkPackets).toHaveBeenCalledWith(expect.anything(), 'founder-1', { limit: 100 })
    expect(mockSaveWorkPacket).toHaveBeenCalledWith(expect.anything(), 'founder-1', packets[0].packet)
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
    expect(body.queuedCount).toBe(1)
    expect(mockCreatePacketLinearWork).toHaveBeenCalledWith(
      packets[0].packet,
      { createIssue },
      { live: true },
    )
  })

  it('POST can skip durable queue writes for a pure preview request', async () => {
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

    const res = await POST(new Request('https://unite.test/api', {
      method: 'POST',
      body: JSON.stringify({ queue: false }),
    }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.queue).toBe(false)
    expect(body.queuedCount).toBe(0)
    expect(mockListWorkPackets).not.toHaveBeenCalled()
    expect(mockSaveWorkPacket).not.toHaveBeenCalled()
  })

  it('POST skips packets that already exist in the durable queue by project and outcome', async () => {
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
    mockListWorkPackets.mockResolvedValue([{
      ...packets[0].packet,
      id: 'existing-packet-1',
    }] as never)

    const res = await POST(new Request('https://unite.test/api', { method: 'POST', body: '{}' }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.queuedCount).toBe(0)
    expect(body.skippedExistingCount).toBe(1)
    expect(mockSaveWorkPacket).not.toHaveBeenCalled()
  })
})
