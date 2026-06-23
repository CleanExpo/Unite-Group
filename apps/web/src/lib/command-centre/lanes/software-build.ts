// src/lib/command-centre/lanes/software-build.ts
//
// CC — Software Lane: Build orchestrator.
//
// runSoftwareBuild: loads the task, generates a build plan, persists
// metadata.software.{ plan, status, plannedAt }, appends a 'comment' audit
// event (best-effort), and returns { status:'planned', plan }.
//
// Inject `deps` for testing; production callers omit it and the real
// implementations are imported directly.

import {
  getTaskById,
  mergeTaskMetadata,
  appendTaskEvent,
  type SupabaseLike,
} from '@/lib/command-centre/tasks'
import { generateBuildPlan, type BuildPlan } from './software-plan'
import { appendAuditEventBestEffort } from './audit-event'
import type { ModelClientLike } from '@/lib/command-centre/clarify'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SoftwareBuildDeps {
  getTaskById: typeof getTaskById
  generateBuildPlan: typeof generateBuildPlan
  mergeTaskMetadata: typeof mergeTaskMetadata
  appendTaskEvent: typeof appendTaskEvent
}

export interface SoftwareBuildResult {
  status: 'planned'
  plan: BuildPlan
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Run the software build intake for a task.
 *
 * 1. Load the task by (founderId, taskId) — throws 'Task not found' if null.
 * 2. Generate a build plan from the task's objective.
 * 3. Persist { plan, status:'planned', plannedAt } to metadata.software.
 * 4. Append a 'comment' audit event (best-effort — never fails the operation).
 * 5. Return { status:'planned', plan }.
 *
 * The `deps` argument is injected for testing; production callers omit it and
 * the real task/plan implementations are used.
 */
export async function runSoftwareBuild(
  { founderId, taskId }: { founderId: string; taskId: string },
  deps?: Partial<SoftwareBuildDeps & { client?: ModelClientLike; db?: SupabaseLike }>,
): Promise<SoftwareBuildResult> {
  const {
    getTaskById: fetchTask = getTaskById,
    generateBuildPlan: genPlan = generateBuildPlan,
    mergeTaskMetadata: mergeMeta = mergeTaskMetadata,
    appendTaskEvent: appendEvent = appendTaskEvent,
  } = deps ?? {}

  const db = deps?.db
  const client = deps?.client

  // 1. Load task — throw if not found.
  const task = await fetchTask({ founderId, taskId }, db)
  if (!task) throw new Error('Task not found')

  // 2. Generate build plan.
  const plan = await genPlan(task.objective, client)

  // 3. Persist to metadata.software. mergeTaskMetadata returns null when the
  // task has vanished between the load and the write — treat that as a hard
  // failure so the route surfaces a 500 rather than silently reporting success
  // (and appending an audit event) for a plan that was never stored.
  const plannedAt = new Date().toISOString()
  const persisted = await mergeMeta(
    {
      founderId,
      taskId,
      patch: {
        software: {
          plan,
          status: 'planned',
          plannedAt,
        },
      },
    },
    db,
  )
  if (!persisted) throw new Error('Failed to persist software build plan')

  // 4. Append audit event — best-effort (never fails the operation).
  await appendAuditEventBestEffort(
    appendEvent,
    {
      founderId,
      taskId,
      type: 'comment',
      actor: 'system',
      payload: { kind: 'software_planned', plannedAt },
    },
    db,
  )

  return { status: 'planned', plan }
}
