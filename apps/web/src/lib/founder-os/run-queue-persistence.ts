// src/lib/founder-os/run-queue-persistence.ts
//
// Durable, founder-scoped persistence for the Pi run queue. Replaces the
// in-memory module-level Map (lost on every serverless cold start, never
// founder-fenced). Stores the full FounderRunQueueItem in the pi_run_queue
// table (one JSONB column + indexed scalars), scoped by founder_id.
//
// The pure queue logic still lives in run-queue.ts (createRunQueueStore /
// applyTransition / summarise). Routes load the founder's items, apply the pure
// operation, then save the changed item back — so behaviour is unchanged but the
// state survives restarts and is isolated per founder.

import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import type { FounderRunQueueItem } from './types'

// pi_run_queue is an off-schema table (not present in the generated Database
// types). Use an untyped client for it so the query builder accepts the table
// name without tripping deep generic instantiation.
const TABLE = 'pi_run_queue'

/** Load every run-queue item for a founder, newest first. */
export async function listFounderRunQueueItems(founderId: string): Promise<FounderRunQueueItem[]> {
  const supabase = (await createClient()) as unknown as SupabaseClient
  const { data, error } = await supabase
    .from(TABLE)
    .select('item')
    .eq('founder_id', founderId)
    .order('updated_at', { ascending: false })

  if (error) throw new Error(`pi_run_queue list failed: ${error.message}`)
  return (data ?? []).map((row) => (row as { item: FounderRunQueueItem }).item)
}

/** Persist (insert or update) a single run-queue item for a founder. */
export async function saveFounderRunQueueItem(
  founderId: string,
  item: FounderRunQueueItem,
): Promise<void> {
  const supabase = (await createClient()) as unknown as SupabaseClient
  const { error } = await supabase.from(TABLE).upsert(
    {
      founder_id: founderId,
      queue_id: item.id,
      status: item.status,
      item,
      updated_at: item.updatedAt,
    },
    { onConflict: 'founder_id,queue_id' },
  )

  if (error) throw new Error(`pi_run_queue save failed: ${error.message}`)
}
