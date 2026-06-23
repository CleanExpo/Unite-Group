// src/lib/command-centre/lanes/audit-event.ts
//
// CC — Lane shared util: best-effort audit-event append.
//
// Lane orchestrators append a 'comment' audit event after a state change has
// already been persisted. That audit write is best-effort: failing to record
// it must never fail the operation that already succeeded. Centralising the
// try/catch here keeps every lane identical and makes the swallowed error
// intentional and reviewable — not a stray empty catch scattered per lane.

import { appendTaskEvent, type AppendTaskEventInput, type SupabaseLike } from '@/lib/command-centre/tasks'

/**
 * Append an audit event, swallowing any error.
 *
 * @param append  the appendTaskEvent implementation (injected for testing)
 * @param input   the audit event to append
 * @param db      optional Supabase client passed through to `append`
 */
export async function appendAuditEventBestEffort(
  append: typeof appendTaskEvent,
  input: AppendTaskEventInput,
  db?: SupabaseLike,
): Promise<void> {
  try {
    await append(input, db)
  } catch {
    // Best-effort — audit failure must not block the operation.
  }
}
