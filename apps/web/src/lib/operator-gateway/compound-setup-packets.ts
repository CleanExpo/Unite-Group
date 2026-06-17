import { readFile } from 'node:fs/promises'
import path from 'node:path'

export type CompoundSetupPriority = 'P0' | 'P1' | 'P2'
export type CompoundSetupStatus = 'ready' | 'blocked' | 'planned'

export interface CompoundSetupPacket {
  packet_id: string
  project_key: string
  project_name: string
  repo_hint: string
  priority: CompoundSetupPriority
  status: CompoundSetupStatus
  objective: string
  recommended_connectors: string[]
  safe_local_checks: string[]
  blocked_install_commands: string[]
  evidence_outputs: string[]
  linear_labels: string[]
  hard_gates: string[]
  next_action: string
}

interface CompoundSetupPacketFile {
  $schema_version?: string
  generated_note?: string
  source_refs: string[]
  packets: CompoundSetupPacket[]
}

export interface CompoundSetupPacketStatus {
  source: 'static_compound_setup_packet_registry'
  generatedNote: string
  sourceRefs: string[]
  packetCount: number
  readyCount: number
  p0Count: number
  projects: string[]
  noAutoInstall: true
  noApiKeyMode: true
  externalExecutionEnabled: false
  productionDbTouched: false
  nextPacketId: string
  packets: CompoundSetupPacket[]
}

function setupPacketPath(): string {
  return path.join(process.cwd(), 'data', 'operator-gateway', 'compound-engineering', 'setup-packets.json')
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

function isPacket(value: unknown): value is CompoundSetupPacket {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    typeof v.packet_id === 'string' &&
    typeof v.project_key === 'string' &&
    typeof v.project_name === 'string' &&
    typeof v.repo_hint === 'string' &&
    (v.priority === 'P0' || v.priority === 'P1' || v.priority === 'P2') &&
    (v.status === 'ready' || v.status === 'blocked' || v.status === 'planned') &&
    typeof v.objective === 'string' &&
    isStringArray(v.recommended_connectors) &&
    isStringArray(v.safe_local_checks) &&
    isStringArray(v.blocked_install_commands) &&
    isStringArray(v.evidence_outputs) &&
    isStringArray(v.linear_labels) &&
    isStringArray(v.hard_gates) &&
    typeof v.next_action === 'string'
  )
}

export async function getCompoundSetupPackets(): Promise<CompoundSetupPacket[]> {
  const raw = await readFile(setupPacketPath(), 'utf-8')
  const parsed = JSON.parse(raw) as CompoundSetupPacketFile

  if (!parsed || !Array.isArray(parsed.packets)) {
    throw new Error('compound setup packets: malformed setup-packets.json (missing "packets" array)')
  }

  const packets = parsed.packets.filter(isPacket)
  if (packets.length !== parsed.packets.length) {
    throw new Error('compound setup packets: one or more packets failed schema validation')
  }

  return packets
}

export async function getCompoundSetupPacketStatus(): Promise<CompoundSetupPacketStatus> {
  const raw = await readFile(setupPacketPath(), 'utf-8')
  const parsed = JSON.parse(raw) as CompoundSetupPacketFile

  if (!parsed || !Array.isArray(parsed.source_refs) || !Array.isArray(parsed.packets)) {
    throw new Error('compound setup packets: malformed setup-packets.json')
  }

  const packets = await getCompoundSetupPackets()
  const nextPacket = packets.find((packet) => packet.priority === 'P0' && packet.status === 'ready') ?? packets[0]

  return {
    source: 'static_compound_setup_packet_registry',
    generatedNote: parsed.generated_note ?? '',
    sourceRefs: [...parsed.source_refs],
    packetCount: packets.length,
    readyCount: packets.filter((packet) => packet.status === 'ready').length,
    p0Count: packets.filter((packet) => packet.priority === 'P0').length,
    projects: packets.map((packet) => packet.project_name),
    noAutoInstall: true,
    noApiKeyMode: true,
    externalExecutionEnabled: false,
    productionDbTouched: false,
    nextPacketId: nextPacket?.packet_id ?? 'none',
    packets: packets.map((packet) => ({
      ...packet,
      recommended_connectors: [...packet.recommended_connectors],
      safe_local_checks: [...packet.safe_local_checks],
      blocked_install_commands: [...packet.blocked_install_commands],
      evidence_outputs: [...packet.evidence_outputs],
      linear_labels: [...packet.linear_labels],
      hard_gates: [...packet.hard_gates],
    })),
  }
}
