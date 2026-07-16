// src/lib/command-centre/agent-events-wall.ts
//
// Matrix wall Wave B2 — founder-facing read path over cc_agent_events
// (UNI-2384). Wraps the existing listAgentEvents accessor with the deck's
// honest-state model (pattern: crm-mission-control-jobs-supabase.ts).
//
// Honesty rules (NorthStar / No-Invaders):
// - no founder session            ⇒ source 'not_connected', reason 'no_founder'
// - cc_agent_events table missing ⇒ source 'not_connected', reason
//   'migration_not_applied' — the migration is founder-gated and NOT applied
//   in prod yet, so the accessor throwing "table not found" is the EXPECTED
//   dark posture, never a crash and never fabricated rows.
// - any other query failure       ⇒ source 'error' with the reason
// - success                       ⇒ source 'connected' (zero rows stays honest:
//   the tile renders "runner not armed", no fake activity).

import { createClient } from '@/lib/supabase/server'
import {
  listAgentEvents,
  type AgentEvent,
  type AgentEventsClientLike,
} from '@/lib/command-centre/agent-events'

export type AgentEventsWallSource = 'connected' | 'not_connected' | 'error'
export type AgentEventsWallReason = 'no_founder' | 'migration_not_applied'

export interface AgentEventsWallResult {
  events: AgentEvent[]
  source: AgentEventsWallSource
  reason?: AgentEventsWallReason
  error?: string
}

const DEFAULT_CAP = 25

/**
 * True when a Supabase/PostgREST failure means the cc_agent_events table does
 * not exist yet (founder-gated migration not applied). Covers Postgres 42P01
 * ("relation ... does not exist") and PostgREST PGRST205 ("Could not find the
 * table ... in the schema cache").
 */
export function isMissingTableError(message: string): boolean {
  return /does not exist|could not find the table|schema cache|42P01|PGRST205/i.test(message)
}

/** The verb the wall renders for a row. Runner lifecycle events (UNI-2384) are
 *  event_type 'status' with the verb in tool_name (claimed | started |
 *  draft_pr_opened | aborted | requeued). */
export function eventVerb(event: Pick<AgentEvent, 'event_type' | 'tool_name'>): string {
  if (event.event_type === 'heartbeat') return 'heartbeat'
  return event.tool_name ?? event.event_type
}

/** Plain relative age in en-AU shorthand ("just now" / "4m ago" / "3h ago" /
 *  "2d ago"). Malformed timestamps degrade to an em dash — never a fake
 *  "live" signal. */
export function relativeAge(iso: string | null | undefined, nowMs: number): string {
  if (!iso) return '—'
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return '—'
  const deltaS = Math.floor((nowMs - t) / 1000)
  if (deltaS < 60) return 'just now'
  const mins = Math.floor(deltaS / 60)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export async function loadAgentEventsWall(
  founderId: string | null,
  cap: number = DEFAULT_CAP,
): Promise<AgentEventsWallResult> {
  if (!founderId) return { events: [], source: 'not_connected', reason: 'no_founder' }
  try {
    const db = (await createClient()) as unknown as AgentEventsClientLike
    const events = await listAgentEvents(db, founderId, cap)
    return { events, source: 'connected' }
  } catch (e) {
    const message = e instanceof Error ? e.message : 'unknown error'
    if (isMissingTableError(message)) {
      return { events: [], source: 'not_connected', reason: 'migration_not_applied' }
    }
    return { events: [], source: 'error', error: message }
  }
}
