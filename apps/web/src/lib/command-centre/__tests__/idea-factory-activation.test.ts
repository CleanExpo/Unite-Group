import { beforeEach, describe, expect, it, vi } from 'vitest'
vi.mock('../idea-evidence-store', async importOriginal => ({
  ...await importOriginal<typeof import('../idea-evidence-store')>(),
  enrollIdeaEvidenceGrant: vi.fn(), getIdeaEvidenceSource: vi.fn(),
  listTaskIdeaEvidence: vi.fn(), persistReviewedHandoff: vi.fn(),
}))
import { applyLifecycleCommand, createIdeaLifecycle, readIdeaLifecycle, toLifecycleView, type LifecycleBriefInput } from '../idea-lifecycle'
import { canonicalEvidenceJson, hashIdeaEvidence, hashEvidenceArtifact, ideaEvidenceEnvelopeSchema, type IdeaEvidenceEnvelope } from '../idea-evidence-contracts'
import { enrollIdeaEvidenceGrant, getIdeaEvidenceSource, IdeaEvidenceError, listTaskIdeaEvidence, persistReviewedHandoff, type StoredIdeaEvidence } from '../idea-evidence-store'
import { persistFactoryReviewedHandoff, readFactoryActivation } from '../idea-factory-activation'
import type { CommandCentreTask } from '../tasks'
import { canonicalHash } from '../portfolio-control-plane'

const founderId = 'b0000000-0000-4000-8000-000000000001'
const taskId = 'b0000000-0000-4000-8000-000000000002'
const now = '2026-10-16T00:03:00.000Z'
const context = { actorId: founderId, now }
const source = { source_id: 'factory-builtin', version: 1, kind: 'builtin_factory', event_kind: 'reviewed_handoff_persisted', adapter_version: 'factory_handoff_v1', repository: 'CleanExpo/Unite-Group', product_id: 'factory', environment: 'production', public_key: null } as const
const brief: LifecycleBriefInput = { objective: 'Persist a reviewed research handoff', user: 'Founder', payer: 'Internal budget', nonGoals: ['External sales'], acceptanceCriteria: [{ id: 'persist', criterion: 'Save the reviewed handoff', validation: 'Read back the durable task' }], outputs: Array.from({ length: 13 }, (_, index) => ({ id: index + 1, status: 'included', content: 'Recorded research' })), design: { summary: 'Existing workbench', sourceIds: [] }, target: { repository: source.repository, baseBranch: 'main' }, risks: [], openDecisions: [] }
function fixture(inputBrief: LifecycleBriefInput = brief) {
  let lifecycle = createIdeaLifecycle({ title: 'Factory', rawIdea: 'Preserve this approved research', requestId: taskId }, { ...context, now: '2026-10-16T00:00:00.000Z' })
  lifecycle = applyLifecycleCommand(lifecycle, { action: 'propose_brief', taskId, expectedRevision: lifecycle.revision, brief: inputBrief }, { ...context, now: '2026-10-16T00:01:00.000Z' })
  lifecycle = applyLifecycleCommand(lifecycle, { action: 'approve_brief', taskId, expectedRevision: lifecycle.revision, briefHash: lifecycle.brief!.hash }, { ...context, now: '2026-10-16T00:02:00.000Z' })
  return { id: taskId, founder_id: founderId, status: 'proposed', updated_at: lifecycle.updatedAt, metadata: { lifecycle, retained: { 'operator-note': '保存', budget: 1.5 } } } as unknown as CommandCentreTask
}
const command = { action: 'create_handoff', taskId, expectedRevision: 2 } as const
function sourceRow(revoked_at: string | null = null) { return { source_id: source.source_id, version: 1, registration: source, canonical_registration: canonicalEvidenceJson(source), registration_hash: hashIdeaEvidence(source), revoked_at } }
function event(envelope: IdeaEvidenceEnvelope): StoredIdeaEvidence { return { id: 'b0000000-0000-4000-8000-000000000003', source_id: envelope.source_id, source_version: envelope.source_version, event_id: envelope.event_id, grant_id: envelope.grant_id, grant_version: envelope.grant_version, founder_id: founderId, task_id: taskId, record_kind: 'evidence', withdrawal_of: null, envelope, canonical_envelope: canonicalEvidenceJson(envelope), payload_hash: hashIdeaEvidence(envelope), signature: null, occurred_at: envelope.occurred_at, admitted_at: '2026-10-16T00:03:01.000Z' } }
async function result(operation: Promise<unknown>) { try { return { value: await operation, error: null } } catch (error) { return { value: null, error: error instanceof IdeaEvidenceError ? error.kind : error instanceof Error ? error.message : String(error) } } }
beforeEach(() => {
  vi.resetAllMocks()
  vi.unstubAllEnvs()
  vi.stubEnv('IDEA_EVIDENCE_ENABLED', '1')
  vi.stubEnv('IDEA_EVIDENCE_FACTORY_SOURCE_ID', source.source_id)
  vi.stubEnv('IDEA_EVIDENCE_FACTORY_SOURCE_VERSION', '1')
  vi.stubEnv('VERCEL_ENV', 'production')
  vi.stubEnv('VERCEL_DEPLOYMENT_ID', 'dpl_ActualRuntime1')
  vi.mocked(getIdeaEvidenceSource).mockResolvedValue(sourceRow() as never)
  vi.mocked(listTaskIdeaEvidence).mockResolvedValue({ history: [], active: [] })
  vi.mocked(persistReviewedHandoff).mockImplementation(async input => ({ event: event(ideaEvidenceEnvelopeSchema.parse(input.envelope)), task: { ...fixture(), metadata: { ...input.expectedMetadata, lifecycle: input.nextLifecycle } } }))
})

describe('internal factory activation producer', () => {
  it('keeps the feature off without querying or enrolling evidence', async () => {
    vi.stubEnv('IDEA_EVIDENCE_ENABLED', '')
    const view = await readFactoryActivation(fixture())
    const write = await result(persistFactoryReviewedHandoff(fixture(), command, context))
    expect({ view, error: write.error, reads: vi.mocked(listTaskIdeaEvidence).mock.calls.length, sources: vi.mocked(getIdeaEvidenceSource).mock.calls.length, grants: vi.mocked(enrollIdeaEvidenceGrant).mock.calls.length, writes: vi.mocked(persistReviewedHandoff).mock.calls.length }).toEqual({ view: { status: 'not_connected', classification: 'internal_factory_use', scope: 'this_mission', history: [], firstValue: null }, error: 'unavailable', reads: 0, sources: 0, grants: 0, writes: 0 })
  })
  it('derives a narrow operator grant and atomically binds the exact handoff and full metadata', async () => {
    const original = fixture()
    const saved = await persistFactoryReviewedHandoff(original, command, context)
    const grant = vi.mocked(enrollIdeaEvidenceGrant).mock.calls[0][0] as Record<string, unknown>
    const input = vi.mocked(persistReviewedHandoff).mock.calls[0][0]
    const envelope = ideaEvidenceEnvelopeSchema.parse(input.envelope)
    const next = saved.metadata.lifecycle as ReturnType<typeof createIdeaLifecycle>
    expect({ sourceLookup: vi.mocked(getIdeaEvidenceSource).mock.calls[0], owner: envelope.subject, kind: envelope.event_kind, product: envelope.product_id, release: envelope.release_id, event: envelope.event_name, outcome: grant.outcome_canonical, stripe: Object.hasOwn(grant, 'stripe_binding'), cas: [input.expectedUpdatedAt, input.expectedRevision, input.expectedMetadata === original.metadata], digests: envelope.event_kind === 'reviewed_handoff_persisted' && envelope.payload.handoff_digest === hashEvidenceArtifact(next.handoff) && envelope.payload.persisted_metadata_digest === hashEvidenceArtifact(saved.metadata), approved: next.handoff?.approved, writeCount: vi.mocked(persistReviewedHandoff).mock.calls.length }).toEqual({ sourceLookup: [source.source_id, 1], owner: { namespace: 'factory_operator', id: founderId }, kind: 'reviewed_handoff_persisted', product: 'factory', release: 'dpl_ActualRuntime1', event: 'factory.research_handoff_persisted.v1', outcome: 'null', stripe: false, cas: [original.updated_at, 2, true], digests: true, approved: true, writeCount: 1 })
  })
  it.each(['IDEA_EVIDENCE_FACTORY_SOURCE_ID', 'VERCEL_DEPLOYMENT_ID', 'VERCEL_ENV'] as const)('fails closed without required runtime configuration %s', async key => {
    vi.stubEnv(key, '')
    const write = await result(persistFactoryReviewedHandoff(fixture(), command, context))
    expect({ error: write.error, reads: vi.mocked(listTaskIdeaEvidence).mock.calls.length, grants: vi.mocked(enrollIdeaEvidenceGrant).mock.calls.length, writes: vi.mocked(persistReviewedHandoff).mock.calls.length }).toEqual({ error: 'unavailable', reads: 0, grants: 0, writes: 0 })
  })
  it.each(['owner', 'approval', 'revision'] as const)('requires current authenticated ownership and approval: %s', async invalid => {
    const original = fixture()
    if (invalid === 'owner') original.founder_id = taskId
    if (invalid === 'approval') (original.metadata.lifecycle as ReturnType<typeof createIdeaLifecycle>).approval = null
    const write = await result(persistFactoryReviewedHandoff(original, invalid === 'revision' ? { ...command, expectedRevision: 99 } : command, context))
    expect({ error: write.error, sources: vi.mocked(getIdeaEvidenceSource).mock.calls.length, writes: vi.mocked(persistReviewedHandoff).mock.calls.length }).toEqual({ error: 'Only the current owner-approved brief can record internal factory use.', sources: 0, writes: 0 })
  })
  it.each(['repository', 'environment', 'kind'] as const)('rejects an enrolled source outside the builtin factory contract: %s', async key => {
    vi.mocked(getIdeaEvidenceSource).mockResolvedValue({ ...sourceRow(), registration: { ...source, [key]: key === 'repository' ? 'OtherOwner/other-app' : key === 'environment' ? 'staging' : 'ed25519' } } as never)
    const write = await result(persistFactoryReviewedHandoff(fixture(), command, context))
    expect({ error: write.error, grants: vi.mocked(enrollIdeaEvidenceGrant).mock.calls.length, writes: vi.mocked(persistReviewedHandoff).mock.calls.length }).toEqual({ error: 'unauthorized', grants: 0, writes: 0 })
  })
  it.each(['conflict', 'unavailable'] as const)('does not claim success after atomic persistence or readback failure: %s', async kind => {
    vi.mocked(persistReviewedHandoff).mockRejectedValue(new IdeaEvidenceError(kind))
    const write = await result(persistFactoryReviewedHandoff(fixture(), command, context))
    expect({ error: write.error, value: write.value, writes: vi.mocked(persistReviewedHandoff).mock.calls.length }).toEqual({ error: kind, value: null, writes: 1 })
  })
  it('reuses the exact admitted event after prospective revocation and a later runtime release', async () => {
    const saved = await persistFactoryReviewedHandoff(fixture(), command, context)
    const firstInput = vi.mocked(persistReviewedHandoff).mock.calls[0][0]
    const original = event(ideaEvidenceEnvelopeSchema.parse(firstInput.envelope))
    vi.mocked(listTaskIdeaEvidence).mockResolvedValue({ history: [original], active: [original] })
    vi.mocked(getIdeaEvidenceSource).mockResolvedValue(sourceRow('2026-10-16T01:00:00.000Z') as never)
    vi.stubEnv('VERCEL_DEPLOYMENT_ID', 'dpl_LaterRuntime2')
    await persistFactoryReviewedHandoff(saved, command, { ...context, now: '2026-10-17T00:00:00.000Z' })
    const retry = vi.mocked(persistReviewedHandoff).mock.calls[1][0]
    expect({ sameEnvelope: canonicalEvidenceJson(retry.envelope) === canonicalEvidenceJson(firstInput.envelope), grants: vi.mocked(enrollIdeaEvidenceGrant).mock.calls.length, occurredAt: (retry.envelope as IdeaEvidenceEnvelope).occurred_at, release: (retry.envelope as IdeaEvidenceEnvelope).release_id }).toEqual({ sameEnvelope: true, grants: 1, occurredAt: now, release: 'dpl_ActualRuntime1' })
  })
  it.each([false, true])('preserves operator history across task revisions and source rotation, withdrawn=%s', async withdrawn => {
    await persistFactoryReviewedHandoff(fixture(), command, context)
    const original = event(ideaEvidenceEnvelopeSchema.parse(vi.mocked(persistReviewedHandoff).mock.calls[0][0].envelope))
    vi.mocked(listTaskIdeaEvidence).mockResolvedValue({ history: [original], active: withdrawn ? [] : [original] })
    vi.stubEnv('IDEA_EVIDENCE_FACTORY_SOURCE_VERSION', '2')
    vi.stubEnv('VERCEL_DEPLOYMENT_ID', 'dpl_LaterRuntime2')
    vi.mocked(getIdeaEvidenceSource).mockImplementation(async (_id, version) => ({ ...sourceRow('2026-10-17T00:00:00.000Z'), version, registration: { ...source, version } }) as never)
    const laterTask = fixture(); (laterTask.metadata.lifecycle as ReturnType<typeof createIdeaLifecycle>).revision = 99
    const view = await readFactoryActivation(laterTask)
    expect({ status: view.status, scope: view.scope, classification: view.classification, firstValue: view.firstValue?.id ?? null, history: view.history.map(row => ({ revision: row.revision, withdrawn: row.withdrawn, occurredAt: row.occurredAt })) }).toEqual({ status: 'available', scope: 'this_mission', classification: 'internal_factory_use', firstValue: withdrawn ? null : original.id, history: [{ revision: 2, withdrawn, occurredAt: now }] })
  })
  it('keeps failed reads honest rather than projecting a successful internal-use event', async () => {
    vi.mocked(listTaskIdeaEvidence).mockRejectedValue(new IdeaEvidenceError('unavailable'))
    const view = await readFactoryActivation(fixture())
    expect(view).toEqual({ status: 'unavailable', classification: 'internal_factory_use', scope: 'this_mission', history: [], firstValue: null })
  })
  it('requires an operator-enrolled source and never self-enrolls one from configuration', async () => {
    vi.mocked(getIdeaEvidenceSource).mockRejectedValue(new IdeaEvidenceError('unauthorized'))
    const write = await result(persistFactoryReviewedHandoff(fixture(), command, context))
    const view = await readFactoryActivation(fixture())
    expect({ error: write.error, status: view.status, grants: vi.mocked(enrollIdeaEvidenceGrant).mock.calls.length, writes: vi.mocked(persistReviewedHandoff).mock.calls.length }).toEqual({ error: 'unauthorized', status: 'unavailable', grants: 0, writes: 0 })
  })
  it('does not recreate an event that has been withdrawn', async () => {
    const saved = await persistFactoryReviewedHandoff(fixture(), command, context)
    const original = event(ideaEvidenceEnvelopeSchema.parse(vi.mocked(persistReviewedHandoff).mock.calls[0][0].envelope))
    vi.mocked(listTaskIdeaEvidence).mockResolvedValue({ history: [original], active: [] })
    const retry = await result(persistFactoryReviewedHandoff(saved, command, context))
    expect({ error: retry.error, grants: vi.mocked(enrollIdeaEvidenceGrant).mock.calls.length, writes: vi.mocked(persistReviewedHandoff).mock.calls.length }).toEqual({ error: 'unauthorized', grants: 1, writes: 1 })
  })
  it('binds an existing commercial contract without treating the operator as its customer', async () => {
    const original = fixture()
    const outcome = { repository: source.repository, baseBranch: 'main' as const, productId: 'prod_ActualOffer', stripeAccountId: 'acct_ActualMerchant', activationEvent: 'customer.completed_work', requiredClients: 2, currency: 'AUD', minimumNetMinor: 5000, windowStart: '2026-10-16T00:00:00.000Z', windowEnd: '2026-11-16T00:00:00.000Z' }
    let state = original.metadata.lifecycle as ReturnType<typeof createIdeaLifecycle>
    state = applyLifecycleCommand(state, { action: 'set_outcome', taskId, expectedRevision: state.revision, outcome }, context)
    state = applyLifecycleCommand(state, { action: 'propose_brief', taskId, expectedRevision: state.revision, brief }, context)
    state = applyLifecycleCommand(state, { action: 'approve_brief', taskId, expectedRevision: state.revision, briefHash: state.brief!.hash }, context)
    original.metadata.lifecycle = state
    await persistFactoryReviewedHandoff(original, { ...command, expectedRevision: state.revision }, context)
    const grant = vi.mocked(enrollIdeaEvidenceGrant).mock.calls[0][0] as Record<string, unknown>
    expect({ outcome: JSON.parse(grant.outcome_canonical as string), hash: grant.outcome_hash, factoryProduct: grant.product_id, customerBinding: Object.hasOwn(grant, 'stripe_binding'), subject: grant.subject }).toEqual({ outcome, hash: canonicalHash(outcome), factoryProduct: 'factory', customerBinding: false, subject: { namespace: 'factory_operator', id: founderId } })
  })
  it('accepts approved ideas for other repositories while recording only internal factory use', async () => {
    const otherRepository = 'OtherOwner/customer-workbench'
    const original = fixture({ ...brief, target: { repository: otherRepository, baseBranch: 'main' } })
    const write = await result(persistFactoryReviewedHandoff(original, command, context))
    const input = vi.mocked(persistReviewedHandoff).mock.calls[0]?.[0]
    const envelope = input ? ideaEvidenceEnvelopeSchema.parse(input.envelope) : null
    const saved = write.value as CommandCentreTask | null
    const state = saved ? readIdeaLifecycle(saved.metadata) : null
    const grant = vi.mocked(enrollIdeaEvidenceGrant).mock.calls[0]?.[0] as Record<string, unknown> | undefined
    expect({ error: write.error, savedTarget: state?.brief?.snapshot.brief.target.repository ?? null, factoryRepository: envelope?.repository ?? null, factoryProduct: envelope?.product_id ?? null, eventKind: envelope?.event_kind ?? null, subject: envelope?.subject ?? null, approvedBriefBound: !!state && envelope?.brief_hash === state.brief?.hash, metadataBound: !!saved && envelope?.event_kind === 'reviewed_handoff_persisted' && envelope.payload.persisted_metadata_digest === hashEvidenceArtifact(saved.metadata), handoffBound: !!state && envelope?.event_kind === 'reviewed_handoff_persisted' && envelope.payload.handoff_digest === hashEvidenceArtifact(state.handoff), customerBinding: !!grant && Object.hasOwn(grant, 'stripe_binding'), eligibleClients: state ? toLifecycleView(state).commercial.eligibleClients : null }).toEqual({ error: null, savedTarget: otherRepository, factoryRepository: 'CleanExpo/Unite-Group', factoryProduct: 'factory', eventKind: 'reviewed_handoff_persisted', subject: { namespace: 'factory_operator', id: founderId }, approvedBriefBound: true, metadataBound: true, handoffBound: true, customerBinding: false, eligibleClients: 0 })
  })
})
