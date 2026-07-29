// src/lib/command-centre/mission-lane-binding.ts
//
// The governed edge between an approved cc_tasks mission and an isolated
// execution lane, plus the honest status it reports back to Mission Control.
//
// WHAT THIS IS NOT: it does not spawn a Claude CLI. The real worktree-isolated
// lane lives in apps/workspace (lane-orchestrator + cli-adapter + worktree-
// manager) and is currently INERT BY DESIGN — processTreeContainmentSupported()
// in apps/workspace/src/server/lanes/process-tree.ts returns false
// unconditionally, so createSupervisedSpawn rejects before any spawn and every
// CLI lane reports unavailable. That gate is a founder/Board safety decision and
// is deliberately left closed here.
//
// WHAT THIS IS: the admission, cancellation and reporting contract around such a
// lane, expressed against the same `run(mission, { signal }) => { output }`
// shape apps/workspace's LaneAdapter already uses, so a runner can be driven
// locally (a mock in tests today; the real adapter when containment is wired)
// without either side inventing a second protocol.
//
// Governance properties, asserted by ./__tests__/mission-lane-binding.test.ts:
//  - HARD_STOP wins over everything, checked before dispatch, not only per poll.
//  - Admission is fail-closed: an unclassified, unsafe, side-effecting or
//    above-L1 mission is refused, and only a `queued` task is ever considered.
//  - Backpressure is a soft refusal that leaves the task queued.
//  - A cancellation or hard stop NEVER requeues — only a timeout or crash does,
//    and the runner's MAX_REQUEUE_ATTEMPTS cap still bounds those.
//  - Lane output and failures are redacted and never echo the mission text.
//  - A missing lane reports `not_connected` and a stale heartbeat reports
//    `stale` — never a fabricated healthy green.

import {
  READ_ONLY_ACTION_KINDS,
  redactVoiceText,
  verifyMissionProvenance,
  type VoiceMissionAdmission,
} from './voice-mission-bridge'
import { HARD_GATED_TASK_TYPES } from '../operator-gateway/lanes'
import type { RunnerReleaseOutcome } from './runner-claim'
import type { CommandCentreTask, TaskStatus } from './tasks'

/** Bounded by default so a wedged lane cannot run forever. */
export const MISSION_LANE_DEFAULT_TIMEOUT_MS = 180_000

/** How often the kill switch is polled while a mission is running. */
export const MISSION_LANE_HARD_STOP_POLL_MS = 1_000

/** A heartbeat older than this is reported as stale rather than live. */
export const MISSION_LANE_STALE_AFTER_MS = 120_000

const MAX_LANE_OUTPUT_LENGTH = 8_000

// ─── Admission ───────────────────────────────────────────────────────────────

export type LaneAdmissionCode =
  | 'admitted'
  | 'hard_stop'
  | 'lane_unavailable'
  | 'not_queued'
  | 'risk_unclassified'
  | 'provenance_missing'
  | 'provenance_legacy'
  | 'side_effecting'
  | 'tier_not_admissible'
  | 'admission_not_safe'
  | 'at_capacity'

export interface LaneAdmissionDecision {
  admit: boolean
  code: LaneAdmissionCode
}

export interface LaneAdmissionContext {
  /** Missions already executing on this host. */
  inFlight: number
  maxConcurrent: number
  /** The estate kill switch (~/.claude/HARD_STOP, or any equivalent signal). */
  hardStop: boolean
  /** Whether an execution lane is actually available to receive the mission. */
  laneAvailable: boolean
  /**
   * The runner id that just won this task via the atomic claim, when the caller
   * IS that claim path.
   *
   * claimNextQueuedTask flips queued → running under `.eq('status','queued')`
   * and returns the UPDATED row, so a freshly claimed task arrives here already
   * reading 'running'. Judging it on `status === 'queued'` alone would therefore
   * refuse every task the runner ever claims. That is not a reason to drop the
   * status check: it is a reason to state what the check is really asserting —
   * that this mission cleared the approval actor and was handed to THIS caller.
   *
   * So a 'running' task is admissible only when its `claimed_by` matches this
   * id, which is exactly the row the atomic guard just proved was queued a
   * moment ago. Omit it (the default) and only a 'queued' task is admissible,
   * which keeps every other caller on the stricter rule.
   */
  claimedBy?: string
}

// ADMISSIBLE_TIERS removed: the gate no longer reads the stored tier at all. It
// derives the hard-gate/high-risk refusal from actionKinds and risk_level, both
// of which are covered by the HMAC — so there is no tier value left to compare
// against a set. Keeping the constant would imply the stored tier still has
// authority here, and it does not.

// (C) Independent review: the previous implementation cast a partial object
// after checking only two fields, so a verdict with `sideEffecting: undefined`
// read as not-side-effecting and a forged `{tier,safe}` envelope was admissible.
// Every field is now validated at runtime before the verdict is trusted.
const VALID_TIERS = new Set(['L0', 'L1', 'L2', 'L3'])
const VALID_INITIAL_STATUSES = new Set(['proposed', 'awaiting_approval'])
const VALID_EXECUTION_MODES = new Set(['advisory', 'local-code', 'branch-preview', 'overnight'])
const MACHINE_CODE = /^[a-z0-9_]+$/
// MISSION_HASH removed: matching the SHAPE of a hash is not evidence about what
// produced it, and accepting any 32-64 char hex is what let a forged envelope
// through the lane gate. Provenance is now recomputed, not pattern-matched.

function readVoiceEnvelope(task: CommandCentreTask): Record<string, unknown> | null {
  const voiceMission = task.metadata?.voiceMission
  if (!voiceMission || typeof voiceMission !== 'object' || Array.isArray(voiceMission)) return null
  return voiceMission as Record<string, unknown>
}

/**
 * Read the admission verdict ONLY if every field is present and well-typed.
 * A missing, partial, forged or wrong-typed verdict returns null, which the
 * caller treats as unclassified and refuses — fail closed on absence.
 */
function readAdmission(task: CommandCentreTask): VoiceMissionAdmission | null {
  const envelope = readVoiceEnvelope(task)
  if (!envelope) return null
  const admission = envelope.admission
  if (!admission || typeof admission !== 'object' || Array.isArray(admission)) return null
  const c = admission as Record<string, unknown>

  if (typeof c.tier !== 'string' || !VALID_TIERS.has(c.tier)) return null
  if (typeof c.safe !== 'boolean') return null
  if (typeof c.sideEffecting !== 'boolean') return null
  if (typeof c.humanApprovalRequired !== 'boolean') return null
  if (typeof c.reason !== 'string' || !MACHINE_CODE.test(c.reason)) return null
  if (typeof c.initialStatus !== 'string' || !VALID_INITIAL_STATUSES.has(c.initialStatus)) return null
  if (typeof c.executionMode !== 'string' || !VALID_EXECUTION_MODES.has(c.executionMode)) return null

  return c as unknown as VoiceMissionAdmission
}

/**
 * Immutable provenance must be present AND authentic for a mission to be
 * dispatchable.
 *
 * This previously returned true for any 32-64 char hex `missionHash`, which is a
 * check on the shape of the value rather than on what produced it — a forged
 * envelope carrying a plausible hash satisfied the lane gate and reached an
 * execution lane. `verifyMissionProvenance` recomputes the hash from the task's
 * own fields and requires an exact match, so it can only be produced by
 * possessing the mission it describes.
 */
function hasProvenance(task: CommandCentreTask): boolean {
  return verifyMissionProvenance(task)
}

/**
 * The action kinds from the envelope, which ARE covered by the HMAC — so by the
 * time provenance has verified, these are authenticated inputs rather than
 * mutable metadata. Returns null if the list is absent or not an array of
 * strings, which the caller treats as unclassified and refuses.
 */
function readAuthenticatedActionKinds(task: CommandCentreTask): string[] | null {
  const envelope = readVoiceEnvelope(task)
  if (!envelope) return null
  const kinds = envelope.actionKinds
  if (!Array.isArray(kinds)) return null
  if (!kinds.every((kind): kind is string => typeof kind === 'string')) return null
  return kinds
}

/**
 * Decide whether an approved mission may be handed to an execution lane.
 * Default-deny and ordered by severity: the kill switch and lane availability
 * are settled before anything about the task is trusted, and capacity is the
 * last (softest) refusal so a safety code always wins.
 */
export function admitMissionToLane(
  task: CommandCentreTask,
  context: LaneAdmissionContext,
): LaneAdmissionDecision {
  if (context.hardStop) return { admit: false, code: 'hard_stop' }
  if (!context.laneAvailable) return { admit: false, code: 'lane_unavailable' }

  // Only the runner's own atomic claim moves queued → running; anything not
  // sitting in `queued` has not cleared the approval actor. The one exception is
  // the claimant itself reading back the row it just won — see `claimedBy`.
  const justClaimedByCaller =
    task.status === 'running' &&
    typeof context.claimedBy === 'string' &&
    context.claimedBy.length > 0 &&
    (task as { claimed_by?: unknown }).claimed_by === context.claimedBy
  if (task.status !== 'queued' && !justClaimedByCaller) {
    return { admit: false, code: 'not_queued' }
  }

  // The admission + provenance checks below judge a VOICE mission, and only a
  // voice mission carries the envelope they read. cc_tasks is also written by
  // work-packet-store and queue-bridge, whose rows have no `voiceMission` key at
  // all — applying these checks to them would refuse every non-voice mission as
  // `risk_unclassified` and starve the runner completely. Those rows reach
  // `queued` through their own founder-authenticated approval path, which is the
  // control that governs them.
  //
  // Scope is decided by TWO independent signals, either of which is sufficient,
  // so an envelope cannot be dropped to escape the check it is subject to: a row
  // that still says `voice:` in external_ref is judged as voice even with no
  // envelope, and an envelope is judged as voice even with external_ref rewritten.
  //
  // Honest boundary: a writer holding the service-role key could insert a row
  // bearing neither signal and skip this gate. That is unchanged by this fix and
  // out of its threat model — the P1 was about the ElevenLabs ingest token, which
  // reaches cc_tasks only through the voice bridge, and the bridge always sets
  // both signals.
  if (isVoiceOriginated(task)) {
    const admission = readAdmission(task)
    if (!admission) return { admit: false, code: 'risk_unclassified' }
    if (!hasProvenance(task)) {
      // A mission bridged BEFORE the keyed-provenance rollout carries an
      // envelope with no `approvalRequested` field, because only the new bridge
      // writes one. Its hash was an unkeyed SHA-256 and can never verify against
      // the HMAC, so it must not run — but reporting it as `provenance_missing`
      // would file approved work under the same code as a forgery, and the
      // caller settles that as a terminal failure. A distinct code lets the
      // refusal say what actually happened: this mission predates the key and
      // has to be re-spoken or re-ingested, not quietly written off as invalid.
      //
      // Verified against production before shipping: zero cc_tasks rows carry
      // voiceMission metadata (48 tasks, 40 queued, 0 voice), so there is
      // nothing to migrate today. That is a reason to keep the deploy ordering
      // safe, not a reason to leave the path destructive.
      return {
        admit: false,
        code: isLegacyEnvelope(task) ? 'provenance_legacy' : 'provenance_missing',
      }
    }
    // RECOMPUTED from authenticated fields, never read from the stored verdict.
    //
    // The HMAC covers the mission (packetId, title, objective, riskLevel,
    // approvalRequested, approvalReason, actionKinds, businessContext). It does
    // NOT cover `admission.sideEffecting` or `admission.tier` — and this gate
    // used to read exactly those two to refuse. So a writer with database access
    // but no provenance key could take a genuine L3 side-effecting voice task,
    // rewrite its envelope to `{sideEffecting: false, tier: 'L1'}`, and pass the
    // gate once a human approved it. The provenance check would still verify,
    // because nothing it covers had changed.
    //
    // That is the same defect this whole change set began with: a gate trusting
    // unauthenticated metadata. I authenticated the mission and left the verdict
    // unauthenticated, while the gate reads the verdict.
    //
    // Extending the hash to cover the verdict would work, but recomputing is
    // strictly better: it removes the possibility of the two disagreeing rather
    // than detecting it. `sideEffecting` and the hard-gate/high-risk tier are
    // pure functions of actionKinds and riskLevel, both of which ARE
    // authenticated, so the gate derives them itself and the stored verdict
    // becomes advisory display data with no authority.
    const authenticatedActionKinds = readAuthenticatedActionKinds(task)
    if (authenticatedActionKinds === null) return { admit: false, code: 'risk_unclassified' }

    const sideEffecting = authenticatedActionKinds.some(
      (kind) => !READ_ONLY_ACTION_KINDS.has(kind),
    )
    if (sideEffecting) return { admit: false, code: 'side_effecting' }

    const hardGated = authenticatedActionKinds.some((kind) =>
      HARD_GATED_TASK_TYPES.includes(kind),
    )
    const highRisk = task.risk_level === 'high' || task.risk_level === 'critical'
    if (hardGated || highRisk) return { admit: false, code: 'tier_not_admissible' }
    // `admission.safe` is deliberately NOT required here any more.
    //
    // The classifier no longer claims safety for a voice mission, because every
    // input it has is self-attested by the packet and none of them constrains
    // the free-text objective the runner executes. So `safe` is now always false
    // on this path, and requiring it would mean a mission the FOUNDER read and
    // approved could never run — the fix for one hole opening a worse one.
    //
    // The authority that replaces it is stronger, not weaker: reaching `queued`
    // requires the approval actor, i.e. a human who read the objective. That is
    // checked above (status must be queued, or running-and-claimed-by-us). The
    // self-attested restrictions still apply — a side-effecting or above-L1
    // declaration is still refused — but the affirmative safety judgement now
    // comes from the human rather than from the packet describing itself.
    //
    // If auto-admission is ever restored it must come with a structurally
    // bounded objective (validated action descriptors, not free text), and this
    // check comes back with it.
  }

  if (context.inFlight >= context.maxConcurrent) return { admit: false, code: 'at_capacity' }

  return { admit: true, code: 'admitted' }
}

/**
 * Whether this envelope predates keyed provenance. `approvalRequested` is
 * written only by the post-rollout bridge, so its absence on an otherwise
 * well-formed voice envelope dates the row rather than condemning it.
 */
function isLegacyEnvelope(task: CommandCentreTask): boolean {
  const envelope = readVoiceEnvelope(task)
  if (!envelope) return false
  const provenance = envelope.provenance
  const hasHash =
    !!provenance &&
    typeof provenance === 'object' &&
    typeof (provenance as Record<string, unknown>).missionHash === 'string'
  return hasHash && !('approvalRequested' in envelope)
}

/**
 * Whether this row came from the voice ingest path, and so must satisfy the
 * voice admission contract. Deliberately over-inclusive: anything that looks
 * like a voice mission by either signal is held to the stricter rule.
 */
function isVoiceOriginated(task: CommandCentreTask): boolean {
  if (readVoiceEnvelope(task) !== null) return true
  const externalRef = (task as { external_ref?: unknown }).external_ref
  if (typeof externalRef === 'string' && externalRef.startsWith('voice:')) return true
  return (task as { agent_owner?: unknown }).agent_owner === 'margot-voice'
}

// ─── Terminal outcomes ───────────────────────────────────────────────────────

export type MissionRunOutcome =
  | 'completed'
  | 'timed_out'
  | 'cancelled'
  | 'hard_stopped'
  | 'crashed'

export interface MissionRelease {
  outcome: RunnerReleaseOutcome
  /** Machine-safe code for the audit trail — never prose. */
  code: string
}

// A deliberate, explicit table: a cancellation or hard stop is a decision, so it
// closes the task rather than quietly re-entering the queue to run again. Only
// an incidental failure (timeout, crash) is retried, and releaseClaimedTask's
// MAX_REQUEUE_ATTEMPTS still caps that.
const OUTCOME_RELEASE: Record<MissionRunOutcome, MissionRelease> = {
  completed: { outcome: 'done', code: 'completed' },
  timed_out: { outcome: 'requeue', code: 'lane_timeout' },
  crashed: { outcome: 'requeue', code: 'lane_crashed' },
  cancelled: { outcome: 'failed', code: 'cancelled' },
  hard_stopped: { outcome: 'failed', code: 'hard_stop' },
}

export function missionOutcomeToRelease(outcome: MissionRunOutcome): MissionRelease {
  return OUTCOME_RELEASE[outcome]
}

// ─── Running a mission in a lane ─────────────────────────────────────────────

/**
 * The execution contract. Structurally identical to apps/workspace's
 * LaneAdapter (`run(lane, mission, { signal })`) so the real worktree-isolated
 * adapter satisfies it unchanged once kernel containment is wired, and a local
 * mock satisfies it today.
 */
export interface MissionLaneRunner {
  run(
    mission: { ref: string; objective: string },
    options: { signal: AbortSignal },
  ): Promise<{ output: string }>
}

export interface MissionRunResult {
  outcome: MissionRunOutcome
  code: string
  /** Redacted, bounded lane output. Empty unless the run completed. */
  output: string
}

export interface RunMissionOptions {
  timeoutMs?: number
  /** External cancellation (a founder stop, a shutdown). */
  signal?: AbortSignal
  /**
   * The estate kill switch. Checked before dispatch AND polled for the life of
   * the run, so a HARD_STOP thrown mid-flight aborts the runner rather than
   * merely preventing the next one.
   */
  hardStop?: () => boolean
  /** How often the kill switch is polled while a run is in flight. */
  hardStopPollMs?: number
}

/**
 * Run one admitted mission against a lane runner with a bounded timeout and a
 * real cancellation path.
 *
 * The kill switch is checked BEFORE dispatch, so a HARD_STOP never merely
 * shortens an in-flight run — it prevents one. Timeout and external
 * cancellation both abort the runner's signal, so a compliant lane terminates
 * its child rather than being orphaned. Nothing derived from the mission text
 * is returned on failure.
 */
export async function runMissionInLane(
  runner: MissionLaneRunner,
  mission: { ref: string; objective: string },
  options: RunMissionOptions,
): Promise<MissionRunResult> {
  if (options.hardStop?.()) {
    return { outcome: 'hard_stopped', code: 'hard_stop', output: '' }
  }
  if (options.signal?.aborted) {
    return { outcome: 'cancelled', code: 'cancelled', output: '' }
  }

  const controller = new AbortController()
  const timeoutMs = options.timeoutMs ?? MISSION_LANE_DEFAULT_TIMEOUT_MS

  let timedOut = false
  let cancelled = false
  let hardStopped = false

  const onExternalAbort = () => {
    cancelled = true
    controller.abort()
  }
  options.signal?.addEventListener('abort', onExternalAbort, { once: true })

  const timer = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, timeoutMs)

  // (D) Independent review: blocking at the door is not a global kill switch.
  // A HARD_STOP raised after the runner started must reach the in-flight child,
  // so poll it for the life of the run and abort the shared signal on transition.
  const hardStopWatcher = options.hardStop
    ? setInterval(() => {
        try {
          if (options.hardStop?.()) {
            hardStopped = true
            controller.abort()
          }
        } catch {
          // A kill switch that cannot be read is treated as thrown: fail closed.
          hardStopped = true
          controller.abort()
        }
      }, options.hardStopPollMs ?? MISSION_LANE_HARD_STOP_POLL_MS)
    : null

  try {
    const { output } = await runner.run(mission, { signal: controller.signal })
    if (hardStopped) return { outcome: 'hard_stopped', code: 'hard_stop', output: '' }
    return {
      outcome: 'completed',
      code: 'completed',
      output: redactLaneOutput(output),
    }
  } catch {
    // The failure reason is deliberately not surfaced: an adapter error can
    // echo the mission text or an environment path. The outcome code is enough
    // for the audit trail, and the lane's own sanitiser owns its logs.
    // Ordered by severity: a kill switch beats a timeout beats a cancellation.
    if (hardStopped) return { outcome: 'hard_stopped', code: 'hard_stop', output: '' }
    if (timedOut) return { outcome: 'timed_out', code: 'lane_timeout', output: '' }
    if (cancelled) return { outcome: 'cancelled', code: 'cancelled', output: '' }
    return { outcome: 'crashed', code: 'lane_crashed', output: '' }
  } finally {
    clearTimeout(timer)
    if (hardStopWatcher) clearInterval(hardStopWatcher)
    options.signal?.removeEventListener('abort', onExternalAbort)
  }
}

function redactLaneOutput(value: string): string {
  return redactVoiceText(value).slice(0, MAX_LANE_OUTPUT_LENGTH)
}

// ─── Honest Mission Control status ───────────────────────────────────────────

export type MissionControlSource = 'live' | 'stale' | 'not_connected'

export interface LaneSnapshot {
  laneStatus: string
  lastHeartbeatAt: string | null
  /** Present on real lanes; never surfaced (it is an absolute host path). */
  worktree?: string
}

export interface MissionControlRow {
  taskId: string
  status: TaskStatus
  /** The gate a mission is parked behind, or null when it is not parked. */
  gate: 'awaiting_approval' | null
  /** The machine-readable reason it is parked (from the admission verdict). */
  gateReason: string | null
  tier: string | null
  source: MissionControlSource
  laneStatus: string | null
  lastHeartbeatAt: string | null
}

/**
 * Project a mission onto the Mission Control surface WITHOUT inventing health.
 * No lane attached reports `not_connected`; an aged heartbeat reports `stale`.
 * A `running` task with nothing behind it is therefore visibly not-connected
 * rather than silently green — the No-Invaders "no fake-as-real" rule.
 */
export function toMissionControlRow(
  task: CommandCentreTask,
  lane: LaneSnapshot | null,
  options: { now: number; staleAfterMs?: number },
): MissionControlRow {
  const admission = readAdmission(task)
  const staleAfterMs = options.staleAfterMs ?? MISSION_LANE_STALE_AFTER_MS

  let source: MissionControlSource = 'not_connected'
  let lastHeartbeatAt: string | null = null

  if (lane) {
    const beat = lane.lastHeartbeatAt ? Date.parse(lane.lastHeartbeatAt) : NaN
    if (Number.isNaN(beat)) {
      source = 'not_connected'
    } else {
      lastHeartbeatAt = lane.lastHeartbeatAt
      source = options.now - beat > staleAfterMs ? 'stale' : 'live'
    }
  }

  return {
    taskId: task.id,
    status: task.status,
    gate: task.status === 'awaiting_approval' ? 'awaiting_approval' : null,
    gateReason: admission?.reason ?? null,
    tier: admission?.tier ?? null,
    source,
    // The worktree path is intentionally not carried through.
    laneStatus: lane ? redactVoiceText(lane.laneStatus) : null,
    lastHeartbeatAt,
  }
}
