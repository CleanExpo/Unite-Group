// src/lib/command-centre/lanes/software-handoff.ts
//
// CC — Software Lane: Gated hand-off.
//
// runSoftwareHandoff: gated operation that requires a build plan to exist in
// metadata.software.plan before it proceeds. Merges status:'awaiting_build' +
// handedOffAt into metadata.software, appends a 'comment' audit event
// (best-effort), and returns { status:'handed_off' }.
//
// If no plan exists returns { status:'not_planned' } immediately — no writes.
// Inject `deps` for testing; production callers omit it.

import {
  getTaskById,
  mergeTaskMetadata,
  appendTaskEvent,
  type SupabaseLike,
} from '@/lib/command-centre/tasks'
import type { BuildPlan } from './software-plan'
import { appendAuditEventBestEffort } from './audit-event'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SoftwareHandoffDeps {
  getTaskById: typeof getTaskById
  mergeTaskMetadata: typeof mergeTaskMetadata
  appendTaskEvent: typeof appendTaskEvent
}

export type SoftwareHandoffResult =
  | { status: 'not_planned' }
  | { status: 'handed_off' }

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Execute the gated hand-off for a planned software task.
 *
 * Gate: metadata.software.plan must exist — returns { status:'not_planned' }
 * immediately if it does not.
 *
 * On success:
 * 1. Merges { ...prev software, status:'awaiting_build', handedOffAt } into metadata.software.
 * 2. Appends a 'comment' audit event (best-effort — never fails the operation).
 * 3. Returns { status:'handed_off' }.
 *
 * The `deps` argument is injected for testing; production callers omit it.
 */
export async function runSoftwareHandoff(
  { founderId, taskId }: { founderId: string; taskId: string },
  deps?: Partial<SoftwareHandoffDeps & { db?: SupabaseLike }>,
): Promise<SoftwareHandoffResult> {
  const {
    getTaskById: fetchTask = getTaskById,
    mergeTaskMetadata: mergeMeta = mergeTaskMetadata,
    appendTaskEvent: appendEvent = appendTaskEvent,
  } = deps ?? {}

  const db = deps?.db

  // Load task.
  const task = await fetchTask({ founderId, taskId }, db)

  // Gate: require an existing plan.
  const software = (task?.metadata?.software ?? {}) as Record<string, unknown>
  const plan = software.plan as BuildPlan | undefined
  if (!plan) {
    return { status: 'not_planned' }
  }

  // Merge awaiting_build status, preserving prior software metadata.
  // mergeTaskMetadata returns null when the task has vanished between the load
  // and the write — treat that as a hard failure so the route surfaces a 500
  // rather than silently reporting a handoff that was never persisted.
  const handedOffAt = new Date().toISOString()
  const persisted = await mergeMeta(
    {
      founderId,
      taskId,
      patch: {
        software: {
          ...software,
          status: 'awaiting_build',
          handedOffAt,
        },
      },
    },
    db,
  )
  if (!persisted) throw new Error('Failed to persist software handoff')

  // Append audit event — best-effort (never fails the operation).
  await appendAuditEventBestEffort(
    appendEvent,
    {
      founderId,
      taskId,
      type: 'comment',
      actor: 'system',
      payload: { kind: 'software_handoff', handedOffAt },
    },
    db,
  )

  return { status: 'handed_off' }
}
