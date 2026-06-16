// src/lib/command-centre/work-packet-store.ts
//
// UNI-2147 — durable persistence for WorkPacket. A WorkPacket is an in-memory
// execution contract (see ./work-packet.ts); on its own it evaporates between
// requests. This module backs it with the existing cc_tasks store (./tasks.ts)
// so a routed packet survives a process restart, an approval round-trip, and a
// status transition.
//
// Mapping strategy:
//  - The packet's stable fields land on dedicated cc_tasks columns where one
//    exists (status, project_key, linear_id, evidence_path, human_approval_*).
//  - The remaining packet-specific fields (lane, riskLevel, nextActionOwner,
//    approvedBy, labels, clientId, projectKey, outcome) live inside
//    cc_tasks.metadata under a namespaced `packet` key so taskToPacket can
//    reconstruct the packet losslessly.
//
// SAFETY:
//  - Pure mapping helpers (packetToCreateTaskInput / taskToPacket) — no I/O.
//  - Store functions take the SupabaseLike DI; a real client is NEVER imported.
//  - No secrets are written to metadata (the packet carries none, and we copy
//    only the whitelisted packet fields).
//  - Forward-only and defensive: missing rows resolve to null, never throw.

import {
  type WorkPacket,
  type PacketStatus,
  type PacketEvent,
  type WorkLane,
  type RiskLevel,
  type NextActionOwner,
  transitionPacket,
} from './work-packet'
import {
  createTask,
  listTasks,
  updateTaskStatus,
  appendTaskEvent,
  type CommandCentreTask,
  type CreateTaskInput,
  type TaskStatus,
  type TaskEventType,
  type SupabaseLike,
} from './tasks'

// ─── Status mapping (PacketStatus <-> TaskStatus) ────────────────────────────

// PacketStatus has six members; TaskStatus has seven. Map each packet status to
// the closest existing TaskStatus value (no new enum values are invented).
const PACKET_TO_TASK_STATUS: Record<PacketStatus, TaskStatus> = {
  draft: 'proposed',
  routed: 'queued',
  running: 'running',
  blocked: 'blocked',
  awaiting_approval: 'awaiting_approval',
  completed: 'done',
}

const TASK_TO_PACKET_STATUS: Record<TaskStatus, PacketStatus> = {
  proposed: 'draft',
  queued: 'routed',
  running: 'running',
  blocked: 'blocked',
  awaiting_approval: 'awaiting_approval',
  done: 'completed',
  // cc_tasks can also report 'failed'; a failed packet is surfaced as blocked,
  // the nearest packet status that signals "not progressing".
  failed: 'blocked',
}

export function packetStatusToTaskStatus(status: PacketStatus): TaskStatus {
  return PACKET_TO_TASK_STATUS[status]
}

export function taskStatusToPacketStatus(status: TaskStatus): PacketStatus {
  return TASK_TO_PACKET_STATUS[status]
}

// ─── Metadata shape (packet-specific fields persisted in cc_tasks.metadata) ───

// The namespaced metadata key; the value below is the lossless remainder of the
// packet that has no dedicated cc_tasks column.
const PACKET_METADATA_KEY = 'packet' as const

interface PacketMetadata {
  lane: WorkLane
  riskLevel: RiskLevel
  nextActionOwner: NextActionOwner
  approvedBy: string | null
  labels: string[]
  clientId: string | null
  projectKey: string
  outcome: string
  createdAt: string
}

function readPacketMetadata(metadata: Record<string, unknown>): Partial<PacketMetadata> {
  const raw = metadata[PACKET_METADATA_KEY]
  if (!raw || typeof raw !== 'object') return {}
  return raw as Partial<PacketMetadata>
}

// ─── Pure mappers (exported for tests) ───────────────────────────────────────

/**
 * Map a WorkPacket to the cc_tasks insert input. Stable fields go to columns;
 * the packet-specific remainder goes to metadata.packet. No secrets are copied.
 */
export function packetToCreateTaskInput(packet: WorkPacket, founderId: string): CreateTaskInput {
  const metadata: Record<string, unknown> = {
    [PACKET_METADATA_KEY]: {
      lane: packet.lane,
      riskLevel: packet.riskLevel,
      nextActionOwner: packet.nextActionOwner,
      approvedBy: packet.approvedBy,
      labels: [...packet.labels],
      clientId: packet.clientId,
      projectKey: packet.projectKey,
      outcome: packet.outcome,
      createdAt: packet.createdAt,
    } satisfies PacketMetadata,
  }

  return {
    founderId,
    externalRef: packet.id,
    title: packet.outcome.slice(0, 120),
    objective: packet.outcome,
    projectKey: packet.projectKey,
    status: packetStatusToTaskStatus(packet.status),
    agentOwner: packet.nextActionOwner,
    riskLevel: packet.riskLevel,
    humanApprovalRequired: packet.approvalRequired,
    evidencePath: packet.evidencePath,
    linearId: packet.linearIssueId,
    metadata,
  }
}

/**
 * Reconstruct a WorkPacket from a persisted cc_tasks row. The packet id is the
 * row's external_ref (its original packet id); fields are read back from the
 * dedicated columns first, falling back to metadata for packet-specific data.
 */
export function taskToPacket(task: CommandCentreTask): WorkPacket {
  const meta = readPacketMetadata(task.metadata)
  return {
    id: task.external_ref ?? task.id,
    outcome: meta.outcome ?? task.objective ?? task.title,
    projectKey: meta.projectKey ?? task.project_key ?? 'unite-group',
    clientId: meta.clientId ?? null,
    lane: meta.lane ?? 'ops',
    riskLevel: meta.riskLevel ?? 'low',
    status: taskStatusToPacketStatus(task.status),
    nextActionOwner: meta.nextActionOwner ?? 'hermes',
    approvalRequired: task.human_approval_required,
    approvedBy: meta.approvedBy ?? null,
    labels: meta.labels ?? [],
    linearIssueId: task.linear_id,
    evidencePath: task.evidence_path,
    createdAt: meta.createdAt ?? task.created_at,
  }
}

// ─── Store functions (SupabaseLike DI; never import a real client) ───────────

export interface ListWorkPacketsFilter {
  status?: PacketStatus
  projectKey?: string
  limit?: number
}

export interface ApplyPacketTransitionResult {
  ok: boolean
  packet: WorkPacket | null
  reason: string
}

/**
 * Persist a packet as a new cc_tasks row and return the round-tripped packet
 * (read back through taskToPacket so callers see exactly what was stored).
 */
export async function saveWorkPacket(
  db: SupabaseLike,
  founderId: string,
  packet: WorkPacket,
): Promise<WorkPacket> {
  const input = packetToCreateTaskInput(packet, founderId)
  const task = await createTask(input, db)
  return taskToPacket(task)
}

/**
 * Fetch a persisted packet by its packet id (stored as external_ref). Returns
 * null when no founder-scoped row matches. Defensive: a missing row is a quiet
 * null, never a throw.
 */
export async function getWorkPacket(
  db: SupabaseLike,
  founderId: string,
  id: string,
): Promise<WorkPacket | null> {
  // The packet id is the row's external_ref, not its primary key, so list the
  // founder's tasks and match on external_ref / reconstructed packet id.
  const tasks = await listTasks({ founderId, limit: 100 }, db)
  const match = tasks.find((t) => (t.external_ref ?? t.id) === id)
  return match ? taskToPacket(match) : null
}

/**
 * List a founder's persisted packets, optionally filtered by packet status
 * and/or project key. Status is translated to the underlying TaskStatus.
 */
export async function listWorkPackets(
  db: SupabaseLike,
  founderId: string,
  filter: ListWorkPacketsFilter = {},
): Promise<WorkPacket[]> {
  const tasks = await listTasks(
    {
      founderId,
      status: filter.status ? packetStatusToTaskStatus(filter.status) : undefined,
      projectKey: filter.projectKey,
      limit: filter.limit,
    },
    db,
  )
  return tasks.map(taskToPacket)
}

// Map a packet transition event to the cc_task_events audit type, so the
// append-only trail mirrors the durable status change.
const EVENT_TO_TASK_EVENT_TYPE: Record<PacketEvent['type'], TaskEventType> = {
  route: 'status_changed',
  start: 'started',
  block: 'blocked',
  unblock: 'status_changed',
  approve: 'approved',
  complete: 'completed',
}

/**
 * Load a packet, run the guarded transition from work-packet.ts, and on success
 * persist the new status (updateTaskStatus) plus an append-only audit event
 * (appendTaskEvent). On a refused transition nothing is written.
 *
 * Returns { ok, packet, reason }:
 *  - ok=false, packet=null when the packet does not exist.
 *  - ok=false, packet=<unchanged> when the transition is refused (e.g. trying
 *    to complete an approval-required packet that has not been approved).
 *  - ok=true,  packet=<new>      when the transition is applied and persisted.
 */
export async function applyPacketTransition(
  db: SupabaseLike,
  founderId: string,
  id: string,
  event: PacketEvent,
): Promise<ApplyPacketTransitionResult> {
  const tasks = await listTasks({ founderId, limit: 100 }, db)
  const task = tasks.find((t) => (t.external_ref ?? t.id) === id)
  if (!task) {
    return { ok: false, packet: null, reason: `packet ${id} not found` }
  }

  const current = taskToPacket(task)
  const result = transitionPacket(current, event)
  if (!result.ok) {
    return { ok: false, packet: current, reason: result.reason }
  }

  const next = result.packet
  // Persist the new status against the row's primary key. The append-only event
  // records the rest of the transition (actor, from/to, reason) for the audit
  // trail; the returned packet carries the full in-memory transition result.
  await updateTaskStatus(
    { founderId, taskId: task.id, status: packetStatusToTaskStatus(next.status) },
    db,
  )
  await appendTaskEvent(
    {
      founderId,
      taskId: task.id,
      type: EVENT_TO_TASK_EVENT_TYPE[event.type],
      actor: event.type === 'approve' ? event.by : 'system',
      payload: { packetId: id, from: current.status, to: next.status, reason: result.reason },
    },
    db,
  )

  return { ok: true, packet: next, reason: result.reason }
}
