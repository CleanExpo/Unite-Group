import type { ProjectConnection, ProjectIntegrationStatus } from './project-integrations'
import { buildWorkPacket, type WorkPacket, type WorkPacketRequest } from './work-packet'

export type IntegrationGapKind = 'manifest-unavailable' | 'blocked' | 'mock' | 'unknown'
type ConnectionGapKind = Exclude<IntegrationGapKind, 'manifest-unavailable'>

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
