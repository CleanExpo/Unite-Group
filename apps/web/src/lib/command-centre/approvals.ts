// src/lib/command-centre/approvals.ts
//
// CC-11 — Approvals lane. Typed accessors over the cc_approvals table
// (20260604010000_cc_command_centre_phase2.sql) plus the orchestration that
// turns an approval decision into a task status transition + audit event.
//
// No remote calls are made at import time — the Supabase server client is
// created lazily inside each accessor (matching tasks.ts). All rows are
// founder-scoped by RLS (founder_id = auth.uid()).

import { createClient } from '@/lib/supabase/server'
import {
  appendTaskEvent,
  updateTaskStatusGuarded,
  getTaskById,
  type SupabaseLike,
  type GuardedUpdateClientLike,
  type TaskStatus,
  type CommandCentreTask,
} from './tasks'

// ─── Types (mirror the SQL schema) ────────────────────────────────────────────

/** cc_approvals.decision CHECK (approve/reject/edit/defer). */
export type ApprovalDecision = 'approve' | 'reject' | 'edit' | 'defer'

/** An approval decision row (cc_approvals). */
export interface Approval {
  id: string
  founder_id: string
  task_id: string
  decision: ApprovalDecision
  approver: string
  note: string | null
  at: string
}

export interface RecordApprovalInput {
  founderId: string
  taskId: string
  decision: ApprovalDecision
  approver?: string
  note?: string | null
  /**
   * Senior Board verdict persisted on the task (metadata.board.verdict), when
   * one exists — recorded in the audit event so every APPROVE/REJECT carries
   * the board context it was made against (UNI-2378 E2E finding 3).
   */
  boardVerdict?: string | null
  /**
   * UNI-2436 TOCTOU guard: the task status the caller read immediately before
   * calling. When present and the decision implies a transition, the status
   * write is made conditional on the task still holding this value (guarded
   * conditional update); a zero-row result is surfaced as a conflict instead of
   * clobbering a newer status. Omitted (legacy callers) → unconditional update.
   */
  expectedStatus?: TaskStatus
}

export interface ListApprovalsFilter {
  founderId: string
  taskId: string
  limit?: number
}

// Table name constant — single source of truth, asserted by tests.
export const CC_APPROVALS_TABLE = 'cc_approvals'

/**
 * Map an approval decision to the resulting task status.
 *  - approve → queued   (promoted into the actionable queue)
 *  - reject  → failed   (closed out, audited)
 *  - defer   → blocked  (parked; can be revisited)
 *  - edit    → null     (stays as-is; the note is recorded, no transition)
 * Pure + exported so the mapping is unit-tested without any DB.
 */
export function decisionToStatus(decision: ApprovalDecision): TaskStatus | null {
  switch (decision) {
    case 'approve':
      return 'queued'
    case 'reject':
      return 'failed'
    case 'defer':
      return 'blocked'
    case 'edit':
      return null
  }
}

// ─── Accessors ────────────────────────────────────────────────────────────────

/** Insert an approval decision row. Returns the inserted row. */
export async function recordApproval(
  input: RecordApprovalInput,
  client?: SupabaseLike,
): Promise<Approval> {
  const db = client ?? ((await createClient()) as unknown as SupabaseLike)

  const row = {
    founder_id: input.founderId,
    task_id: input.taskId,
    decision: input.decision,
    approver: input.approver ?? 'founder',
    note: input.note ?? null,
  }

  const { data, error } = await db.from(CC_APPROVALS_TABLE).insert(row).select('*').single()
  if (error) throw new Error(`recordApproval failed: ${error.message}`)
  return data as Approval
}

/** List a task's approval history, newest first. Capped at 100 rows. */
export async function listApprovalsForTask(
  filter: ListApprovalsFilter,
  client?: SupabaseLike,
): Promise<Approval[]> {
  const db = client ?? ((await createClient()) as unknown as SupabaseLike)
  const limit = Math.min(Math.max(filter.limit ?? 50, 1), 100)

  const { data, error } = await db
    .from(CC_APPROVALS_TABLE)
    .select('*')
    .eq('founder_id', filter.founderId)
    .eq('task_id', filter.taskId)
    .order('at', { ascending: false })
    .limit(limit)

  if (error) throw new Error(`listApprovalsForTask failed: ${error.message}`)
  return (data as Approval[]) ?? []
}

export interface ApplyApprovalResult {
  /**
   * The recorded approval row, or null on a conflict — on a lost TOCTOU race the
   * decision was NOT applied, so no cc_approvals audit row is written for it
   * (UNI-2436: an approval intent must not be recorded for a transition that did
   * not happen).
   */
  approval: Approval | null
  /**
   * The updated task, or null if the decision implied no status change (edit) or
   * the guarded write lost a TOCTOU race (see `conflict`).
   */
  task: CommandCentreTask | null
  /**
   * UNI-2436 — true when the decision implied a status transition but the task's
   * status had already changed since the caller read it (the guarded conditional
   * write matched zero rows). The caller surfaces this as a 409 and must NOT treat
   * the decision as applied. No approval row is recorded for a conflicted decision.
   */
  conflict: boolean
}

/**
 * Apply an approval decision end-to-end:
 *   1. transition the task status when the decision implies one — ALWAYS via a
 *      guarded conditional write (never an unconditional clobber),
 *   2. only if that succeeds (or the decision implies no transition), record the
 *      decision in cc_approvals and append an immutable 'approved' task event.
 * On a lost TOCTOU race the decision is not applied and nothing is recorded, so
 * the audit trail never shows an approval for a transition that did not happen.
 */
export async function applyApproval(
  input: RecordApprovalInput,
  client?: SupabaseLike,
): Promise<ApplyApprovalResult> {
  const db = client ?? ((await createClient()) as unknown as SupabaseLike)

  const nextStatus = decisionToStatus(input.decision)
  let task: CommandCentreTask | null = null

  if (nextStatus) {
    // UNI-2436 TOCTOU guard: only transition while the task still holds the
    // expected status. The write is ALWAYS conditional — when the caller did not
    // supply `expectedStatus` (legacy callers), read the current status and guard
    // on that, so no code path ever performs an unconditional clobber.
    let expected = input.expectedStatus
    if (!expected) {
      const current = await getTaskById(
        { founderId: input.founderId, taskId: input.taskId },
        db,
      )
      if (!current) {
        return { approval: null, task: null, conflict: true }
      }
      expected = current.status
    }

    task = await updateTaskStatusGuarded(
      {
        founderId: input.founderId,
        taskId: input.taskId,
        status: nextStatus,
        expectedStatus: expected,
      },
      db as unknown as GuardedUpdateClientLike,
    )
    // A zero-row (null) result means the status changed (or the row vanished)
    // between the read and this write — a lost race. Do NOT record the approval
    // or event for a transition that did not happen.
    if (!task) {
      return { approval: null, task: null, conflict: true }
    }
  }

  // The transition succeeded (or this is a no-transition 'edit'): record the
  // audited decision, then append the immutable event.
  const approval = await recordApproval(input, db)

  await appendTaskEvent(
    {
      founderId: input.founderId,
      taskId: input.taskId,
      type: 'approved',
      actor: input.approver ?? 'founder',
      payload: {
        decision: input.decision,
        note: input.note ?? null,
        new_status: nextStatus,
        board_verdict: input.boardVerdict ?? null,
      },
    },
    db,
  )

  return { approval, task, conflict: false }
}
