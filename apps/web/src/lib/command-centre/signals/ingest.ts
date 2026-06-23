// src/lib/command-centre/signals/ingest.ts
//
// Signal ingestion — Unit 3. Orchestrates the bridge from an inbound signal to
// the existing idea-intake pipeline:
//
//   normaliseSignal → shouldIngest (dedup vs recent external_refs) →
//   createTask({ status: 'proposed' }) → appendTaskEvent('created')
//
// The task lands PROPOSED — exactly like a hand-typed idea. Nothing
// auto-executes; the board/lane gates still apply. Provenance rides on the
// task's `external_ref` (the dedup key) + `metadata.signalSource`, so no new
// TaskOrigin / no schema change is needed.
//
// Pure orchestration over injected deps — no direct Supabase coupling.

import { normaliseSignal, type RawSignal } from './normalise'
import { shouldIngest } from './dedup'
import type { createTask, listTasks, appendTaskEvent, CommandCentreTask } from '../tasks'

export interface IngestSignalDeps {
  listTasks: typeof listTasks
  createTask: typeof createTask
  appendTaskEvent: typeof appendTaskEvent
}

export type IngestSignalResult =
  | { status: 'created'; task: CommandCentreTask }
  | { status: 'skipped'; reason: string }

/** How many recent tasks to scan for an already-seen external_ref. */
const DEDUP_LOOKBACK = 100

export async function ingestSignal(
  founderId: string,
  raw: RawSignal,
  deps: IngestSignalDeps,
): Promise<IngestSignalResult> {
  const normalised = normaliseSignal(raw)

  const recent = await deps.listTasks({ founderId, limit: DEDUP_LOOKBACK })
  const recentRefs = recent
    .map((t) => t.external_ref)
    .filter((r): r is string => typeof r === 'string' && r.length > 0)

  const decision = shouldIngest(normalised, recentRefs)
  if (!decision.ingest) return { status: 'skipped', reason: decision.reason ?? 'skipped' }

  const task = await deps.createTask({
    founderId,
    title: normalised.title,
    objective: normalised.objective,
    origin: normalised.origin,
    externalRef: normalised.externalRef,
    projectKey: normalised.projectKey,
    status: 'proposed',
    humanApprovalRequired: true,
    metadata: {
      signalSource: normalised.source,
      signalSeverity: normalised.severity,
      observedAt: normalised.observedAt,
    },
  })

  await deps.appendTaskEvent({
    founderId,
    taskId: task.id,
    type: 'created',
    actor: `signal:${normalised.source}`,
    payload: { externalRef: normalised.externalRef, severity: normalised.severity },
  })

  return { status: 'created', task }
}
