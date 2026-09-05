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

import { appendTaskEvent, CC_TASK_EVENTS_TABLE, type CommandCentreTask, type SupabaseLike } from './tasks'
import type { AgentEventInput } from './agent-events'
import { RUNNER_AGENT_NAME } from './runner-identity'
import { isDeliveryMission, readDeliveryMetadata } from './delivery-types'
import { getApprovedDelivery, verifyDeliveryApproval } from './delivery-store'

export const CC_TASKS_TABLE = 'cc_tasks'
// Re-exported so existing importers keep working. The DEFINITION moved to
// runner-identity.ts because this module reaches `node:crypto` through
// ./tasks, and a client component that only wanted this string was pulling
// that in — see the note in runner-identity.ts.
export { RUNNER_AGENT_NAME }

/**
 * UNI-2396: a task may be requeued this many times before a further requeue is
 * released as 'failed' instead — a deterministically-requeueing task must not
 * loop forever. Counted from the cc_task_events audit trail (no new DDL).
 */
export const MAX_REQUEUE_ATTEMPTS = 3

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
  /** Server-validated snapshot; never reconstructed by the worker from a draft. */
  approvedDelivery?: NonNullable<ReturnType<typeof getApprovedDelivery>>
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
    .select('*')
    .eq('founder_id', input.founderId)
    .eq('status', 'queued')
    .order('priority', { ascending: true })
    .order('created_at', { ascending: true })
    .limit(limit)
  if (error) throw new Error(`claimNextQueuedTask candidates failed: ${error.message}`)

  const candidates = (data as CommandCentreTask[]) ?? []

  for (const candidate of candidates) {
    const deliveryMission = isDeliveryMission(candidate)
    const delivery = deliveryMission ? readDeliveryMetadata(candidate) : null
    const approvedDelivery = deliveryMission ? getApprovedDelivery(candidate) : null
    // A queued status alone is insufficient: the exact frozen specification
    // must have a durable, current consent receipt. Damaged marked missions
    // stay unclaimed and cannot silently take the legacy path.
    if (deliveryMission && (!delivery || delivery.build || !approvedDelivery ||
      !await verifyDeliveryApproval(candidate, client as unknown as SupabaseLike))) continue

    const claimedAt = new Date().toISOString()
    const values: Record<string, unknown> = {
      status: 'running', claimed_by: input.runnerId, claimed_at: claimedAt,
    }
    if (delivery && approvedDelivery) {
      values.updated_at = new Date(Math.max(Date.now(), Date.parse(candidate.updated_at) + 1)).toISOString()
      values.metadata = { ...candidate.metadata, delivery: {
        ...delivery,
        executionAssignment: {
          role: 'build_spm', runnerId: input.runnerId, specRevision: delivery.revision,
          specFingerprint: delivery.specVersion, scope: delivery.scope, acceptedAt: claimedAt,
        },
      } }
    }
    let claim = client
      .from(CC_TASKS_TABLE)
      .update(values)
      .eq('founder_id', input.founderId)
      .eq('id', candidate.id)
      .eq('status', 'queued') // the atomic guard — zero rows means a lost race
    if (delivery) {
      claim = claim.eq('updated_at', candidate.updated_at)
        .eq('metadata->delivery->>revision', String(delivery.revision))
    }
    const { data: claimed, error: claimError } = await claim.select('*')
    if (claimError) throw new Error(`claimNextQueuedTask claim failed: ${claimError.message}`)

    const rows = (claimed as ClaimedTask[]) ?? []
    if (rows.length === 1) return approvedDelivery ? { ...rows[0], approvedDelivery } : rows[0]
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

export interface ReleaseClaimedTaskResult {
  /** The released row, or null when no matching running row was claimed by this runner. */
  task: ClaimedTask | null
  /**
   * The outcome actually applied — differs from the requested outcome when a
   * capped requeue is downgraded to 'failed' (UNI-2396). Callers auditing the
   * release must log this, never the raw request (UNI-2398).
   */
  effectiveOutcome: RunnerReleaseOutcome
}

/**
 * Count this task's prior requeue releases from the cc_task_events audit trail
 * (the release route records each requeue as type='status_changed' with
 * payload.outcome='requeue'). Returns null when the count query fails — the
 * caller degrades honestly to a plain requeue rather than failing the release.
 */
async function countPriorRequeues(
  client: RunnerClaimClientLike,
  founderId: string,
  taskId: string,
): Promise<number | null> {
  // Read the count with a bounded retry before deciding anything.
  //
  // The two ambiguous outcomes used to disagree with each other: a null body
  // returned "cap exhausted" (so ONE blip could permanently fail a task with
  // zero prior requeues) while a thrown query returned null and proceeded with
  // the requeue (so a persistently unreadable count could loop forever). Both
  // are the same situation - the count is unknown - and they now take the same
  // path: retry a couple of times, and only if it is still unreadable treat the
  // cap as exhausted. That keeps a transient blip from destroying work while
  // still bounding the loop, which is the third option an independent review
  // pointed out neither original branch took.
  const ATTEMPTS = 3
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    try {
      const { data, error } = await client
        .from(CC_TASK_EVENTS_TABLE)
        .select('id')
        .eq('founder_id', founderId)
        .eq('task_id', taskId)
        .eq('type', 'status_changed')
        .eq('payload->>outcome', 'requeue')
        .limit(MAX_REQUEUE_ATTEMPTS)
      if (!error && Array.isArray(data)) return (data as Array<{ id: string }>).length
    } catch {
      // fall through to the retry
    }
  }
  console.error(
    `releaseClaimedTask: requeue count unreadable after ${ATTEMPTS} attempts — treating the cap as exhausted for task ${taskId}`,
  )
  return MAX_REQUEUE_ATTEMPTS
}

/**
 * Release a running task this runner claimed. Guarded by claimed_by = runnerId
 * so only the claimant can release; the returned task is null when no matching
 * running row exists (wrong id, wrong claimant, or already released). A requeue
 * clears the claim columns so the task is claimable again — unless the task has
 * already been requeued MAX_REQUEUE_ATTEMPTS times (per the cc_task_events
 * audit trail), in which case it is released as 'failed' with a
 * max_requeue_attempts_exhausted event instead (UNI-2396). The result carries
 * the EFFECTIVE outcome so callers audit what actually happened (UNI-2398).
 */
export async function releaseClaimedTask(
  client: RunnerClaimClientLike,
  input: ReleaseClaimedTaskInput,
): Promise<ReleaseClaimedTaskResult> {
  const currentResult = await client.from(CC_TASKS_TABLE).select('*')
    .eq('founder_id', input.founderId).eq('id', input.taskId)
    .eq('status', 'running').eq('claimed_by', input.runnerId).limit(1)
  if (currentResult.error) throw new Error(`releaseClaimedTask read failed: ${currentResult.error.message}`)
  if (!Array.isArray(currentResult.data)) throw new Error('releaseClaimedTask read returned no row data')
  const current = currentResult.data[0] as ClaimedTask | undefined
  if (!current) return { task: null, effectiveOutcome: input.outcome }
  const deliveryMission = isDeliveryMission(current)
  const delivery = deliveryMission ? readDeliveryMetadata(current) : null
  let outcome = input.outcome
  let priorRequeues: number | null = null
  if (input.outcome === 'requeue') {
    priorRequeues = await countPriorRequeues(client, input.founderId, input.taskId)
    if (priorRequeues !== null && priorRequeues >= MAX_REQUEUE_ATTEMPTS) outcome = 'failed'
  }

  const values: Record<string, unknown> = { status: OUTCOME_STATUS[outcome] }
  if (deliveryMission) values.updated_at = new Date(Math.max(Date.now(), Date.parse(current.updated_at) + 1)).toISOString()
  if (delivery && outcome !== 'done') {
    // Claim is initially a reservation. A later lane refusal must not leave a
    // persisted active build-SPM assignment. Historical attempts remain in the
    // claim/lifecycle events; a retry creates its own new acceptance identity.
    const releasedDelivery = { ...delivery }
    delete releasedDelivery.executionAssignment
    values.metadata = { ...current.metadata, delivery: releasedDelivery }
  }
  if (outcome === 'done' && deliveryMission) {
    if (!delivery || !getApprovedDelivery(current)) throw new Error('Approved delivery specification is unavailable')
    if (!input.prRef || !/^https:\/\/github\.com\/CleanExpo\/Unite-Group\/pull\/[1-9][0-9]*$/i.test(input.prRef)) {
      throw new Error('A valid draft PR reference for the approved repository is required for delivery review')
    }
    values.status = 'awaiting_approval'
    values.claimed_by = null
    values.claimed_at = null
    values.metadata = { ...current.metadata, delivery: { ...delivery, build: {
      status: 'awaiting_review', prRef: input.prRef, runnerId: input.runnerId,
      specRevision: delivery.revision, specFingerprint: delivery.specVersion,
      completedAt: new Date().toISOString(),
    } } }
  }
  if (outcome === 'requeue') {
    values.claimed_by = null
    values.claimed_at = null
  }
  if (input.prRef && (!deliveryMission || outcome === 'done')) values.preview_url = input.prRef

  let release = client
    .from(CC_TASKS_TABLE)
    .update(values)
    .eq('founder_id', input.founderId)
    .eq('id', input.taskId)
    .eq('status', 'running')
    .eq('claimed_by', input.runnerId)
  if (deliveryMission) {
    release = release.eq('updated_at', current.updated_at)
    if (delivery) release = release.eq('metadata->delivery->>revision', String(delivery.revision))
  }
  const { data, error } = await release.select('*')
  if (error) throw new Error(`releaseClaimedTask failed: ${error.message}`)

  const rows = (data as ClaimedTask[]) ?? []
  const released = rows[0] ?? null
  // A concurrent metadata write can lose this CAS while the runner still owns
  // the running task. Let the existing bounded 5xx retry re-read it; treating
  // this as terminal 404 would leave that claim stranded unnecessarily.
  if (!released && deliveryMission) throw new Error('Delivery release changed concurrently; retry the release')

  // Record why a requeue came back as 'failed' — best-effort, the status
  // change above is the source of truth (matches the queue route's pattern).
  if (released && input.outcome === 'requeue' && outcome === 'failed') {
    try {
      await appendTaskEvent(
        {
          founderId: input.founderId,
          taskId: input.taskId,
          type: 'failed',
          actor: input.runnerId,
          payload: {
            outcome: 'failed',
            code: 'max_requeue_attempts_exhausted',
            prior_requeues: priorRequeues,
          },
        },
        client as unknown as SupabaseLike,
      )
    } catch (err) {
      console.error(
        `releaseClaimedTask: max-attempts event append failed (${err instanceof Error ? err.message : 'unknown'}) for task ${input.taskId}`,
      )
    }
  }

  return { task: released, effectiveOutcome: outcome }
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
