// src/lib/founder-chat/mission-receipt.ts
// The receipt for one founder chat turn (Mission Control chat W1a): a closed,
// exported discriminated union, the founder-facing copy for each kind, and the
// readback mapping from a cc_tasks row. A receipt is rendered only from what the
// server observed in this request — never from client-stored data.

import type { AppendTaskEventOnceResult, CommandCentreTask, TaskStatus } from '@/lib/command-centre/tasks'

/** Every cc_tasks status the readback can show, plus 'unknown' for anything unmapped. */
export type ReceiptStatus = TaskStatus | 'unknown'

const KNOWN_STATUSES: readonly TaskStatus[] = [
  'proposed',
  'queued',
  'running',
  'blocked',
  'awaiting_approval',
  'done',
  'failed',
]

export interface ReceiptMission {
  taskId: string
  externalRef: string
  status: ReceiptStatus
  title: string
  projectKey: string | null
  humanApprovalRequired: boolean
}

export type MissionReceipt =
  // POST: the row AND its created audit event were both returned.
  | ({ kind: 'recorded' } & ReceiptMission)
  // POST: the row exists but its created event could not be written.
  | ({ kind: 'recorded_unaudited' } & ReceiptMission)
  | { kind: 'needs_project' }
  | { kind: 'registry_unavailable' }
  | { kind: 'unsupported_action' }
  | { kind: 'failed_to_record' }
  | { kind: 'not_confirmed' }
  | { kind: 'conflict' }
  // GET readback: the row read now for (founder, external_ref).
  | ({ kind: 'mission' } & ReceiptMission)
  | { kind: 'not_found' }
  | { kind: 'unavailable' }

export type MissionReceiptKind = MissionReceipt['kind']

export const RECEIPT_COPY = {
  recorded: 'Draft recorded. Needs preparation before approval. No worker assigned.',
  recorded_unaudited: 'Draft recorded, but its audit entry could not be written. Check Missions.',
  needs_project: 'Which project is this for?',
  registry_unavailable: "Couldn't check the project list, so nothing was recorded.",
  unsupported_action: 'That needs the approval gate. Nothing was recorded or started.',
  failed_to_record: 'Not recorded.',
  not_confirmed: 'Could not confirm. Check Missions.',
  conflict: 'That turn was already used for a different request.',
  mission: 'Mission status is read from Missions now.',
  not_found: 'This draft no longer exists.',
  unavailable: 'Mission status is unavailable right now.',
} as const satisfies Record<MissionReceiptKind, string>

export function receiptCopy(receipt: MissionReceipt): string {
  return RECEIPT_COPY[receipt.kind]
}

/** Map any stored status over the full enum; anything else is 'unknown', never guessed. */
export function readbackStatus(raw: unknown): ReceiptStatus {
  return KNOWN_STATUSES.find((status) => status === raw) ?? 'unknown'
}

type TaskRowLike = Pick<
  CommandCentreTask,
  'id' | 'external_ref' | 'status' | 'title' | 'project_key' | 'human_approval_required'
>

function missionFields(task: TaskRowLike): ReceiptMission {
  return {
    taskId: task.id,
    externalRef: task.external_ref ?? '',
    status: readbackStatus(task.status),
    title: task.title,
    projectKey: task.project_key ?? null,
    humanApprovalRequired: task.human_approval_required === true,
  }
}

/**
 * The only way a POST receipt says "recorded": the task row AND the created
 * event result were both returned. A replayed event (23505, event null,
 * created false) still proves the audit row exists.
 */
export function receiptFrom(
  task: TaskRowLike,
  event: AppendTaskEventOnceResult | null,
): MissionReceipt {
  if (!event) return { kind: 'recorded_unaudited', ...missionFields(task) }
  return { kind: 'recorded', ...missionFields(task) }
}

/** GET readback: built only from the cc_tasks row read in this request. */
export function readbackReceipt(row: TaskRowLike): MissionReceipt {
  return { kind: 'mission', ...missionFields(row) }
}

const RECEIPT_KINDS = new Set<string>(Object.keys(RECEIPT_COPY))

/** Client-side guard for an SSE `{mission}` frame: a known kind on a plain object. */
export function isMissionReceipt(value: unknown): value is MissionReceipt {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const kind = (value as { kind?: unknown }).kind
  if (typeof kind !== 'string' || !RECEIPT_KINDS.has(kind)) return false
  if (kind === 'recorded' || kind === 'recorded_unaudited' || kind === 'mission') {
    const v = value as Record<string, unknown>
    return typeof v.taskId === 'string' && typeof v.status === 'string' && typeof v.title === 'string'
  }
  return true
}
