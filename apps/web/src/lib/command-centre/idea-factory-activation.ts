import { createHash } from 'node:crypto'
import {
  applyLifecycleCommand, ideaLifecycleApprovalHolds, LifecycleConflict, readIdeaLifecycle,
  type LifecycleCommand, type LifecycleContext,
} from './idea-lifecycle'
import {
  hashIdeaEvidence, hashEvidenceArtifact, ideaEvidenceEnvelopeSchema,
  type IdeaEvidenceSourceRegistration,
} from './idea-evidence-contracts'
import {
  enrollIdeaEvidenceGrant, getIdeaEvidenceSource, IdeaEvidenceError,
  listTaskIdeaEvidence, persistReviewedHandoff, type StoredIdeaEvidence,
} from './idea-evidence-store'
import { canonicalHash } from './portfolio-control-plane'
import { deterministicTaskEventId, type CommandCentreTask } from './tasks'

const repository = 'CleanExpo/Unite-Group'
const eventName = 'factory.research_handoff_persisted.v1'
const namespace = 'factory_operator'
const contractHash = hashIdeaEvidence({ adapter_version: 'factory_handoff_v1', event_name: eventName, subject_namespace: namespace, classification: 'internal_factory_use' })

export interface FactoryActivationEntry {
  id: string
  occurredAt: string
  admittedAt: string
  briefHash: string
  revision: number
  releaseId: string
  environment: 'staging' | 'production'
  withdrawn: boolean
}
export interface FactoryActivationView {
  status: 'not_connected' | 'available' | 'unavailable'
  classification: 'internal_factory_use'
  scope: 'this_mission'
  history: FactoryActivationEntry[]
  firstValue: FactoryActivationEntry | null
}
export const factoryEvidenceEnabled = () => process.env.IDEA_EVIDENCE_ENABLED === '1'

function configuration() {
  const sourceId = process.env.IDEA_EVIDENCE_FACTORY_SOURCE_ID?.trim()
  const sourceVersion = Number(process.env.IDEA_EVIDENCE_FACTORY_SOURCE_VERSION ?? '1')
  const releaseId = process.env.VERCEL_DEPLOYMENT_ID
  const environment = process.env.VERCEL_ENV === 'production' ? 'production' : process.env.VERCEL_ENV === 'preview' ? 'staging' : null
  if (!sourceId || !Number.isSafeInteger(sourceVersion) || sourceVersion < 1 || !releaseId || !/^dpl_[A-Za-z0-9]+$/.test(releaseId) || !environment) throw new IdeaEvidenceError('unavailable')
  return { sourceId, sourceVersion, releaseId, environment }
}

function builtinSource(source: IdeaEvidenceSourceRegistration) {
  return source.kind === 'builtin_factory' && source.event_kind === 'reviewed_handoff_persisted' && source.adapter_version === 'factory_handoff_v1' && source.public_key === null && source.repository === repository
}

function internalEnvelope(row: StoredIdeaEvidence, founderId: string, taskId: string) {
  if (row.record_kind !== 'evidence') return null
  const envelope = ideaEvidenceEnvelopeSchema.parse(row.envelope)
  return envelope.event_kind === 'reviewed_handoff_persisted' && envelope.founder_id === founderId && envelope.task_id === taskId && envelope.repository === repository && envelope.subject.namespace === namespace && envelope.subject.id === founderId && envelope.event_name === eventName && envelope.contract_hash === contractHash ? envelope : null
}

/** Historical internal use is separate from per-idea customers, payments and current release health. */
export async function readFactoryActivation(task: CommandCentreTask): Promise<FactoryActivationView> {
  const empty = { classification: 'internal_factory_use' as const, scope: 'this_mission' as const, history: [], firstValue: null }
  if (!factoryEvidenceEnabled()) return { ...empty, status: 'not_connected' }
  try {
    const config = configuration()
    const currentSource = await getIdeaEvidenceSource(config.sourceId, config.sourceVersion)
    if (!builtinSource(currentSource.registration) || currentSource.registration.environment !== config.environment) throw new IdeaEvidenceError('unavailable')
    const records = await listTaskIdeaEvidence(task.founder_id, task.id)
    const active = new Set(records.active.map(row => row.id))
    const history: FactoryActivationEntry[] = []
    const sources = new Map<string, Awaited<ReturnType<typeof getIdeaEvidenceSource>>>([[`${config.sourceId}:${config.sourceVersion}`, currentSource]])
    for (const row of records.history) {
      const envelope = internalEnvelope(row, task.founder_id, task.id)
      if (!envelope) continue
      const key = `${envelope.source_id}:${envelope.source_version}`
      let source = sources.get(key)
      if (!source) { source = await getIdeaEvidenceSource(envelope.source_id, envelope.source_version); sources.set(key, source) }
      if (!builtinSource(source.registration) || source.registration.product_id !== envelope.product_id || source.registration.environment !== envelope.environment) throw new IdeaEvidenceError('unavailable')
      history.push({ id: row.id, occurredAt: row.occurred_at, admittedAt: row.admitted_at, briefHash: envelope.brief_hash, revision: envelope.lifecycle_revision, releaseId: envelope.release_id, environment: envelope.environment, withdrawn: !active.has(row.id) })
    }
    return { ...empty, status: 'available', history, firstValue: history.find(entry => !entry.withdrawn) ?? null }
  } catch { return { ...empty, status: 'unavailable' } }
}

/** Enrollment is server-owned and narrowly derived from the authenticated current approval. */
export async function persistFactoryReviewedHandoff(
  task: CommandCentreTask,
  command: Extract<LifecycleCommand, { action: 'create_handoff' }>,
  context: LifecycleContext,
): Promise<CommandCentreTask> {
  if (!factoryEvidenceEnabled()) throw new IdeaEvidenceError('unavailable')
  const lifecycle = readIdeaLifecycle(task.metadata)
  if (!lifecycle || task.founder_id !== context.actorId || !ideaLifecycleApprovalHolds(lifecycle) || lifecycle.approval?.actorId !== context.actorId || lifecycle.revision !== command.expectedRevision || command.taskId !== task.id) throw new LifecycleConflict('Only the current owner-approved brief can record internal factory use.')
  const config = configuration()
  const source = await getIdeaEvidenceSource(config.sourceId, config.sourceVersion)
  // The producer identifies the factory; the approved brief and handoff digests bind the submitted repository.
  if (!builtinSource(source.registration) || source.registration.environment !== config.environment) throw new IdeaEvidenceError('unauthorized')
  const records = await listTaskIdeaEvidence(task.founder_id, task.id)
  const prior = records.history.find(row => {
    const envelope = internalEnvelope(row, task.founder_id, task.id)
    return envelope && envelope.source_id === config.sourceId && envelope.source_version === config.sourceVersion && envelope.brief_hash === lifecycle.brief!.hash && envelope.payload.handoff_id === lifecycle.handoff?.manifestHash
  })
  if (prior) {
    if (!records.active.some(row => row.id === prior.id)) throw new IdeaEvidenceError('unauthorized')
    // Reuse the admitted logical payload even after prospective issuer/grant revocation.
    return (await persistReviewedHandoff({ envelope: prior.envelope, expectedMetadata: task.metadata, expectedUpdatedAt: task.updated_at, expectedRevision: lifecycle.revision, nextLifecycle: lifecycle, handoff: lifecycle.handoff })).task
  }
  if (source.revoked_at) throw new IdeaEvidenceError('unauthorized')
  const next = applyLifecycleCommand(lifecycle, command, context)
  const handoff = next.handoff!
  const outcomeCanonical = JSON.stringify(lifecycle.outcome === null ? null : Object.fromEntries(Object.entries(lifecycle.outcome).sort(([a], [b]) => a.localeCompare(b))))
  const outcomeHash = lifecycle.outcome === null ? null : canonicalHash(lifecycle.outcome)
  if (outcomeHash !== null && createHash('sha256').update(outcomeCanonical, 'utf8').digest('hex') !== outcomeHash) throw new IdeaEvidenceError('invalid')
  const scope = {
    source_id: config.sourceId, source_version: config.sourceVersion,
    founder_id: task.founder_id, task_id: task.id, lifecycle_revision: lifecycle.revision,
    brief_hash: lifecycle.brief!.hash, outcome_hash: outcomeHash,
    repository, product_id: source.registration.product_id, release_id: config.releaseId,
    environment: config.environment, subject: { namespace, id: context.actorId },
    event_name: eventName, contract_hash: contractHash,
  }
  const grantId = deterministicTaskEventId(task.id, `idea-evidence-grant:${hashIdeaEvidence({ ...scope, manifest_hash: handoff.manifestHash })}`)
  await enrollIdeaEvidenceGrant({ ...scope, grant_id: grantId, version: 1, outcome_canonical: outcomeCanonical, valid_from: context.now, valid_until: new Date(Date.parse(context.now) + 5 * 60_000).toISOString() })
  const envelope = ideaEvidenceEnvelopeSchema.parse({ ...scope, grant_id: grantId, grant_version: 1, event_kind: 'reviewed_handoff_persisted', event_id: `factory-handoff:${hashIdeaEvidence({ task_id: task.id, brief_hash: lifecycle.brief!.hash, manifest_hash: handoff.manifestHash })}`, occurred_at: context.now, payload: { adapter_version: 'factory_handoff_v1', handoff_id: handoff.manifestHash, handoff_digest: hashEvidenceArtifact(handoff), persisted_metadata_digest: hashEvidenceArtifact({ ...task.metadata, lifecycle: next }) } })
  return (await persistReviewedHandoff({ envelope, expectedMetadata: task.metadata, expectedUpdatedAt: task.updated_at, expectedRevision: lifecycle.revision, nextLifecycle: next, handoff })).task
}
