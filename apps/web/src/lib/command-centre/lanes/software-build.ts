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

  // 3. Persist to metadata.software.
  const plannedAt = new Date().toISOString()
  await mergeMeta(
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

  // 4. Append audit event — best-effort.
  try {
    await appendEvent(
      {
        founderId,
        taskId,
        type: 'comment',
        actor: 'system',
        payload: { kind: 'software_planned', plannedAt },
      },
      db,
    )
  } catch {
    // Best-effort — audit failure must not block the response.
  }

  return { status: 'planned', plan }
}
