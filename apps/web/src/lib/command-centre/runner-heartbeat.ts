// src/lib/command-centre/runner-heartbeat.ts
//
// H1 (UNI-2373) — classify Nexus runner liveness from cc_agent_events heartbeats.
// QueueBoard used to hardcode every `running` session as "waiting for runner —
// none connected". That was honest on 15/07 (no runner yet) and became a lie
// once the estate runner armed on 16/07. This module is the single place that
// turns a freshest-heartbeat age into a connected/stale/offline state and the
// session-chip label that depends on it.
//
// Thresholds: the runner polls every POLL_SECONDS (default 60). Connected =
// within 2.5× that (150s slack for one missed beat + network). Stale = within
// 5 minutes. Older / missing = offline ("none connected").

import {
  CC_AGENT_EVENTS_TABLE,
  type AgentEventsClientLike,
  type AgentEvent,
} from '@/lib/command-centre/agent-events'
// From runner-identity, NOT runner-claim: this module is reachable from the
// 'use client' QueueBoard, and runner-claim reaches node:crypto via ./tasks.
import { RUNNER_AGENT_NAME } from '@/lib/command-centre/runner-identity'
import { isMissingTableError } from '@/lib/command-centre/agent-events-wall'

export type RunnerHeartbeatState = 'connected' | 'stale' | 'offline'

export type RunnerHeartbeatSource =
  | 'cc_agent_events'
  | 'no_heartbeat'
  | 'migration_not_applied'
  | 'error'

export interface RunnerHeartbeatSummary {
  state: RunnerHeartbeatState
  source: RunnerHeartbeatSource
  ageSeconds: number | null
  checkedAt: string
  error?: string
}

/** 2.5 × default POLL_SECONDS (60s) — one missed beat still counts as connected. */
export const RUNNER_CONNECTED_WITHIN_MS = 150_000
/** Beyond this, the runner is offline for label purposes. */
export const RUNNER_STALE_WITHIN_MS = 5 * 60_000

/** Pure freshness classifier. Future timestamps (clock skew) count as connected. */
export function classifyRunnerHeartbeatAge(
  ageMs: number | null,
  nowMs: number = Date.now(),
): RunnerHeartbeatState {
  void nowMs
  if (ageMs === null) return 'offline'
  if (ageMs < 0) return 'connected'
  if (ageMs <= RUNNER_CONNECTED_WITHIN_MS) return 'connected'
  if (ageMs <= RUNNER_STALE_WITHIN_MS) return 'stale'
  return 'offline'
}

/**
 * Session-chip label for an execution session. Non-running statuses pass through.
 * Running + connected → raw "running". Running + stale/offline → honest wait copy.
 */
export function runningSessionLabel(
  status: string,
  runnerState: RunnerHeartbeatState,
): string {
  if (status !== 'running') return status
  if (runnerState === 'connected') return 'running'
  if (runnerState === 'stale') return 'waiting for runner — heartbeat stale'
  return 'waiting for runner — none connected'
}

/**
 * Newest nexus-runner heartbeat among recent events, or null if none.
 * Filters in memory so we stay inside the existing AgentEventsClientLike shape
 * (founder_id → order → limit) without inventing a second query DSL.
 */
export function pickNewestRunnerHeartbeat(
  events: ReadonlyArray<Pick<AgentEvent, 'agent_name' | 'event_type' | 'created_at'>>,
): Pick<AgentEvent, 'created_at'> | null {
  let newest: Pick<AgentEvent, 'created_at'> | null = null
  let newestMs = -Infinity
  for (const e of events) {
    if (e.agent_name !== RUNNER_AGENT_NAME) continue
    if (e.event_type !== 'heartbeat') continue
    const t = new Date(e.created_at).getTime()
    if (Number.isNaN(t)) continue
    if (t > newestMs) {
      newestMs = t
      newest = e
    }
  }
  return newest
}

export function summariseRunnerHeartbeat(
  events: ReadonlyArray<Pick<AgentEvent, 'agent_name' | 'event_type' | 'created_at'>>,
  nowMs: number = Date.now(),
): RunnerHeartbeatSummary {
  const checkedAt = new Date(nowMs).toISOString()
  const newest = pickNewestRunnerHeartbeat(events)
  if (!newest) {
    return { state: 'offline', source: 'no_heartbeat', ageSeconds: null, checkedAt }
  }
  const ageMs = nowMs - new Date(newest.created_at).getTime()
  const ageSeconds = Number.isNaN(ageMs) ? null : Math.max(0, Math.floor(ageMs / 1000))
  return {
    state: classifyRunnerHeartbeatAge(Number.isNaN(ageMs) ? null : ageMs, nowMs),
    source: 'cc_agent_events',
    ageSeconds,
    checkedAt,
  }
}

/** Load + classify. Degrades honestly when the table is missing or the query fails. */
export async function loadRunnerHeartbeat(
  client: AgentEventsClientLike,
  founderId: string,
  nowMs: number = Date.now(),
): Promise<RunnerHeartbeatSummary> {
  const checkedAt = new Date(nowMs).toISOString()
  try {
    const { data, error } = await client
      .from(CC_AGENT_EVENTS_TABLE)
      .select('*')
      .eq('founder_id', founderId)
      .order('created_at', { ascending: false })
      .limit(50)
    if (error) {
      if (isMissingTableError(error.message)) {
        return { state: 'offline', source: 'migration_not_applied', ageSeconds: null, checkedAt }
      }
      return {
        state: 'offline',
        source: 'error',
        ageSeconds: null,
        checkedAt,
        error: error.message,
      }
    }
    return summariseRunnerHeartbeat((data as AgentEvent[]) ?? [], nowMs)
  } catch (e) {
    const message = e instanceof Error ? e.message : 'unknown error'
    if (isMissingTableError(message)) {
      return { state: 'offline', source: 'migration_not_applied', ageSeconds: null, checkedAt }
    }
    return { state: 'offline', source: 'error', ageSeconds: null, checkedAt, error: message }
  }
}
