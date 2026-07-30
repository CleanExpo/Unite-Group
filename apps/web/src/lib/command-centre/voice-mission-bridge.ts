// src/lib/command-centre/voice-mission-bridge.ts
//
// The missing edge between an authenticated mobile-voice packet and the
// founder-scoped cc_tasks mission authority.
//
// Today `/api/pi-ceo/margot-voice/task` validates a packet, writes one
// `margot_voice_sessions` row and stops; nothing turns a spoken mission into
// governed work. This module is that bridge, and deliberately nothing more:
//
//   parseVoiceMissionPacket → classifyVoiceMission → voiceMissionToCreateTaskInput
//   → createTaskOnce (idempotent) → appendTaskEvent('created')
//
// Governance properties, each asserted by ./__tests__/voice-mission-bridge.test.ts:
//
//  - NO NEW LEDGER. cc_tasks stays the mission authority; this module only maps
//    onto it. margot_voice_sessions keeps the transcript, and the task holds a
//    pointer, never a copy.
//  - IDEMPOTENT BY CONSTRAINT, not by application logic. The external_ref is a
//    deterministic function of the packet id, so a webhook redelivery collides
//    on cc_tasks' UNIQUE(founder_id, external_ref) and createTaskOnce reuses the
//    winner. No lookback scan, no process-local lock.
//  - DORMANT BY DEFAULT. With MOBILE_VOICE_AUTONOMY unset, every mission is
//    parked at `awaiting_approval` with reason 'kill_switch_off'. Merging this
//    arms nothing.
//  - CANNOT MINT RUNNABLE WORK. A mission is only ever born `proposed` or
//    `awaiting_approval`. Promotion to `queued` belongs to the `approval` actor
//    alone (task-transitions.ts) and `running` to the runner's atomic claim, so
//    "admitted" here means eligible for approval — never self-dispatch.
//  - FAIL CLOSED. An unrecognised action kind is treated as side-effecting, and
//    a side-effecting or hard-gated mission is never auto-admitted.
//  - REDACTED. Transcript text never reaches cc_tasks; free text that does
//    (title/objective, event targets) is scrubbed and bounded first.
//
// Pure functions plus one orchestrator over an injected SupabaseLike — no
// Supabase client is imported, so the whole module is unit-testable with no DB
// (the house pattern from ./tasks.ts and ./signals/ingest.ts).

import { createHmac, timingSafeEqual } from 'node:crypto'

import type { AgentEventInput } from './agent-events'
import {
  appendTaskEventOnce,
  createTaskOnce,
  type CommandCentreTask,
  type CreateTaskInput,
  type SupabaseLike,
  type TaskExecutionMode,
  type TaskRiskLevel,
  type TaskStatus,
} from './tasks'
import { HARD_GATED_TASK_TYPES } from '../operator-gateway/lanes'
// Type-only: keeps one tier vocabulary across the estate without pulling the
// CRM matrix's evidence-ledger dependency into this path.
import type { AutoExecuteTier } from '../crm/auto-exec-matrix'

/** Arming flag. Unset (the default) parks every voice mission for approval. */
export const VOICE_MISSION_AUTONOMY_ENV = 'MOBILE_VOICE_AUTONOMY'

/** Mirrors the mobile-voice intake route's transcript cap. */
export const MAX_VOICE_TRANSCRIPT_LENGTH = 80_000

const MAX_TITLE_LENGTH = 120
const MAX_OBJECTIVE_LENGTH = 500
const MAX_TARGET_LENGTH = 128
const MAX_PACKET_ID_LENGTH = 200
const MAX_ACTION_KINDS = 20
/** Hashed AND used for routing, so an over-long value is refused, not shortened. */
const MAX_BUSINESS_CONTEXT_LENGTH = 64

/**
 * The closed set of action kinds a voice mission may carry and still be
 * considered read-only. Anything outside this set — including a kind we have
 * never seen — counts as side-effecting, so the gate fails closed.
 */
export const READ_ONLY_ACTION_KINDS: ReadonlySet<string> = new Set([
  'research',
  'summarise',
  'draft',
  'read',
  'inspect',
  'plan',
])

// ─── Normalised mission ──────────────────────────────────────────────────────

/**
 * A voice mission reduced to its control fields. Deliberately carries NO
 * transcript: the transcript stays in margot_voice_sessions under RLS and this
 * record points at it by packet id.
 */
export interface NormalisedVoiceMission {
  packetId: string
  conversationId: string | null
  title: string
  objective: string
  riskLevel: TaskRiskLevel
  approvalRequested: boolean
  approvalReason: string | null
  actionKinds: string[]
  transcriptCharacterCount: number
  businessContext: string
}

export type VoiceMissionParse =
  | { ok: true; mission: NormalisedVoiceMission }
  | { ok: false; reasons: string[] }

// ─── Redaction (apps/web has no shared text sanitiser; this is the minimum) ───

// Token families and absolute home paths that must never survive into a task
// row or an event target. Mirrors the intent of apps/workspace's
// sanitiseLaneOutput; kept deliberately small because only bounded, already
// structured fields pass through here.
const SECRET_PATTERNS: readonly RegExp[] = [
  /\b(?:sk|rk)[-_](?:live[-_])?[A-Za-z0-9_-]{8,}/gi,
  /\b(?:gh[opusr]_|github_pat_)[A-Za-z0-9_]{10,}/g,
  /\bxox[baprs]-[A-Za-z0-9-]{10,}/g,
  /\bA(?:KI|SI)A[A-Z0-9]{12,}/g,
  /\bAIza[A-Za-z0-9_-]{10,}/g,
  /\b(?:whsec_|gsk_|hf_|lin_api_|sb_secret_)[A-Za-z0-9._-]{8,}/g,
  /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g,
  /\b[A-Z][A-Z0-9_]*(?:KEY|TOKEN|SECRET|PASSWORD)\s*=\s*\S+/g,
]

const PATH_PATTERN = /(?:\/Users\/|\/home\/|\/private\/var\/folders\/|\/var\/folders\/)\S*/g

/** Scrub secret-shaped substrings from free text before it is persisted. */
export function redactVoiceText(value: string): string {
  let out = value.replace(PATH_PATTERN, 'redacted-path')
  for (const pattern of SECRET_PATTERNS) out = out.replace(pattern, 'redacted')
  return out
}

/**
 * Reduce a value to a short machine-safe reference. Event targets are "codes,
 * never prose" (the cc_agent_events contract in runner-claim.ts), so this
 * redacts first, then keeps only reference-safe characters.
 */
function machineSafeRef(value: string, limit = MAX_TARGET_LENGTH): string {
  return redactVoiceText(value)
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^A-Za-z0-9._:/-]/g, '')
    .slice(0, limit)
}

function cleanText(value: string, limit: number): string {
  // Control characters are stripped so a transcript cannot smuggle terminal
  // escapes or line breaks into a title, objective or event target.
  return redactVoiceText(value.replace(/[\u0000-\u001f\u007f]/g, ' '))
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, limit)
}

// ─── Parsing ─────────────────────────────────────────────────────────────────

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

/**
 * The four declared risk levels. A packet must state one of them exactly.
 *
 * (A) Independent review: an absent or unrecognised risk_level must NOT quietly
 * become 'low'. Silently downgrading an unknown risk is the single cheapest way
 * for an unclassified mission to acquire an L1 verdict, so this refuses instead.
 */
export const VOICE_RISK_LEVELS: readonly TaskRiskLevel[] = ['low', 'medium', 'high', 'critical']

function readRiskLevel(value: unknown): TaskRiskLevel | null {
  if (typeof value !== 'string') return null
  const risk = value.trim()
  return (VOICE_RISK_LEVELS as readonly string[]).includes(risk) ? (risk as TaskRiskLevel) : null
}

/**
 * Pull the bounded, machine-safe `kind` of each proposed action, or null if the
 * action list cannot be read faithfully.
 *
 * This previously DROPPED what it could not parse and TRUNCATED after 20, which
 * made the parser a bypass: a packet carrying twenty read-only actions followed
 * by `{kind:'payments'}` had the side-effecting action silently discarded and
 * was then classified read-only. The same held for a malformed entry, an empty
 * kind, or a kind whose characters were all stripped. Every one of those made
 * the mission look SAFER than the packet actually declared, which is the wrong
 * direction for a lossy step to fail in.
 *
 * The same reasoning the packet-id canonicaliser already documents applies here:
 * refusing keeps the mapping faithful, whereas quietly rewriting the input
 * merges distinct meanings. So an unreadable or over-long action list is now a
 * parse failure, and the caller refuses the packet.
 */
function readActionKinds(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null
  if (value.length > MAX_ACTION_KINDS) return null

  const kinds: string[] = []
  for (const action of value) {
    if (!isRecord(action)) return null
    const raw = asString(action.kind ?? action.type).toLowerCase()
    if (!raw) return null
    const cleaned = raw.replace(/[^a-z0-9_]/g, '')
    // A kind that is not already machine-safe is refused rather than rewritten:
    // 'pay-ments' and 'payments' must not silently become the same token, and a
    // kind of '***' must not vanish into nothing.
    if (cleaned !== raw || cleaned.length > 64) return null
    kinds.push(cleaned)
  }
  return kinds
}

/**
 * (B) The admissible packet-id alphabet. Canonicalisation here is an IDENTITY
 * map over admissible ids and a refusal for everything else — it never rewrites
 * an id. A lossy canonicaliser (strip-unsafe-characters) would map 'a b',
 * 'a/b' and 'a★b' onto the same ref and silently merge three distinct missions;
 * refusing keeps the mapping injective, so distinct ids stay distinct.
 *
 * Returns null when the id is empty, over-long, contains a character outside
 * the alphabet, or carries no alphanumeric content at all (e.g. '...', '★★★').
 */
const PACKET_ID_ALPHABET = /^[A-Za-z0-9._:-]+$/
const PACKET_ID_HAS_SUBSTANCE = /[A-Za-z0-9]/

export function canonicalPacketId(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed || trimmed.length > MAX_PACKET_ID_LENGTH) return null
  if (!PACKET_ID_ALPHABET.test(trimmed)) return null
  if (!PACKET_ID_HAS_SUBSTANCE.test(trimmed)) return null
  return trimmed
}

/**
 * Validate and normalise an inbound voice packet, collecting EVERY reason it
 * was refused rather than throwing on the first (the validateJobProposal idiom).
 * founder scope is never accepted from the body — it is derived server-side.
 */
export function parseVoiceMissionPacket(value: unknown): VoiceMissionParse {
  const reasons: string[] = []
  if (!isRecord(value)) return { ok: false, reasons: ['packet must be an object'] }

  // Server-controlled fields must never arrive from the caller.
  for (const forbidden of ['founder_id', 'founderId', 'status', 'execution_mode']) {
    if (forbidden in value) reasons.push(`${forbidden} is server-derived and must not be supplied`)
  }

  const packetId = canonicalPacketId(value.packet_id)
  if (!packetId) {
    reasons.push(
      `packet_id is required and must be 1-${MAX_PACKET_ID_LENGTH} characters of [A-Za-z0-9._:-] including at least one alphanumeric`,
    )
  }

  const transcript = asString(value.transcript_text)
  if (!transcript) reasons.push('transcript_text is required')
  else if (transcript.length > MAX_VOICE_TRANSCRIPT_LENGTH) {
    reasons.push(`transcript_text exceeds ${MAX_VOICE_TRANSCRIPT_LENGTH} characters`)
  }

  const summary = asString(value.summary)
  if (!summary) reasons.push('summary is required')

  const riskLevel = readRiskLevel(value.risk_level)
  if (!riskLevel) {
    reasons.push(`risk_level is required and must be one of ${VOICE_RISK_LEVELS.join(', ')}`)
  }

  // An action list that cannot be read FAITHFULLY is refused, never partially
  // accepted: every lossy outcome (a dropped malformed entry, an emptied kind, a
  // list truncated at the cap) made the mission look safer than the packet
  // declared, so the parser now fails closed and says so.
  const actionKinds = readActionKinds(value.actions)
  if (actionKinds === null) {
    reasons.push(
      `actions must be an array of at most ${MAX_ACTION_KINDS} objects, each with a machine-safe kind of [a-z0-9_] up to 64 characters`,
    )
  }

  // requested_outcome must fit the objective bound rather than be truncated to
  // it. The route accepts up to 2,000 characters and hands the raw body to this
  // parser, which then cut the objective to 500 — so two different instructions
  // sharing their first 500 characters produced the SAME provenance hash and the
  // second was accepted as a duplicate replay of the first. Refusing keeps the
  // hash injective over admissible packets, which is the property the whole
  // provenance check depends on.
  const requestedOutcome = asString(value.requested_outcome)
  if (requestedOutcome && cleanText(requestedOutcome, MAX_OBJECTIVE_LENGTH + 1).length > MAX_OBJECTIVE_LENGTH) {
    reasons.push(`requested_outcome exceeds ${MAX_OBJECTIVE_LENGTH} characters after normalisation`)
  }
  if (summary && cleanText(summary, MAX_TITLE_LENGTH + 1).length > MAX_TITLE_LENGTH && !requestedOutcome) {
    // summary is the objective fallback, so it is bound by the objective limit
    // when it plays that role.
    if (cleanText(summary, MAX_OBJECTIVE_LENGTH + 1).length > MAX_OBJECTIVE_LENGTH) {
      reasons.push(`summary exceeds ${MAX_OBJECTIVE_LENGTH} characters after normalisation`)
    }
  }

  // Same injectivity requirement as requested_outcome, applied to its SIBLINGS.
  // Both of these are hashed, and both were silently shortened before hashing
  // while the route accepted a longer value: approval_reason (route 2,000 ->
  // hashed at 500) and business_context (route 120 -> hashed at 64). Two packets
  // differing only past the cut produced the SAME provenance hash, so the second
  // resolved as a duplicate replay of the first instead of a conflict — and for
  // business_context it also changed where the mission routes. I fixed
  // requested_outcome and did not sweep for the other fields with the same shape.
  const approvalReasonRaw = asString(value.approval_reason)
  if (
    approvalReasonRaw &&
    cleanText(approvalReasonRaw, MAX_OBJECTIVE_LENGTH + 1).length > MAX_OBJECTIVE_LENGTH
  ) {
    reasons.push(`approval_reason exceeds ${MAX_OBJECTIVE_LENGTH} characters after normalisation`)
  }
  // TITLE. `summary` is hashed only via `title`, which is cut to
  // MAX_TITLE_LENGTH. When requested_outcome is PRESENT it becomes the objective,
  // so summary lands nowhere else — and two packets whose summaries differ only
  // after character 120 then produce an identical canonical payload, making the
  // second a duplicate replay of the first. (With requested_outcome absent,
  // summary also becomes the objective at 500, so the difference still shows up
  // there and the hash separates them.) Refused rather than cut, for the same
  // reason as every other hashed field.
  const summaryNormalised = cleanText(summary, MAX_TITLE_LENGTH + 1)
  if (asString(value.requested_outcome) && summaryNormalised.length > MAX_TITLE_LENGTH) {
    reasons.push(
      `summary exceeds ${MAX_TITLE_LENGTH} characters after normalisation, and is the only hashed home for it when requested_outcome is supplied`,
    )
  }

  // CONVERSATION ID. machineSafeRef STRIPS characters, so 'conv a' and 'conv-a'
  // both become 'conv-a' — two route-legal ids collapsing to one hashed value and
  // therefore one mission. This is the same lossy-canonicaliser trap the packet-id
  // comment already warns about; refusing keeps the mapping injective.
  const conversationIdRaw = asString(value.conversation_id)
  if (conversationIdRaw && machineSafeRef(conversationIdRaw, 200) !== conversationIdRaw) {
    reasons.push(
      'conversation_id must already be machine-safe ([A-Za-z0-9._:/-], no spaces) and at most 200 characters',
    )
  }

  // BUSINESS CONTEXT. Two dimensions, and the previous pass only closed one.
  //
  // Length was refused; lossy character normalisation was not. machineSafeRef
  // STRIPS, so 'client a' and 'client-a' both became 'client-a' — one hashed
  // value, one mission, and a routing key pointing somewhere the caller did not
  // ask for. The identical fix had just been applied to conversation_id in the
  // same commit and was not carried to its neighbour.
  //
  // THE RULE, so this boundary is decidable rather than remembered:
  //   IDENTITY and ROUTING fields (packet_id, conversation_id, business_context)
  //   must be an IDENTITY MAP or a refusal. Distinct values designate distinct
  //   things, so collapsing two of them merges two entities.
  //   PROSE fields (title, objective, approval_reason) may be normalised —
  //   cleanText collapses whitespace runs, and 'Do X' and 'Do  X' genuinely mean
  //   the same instruction, so merging them is correct rather than lossy.
  // Any NEW hashed field must be classified against that rule before it is added.
  const businessContextRaw = asString(value.business_context)
  if (businessContextRaw) {
    if (businessContextRaw.length > MAX_BUSINESS_CONTEXT_LENGTH) {
      reasons.push(`business_context exceeds ${MAX_BUSINESS_CONTEXT_LENGTH} characters`)
    } else if (machineSafeRef(businessContextRaw, MAX_BUSINESS_CONTEXT_LENGTH) !== businessContextRaw) {
      reasons.push(
        'business_context must already be machine-safe ([A-Za-z0-9._:/-], no spaces)',
      )
    }
  }

  if (reasons.length > 0 || !packetId || !riskLevel || actionKinds === null) {
    return { ok: false, reasons: reasons.length > 0 ? reasons : ['packet failed validation'] }
  }

  const objective = cleanText(requestedOutcome || summary, MAX_OBJECTIVE_LENGTH)
  const title = cleanText(summary, MAX_TITLE_LENGTH) || 'Mobile voice mission'

  return {
    ok: true,
    mission: {
      packetId,
      // Machine-safe, not raw. This value reaches cc_tasks metadata and the
      // provenance payload, so an unredacted caller string could carry a secret
      // or a host path out of the voice-session record and into the mission row.
      // Already proven machine-safe above, so this is an identity map rather than
      // a rewrite.
      conversationId: conversationIdRaw || null,
      title,
      objective,
      riskLevel,
      approvalRequested: value.approval_required === true,
      approvalReason: cleanText(approvalReasonRaw, MAX_OBJECTIVE_LENGTH) || null,
      actionKinds,
      transcriptCharacterCount: transcript.length,
      // Proven machine-safe above, so this is an identity map, not a rewrite.
      businessContext: businessContextRaw || 'unite-group',
    },
  }
}

/**
 * Deterministic idempotency key. The packet id is the producer's stable event
 * id, so a redelivered webhook maps to the same cc_tasks row through the
 * existing UNIQUE(founder_id, external_ref) constraint.
 */
export function voiceMissionExternalRef(packetId: string): string {
  const canonical = canonicalPacketId(packetId)
  if (!canonical) {
    throw new Error('voiceMissionExternalRef requires an admissible packet id')
  }
  return `voice:${canonical}`
}

/**
 * Immutable provenance for a mission: a content hash over the fields that
 * define it, so a persisted task can later be proved to correspond to the
 * packet that produced it — and a forged or partially-written envelope is
 * detectable. The hash covers content, not just the id, so two packets sharing
 * an id but differing in substance do not silently look identical.
 */
export function buildMissionProvenance(mission: NormalisedVoiceMission): {
  missionHash: string
  packetId: string
  hashedFields: readonly string[]
} {
  // Every field that can change the resulting task or its admission verdict.
  // If a field influences what gets created or how it is gated, it belongs
  // here — otherwise a reused packet id could carry a different control payload
  // and be silently accepted as a replay.
  const hashedFields = [
    'packetId',
    'conversationId',
    'title',
    'objective',
    'riskLevel',
    'approvalRequested',
    'approvalReason',
    'actionKinds',
    'businessContext',
  ] as const

  const canonicalPayload = JSON.stringify({
    packetId: mission.packetId,
    conversationId: mission.conversationId,
    title: mission.title,
    objective: mission.objective,
    riskLevel: mission.riskLevel,
    approvalRequested: mission.approvalRequested,
    approvalReason: mission.approvalReason,
    // Sorted: action ORDER is not semantic, action SET is.
    actionKinds: [...mission.actionKinds].sort(),
    businessContext: mission.businessContext,
  })

  const missionHash = computeMissionHash(canonicalPayload)
  if (missionHash === null) throw new MissionProvenanceUnavailable()

  return { missionHash, packetId: mission.packetId, hashedFields }
}

/** The env var holding the provenance key. */
export const MISSION_PROVENANCE_SECRET_ENV = 'MISSION_PROVENANCE_SECRET'

/**
 * Thrown when the provenance key is absent. Deliberately fatal rather than
 * silently degrading to an unkeyed hash: a hash anyone can recompute is not a
 * control, and the failure has to be visible at ingest instead of showing up
 * later as missions that mysteriously never run.
 */
export class MissionProvenanceUnavailable extends Error {
  constructor() {
    super('mission provenance secret unset')
    this.name = 'MissionProvenanceUnavailable'
  }
}

/**
 * Keyed hash over the canonical mission payload, or null when no key is
 * configured.
 *
 * An independent review was right that the previous plain SHA-256 was an
 * integrity check, not authentication: it proves the envelope still matches the
 * task's own fields, but anyone who can WRITE the row can also recompute the
 * digest, so a writer with database access (a leaked service-role key, an
 * injection) could mint a mission that passes the lane gate. An HMAC keyed on a
 * server-side secret closes that: forging now requires the key as well as write
 * access, and the key never leaves the application environment.
 *
 * Returns null rather than falling back to an unkeyed digest, so every caller
 * has to decide explicitly what to do without a key — and every one of them
 * fails closed.
 */
function computeMissionHash(canonicalPayload: string): string | null {
  const secret = process.env[MISSION_PROVENANCE_SECRET_ENV]?.trim()
  if (!secret) return null
  return createHmac('sha256', secret).update(canonicalPayload).digest('hex')
}

/** Shape of a well-formed persisted mission hash. */
const MISSION_HASH_PATTERN = /^[a-f0-9]{64}$/

/**
 * Recompute a stored task's mission hash from its own fields and compare.
 *
 * The lane gate previously accepted any 32-64 char hex as provenance, so a
 * forged envelope carrying a plausible-looking `missionHash` satisfied it. A
 * shape check proves the value looks like a hash; it proves nothing about what
 * was hashed. This recomputes the same canonical payload `buildMissionProvenance`
 * signs and requires an exact match, so the hash can only be produced by
 * possessing the mission it describes.
 *
 * Fails closed on anything it cannot fully reconstruct — a task whose envelope
 * predates `approvalRequested` being persisted is unverifiable, not trusted.
 * Constant-time comparison because the attacker controls the candidate and can
 * iterate.
 */
export function verifyMissionProvenance(task: CommandCentreTask): boolean {
  const envelope = task.metadata?.voiceMission
  if (!envelope || typeof envelope !== 'object') return false
  const e = envelope as Record<string, unknown>

  const stored = persistedMissionHash(task)
  if (!stored) return false

  const actionKinds = e.actionKinds
  // conversationId and approvalReason are legitimately null on a mission that
  // arrived without a conversation or an approval note. Demanding a string here
  // refused every such mission — fail-closed, but wrong, and it is the majority
  // case rather than an edge one.
  if (
    typeof e.packetId !== 'string' ||
    (e.conversationId !== null && typeof e.conversationId !== 'string') ||
    typeof e.approvalRequested !== 'boolean' ||
    !Array.isArray(actionKinds) ||
    !actionKinds.every((k) => typeof k === 'string') ||
    typeof task.title !== 'string' ||
    typeof task.objective !== 'string' ||
    // snake_case: the PERSISTED row, not the camelCase CreateTaskInput that wrote
    // it. Reading task.riskLevel here yields undefined, every recomputed hash then
    // mismatches, and every mission is refused — fail-closed, but a total outage
    // of the feature. tsc caught it; a runtime-only check would not have.
    typeof task.risk_level !== 'string' ||
    typeof task.project_key !== 'string'
  ) {
    return false
  }
  const approvalReason = e.approvalReason
  if (approvalReason !== null && typeof approvalReason !== 'string') return false

  // Field order and sorting must match buildMissionProvenance exactly; a
  // divergence here silently fails every mission rather than passing a forged
  // one, which is the safe direction but still a bug. The shared-shape test
  // pins them together.
  const canonicalPayload = JSON.stringify({
    packetId: e.packetId,
    conversationId: e.conversationId,
    title: task.title,
    objective: task.objective,
    riskLevel: task.risk_level,
    approvalRequested: e.approvalRequested,
    approvalReason: approvalReason ?? null,
    actionKinds: [...(actionKinds as string[])].sort(),
    businessContext: task.project_key,
  })

  // No key configured means no mission can be proved authentic, so none is
  // admitted. Falling back to an unkeyed digest here would hand an attacker the
  // exact bypass the key exists to prevent: strip the key from the environment,
  // or simply exploit an environment that never set it, and every forged
  // envelope verifies again.
  const expected = computeMissionHash(canonicalPayload)
  if (expected === null) return false

  const a = Buffer.from(expected, 'utf8')
  const b = Buffer.from(stored, 'utf8')
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

/**
 * Read the provenance hash previously persisted on a task. Returns null when it
 * is absent or malformed — either way the task cannot be proved to correspond
 * to the incoming packet, so the caller must refuse rather than repair.
 */
function persistedMissionHash(task: CommandCentreTask): string | null {
  const envelope = task.metadata?.voiceMission
  if (!envelope || typeof envelope !== 'object') return null
  const provenance = (envelope as Record<string, unknown>).provenance
  if (!provenance || typeof provenance !== 'object') return null
  const hash = (provenance as Record<string, unknown>).missionHash
  return typeof hash === 'string' && MISSION_HASH_PATTERN.test(hash) ? hash : null
}

// ─── Risk admission ──────────────────────────────────────────────────────────

export interface VoiceMissionAdmission {
  tier: AutoExecuteTier
  /** Eligible to be put in front of the approval actor for the runner substrate. */
  safe: boolean
  /** Machine-readable code — never prose, never a bare boolean. */
  reason: string
  initialStatus: Extract<TaskStatus, 'proposed' | 'awaiting_approval'>
  humanApprovalRequired: boolean
  sideEffecting: boolean
  executionMode: TaskExecutionMode
}

function isArmed(): boolean {
  return process.env[VOICE_MISSION_AUTONOMY_ENV] === '1'
}

function parked(tier: AutoExecuteTier, reason: string, sideEffecting: boolean): VoiceMissionAdmission {
  return {
    tier,
    safe: false,
    reason,
    initialStatus: 'awaiting_approval',
    humanApprovalRequired: true,
    sideEffecting,
    executionMode: 'advisory',
  }
}

/**
 * Classify a normalised mission against the estate's autonomy gates. Returns a
 * verdict with a machine-readable reason for every outcome (the auto-exec-matrix
 * contract), never a bare boolean.
 *
 * `safe: true` means only that the mission may be offered to the approval actor
 * as an L0/L1 local-safe candidate. It never means the mission may run: birth is
 * capped at `proposed`, and only `applyApproval` can promote to `queued`.
 */
export function classifyVoiceMission(mission: NormalisedVoiceMission): VoiceMissionAdmission {
  const hardGated = mission.actionKinds.some((kind) => HARD_GATED_TASK_TYPES.includes(kind))
  const sideEffecting = mission.actionKinds.some((kind) => !READ_ONLY_ACTION_KINDS.has(kind))
  const highRisk = mission.riskLevel === 'high' || mission.riskLevel === 'critical'

  // The kill switch is checked before anything else: an unarmed estate parks
  // every mission regardless of how safe it looks.
  if (!isArmed()) {
    const tier: AutoExecuteTier = hardGated || sideEffecting || highRisk ? 'L3' : 'L1'
    return parked(tier, 'kill_switch_off', sideEffecting)
  }

  if (hardGated || highRisk || sideEffecting) {
    return parked('L3', hardGated || highRisk ? 'high_risk_never_auto' : 'side_effecting', sideEffecting)
  }

  if (mission.approvalRequested) {
    return parked('L1', 'approval_requested', sideEffecting)
  }

  if (mission.riskLevel === 'medium') {
    return parked('L2', 'l2_requires_approval', sideEffecting)
  }

  // No proposed actions at all — advisory only, still a human decision.
  if (mission.actionKinds.length === 0) {
    return parked('L0', 'advise_only', sideEffecting)
  }

  // NO AUTO-ADMIT. Every input this function has read so far is SELF-ATTESTED by
  // the inbound packet: risk_level, the action kinds, approval_required. None of
  // them constrains `mission.objective`, which is untrusted free text and is the
  // thing runner.mjs interpolates into a `claude --permission-mode
  // bypassPermissions` prompt.
  //
  // So a packet declaring risk_level 'low' with a single 'research' action and an
  // objective of "rm -rf /" previously arrived here and was labelled
  // `safe: true, humanApprovalRequired: false`. Keyed HMAC provenance does not
  // help: it authenticates that the bridge produced the record, not that the
  // record's intent is safe. An independent review found exactly this.
  //
  // Screening the objective for dangerous phrases is the wrong fix and this
  // estate has lost that argument repeatedly — detect-the-bad-thing is defeated
  // every time. The only thing that can bound free-text intent is a human
  // reading it, so an L1 read-only voice mission is now PARKED for approval
  // rather than marked safe. The tier still says L1 (the declared actions really
  // are read-only) but the verdict no longer claims a safety property it cannot
  // establish.
  //
  // What this costs: voice missions never auto-dispatch, even with
  // MOBILE_VOICE_AUTONOMY armed. That flag now governs how a mission is
  // PRESENTED, not whether a human sees it. Restoring auto-admit requires
  // bounding the objective structurally — dispatching validated action
  // descriptors instead of free text — not relaxing this branch.
  return parked('L1', 'objective_is_untrusted_free_text', false)
}

// ─── Mapping onto the existing mission authority ──────────────────────────────

/**
 * Map a classified mission onto a cc_tasks insert. The transcript is NOT copied:
 * metadata carries a pointer (packet id + conversation id + character count) and
 * the full admission verdict, so Mission Control can show why a mission is
 * parked without holding the spoken content twice.
 */
export function voiceMissionToCreateTaskInput(
  mission: NormalisedVoiceMission,
  admission: VoiceMissionAdmission,
  founderId: string,
): CreateTaskInput {
  return {
    founderId,
    externalRef: voiceMissionExternalRef(mission.packetId),
    title: mission.title,
    objective: mission.objective,
    projectKey: mission.businessContext,
    status: admission.initialStatus,
    riskLevel: mission.riskLevel,
    executionMode: admission.executionMode,
    origin: 'idea',
    humanApprovalRequired: admission.humanApprovalRequired,
    agentOwner: 'margot-voice',
    metadata: {
      voiceMission: {
        source: 'margot_voice_session',
        provenance: buildMissionProvenance(mission),
        packetId: mission.packetId,
        conversationId: mission.conversationId,
        transcriptCharacterCount: mission.transcriptCharacterCount,
        actionKinds: mission.actionKinds,
        approvalReason: mission.approvalReason,
        // Hashed but previously unpersisted, which made missionHash impossible to
        // recompute from a stored task — so the lane gate could only shape-check
        // the hex and a forged envelope passed. Persisting it is what lets
        // verifyMissionProvenance() authenticate rather than pattern-match.
        approvalRequested: mission.approvalRequested,
        admission,
      },
    },
  }
}

// ─── Receipts ────────────────────────────────────────────────────────────────

export type VoiceMissionVerb = 'admitted' | 'parked' | 'rejected' | 'duplicate'

export const VOICE_MISSION_AGENT_NAME = 'margot-voice-bridge'

/** Logical identity of the mission's one immutable `created` receipt. */
export const VOICE_MISSION_RECEIPT_KEY = 'voice_mission_created'

/**
 * Build a redacted lifecycle receipt for POST /api/agents/events. Reuses the
 * existing cc_agent_events contract — names and targets only — so no payload can
 * ride along even if a caller tries.
 */
export function buildVoiceMissionEvent(input: {
  verb: VoiceMissionVerb
  missionRef: string
  sessionId?: string | null
  target?: string | null
}): AgentEventInput {
  return {
    sessionId: input.sessionId ?? null,
    agentName: VOICE_MISSION_AGENT_NAME,
    surface: 'claude-code',
    planKey: machineSafeRef(input.missionRef, 64),
    eventType: 'status',
    toolName: input.verb,
    target: input.target != null ? machineSafeRef(input.target) : null,
  }
}

// ─── Orchestration ───────────────────────────────────────────────────────────

/**
 * (E) Whether the immutable `created` receipt for this mission is known to
 * exist. `unverified` is reported honestly when the audit trail could not be
 * read — it is never optimistically reported as complete.
 */
export type MissionReceiptState = 'complete' | 'incomplete' | 'unverified'

export type MissionConflictReason = 'provenance_mismatch' | 'provenance_unverifiable'

export type IngestVoiceMissionResult =
  | {
      status: 'created' | 'created_incomplete' | 'duplicate'
      task: CommandCentreTask
      admission: VoiceMissionAdmission
      receipt: MissionReceiptState
    }
  | {
      /**
       * The packet id was reused with a DIFFERENT control payload, or the
       * persisted mission cannot be proved to match. Not a duplicate: reporting
       * it as one would silently discard a genuinely different instruction.
       */
      status: 'conflict'
      task: CommandCentreTask
      reason: MissionConflictReason
      missionHash: string
      persistedMissionHash: string | null
    }
  | { status: 'rejected'; reasons: string[] }

/**
 * Bridge one authenticated voice packet into the mission authority.
 *
 * The founder id is supplied by the caller (derived server-side from
 * FOUNDER_USER_ID) and never read from the packet. A malformed packet is
 * refused before any write. A replayed packet resolves to the existing task and
 * appends no second 'created' event, so the audit trail stays truthful.
 */
/** Suffix marking a mission re-bridged under keyed provenance. */
export const VOICE_MISSION_REKEY_SUFFIX = '#rekeyed'

/**
 * The external_ref a signed REPLACEMENT for a pre-rollout mission is minted
 * under. Distinct from the original so the failed row survives untouched as the
 * audit record, and deterministic so a second recovery attempt is a duplicate
 * rather than a second replacement.
 */
export function voiceMissionRekeyedExternalRef(packetId: string): string {
  return `${voiceMissionExternalRef(packetId)}${VOICE_MISSION_REKEY_SUFFIX}`
}

/**
 * Whether an existing task is a pre-rollout mission eligible for recovery.
 *
 * All three conditions are required, and each one is load-bearing:
 *  - it carries a persisted missionHash (so it IS a bridged voice mission),
 *  - its envelope has no `approvalRequested` (only the post-rollout bridge
 *    writes that field, so its absence dates the row rather than condemning it),
 *  - and it is terminally `failed` (a live mission must never be duplicated
 *    under a second ref while it is still queued, running or done).
 *
 * The status check is what stops this becoming a way to fork an active mission.
 */
function isRecoverableLegacyTask(task: CommandCentreTask): boolean {
  if (task.status !== 'failed') return false
  if (persistedMissionHash(task) === null) return false
  const envelope = task.metadata?.voiceMission
  if (!envelope || typeof envelope !== 'object' || Array.isArray(envelope)) return false
  return !('approvalRequested' in (envelope as Record<string, unknown>))
}


export async function ingestVoiceMission(
  founderId: string,
  packet: unknown,
  client: SupabaseLike,
): Promise<IngestVoiceMissionResult> {
  const parsed = parseVoiceMissionPacket(packet)
  if (!parsed.ok) return { status: 'rejected', reasons: parsed.reasons }

  const admission = classifyVoiceMission(parsed.mission)

  // Refuse BEFORE creating the task. Without the provenance key no mission can
  // be signed, so one created here could never pass the lane gate — it would sit
  // in the queue being claimed and refused until its requeue budget ran out.
  // Rejecting up front tells the caller the truth immediately instead of
  // manufacturing work that is guaranteed to fail later.
  let provenance: ReturnType<typeof buildMissionProvenance>
  try {
    provenance = buildMissionProvenance(parsed.mission)
  } catch (err) {
    if (err instanceof MissionProvenanceUnavailable) {
      return { status: 'rejected', reasons: ['provenance_secret_unset'] }
    }
    throw err
  }

  const { task, created } = await createTaskOnce(
    voiceMissionToCreateTaskInput(parsed.mission, admission, founderId),
    client,
  )

  const receiptPayload = {
    externalRef: voiceMissionExternalRef(parsed.mission.packetId),
    tier: admission.tier,
    reason: admission.reason,
    safe: admission.safe,
    missionHash: provenance.missionHash,
  }

  // Exactly-once receipt: the event id is derived from (task id, 'created'), so
  // a concurrent racer collides on cc_task_events' PRIMARY KEY and treats that
  // as success. One row, both racers truthful, no migration required.
  /**
   * How many times a receipt write is attempted before it is reported as
   * incomplete.
   *
   * An independent review pointed out that dead-lettering at the delivery cap
   * treats every non-complete receipt as permanently unresolved, while a single
   * transient cc_task_events failure looks identical to a store that is truly
   * gone. Retrying here means the "unresolved" classification is EARNED rather
   * than assumed: combined with the per-packet delivery cap, a receipt is only
   * declared stuck after the write has genuinely failed repeatedly across
   * repeated deliveries. Same shape as the bounded retry on the requeue count -
   * an ambiguous single failure is not a verdict.
   */
  const RECEIPT_WRITE_ATTEMPTS = 3

  const attemptReceiptWrite = async (
    taskId: string,
    extraPayload?: Record<string, unknown>,
  ): Promise<MissionReceiptState> => {
    try {
      await appendTaskEventOnce(
        {
          founderId,
          taskId,
          type: 'created',
          eventKey: VOICE_MISSION_RECEIPT_KEY,
          actor: VOICE_MISSION_AGENT_NAME,
          payload: extraPayload ? { ...receiptPayload, ...extraPayload } : receiptPayload,
        },
        client,
      )
      return 'complete'
    } catch {
      return 'incomplete'
    }
  }
  const writeReceiptFor = async (
    taskId: string,
    extraPayload?: Record<string, unknown>,
  ): Promise<MissionReceiptState> => {
    for (let attempt = 1; attempt <= RECEIPT_WRITE_ATTEMPTS; attempt++) {
      const state = await attemptReceiptWrite(taskId, extraPayload)
      if (state === 'complete') return state
    }
    return 'incomplete'
  }

  const writeReceipt = (): Promise<MissionReceiptState> => writeReceiptFor(task.id)

  // ONE decider for "a task was just created": its status depends on whether the
  // immutable receipt landed. There are now TWO creation paths (the ordinary one
  // here and the legacy-recovery replacement below) and the first version of the
  // recovery path hardcoded `created`, so a recovery whose receipt insert failed
  // was reported as a clean success and never retried. That is the third time in
  // this change series that a second copy of a decision drifted from the first,
  // so the decision is a function and both paths call it.
  const createdStatus = (
    createdTask: CommandCentreTask,
    receipt: MissionReceiptState,
  ): IngestVoiceMissionResult =>
    receipt === 'complete'
      ? { status: 'created', task: createdTask, admission, receipt }
      : { status: 'created_incomplete', task: createdTask, admission, receipt }

  if (created) {
    return createdStatus(task, await writeReceipt())
  }

  // A pre-rollout mission that was refused and terminally failed can be
  // RECOVERED here, and this is the only place it can be.
  //
  // The previous commit added a `recover_packet_id` pointer to the refusal
  // event, then never proved the path it pointed at actually worked. It did
  // not: re-POSTing the packet lands on this function, finds the existing task
  // through UNIQUE(founder_id, external_ref), compares the new HMAC against the
  // old unkeyed SHA-256, and returns `provenance_mismatch` — so the "recovery"
  // was a dead end and the work stayed failed. That is a recovery route that was
  // wired and never exercised, which is exactly the class of defect this gate
  // exists to catch, and an independent review caught it rather than the author.
  //
  // The fix does NOT repair the old row. Rewriting provenance in place would
  // mean an ingest-token holder could re-sign an existing mission's fields, so
  // instead a signed REPLACEMENT is minted under a distinct external_ref. The
  // failed row stays exactly as it is, as the audit record of what happened, and
  // the replacement is born at `proposed`/`awaiting_approval` like any new
  // mission — so it passes back through the founder's approval actor rather than
  // inheriting the old task's approval.
  if (isRecoverableLegacyTask(task)) {
    // Lineage, so an operator does not see two unrelated rows. The replacement's
    // receipt records ITS ref (not the original's) and names the failed task it
    // replaces; the packet contents are whatever this delivery carried, which is
    // recorded honestly rather than assumed identical to the original.
    const recoveryReceipt = {
      externalRef: voiceMissionRekeyedExternalRef(parsed.mission.packetId),
      recoveredFromTaskId: task.id,
      recoveredFromExternalRef: voiceMissionExternalRef(parsed.mission.packetId),
      recovery: 'legacy_provenance_rekey' as const,
    }
    const { task: replacement, created: replacementCreated } = await createTaskOnce(
      {
        ...voiceMissionToCreateTaskInput(parsed.mission, admission, founderId),
        externalRef: voiceMissionRekeyedExternalRef(parsed.mission.packetId),
      },
      client,
    )
    if (replacementCreated) {
      // Same rule as the ordinary path: an unwritten receipt is reported as
      // created_incomplete so the caller retries and can close the audit hole.
      return createdStatus(replacement, await writeReceiptFor(replacement.id, recoveryReceipt))
    }
    // The replacement already exists (a second recovery attempt). Report it as a
    // duplicate rather than a conflict: the recovery already happened.
    return {
      status: 'duplicate',
      task: replacement,
      admission,
      receipt: await writeReceiptFor(replacement.id, recoveryReceipt),
    }
  }

  // The packet id already owns a mission. Before treating this as a replay,
  // prove the persisted mission is the SAME mission — a reused id carrying a
  // changed risk, objective or action set is a conflict, not a duplicate, and
  // must never be silently swallowed or repaired under the new payload.
  const persisted = persistedMissionHash(task)
  if (!persisted) {
    return {
      status: 'conflict',
      task,
      reason: 'provenance_unverifiable',
      missionHash: provenance.missionHash,
      persistedMissionHash: null,
    }
  }
  if (persisted !== provenance.missionHash) {
    return {
      status: 'conflict',
      task,
      reason: 'provenance_mismatch',
      missionHash: provenance.missionHash,
      persistedMissionHash: persisted,
    }
  }

  // Proven-identical replay: make the receipt whole if a prior delivery died
  // between the task insert and its event. Idempotent by construction.
  return { status: 'duplicate', task, admission, receipt: await writeReceipt() }
}
