import { describe, expect, it } from 'vitest'
import { buildProjectIntegrationWorkPackets } from '@/lib/command-centre/project-integration-work-packets'
import type { ProjectIntegrationStatus } from '@/lib/command-centre/project-integrations'

const baseSummary = { total: 0, connected: 0, ready: 0, mock: 0, blocked: 0, unknown: 0 }

function status(overrides: Partial<ProjectIntegrationStatus>): ProjectIntegrationStatus {
  return {
    projectName: 'Synthex',
    statusUrl: 'https://synthex.social/api/v1/connections/status',
    ok: true,
    source: 'synthex:connection-status',
    generatedAt: '2026-06-16T00:00:00.000Z',
    summary: baseSummary,
    connections: [],
    error: null,
    ...overrides,
  }
}

describe('buildProjectIntegrationWorkPackets', () => {
  it('creates work packets for blocked, mock, and unknown manifest rows only', () => {
    const packets = buildProjectIntegrationWorkPackets([
      status({
        connections: [
          { id: 'database', label: 'Database', state: 'ready' },
          { id: 'linear', label: 'Linear intake', state: 'blocked' },
          { id: 'publishing', label: 'Social publishing', state: 'mock' },
          { id: 'ai', label: 'AI provider mesh', state: 'unknown' },
        ],
      }),
    ], { now: '2026-06-16T12:00:00.000Z' })

    expect(packets.map(packet => packet.gapKind)).toEqual(['blocked', 'mock', 'unknown'])
    expect(packets.map(packet => packet.connectionId)).toEqual(['linear', 'publishing', 'ai'])
    expect(packets[0].packet).toMatchObject({
      outcome: 'Unblock Synthex integration: Linear intake',
      projectKey: 'synthex',
      lane: 'ops',
      riskLevel: 'medium',
      approvalRequired: false,
      nextActionOwner: 'hermes',
    })
    expect(packets[1].packet.outcome).toBe('Replace mock Synthex integration: Social publishing')
    expect(packets[2].packet.outcome).toBe('Classify Synthex integration: AI provider mesh')
  })

  it('creates one medium-risk packet when the manifest itself is unavailable', () => {
    const packets = buildProjectIntegrationWorkPackets([
      status({
        projectName: 'Dimitri-ITR',
        ok: false,
        error: 'status endpoint returned 503',
        summary: baseSummary,
      }),
    ], { now: '2026-06-16T12:00:00.000Z' })

    expect(packets).toHaveLength(1)
    expect(packets[0]).toMatchObject({
      projectName: 'Dimitri-ITR',
      gapKind: 'manifest-unavailable',
      connectionId: null,
    })
    expect(packets[0].packet.outcome).toBe('Restore Dimitri-ITR Mission Control integration manifest: status endpoint returned 503')
    expect(packets[0].packet.projectKey).toBe('dimitri-itr')
  })
})
