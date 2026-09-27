// src/lib/mission-authority/continuation.ts
//
// UNI-2779 — persistent mission continuation. Where a mission is, what it last
// proved and what it does next is stored on the cc_tasks row itself
// (metadata.mission), so a fresh runner with no conversation state resumes from
// the row and asks may() the same question the last runner would have asked.
//
// Convention over migration: no new table. metadata.mission is a SIBLING of
// metadata.delivery, exactly like metadata.intent. It is written only through
// saveContinuation, which mirrors saveMissionIntent / saveDelivery's
// compare-and-swap (founder_id, id, status, updated_at, and the delivery
// revision when the envelope parses) and confirms with a separate read that
// metadata.delivery and metadata.intent are byte-identical afterwards. It never
// goes through mergeTaskMetadata, which refuses delivery missions on purpose.
//
// Phases and action names come from scripts/nexus-runner/mission-authority.json;
// nothing here restates those lists.

import { z } from 'zod'
import policy from '../../../../../scripts/nexus-runner/mission-authority.json'
import { createClient } from '@/lib/supabase/server'
import { getTaskById, type CommandCentreTask, type SupabaseLike } from '@/lib/command-centre/tasks'
import { readDeliveryMetadata } from '@/lib/command-centre/delivery-types'
import {
  DeliveryConflict,
  getApprovedDelivery,
  hashDeliveryInput,
  verifyDeliveryApproval,
  type DeliveryMutationClient,
  type DeliveryStoreClient,
} from '@/lib/command-centre/delivery-store'
import { isPreparationLeaseActive } from '@/lib/command-centre/intent-store'
import { may, type Boundary, type MissionAuthority, type Risk } from './may'

export const CONTINUATION_STATUSES = ['active', 'blocked', 'complete'] as const
const SHA = /^[0-9a-f]{40}(?:[0-9a-f]{24})?$/
const sha = z.string().regex(SHA, 'must be a full 40- or 64-character lowercase hex SHA')
const phases = policy.phases as [string, ...string[]]

const receiptSchema = z
  .object({
    kind: z.string().trim().min(1).max(64),
    ref: z.string().trim().min(1).max(512),
    sha: sha.optional(),
    at: z.string().datetime(),
  })
  .strict()

const bodySchema = z
  .object({
    mission_id: z.string().trim().min(1).max(128),
    intent_hash: z.string().regex(/^[a-f0-9]{64}$/, 'must be a sha256 hex digest'),
    authority_version: z.string().trim().min(1).max(64),
    phase: z.enum(phases),
    status: z.enum(CONTINUATION_STATUSES),
    candidate_sha: sha.nullable(),
    last_verified_sha: sha.nullable(),
    next_action: z.string().refine((action) => Object.hasOwn(policy.action_classes, action), {
      message: 'has no class in the authority policy (missing_authority_mapping)',
    }),
    blocked_reason: z.string().trim().min(1).max(2000).nullable(),
    attempt_count: z.number().int().min(0).max(1_000_000),
    receipts: z.array(receiptSchema).max(200),
  })
  .strict()
  .refine((c) => (c.status === 'blocked') === (c.blocked_reason !== null), {
    message: 'blocked_reason is required when, and only when, status is blocked',
    path: ['blocked_reason'],
  })

const storedSchema = bodySchema.and(z.object({ updated_at: z.string().datetime() }))

/** What a runner proposes; updated_at is stamped by saveContinuation, never by the caller. */
export type ContinuationInput = z.infer<typeof bodySchema>
export type MissionContinuation = ContinuationInput & { updated_at: string }

export type Validation<T> = { ok: true; value: T } | { ok: false; field: string; error: string }

function result<T>(parsed: z.ZodSafeParseResult<T>): Validation<T> {
  if (parsed.success) return { ok: true, value: parsed.data }
  const issue = parsed.error.issues[0]
  const field = issue?.path.join('.') || '(root)'
  return { ok: false, field, error: `${field} ${issue?.message ?? 'is invalid'}` }
}

/** Validate a proposed continuation. Unknown keys, unknown phases and unmapped actions are refused. */
export function validateContinuation(raw: unknown): Validation<ContinuationInput> {
  return result(bodySchema.safeParse(raw))
}

/** Read the stored continuation. `null` = none stored; `invalid` = present but unreadable (never "none"). */
export function readContinuation(
  task: Pick<CommandCentreTask, 'metadata'>,
): { state: 'none' } | { state: 'invalid'; error: string } | { state: 'ok'; continuation: MissionContinuation } {
  const raw = task.metadata?.mission
  if (raw === undefined || raw === null) return { state: 'none' }
  const parsed = result(storedSchema.safeParse(raw))
  return parsed.ok ? { state: 'ok', continuation: parsed.value } : { state: 'invalid', error: parsed.error }
}

export class ContinuationUnreadable extends Error {
  constructor(detail: string) {
    super(`The stored mission continuation is unreadable: ${detail}`)
    this.name = 'ContinuationUnreadable'
  }
}

/** Load by task id. Throws ContinuationUnreadable rather than reporting a damaged record as absent. */
export async function loadContinuation(
  input: { founderId: string; taskId: string },
  client?: SupabaseLike,
): Promise<{ task: CommandCentreTask; continuation: MissionContinuation | null } | null> {
  const db = client ?? ((await createClient()) as unknown as SupabaseLike)
  const task = await getTaskById(input, db)
  if (!task) return null
  const stored = readContinuation(task)
  if (stored.state === 'invalid') throw new ContinuationUnreadable(stored.error)
  return { task, continuation: stored.state === 'ok' ? stored.continuation : null }
}

/**
 * Atomic compare-and-swap of metadata.mission. `expectedUpdatedAt` is the
 * continuation's updated_at the caller loaded (null when it loaded none). A
 * stale expectation, or a lost row CAS, is a DeliveryConflict: the caller
 * re-reads; nothing retries against changed state.
 */
export async function saveContinuation(
  task: CommandCentreTask,
  proposed: ContinuationInput,
  expectedUpdatedAt: string | null,
  options: { client?: DeliveryStoreClient; now?: number } = {},
): Promise<{ task: CommandCentreTask; continuation: MissionContinuation }> {
  const checked = validateContinuation(proposed)
  if (!checked.ok) throw new TypeError(checked.error)

  const stored = readContinuation(task)
  if (stored.state === 'invalid') throw new ContinuationUnreadable(stored.error)
  const storedUpdatedAt = stored.state === 'ok' ? stored.continuation.updated_at : null
  if (storedUpdatedAt !== expectedUpdatedAt) {
    throw new DeliveryConflict('The mission continuation changed. Reload it before continuing.')
  }
  // A live preparation lease chains several delivery saves on this row; bumping
  // updated_at underneath it would make the lease-holder's next save conflict.
  if (isPreparationLeaseActive(task, options.now)) {
    throw new DeliveryConflict('The mission is being prepared. Try again when preparation finishes.')
  }

  const delivery = readDeliveryMetadata(task)
  const deliveryHashBefore = hashDeliveryInput(task.metadata?.delivery ?? null)
  const intentHashBefore = hashDeliveryInput(task.metadata?.intent ?? null)
  const db = options.client ?? ((await createClient()) as unknown as DeliveryStoreClient)
  const updatedAt = new Date(Math.max(options.now ?? Date.now(), Date.parse(task.updated_at) + 1)).toISOString()
  const continuation: MissionContinuation = { ...checked.value, updated_at: updatedAt }

  let query = (db as DeliveryMutationClient)
    .from('cc_tasks')
    .update({ metadata: { ...task.metadata, mission: continuation }, updated_at: updatedAt })
    .eq('founder_id', task.founder_id)
    .eq('id', task.id)
    .eq('status', task.status)
    .eq('updated_at', task.updated_at)
  if (delivery) query = query.eq('metadata->delivery->>revision', String(delivery.revision))

  const { data, error } = await query.select('*')
  if (error) throw new Error(`Continuation persistence failed: ${error.message}`)
  if (!Array.isArray(data) || data.length !== 1) throw new DeliveryConflict()
  const returned = data[0] as CommandCentreTask

  const confirmed = await getTaskById({ founderId: task.founder_id, taskId: task.id }, db)
  if (
    !confirmed ||
    confirmed.updated_at !== returned.updated_at ||
    confirmed.status !== returned.status ||
    hashDeliveryInput(confirmed.metadata?.delivery ?? null) !== deliveryHashBefore ||
    hashDeliveryInput(confirmed.metadata?.intent ?? null) !== intentHashBefore ||
    hashDeliveryInput(confirmed.metadata?.mission ?? null) !== hashDeliveryInput(continuation)
  ) {
    throw new DeliveryConflict('The saved continuation could not be confirmed; reload before continuing.')
  }
  return { task: confirmed, continuation }
}

/**
 * The build authority a delivery mission holds, per the policy's
 * build_authorised_when: the founder-signed approval of the frozen spec IS the
 * build authority. Only an approval bound to an accepted intent qualifies (the
 * continuation carries intent_hash). No release mandate is persisted anywhere,
 * so none is granted: every release action escalates. Callers must also check
 * the approval ledger (verifyDeliveryApproval) — this reads the row only.
 */
export function authorityFromApprovedDelivery(task: CommandCentreTask): MissionAuthority | null {
  const approved = getApprovedDelivery(task)
  const intent = approved?.approval.intent
  if (!approved || !intent) return null
  return {
    missionId: task.id,
    intentHash: intent.hash,
    intentVersion: intent.version,
    admissionReceipt: approved.approval.id,
    authorityVersion: policy.schema,
    allowedActions: Object.keys(policy.build),
    releaseMandate: { classes: [], maxRisk: 'low' },
    expiresAt: null,
    revokedAt: null,
  }
}

/** The row-derived authority, only while the approval ledger still names that approval. */
export async function resolveMissionAuthority(task: CommandCentreTask, client?: SupabaseLike): Promise<MissionAuthority | null> {
  const authority = authorityFromApprovedDelivery(task)
  if (!authority) return null
  return (await verifyDeliveryApproval(task, client)) ? authority : null
}

export type NextStep =
  | { execute: true; action: string; reason: string }
  | { execute: false; boundary: Boundary | 'HALTED'; reason: string; founderPacket?: string }

/**
 * What a fresh runner does next. Pure: same inputs, same answer. `risk` is not
 * part of the continuation record, so it defaults to 'high', which never
 * auto-releases — a caller that knows the task's risk passes it.
 */
export function nextStep(
  continuation: MissionContinuation,
  authority: MissionAuthority | null,
  gates: Record<string, boolean>,
  now: number,
  risk: Risk = 'high',
): NextStep {
  if (continuation.status !== 'active') {
    const why = continuation.blocked_reason ? `: ${continuation.blocked_reason}` : ''
    return { execute: false, boundary: 'HALTED', reason: `continuation is ${continuation.status}${why}` }
  }
  if (
    authority &&
    (authority.missionId !== continuation.mission_id ||
      authority.intentHash !== continuation.intent_hash ||
      authority.authorityVersion !== continuation.authority_version)
  ) {
    return { execute: false, boundary: 'NO_AUTHORITY', reason: 'continuation is bound to a different mission, intent or authority version' }
  }
  const decision = may({
    mission: authority,
    actor: 'nexus-runner',
    action: continuation.next_action,
    target: continuation.candidate_sha ?? continuation.mission_id,
    risk,
    state: { gates, phase: continuation.phase },
    now,
  })
  if (decision.verdict === 'continue') return { execute: true, action: continuation.next_action, reason: decision.reason }
  return {
    execute: false,
    boundary: decision.boundary,
    reason: decision.reason,
    ...(decision.founderPacket ? { founderPacket: decision.founderPacket } : {}),
  }
}
