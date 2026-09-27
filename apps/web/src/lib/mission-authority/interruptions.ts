// src/lib/mission-authority/interruptions.ts
//
// UNI-2779 — the founder interruption ledger. Every time a mission stops to
// ask the founder something, the runner records WHY as an immutable
// cc_task_events row (type 'comment', payload.kind 'interruption'). Only
// LEGITIMATE_PROTECTED_BOUNDARY justifies an interruption; every other class
// is a defect the policy should learn from. The metric makes that visible:
// interruptions by class, and interruptions per VERIFIED outcome.
//
// The classes live in ONE place: scripts/nexus-runner/mission-authority.json
// (interruption_classes). Nothing here restates the list. No new table: the
// ledger is the existing append-only audit trail.

import policy from '../../../../../scripts/nexus-runner/mission-authority.json'
import { createClient } from '@/lib/supabase/server'
import {
  appendTaskEvent,
  CC_TASK_EVENTS_TABLE,
  CC_TASKS_TABLE,
  type CommandCentreTask,
  type SupabaseLike,
  type TaskEvent,
} from '@/lib/command-centre/tasks'
import { readContinuation } from './continuation'

export const INTERRUPTION_CLASSES: readonly string[] = Object.keys(policy.interruption_classes)
export const FALLBACK_CLASS = 'OTHER'
export const PROTECTED_BOUNDARY_CLASS = 'LEGITIMATE_PROTECTED_BOUNDARY'

export interface RecordInterruptionInput {
  founderId: string
  taskId: string
  class: string
  source: string
  reason: string
}

export interface InterruptionPayload {
  kind: 'interruption'
  class: string
  source: string
  reason: string
}

const isKnownClass = (value: unknown): value is string =>
  typeof value === 'string' && Object.hasOwn(policy.interruption_classes, value)

/**
 * Append one interruption to the task's audit trail. An unknown class is
 * recorded as OTHER with the original class kept in the reason, so nothing the
 * runner reports is dropped and the policy can learn a class for it.
 */
export async function recordInterruption(input: RecordInterruptionInput, db?: SupabaseLike): Promise<TaskEvent> {
  const known = isKnownClass(input.class)
  const payload: InterruptionPayload = {
    kind: 'interruption',
    class: known ? input.class : FALLBACK_CLASS,
    source: input.source,
    reason: known ? input.reason : `unrecognised class "${String(input.class)}": ${input.reason}`,
  }
  return appendTaskEvent(
    { founderId: input.founderId, taskId: input.taskId, type: 'comment', actor: input.source || 'system', payload: { ...payload } },
    db,
  )
}

export interface InterruptionEntry {
  id: string
  taskId: string
  class: string
  source: string
  reason: string
  at: string
}

/** Read one event as an interruption, or null when it is not one. A stored class the policy no longer names reads as OTHER. */
export function readInterruption(event: Pick<TaskEvent, 'id' | 'task_id' | 'type' | 'payload' | 'at'>): InterruptionEntry | null {
  const payload = event.payload
  if (event.type !== 'comment' || !payload || payload.kind !== 'interruption') return null
  const stored = payload.class
  return {
    id: event.id,
    taskId: event.task_id,
    class: isKnownClass(stored) ? stored : FALLBACK_CLASS,
    source: typeof payload.source === 'string' ? payload.source : '',
    reason: typeof payload.reason === 'string' ? payload.reason : '',
    at: event.at,
  }
}

export interface InterruptionMetric {
  total: number
  byClass: Record<string, number>
  verifiedOutcomes: number
  /** Interruptions per VERIFIED outcome. null when there is no verified outcome yet — never 0, Infinity or NaN. */
  perVerifiedOutcome: number | null
}

/** A mission counts as a VERIFIED outcome when its continuation phase is VERIFIED or its task is done. */
export function isVerifiedOutcome(mission: Pick<CommandCentreTask, 'status' | 'metadata'>): boolean {
  if (mission.status === 'done') return true
  const stored = readContinuation(mission)
  return stored.state === 'ok' && stored.continuation.phase === 'VERIFIED'
}

/** Pure: count interruptions by class and relate them to verified outcomes. */
export function interruptionMetric(
  events: ReadonlyArray<Pick<TaskEvent, 'id' | 'task_id' | 'type' | 'payload' | 'at'>>,
  missions: ReadonlyArray<Pick<CommandCentreTask, 'status' | 'metadata'>>,
): InterruptionMetric {
  const byClass: Record<string, number> = Object.fromEntries(INTERRUPTION_CLASSES.map((name) => [name, 0]))
  let total = 0
  for (const event of events) {
    const entry = readInterruption(event)
    if (!entry) continue
    byClass[entry.class] += 1
    total += 1
  }
  const verifiedOutcomes = missions.filter(isVerifiedOutcome).length
  return { total, byClass, verifiedOutcomes, perVerifiedOutcome: verifiedOutcomes > 0 ? total / verifiedOutcomes : null }
}

export const LEDGER_LIMIT = 500

interface Rows {
  data: unknown
  error: { message: string } | null
}

/** Structural client for the two founder-scoped reads the ledger needs. */
export interface InterruptionReadClient {
  from(table: string): {
    select(columns: string): {
      eq(column: string, value: unknown): {
        eq(column: string, value: unknown): {
          eq(column: string, value: unknown): {
            order(column: string, opts: { ascending: boolean }): { limit(n: number): PromiseLike<Rows> }
          }
        }
        limit(n: number): PromiseLike<Rows>
      }
    }
  }
}

export interface InterruptionLedger {
  ledger: InterruptionEntry[]
  metric: InterruptionMetric
  /** True when either read hit LEDGER_LIMIT, so the counts cover only the most recent rows. */
  truncated: boolean
}

/** Load the founder's interruption ledger and metric. Throws on a failed read rather than reporting an empty ledger. */
export async function loadInterruptionLedger(founderId: string, client?: InterruptionReadClient): Promise<InterruptionLedger> {
  const db = client ?? ((await createClient()) as unknown as InterruptionReadClient)
  const events = await db
    .from(CC_TASK_EVENTS_TABLE)
    .select('id,task_id,type,payload,at')
    .eq('founder_id', founderId)
    .eq('type', 'comment')
    .eq('payload->>kind', 'interruption')
    .order('at', { ascending: false })
    .limit(LEDGER_LIMIT)
  if (events.error || !Array.isArray(events.data)) {
    throw new Error(`Interruption ledger read failed: ${events.error?.message ?? 'no rows returned'}`)
  }
  const missions = await db.from(CC_TASKS_TABLE).select('id,status,metadata').eq('founder_id', founderId).limit(LEDGER_LIMIT)
  if (missions.error || !Array.isArray(missions.data)) {
    throw new Error(`Mission outcome read failed: ${missions.error?.message ?? 'no rows returned'}`)
  }
  const eventRows = events.data as TaskEvent[]
  const missionRows = missions.data as Array<Pick<CommandCentreTask, 'status' | 'metadata'>>
  return {
    ledger: eventRows.map(readInterruption).filter((entry): entry is InterruptionEntry => entry !== null),
    metric: interruptionMetric(eventRows, missionRows),
    truncated: eventRows.length >= LEDGER_LIMIT || missionRows.length >= LEDGER_LIMIT,
  }
}
