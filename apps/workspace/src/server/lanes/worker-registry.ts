import { hostname } from 'node:os'
import { CODEX_ACCOUNT, DEFAULT_ROLE_ACCOUNT_MAP } from './backend-registry'
import { cliAccountAvailable, probeGateway } from './lane-availability'
import type { Lane, LaneBackend } from './types'

export type NexusWorkerId =
  'claude-cli' | 'codex-cli' | 'hermes-gateway' | 'mac-mini-tailscale'

export type NexusMachineStatus = 'local' | 'unverified'

export interface NexusWorkerDescriptor {
  id: NexusWorkerId
  label: string
  transport: 'local-cli' | 'local-gateway' | 'tailscale'
  machineId: string
  machineStatus: NexusMachineStatus
  enabled: boolean
  reason?: string
}

export interface WorkerRegistryProbe {
  machineId?: string
  claudeAvailable: boolean
  codexAvailable: boolean
  hermesAvailable: boolean
}

export function workerIdForBackend(backend: LaneBackend): NexusWorkerId {
  if (backend.kind === 'gateway') return 'hermes-gateway'
  return backend.tool === 'codex' ? 'codex-cli' : 'claude-cli'
}

export function workerIdForLane(lane: Lane): NexusWorkerId {
  return workerIdForBackend(lane.backend)
}

export function buildWorkerRegistry(
  probe: WorkerRegistryProbe,
): Array<NexusWorkerDescriptor> {
  const machineId = probe.machineId ?? hostname()
  return [
    {
      id: 'claude-cli',
      label: 'Claude CLI',
      transport: 'local-cli',
      machineId,
      machineStatus: 'local',
      enabled: probe.claudeAvailable,
      ...(!probe.claudeAvailable
        ? { reason: 'No admitted local Claude account' }
        : {}),
    },
    {
      id: 'codex-cli',
      label: 'Codex',
      transport: 'local-cli',
      machineId,
      machineStatus: 'local',
      enabled: probe.codexAvailable,
      ...(!probe.codexAvailable
        ? { reason: 'No admitted local Codex account' }
        : {}),
    },
    {
      id: 'hermes-gateway',
      label: 'Hermes gateway',
      transport: 'local-gateway',
      machineId,
      machineStatus: 'local',
      enabled: probe.hermesAvailable,
      ...(!probe.hermesAvailable
        ? { reason: 'Hermes gateway is unavailable' }
        : {}),
    },
    {
      id: 'mac-mini-tailscale',
      label: 'Mac Mini over Tailscale',
      transport: 'tailscale',
      machineId: 'unverified-mac-mini',
      machineStatus: 'unverified',
      enabled: false,
      reason:
        'Interface only — remote identity, admission and termination are not verified',
    },
  ]
}

export async function probeWorkerRegistry(
  gatewayUrl: string,
): Promise<Array<NexusWorkerDescriptor>> {
  const claudeAvailable = Object.values(DEFAULT_ROLE_ACCOUNT_MAP).some(
    (account) => cliAccountAvailable(account, 'claude-code'),
  )
  return buildWorkerRegistry({
    claudeAvailable,
    codexAvailable: cliAccountAvailable(CODEX_ACCOUNT, 'codex'),
    hermesAvailable: await probeGateway(gatewayUrl),
  })
}
