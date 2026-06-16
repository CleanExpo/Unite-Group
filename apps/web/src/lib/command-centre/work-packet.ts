// src/lib/command-centre/work-packet.ts
//
// UNI-2147 — Mission Control work-generator: the execution-packet contract.
//
// A WorkPacket binds outcome → project → agent owner → routing → Linear → approval
// → evidence, so a plain business request becomes a durable, routable unit of work.
// This module is the typed contract + builder + guarded status machine + the
// mapping to a claimable Linear issue (pi-dev:autonomous / mesh:auto labels).
//
// SAFETY: pure + dependency-free for the contract/transitions. The one side-effect
// (creating a Linear issue) is DI'd and DRY-RUN by default — a live create happens
// only when opts.live === true AND process.env.CC_LINEAR_LIVE === '1'. A packet
// that touches CRM/prod writes cannot execute without approval.

import { BUSINESS_TO_TEAM, type CreateIssueInput } from '@/lib/integrations/linear'

export type PacketStatus = 'draft' | 'routed' | 'running' | 'blocked' | 'awaiting_approval' | 'completed'
export type NextActionOwner = 'hermes' | 'pi-ceo' | 'senior_agent' | 'phill' | 'external_provider'
export type WorkLane = 'deep_reasoning' | 'coding' | 'video_media' | 'fast_drafting' | 'ops'
export type RiskLevel = 'low' | 'medium' | 'high'

/** Contract labels — the existing autonomous markers. Do NOT invent new tags. */
export const PACKET_LABELS = ['pi-dev:autonomous', 'mesh:auto'] as const

export interface WorkPacketRequest {
  /** Plain-language requested outcome. */
  outcome: string
  /** Portfolio/business key (synthex, dr, ccw, …) — routes the Linear team. */
  projectKey?: string
  clientId?: string | null
  lane?: WorkLane
  riskLevel?: RiskLevel
  /** Whether the work performs a CRM / production write (forces approval). */
  touchesCrmWrite?: boolean
}

export interface WorkPacket {
  id: string
  outcome: string
  projectKey: string
  clientId: string | null
  lane: WorkLane
  riskLevel: RiskLevel
  status: PacketStatus
  nextActionOwner: NextActionOwner
  approvalRequired: boolean
  approvedBy: string | null
  labels: string[]
  linearIssueId: string | null
  evidencePath: string | null
  createdAt: string
}

function slug(outcome: string): string {
  return outcome.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48) || 'packet'
}

/** Who owns the next action for a freshly-built packet. */
export function routeOwner(lane: WorkLane, approvalRequired: boolean): NextActionOwner {
  if (approvalRequired) return 'phill' // approval gate → Phill owns the next move
  switch (lane) {
    case 'deep_reasoning':
      return 'pi-ceo'
    case 'coding':
      return 'senior_agent'
    case 'video_media':
    case 'fast_drafting':
      return 'external_provider'
    case 'ops':
      return 'hermes'
  }
}

export interface BuildWorkPacketOptions {
  now: string
  idPrefix?: string
}

export function buildWorkPacket(request: WorkPacketRequest, opts: BuildWorkPacketOptions): WorkPacket {
  const lane: WorkLane = request.lane ?? 'ops'
  const riskLevel: RiskLevel = request.riskLevel ?? 'low'
  const approvalRequired = request.touchesCrmWrite === true || riskLevel === 'high'
  const projectKey = (request.projectKey ?? '').trim().toLowerCase() || 'unite-group'
  return {
    id: `${opts.idPrefix ?? 'wp'}-${slug(request.outcome)}-${opts.now}`,
    outcome: request.outcome,
    projectKey,
    clientId: request.clientId ?? null,
    lane,
    riskLevel,
    status: 'draft',
    nextActionOwner: routeOwner(lane, approvalRequired),
    approvalRequired,
    approvedBy: null,
    labels: [...PACKET_LABELS],
    linearIssueId: null,
    evidencePath: null,
    createdAt: opts.now,
  }
}

// ─── Guarded status machine ──────────────────────────────────────────────────

export type PacketEvent =
  | { type: 'route' }
  | { type: 'start' }
  | { type: 'block' }
  | { type: 'unblock' }
  | { type: 'approve'; by: string }
  | { type: 'complete'; evidencePath?: string }

export interface TransitionResult {
  packet: WorkPacket
  ok: boolean
  reason: string
}

const ALLOWED_FROM: Record<PacketEvent['type'], PacketStatus[]> = {
  route: ['draft'],
  start: ['routed', 'blocked', 'awaiting_approval'],
  block: ['routed', 'running', 'awaiting_approval'],
  unblock: ['blocked'],
  approve: ['awaiting_approval', 'blocked', 'routed', 'running'],
  complete: ['running'],
}

export function transitionPacket(packet: WorkPacket, event: PacketEvent): TransitionResult {
  const allowed = ALLOWED_FROM[event.type]
  if (!allowed.includes(packet.status)) {
    return { packet, ok: false, reason: `cannot ${event.type} from ${packet.status}` }
  }

  switch (event.type) {
    case 'route':
      return { packet: { ...packet, status: 'routed' }, ok: true, reason: 'routed' }
    case 'block':
      return { packet: { ...packet, status: 'blocked' }, ok: true, reason: 'blocked' }
    case 'unblock':
      return { packet: { ...packet, status: 'routed' }, ok: true, reason: 'unblocked' }
    case 'approve':
      return { packet: { ...packet, approvedBy: event.by, status: 'running' }, ok: true, reason: `approved by ${event.by}` }
    case 'start': {
      // A packet requiring approval cannot run until approved.
      if (packet.approvalRequired && !packet.approvedBy) {
        return { packet: { ...packet, status: 'awaiting_approval' }, ok: true, reason: 'approval required before running' }
      }
      return { packet: { ...packet, status: 'running' }, ok: true, reason: 'running' }
    }
    case 'complete': {
      if (packet.approvalRequired && !packet.approvedBy) {
        return { packet, ok: false, reason: 'cannot complete: approval required and not approved' }
      }
      return {
        packet: { ...packet, status: 'completed', evidencePath: event.evidencePath ?? packet.evidencePath },
        ok: true,
        reason: 'completed',
      }
    }
  }
}

// ─── Linear mapping + creation (DI, double-gated) ────────────────────────────

const LANE_PRIORITY: Record<WorkLane, number> = { deep_reasoning: 2, coding: 2, ops: 3, fast_drafting: 3, video_media: 3 }

export function toLinearIssueInput(packet: WorkPacket): CreateIssueInput {
  const teamKey = BUSINESS_TO_TEAM[packet.projectKey] ?? 'UNI'
  const description = [
    packet.outcome,
    '',
    `Project: ${packet.projectKey}${packet.clientId ? ` · client ${packet.clientId}` : ''}`,
    `Lane: ${packet.lane} · risk: ${packet.riskLevel}`,
    `Next action owner: ${packet.nextActionOwner}`,
    `Approval required: ${packet.approvalRequired}`,
    `Contract: ${PACKET_LABELS.join(' · ')}`,
  ].join('\n')
  return {
    title: packet.outcome.slice(0, 120),
    description,
    teamKey,
    priority: packet.riskLevel === 'high' ? 1 : LANE_PRIORITY[packet.lane],
    labelNames: [...packet.labels],
  }
}

export interface WorkPacketDeps {
  createIssue: (input: CreateIssueInput) => Promise<{ id: string; url?: string }>
}

export interface CreatePacketOptions {
  live?: boolean
}

export interface CreatePacketResult {
  packet: WorkPacket
  mode: 'live' | 'dry-run'
  linearInput: CreateIssueInput
  created: { id: string; url?: string } | null
}

/**
 * Optionally create a claimable Linear issue for a packet. DRY-RUN by default;
 * a live create needs opts.live === true AND CC_LINEAR_LIVE === '1'.
 */
export async function createPacketLinearWork(
  packet: WorkPacket,
  deps: WorkPacketDeps,
  opts: CreatePacketOptions = {},
): Promise<CreatePacketResult> {
  const linearInput = toLinearIssueInput(packet)
  const isLive = opts.live === true && process.env.CC_LINEAR_LIVE === '1'
  if (!isLive) {
    return { packet, mode: 'dry-run', linearInput, created: null }
  }
  const created = await deps.createIssue(linearInput)
  return { packet: { ...packet, linearIssueId: created.id }, mode: 'live', linearInput, created }
}
