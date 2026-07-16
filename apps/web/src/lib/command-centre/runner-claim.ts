// src/lib/command-centre/runner-claim.ts
//
// Queue-claim accessors + lifecycle-event builders for the Nexus runner
// (UNI-2383/UNI-2384 — lifecycle + watch-experience grills, DECIDED 2026-07-16).
//
// The runner claims one approved task at a time via a conditional
// UPDATE ... WHERE status = 'queued' with a returned-row check — two racing
// claimants cannot both win because the loser's filter matches zero rows.
// Writes come from the bearer-authed runner routes via the service client with
// founder_id set explicitly (single-tenant, same plane as agent-events).
//
// Event taxonomy (convention over migration): event_type='status' with the
// lifecycle verb in tool_name and a short machine-safe ref/code in target —
// codes, never prose, so the cc_agent_events redaction contract holds.

import type { CommandCentreTask } from './tasks'
import type { AgentEventInput } from './agent-events'

export const CC_TASKS_TABLE = 'cc_tasks'
export const RUNNER_AGENT_NAME = 'nexus-runner'

export type RunnerLifecycleVerb =
  | 'claimed'
  | 'started'
  | 'draft_pr_opened'
  | 'aborted'
  | 'requeued'

export type RunnerReleaseOutcome = 'done' | 'failed' | 'requeue'

/** cc_tasks row including the claim columns added by 20260716010000_cc_tasks_claim.sql. */
export type ClaimedTask = CommandCentreTask & {
  claimed_by: string | null
  claimed_at: string | null
}

interface SupabaseErrorLike {
  message: string
}

interface QueryResult {
  data: unknown
  error: SupabaseErrorLike | null
}

interface SelectChain {
  eq(column: string, value: unknown): SelectChain
  order(column: string, opts: { ascending: boolean }): SelectChain
  limit(n: number): Promise<QueryResult>
}

interface UpdateChain {
  eq(column: string, value: unknown): UpdateChain
  select(columns?: string): Promise<QueryResult>
}

// Minimal structural client type so the accessors are testable with a mock and
// don't pull the full generated types (matches agent-events.ts).
export interface RunnerClaimClientLike {
  from(table: string): {
    select(columns?: string): SelectChain
    update(values: Record<string, unknown>): UpdateChain
  }
}

export interface ClaimNextQueuedTaskInput {
  founderId: string
  runnerId: string
  /** How many queued candidates to attempt per poll (races skip to the next). */
  candidateLimit?: number
}

/**
 * Claim the highest-priority queued task for this runner. Candidates are
 * ordered P0-first then oldest-first; each is claimed with a conditional
 * update that only succeeds while the row is still 'queued', so a lost race
 * simply falls through to the next candidate. Returns null when the queue is
 * empty (or every candidate was claimed by someone else first).
 */
export async function claimNextQueuedTask(
  client: RunnerClaimClientLike,
  input: ClaimNextQueuedTaskInput,
): Promise<ClaimedTask | null> {
  const limit = Math.min(Math.max(input.candidateLimit ?? 5, 1), 20)

  const { data, error } = await client
    .from(CC_TASKS_TABLE)
    .select('id')
    .eq('founder_id', input.founderId)
    .eq('status', 'queued')
    .order('priority', { ascending: true })
    .order('created_at', { ascending: true })
    .limit(limit)
  if (error) throw new Error(`claimNextQueuedTask candidates failed: ${error.message}`)

  const candidates = (data as Array<{ id: string }>) ?? []

  for (const candidate of candidates) {
    const { data: claimed, error: claimError } = await client
      .from(CC_TASKS_TABLE)
      .update({
        status: 'running',
        claimed_by: input.runnerId,
        claimed_at: new Date().toISOString(),
      })
      .eq('founder_id', input.founderId)
      .eq('id', candidate.id)
      .eq('status', 'queued') // the atomic guard — zero rows means a lost race
      .select('*')
    if (claimError) throw new Error(`claimNextQueuedTask claim failed: ${claimError.message}`)

    const rows = (claimed as ClaimedTask[]) ?? []
    if (rows.length === 1) return rows[0]
  }

  return null
}

export interface ReleaseClaimedTaskInput {
  founderId: string
  taskId: string
  runnerId: string
  outcome: RunnerReleaseOutcome
  /** Short PR ref for done outcomes (e.g. a PR URL); stored on preview_url. */
  prRef?: string | null
}

const OUTCOME_STATUS: Record<RunnerReleaseOutcome, CommandCentreTask['status']> = {
  done: 'done',
  failed: 'failed',
  requeue: 'queued',
}

/**
 * Release a running task this runner claimed. Guarded by claimed_by = runnerId
 * so only the claimant can release; returns null when no matching running row
 * exists (wrong id, wrong claimant, or already released). A requeue clears the
 * claim columns so the task is claimable again.
 */
export async function releaseClaimedTask(
  client: RunnerClaimClientLike,
  input: ReleaseClaimedTaskInput,
): Promise<ClaimedTask | null> {
  const values: Record<string, unknown> = { status: OUTCOME_STATUS[input.outcome] }
  if (input.outcome === 'requeue') {
    values.claimed_by = null
    values.claimed_at = null
  }
  if (input.prRef) values.preview_url = input.prRef

  const { data, error } = await client
    .from(CC_TASKS_TABLE)
    .update(values)
    .eq('founder_id', input.founderId)
    .eq('id', input.taskId)
    .eq('status', 'running')
    .eq('claimed_by', input.runnerId)
    .select('*')
  if (error) throw new Error(`releaseClaimedTask failed: ${error.message}`)

  const rows = (data as ClaimedTask[]) ?? []
  return rows[0] ?? null
}

// ─── Lifecycle-event builders (UNI-2384 taxonomy) ─────────────────────────────

export interface RunnerStatusEventInput {
  verb: RunnerLifecycleVerb
  taskId: string
  sessionId?: string | null
  /** Short machine-safe ref/code (task id, PR#n, abort code) — never prose. */
  target?: string | null
}

/** Build a redacted runner lifecycle event for POST /api/agents/events. */
export function buildRunnerStatusEvent(input: RunnerStatusEventInput): AgentEventInput {
  return {
    sessionId: input.sessionId ?? null,
    agentName: RUNNER_AGENT_NAME,
    surface: 'claude-code',
    planKey: input.taskId,
    eventType: 'status',
    toolName: input.verb,
    target: input.target ?? null,
  }
}

/** Build the runner's once-per-poll heartbeat event. */
export function buildRunnerHeartbeat(sessionId?: string | null): AgentEventInput {
  return {
    sessionId: sessionId ?? null,
    agentName: RUNNER_AGENT_NAME,
    surface: 'claude-code',
    eventType: 'heartbeat',
  }
}
