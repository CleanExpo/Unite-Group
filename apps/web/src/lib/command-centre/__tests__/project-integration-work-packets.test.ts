import { describe, expect, it } from 'vitest'
import {
  buildEndpointMissingWorkPackets,
  buildProjectIntegrationWorkPackets,
} from '@/lib/command-centre/project-integration-work-packets'
import type { ProjectIntegrationStatus } from '@/lib/command-centre/project-integrations'
import type { CommandCentreProject } from '@/lib/command-centre/registry'

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

function project(overrides: Partial<CommandCentreProject> & Pick<CommandCentreProject, 'name'>): CommandCentreProject {
  return {
    name: overrides.name,
    repo_path: 'D:\\Example',
    github_repo: null,
    business_purpose: 'Example',
    brand_rules_ref: 'example',
    deployment_target: 'Vercel',
    owner: 'phill',
    status: 'active',
    evidence_vault_path: 'docs/example',
    validation_commands: [],
    linear_prefix: 'UNI',
    production_url: null,
    integration_status_url: null,
    ...overrides,
  }
}

describe('buildEndpointMissingWorkPackets', () => {
  it('emits an endpoint-missing packet for active and stub projects with no status URL', () => {
    const packets = buildEndpointMissingWorkPackets(
      [
        project({ name: 'RestoreAssist', status: 'active' }),
        project({ name: 'CARSI', status: 'stub' }),
      ],
      { now: '2026-06-16T12:00:00.000Z' },
    )

    expect(packets).toHaveLength(2)
    expect(packets.map(packet => packet.gapKind)).toEqual(['endpoint-missing', 'endpoint-missing'])
    expect(packets.map(packet => packet.projectName)).toEqual(['RestoreAssist', 'CARSI'])
  })

  it('does NOT emit a packet for a project that already has an integration status URL', () => {
    const packets = buildEndpointMissingWorkPackets(
      [
        project({
          name: 'Synthex',
          integration_status_url: 'https://synthex.social/api/v1/connections/status',
        }),
        project({ name: 'Whitespace', integration_status_url: '   ' }),
      ],
      { now: '2026-06-16T12:00:00.000Z' },
    )

    expect(packets.map(packet => packet.projectName)).toEqual(['Whitespace'])
  })

  it('does NOT emit packets for archived or paused projects', () => {
    const packets = buildEndpointMissingWorkPackets(
      [
        project({ name: 'Archived', status: 'archived' }),
        project({ name: 'Paused', status: 'paused' }),
        project({ name: 'Active', status: 'active' }),
      ],
      { now: '2026-06-16T12:00:00.000Z' },
    )

    expect(packets.map(packet => packet.projectName)).toEqual(['Active'])
  })

  it('produces the expected packet shape', () => {
    const [{ packet, ...meta }] = buildEndpointMissingWorkPackets(
      [project({ name: 'DR-NRPG', status: 'active' })],
      { now: '2026-06-16T12:00:00.000Z' },
    )

    expect(meta).toMatchObject({
      projectName: 'DR-NRPG',
      gapKind: 'endpoint-missing',
      connectionId: null,
      connectionLabel: null,
    })
    expect(packet).toMatchObject({
      outcome: 'Stand up Mission Control connections/status endpoint for DR-NRPG',
      projectKey: 'dr-nrpg',
      lane: 'ops',
      riskLevel: 'low',
      approvalRequired: false,
      nextActionOwner: 'hermes',
    })
    expect(packet.id.startsWith('endpoint-dr-nrpg-')).toBe(true)
  })

  it('is deterministic over the injected now', () => {
    const args = [project({ name: 'ATO-APP', status: 'active' })]
    const a = buildEndpointMissingWorkPackets(args, { now: '2026-06-16T12:00:00.000Z' })
    const b = buildEndpointMissingWorkPackets(args, { now: '2026-06-16T12:00:00.000Z' })
    const c = buildEndpointMissingWorkPackets(args, { now: '2026-06-17T09:30:00.000Z' })

    expect(a).toEqual(b)
    expect(a[0].packet.id).not.toBe(c[0].packet.id)
    expect(a[0].packet.createdAt).toBe('2026-06-16T12:00:00.000Z')
    expect(c[0].packet.createdAt).toBe('2026-06-17T09:30:00.000Z')
  })
})
