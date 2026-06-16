import type { CommandCentreProject } from './registry'
import type { ProjectConnection, ProjectIntegrationStatus } from './project-integrations'
import { buildWorkPacket, type WorkPacket, type WorkPacketRequest } from './work-packet'

export type IntegrationGapKind = 'manifest-unavailable' | 'blocked' | 'mock' | 'unknown' | 'endpoint-missing'
type ConnectionGapKind = Exclude<IntegrationGapKind, 'manifest-unavailable' | 'endpoint-missing'>

export interface ProjectIntegrationWorkPacket {
  projectName: string
  gapKind: IntegrationGapKind
  connectionId: string | null
  connectionLabel: string | null
  packet: WorkPacket
}

export interface BuildIntegrationWorkPacketOptions {
  now: string
}

function projectKey(projectName: string): string {
  return projectName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'unite-group'
}

function requestForConnection(
  status: ProjectIntegrationStatus,
  connection: ProjectConnection,
  gapKind: ConnectionGapKind,
): WorkPacketRequest {
  const action =
    gapKind === 'blocked'
      ? 'Unblock'
      : gapKind === 'mock'
        ? 'Replace mock'
        : 'Classify'
  return {
    outcome: `${action} ${status.projectName} integration: ${connection.label}`,
    projectKey: projectKey(status.projectName),
    lane: 'ops',
    riskLevel: gapKind === 'blocked' ? 'medium' : 'low',
    touchesCrmWrite: false,
  }
}

function requestForUnavailableManifest(status: ProjectIntegrationStatus): WorkPacketRequest {
  return {
    outcome: `Restore ${status.projectName} Mission Control integration manifest${status.error ? `: ${status.error}` : ''}`,
    projectKey: projectKey(status.projectName),
    lane: 'ops',
    riskLevel: 'medium',
    touchesCrmWrite: false,
  }
}

type EndpointMissingProject = Pick<CommandCentreProject, 'name' | 'status' | 'integration_status_url'>

function requestForEndpointMissing(project: EndpointMissingProject): WorkPacketRequest {
  return {
    outcome: `Stand up Mission Control connections/status endpoint for ${project.name}`,
    projectKey: projectKey(project.name),
    lane: 'ops',
    riskLevel: 'low',
    touchesCrmWrite: false,
  }
}

function hasIntegrationStatusUrl(project: EndpointMissingProject): boolean {
  return Boolean(project.integration_status_url?.trim())
}

function shouldCreateForConnection(connection: ProjectConnection): ConnectionGapKind | null {
  if (connection.state === 'blocked') return 'blocked'
  if (connection.state === 'mock') return 'mock'
  if (connection.state === 'unknown') return 'unknown'
  return null
}

export function buildProjectIntegrationWorkPackets(
  statuses: ProjectIntegrationStatus[],
  opts: BuildIntegrationWorkPacketOptions,
): ProjectIntegrationWorkPacket[] {
  const packets: ProjectIntegrationWorkPacket[] = []

  for (const status of statuses) {
    if (!status.ok || status.error) {
      packets.push({
        projectName: status.projectName,
        gapKind: 'manifest-unavailable',
        connectionId: null,
        connectionLabel: null,
        packet: buildWorkPacket(requestForUnavailableManifest(status), {
          now: opts.now,
          idPrefix: `manifest-${projectKey(status.projectName)}`,
        }),
      })
      continue
    }

    for (const connection of status.connections) {
      const gapKind = shouldCreateForConnection(connection)
      if (!gapKind) continue
      packets.push({
        projectName: status.projectName,
        gapKind,
        connectionId: connection.id,
        connectionLabel: connection.label,
        packet: buildWorkPacket(requestForConnection(status, connection, gapKind), {
          now: opts.now,
          idPrefix: `manifest-${projectKey(status.projectName)}-${connection.id}`,
        }),
      })
    }
  }

  return packets
}

/**
 * Surface registered portfolio projects that have NO integration status endpoint
 * as an honest tracked gap. These projects are dropped by
 * `loadProjectIntegrationStatuses` (no URL → no manifest), so without this they
 * never become RANA-claimable work. Additive sibling to
 * `buildProjectIntegrationWorkPackets`; deterministic over `opts.now`.
 *
 * A project qualifies when it is not archived/paused AND has no non-empty
 * `integration_status_url`.
 */
export function buildEndpointMissingWorkPackets(
  projects: EndpointMissingProject[],
  opts: BuildIntegrationWorkPacketOptions,
): ProjectIntegrationWorkPacket[] {
  const packets: ProjectIntegrationWorkPacket[] = []

  for (const project of projects) {
    if (project.status === 'archived' || project.status === 'paused') continue
    if (hasIntegrationStatusUrl(project)) continue

    packets.push({
      projectName: project.name,
      gapKind: 'endpoint-missing',
      connectionId: null,
      connectionLabel: null,
      packet: buildWorkPacket(requestForEndpointMissing(project), {
        now: opts.now,
        idPrefix: `endpoint-${projectKey(project.name)}`,
      }),
    })
  }

  return packets
}
