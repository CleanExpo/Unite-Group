import { createHmac, timingSafeEqual } from 'node:crypto'
import { createClient } from '@/lib/supabase/server'
import { appendTaskEventOnce, createTaskOnce, type CommandCentreTask } from './tasks'
import { readDeliveryMetadata } from './delivery-types'
import { buildCapturedDelivery } from './delivery-envelope'
import { DeliveryConflict, DeliveryNotFound, hashDeliveryInput, type DeliveryMutationClient, type DeliveryStoreClient } from './delivery-store'
import { isPreparationLeaseActive } from './intent-store'
import { createIdeaLifecycle, readIdeaLifecycle, type LifecycleObservations } from './idea-lifecycle'
import { MISSION_PROVENANCE_SECRET_ENV } from './voice-mission-bridge'

export type StoredIdeaLifecycle = NonNullable<ReturnType<typeof readIdeaLifecycle>>
export type CaptureIdeaInput = Parameters<typeof createIdeaLifecycle>[0]
export type LifecycleContext = Parameters<typeof createIdeaLifecycle>[1]

async function readOwnedTask(founderId: string, taskId: string, client: DeliveryStoreClient): Promise<CommandCentreTask | null> {
  const { data, error } = await client.from('cc_tasks').select('*')
    .eq('founder_id', founderId).eq('id', taskId).single()
  if (error?.code === 'PGRST116') return null
  if (error) throw new Error('Lifecycle task persistence is unavailable.')
  return (data as CommandCentreTask | null) ?? null
}

/** Research capture creates the existing inert delivery identity; it does not prepare or dispatch work. */
export async function captureIdeaLifecycle(
  founderId: string,
  input: CaptureIdeaInput,
  context: LifecycleContext,
  options: { client?: DeliveryStoreClient } = {},
): Promise<{ task: CommandCentreTask; deduplicated: boolean }> {
  const db = options.client ?? ((await createClient()) as unknown as DeliveryStoreClient)
  const lifecycle = createIdeaLifecycle(input, context)
  const inputHash = hashDeliveryInput(input)
  const deliveryIdea = input.rawIdea.trim().slice(0, 12000)
  const delivery = buildCapturedDelivery({ inputHash, projectKey: null, originalIdea: deliveryIdea })
  const result = await createTaskOnce({
    founderId, externalRef: `delivery:research:${input.requestId}`,
    title: input.title, objective: deliveryIdea, status: 'proposed', origin: 'idea',
    executionMode: 'branch-preview', humanApprovalRequired: true,
    validationRequired: ['lint', 'type-check', 'test', 'build'],
    metadata: { delivery, lifecycle },
  }, db)
  const storedDelivery = readDeliveryMetadata(result.task)
  if (result.task.founder_id !== founderId || storedDelivery?.inputHash !== inputHash || !readIdeaLifecycle(result.task.metadata)) {
    throw new DeliveryConflict('This request ID belongs to a different or invalid idea. Start a new capture.')
  }
  const confirmed = await readOwnedTask(founderId, result.task.id, db)
  if (!confirmed || confirmed.founder_id !== founderId ||
    confirmed.external_ref !== result.task.external_ref ||
    hashDeliveryInput(confirmed.metadata) !== hashDeliveryInput(result.task.metadata)) {
    throw new DeliveryConflict('The captured idea could not be confirmed; reload before retrying.')
  }
  return { task: confirmed, deduplicated: !result.created }
}

export async function getIdeaLifecycleTask(
  founderId: string,
  taskId: string,
  client?: DeliveryStoreClient,
): Promise<CommandCentreTask> {
  const db = client ?? ((await createClient()) as unknown as DeliveryStoreClient)
  const task = await readOwnedTask(founderId, taskId, db)
  if (!task || task.founder_id !== founderId || task.id !== taskId || !readIdeaLifecycle(task.metadata)) throw new DeliveryNotFound()
  return task
}

/** Guard every sibling write with the row version and confirm the complete metadata envelope. */
export async function saveIdeaLifecycle(
  task: CommandCentreTask,
  lifecycle: StoredIdeaLifecycle,
  expectedRevision: number,
  options: { client?: DeliveryStoreClient } = {},
): Promise<CommandCentreTask> {
  const current = readIdeaLifecycle(task.metadata)
  if (!current || current.revision !== expectedRevision || ![expectedRevision, expectedRevision + 1].includes(lifecycle.revision)) throw new DeliveryConflict()
  if (task.status === 'done' && lifecycle.revision !== current.revision) {
    throw new DeliveryConflict('This completed mission is closed. Capture a new idea for further delivery.')
  }
  return persistLifecycleMetadata(task, { ...task.metadata, lifecycle }, expectedRevision, options)
}

/** Only trusted server adapters call this; observations never create approval or dispatch authority. */
export async function saveLifecycleProof(
  task: CommandCentreTask,
  observations: LifecycleObservations,
  expectedRevision: number,
  options: { client?: DeliveryStoreClient } = {},
): Promise<CommandCentreTask> {
  if (readIdeaLifecycle(task.metadata)?.revision !== expectedRevision) throw new DeliveryConflict()
  const pending = readSignedLifecycleProof(task)
  if (pending && !auditSignatureHolds(task, pending)) {
    return finishProofAudit(task, pending, expectedRevision, options)
  }
  const contextHash = lifecycleProofContextHash(task)
  const signature = signLifecycleProof(task, observations)
  if (!signature) throw new Error('Trusted evidence signing is unavailable in this runtime.')
  const proof: LifecycleProof = { observations, signature, contextHash, pendingAudit: true }
  const saved = await persistLifecycleMetadata(task, { ...task.metadata, lifecycleProof: proof }, expectedRevision, options)
  return finishProofAudit(saved, proof, expectedRevision, options)
}

interface LifecycleProof {
  observations: LifecycleObservations
  signature: string
  contextHash: string
  pendingAudit: boolean
  auditSignature?: string
}

async function finishProofAudit(task: CommandCentreTask, proof: LifecycleProof, revision: number, options: { client?: DeliveryStoreClient }) {
  const { observations } = proof
  const proofHash = hashDeliveryInput({ observations, signature: proof.signature, contextHash: proof.contextHash })
  await appendTaskEventOnce({
    founderId: task.founder_id, taskId: task.id, type: 'evidence_added', actor: 'system',
    eventKey: `lifecycle-proof:${proofHash}`,
    payload: { kind: 'lifecycle_provider_observation', proofHash, observedAt: observations.observedAt,
      lifecycleRevision: observations.lifecycleRevision, briefHash: observations.briefHash,
      outcomeHash: observations.outcomeHash, sources: observations.sources,
      paymentObservations: observations.payments.length, activationObservations: observations.activations.length },
  }, options.client)
  const auditSignature = signProofAudit(task, proofHash)
  if (!auditSignature) throw new Error('Evidence audit confirmation is unavailable.')
  return persistLifecycleMetadata(task, { ...task.metadata, lifecycleProof: { ...proof, pendingAudit: false, auditSignature } }, revision, options)
}

function lifecycleProofContextHash(task: CommandCentreTask): string {
  const lifecycle = readIdeaLifecycle(task.metadata)
  return hashDeliveryInput({ briefHash: lifecycle?.brief?.hash ?? null, outcome: lifecycle?.outcome ?? null, delivery: task.metadata.delivery })
}

function signLifecycleProof(task: CommandCentreTask, observations: LifecycleObservations, contextHash = lifecycleProofContextHash(task)): string | null {
  const key = process.env[MISSION_PROVENANCE_SECRET_ENV]?.trim()
  if (!key) return null
  return createHmac('sha256', key).update('unite-group:lifecycle-proof:v1:').update(hashDeliveryInput({
    taskId: task.id, founderId: task.founder_id, externalRef: task.external_ref,
    contextHash, observations,
  })).digest('hex')
}

function readSignedLifecycleProof(task: CommandCentreTask): LifecycleProof | undefined {
  const proof = task.metadata.lifecycleProof as LifecycleProof | undefined
  if (!proof?.observations || typeof proof.signature !== 'string' || !/^[a-f0-9]{64}$/.test(proof.signature)
    || typeof proof.contextHash !== 'string' || !/^[a-f0-9]{64}$/.test(proof.contextHash)) return undefined
  const expected = signLifecycleProof(task, proof.observations, proof.contextHash)
  return expected && timingSafeEqual(Buffer.from(proof.signature), Buffer.from(expected)) ? proof : undefined
}

function signProofAudit(task: CommandCentreTask, proofHash: string): string | null {
  const key = process.env[MISSION_PROVENANCE_SECRET_ENV]?.trim()
  return key ? createHmac('sha256', key).update('unite-group:lifecycle-proof-audit:v1:')
    .update(hashDeliveryInput({ taskId: task.id, founderId: task.founder_id, proofHash })).digest('hex') : null
}

function auditSignatureHolds(task: CommandCentreTask, proof: LifecycleProof): boolean {
  if (proof.pendingAudit || typeof proof.auditSignature !== 'string' || !/^[a-f0-9]{64}$/.test(proof.auditSignature)) return false
  const proofHash = hashDeliveryInput({ observations: proof.observations, signature: proof.signature, contextHash: proof.contextHash })
  const expected = signProofAudit(task, proofHash)
  return !!expected && timingSafeEqual(Buffer.from(proof.auditSignature), Buffer.from(expected))
}

/** Pending audit is durable, retryable and never projects as verified evidence. */
export function readTrustedLifecycleObservations(task: CommandCentreTask): LifecycleObservations | undefined {
  const proof = readSignedLifecycleProof(task)
  return proof && auditSignatureHolds(task, proof) && proof.contextHash === lifecycleProofContextHash(task) ? proof.observations : undefined
}

async function persistLifecycleMetadata(
  task: CommandCentreTask,
  metadata: Record<string, unknown>,
  expectedRevision: number,
  options: { client?: DeliveryStoreClient },
): Promise<CommandCentreTask> {
  if ((task.status === 'running' || isPreparationLeaseActive(task)) && !isExactApprovalRevocation(task.metadata, metadata)) {
    throw new DeliveryConflict('Research cannot change while preparation or a build is running. Wait for its guarded handoff.')
  }
  const db = options.client ?? ((await createClient()) as unknown as DeliveryStoreClient)
  const oldDelivery = readDeliveryMetadata(task)
  const updatedAt = new Date(Math.max(Date.now(), Date.parse(task.updated_at) + 1)).toISOString()
  let query = (db as DeliveryMutationClient).from('cc_tasks').update({ metadata, updated_at: updatedAt })
    .eq('founder_id', task.founder_id).eq('id', task.id)
    .eq('status', task.status).eq('updated_at', task.updated_at)
    .eq('metadata->lifecycle->>revision', String(expectedRevision))
  if (oldDelivery) query = query.eq('metadata->delivery->>revision', String(oldDelivery.revision))
  const { data, error } = await query.select('*')
  if (error) throw new Error(`Lifecycle persistence failed: ${error.message}`)
  if (!Array.isArray(data) || data.length !== 1) throw new DeliveryConflict()
  const returned = data[0] as CommandCentreTask
  const confirmed = await readOwnedTask(task.founder_id, task.id, db)
  if (!confirmed || confirmed.founder_id !== task.founder_id || confirmed.id !== task.id ||
    confirmed.updated_at !== returned.updated_at || confirmed.status !== task.status ||
    hashDeliveryInput(confirmed.metadata) !== hashDeliveryInput(metadata)) {
    throw new DeliveryConflict('The saved lifecycle could not be confirmed; reload before continuing.')
  }
  return confirmed
}

function isExactApprovalRevocation(before: Record<string, unknown>, after: Record<string, unknown>): boolean {
  const current = readIdeaLifecycle(before)
  const next = readIdeaLifecycle(after)
  if (!current || !next || next.approval !== null || next.handoff !== null || next.revision !== current.revision) return false
  const last = next.history.at(-1)
  if (!last || last.action !== 'revoke_approval' || last.revision !== current.revision || last.at !== next.updatedAt) return false
  if (hashDeliveryInput(next.history) !== hashDeliveryInput([...current.history, last].slice(-100))) return false
  const normalized = { ...next, approval: current.approval, handoff: current.handoff, updatedAt: current.updatedAt, history: current.history }
  return hashDeliveryInput({ ...after, lifecycle: normalized }) === hashDeliveryInput(before)
}
