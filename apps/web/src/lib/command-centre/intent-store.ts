// src/lib/command-centre/intent-store.ts
//
// Guarded writer for metadata.intent on delivery missions.
//
// metadata.intent is a SIBLING of metadata.delivery: it is not part of
// deliveryMetadataSchema, the delivery fingerprint, approval signing or phase
// logic. saveDelivery writes `metadata: { ...task.metadata, delivery }`, so the
// sibling survives every delivery save made from a freshly read task.
//
// This mirrors saveDelivery's compare-and-swap exactly (founder_id, id, status,
// updated_at, and the delivery revision when the envelope parses), bumps
// updated_at the same way, requires exactly one row, then confirms with a
// separate founder-scoped read that metadata.delivery is byte-identical to
// before and metadata.intent is what was written. Anything else is a
// DeliveryConflict: the caller re-reads, it never retries blindly.

import { createClient } from '@/lib/supabase/server'
import { getTaskById, type CommandCentreTask } from './tasks'
import { readDeliveryMetadata } from './delivery-types'
import { DeliveryConflict, hashDeliveryInput, type DeliveryMutationClient, type DeliveryStoreClient } from './delivery-store'
import type { IntentStatus } from './intent'

export interface MissionIntent {
  status: IntentStatus
  markdown: string
  generatedAt?: string
  acceptedAt?: string
  author?: string
}

/** Read a stored intent without trusting its shape. Returns null for anything malformed. */
export function readMissionIntent(task: Pick<CommandCentreTask, 'metadata'>): MissionIntent | null {
  const raw = task.metadata?.intent as Record<string, unknown> | undefined
  if (!raw || typeof raw !== 'object') return null
  if ((raw.status !== 'draft' && raw.status !== 'accepted') || typeof raw.markdown !== 'string') return null
  const optional = (key: string) => (typeof raw[key] === 'string' ? (raw[key] as string) : undefined)
  return {
    status: raw.status,
    markdown: raw.markdown,
    ...(optional('generatedAt') ? { generatedAt: optional('generatedAt') } : {}),
    ...(optional('acceptedAt') ? { acceptedAt: optional('acceptedAt') } : {}),
    ...(optional('author') ? { author: optional('author') } : {}),
  }
}

/** True while a preparation lease is live — its chained delivery saves must not be interrupted. */
export function isPreparationLeaseActive(task: Pick<CommandCentreTask, 'metadata'>, now = Date.now()): boolean {
  const lease = readDeliveryMetadata(task)?.lease
  return !!lease && Date.parse(lease.expiresAt) > now
}

/** Atomic compare-and-swap of metadata.intent. No retry against changed state. */
export async function saveMissionIntent(
  task: CommandCentreTask,
  intent: MissionIntent,
  options: { client?: DeliveryStoreClient } = {},
): Promise<CommandCentreTask> {
  const old = readDeliveryMetadata(task)
  const deliveryHashBefore = hashDeliveryInput(task.metadata?.delivery ?? null)
  const db = options.client ?? ((await createClient()) as unknown as DeliveryStoreClient)
  const updatedAt = new Date(Math.max(Date.now(), Date.parse(task.updated_at) + 1)).toISOString()

  let query = (db as DeliveryMutationClient)
    .from('cc_tasks')
    .update({ metadata: { ...task.metadata, intent }, updated_at: updatedAt })
    .eq('founder_id', task.founder_id)
    .eq('id', task.id)
    .eq('status', task.status)
    .eq('updated_at', task.updated_at)
  if (old) query = query.eq('metadata->delivery->>revision', String(old.revision))

  const { data, error } = await query.select('*')
  if (error) throw new Error(`Intent persistence failed: ${error.message}`)
  if (!Array.isArray(data) || data.length !== 1) throw new DeliveryConflict()
  const returned = data[0] as CommandCentreTask

  const confirmed = await getTaskById({ founderId: task.founder_id, taskId: task.id }, db)
  if (
    !confirmed ||
    confirmed.updated_at !== returned.updated_at ||
    confirmed.status !== returned.status ||
    hashDeliveryInput(confirmed.metadata?.delivery ?? null) !== deliveryHashBefore ||
    hashDeliveryInput(confirmed.metadata?.intent ?? null) !== hashDeliveryInput(intent)
  ) {
    throw new DeliveryConflict('The saved intent could not be confirmed; reload before continuing.')
  }
  return confirmed
}
