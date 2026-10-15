import { afterEach, describe, expect, it, vi } from 'vitest'
vi.mock('../tasks', async (original) => ({ ...await original<typeof import('../tasks')>(), getTaskById: vi.fn(), createTaskOnce: vi.fn(), appendTaskEventOnce: vi.fn(async () => ({ event: null, created: false })) }))
import { appendTaskEventOnce, createTaskOnce, type CommandCentreTask } from '../tasks'
import { applyLifecycleCommand, createIdeaLifecycle, type IdeaLifecycle, type LifecycleBriefInput, type LifecycleObservations } from '../idea-lifecycle'
import { captureIdeaLifecycle, getIdeaLifecycleTask, readTrustedLifecycleObservations, saveIdeaLifecycle, saveLifecycleProof } from '../idea-lifecycle-store'
import { DeliveryConflict, getApprovedDelivery, signDeliveryApproval, type DeliveryStoreClient } from '../delivery-store'
import { readDeliveryMetadata, type DeliveryMetadata } from '../delivery-types'
import { prepareDeliveryMission, type DeliveryPreparationDeps } from '../delivery-prepare'
import { acceptedIntentBinding } from '@/lib/mission-authority/intent-binding'
import { authorityFromApprovedDelivery } from '@/lib/mission-authority/continuation'
import { missionClaimVerdict } from '@/lib/mission-authority/runner-boundary'
import { intentFromReviewedLifecycle, renderIntentMarkdown } from '../intent'

const actorId = 'b0000000-0000-4000-8000-000000000001'
const taskId = 'b0000000-0000-4000-8000-000000000002'
const context = { actorId, now: '2026-10-15T00:00:00.000Z' }
const capture = { title: 'Simulation', rawIdea: '  Explore a simulation\n', requestId: taskId }
const brief: LifecycleBriefInput = {
  objective: 'Test the idea', user: 'Founder', payer: 'Founder', nonGoals: ['No external actions'],
  acceptanceCriteria: [{ id: 'a1', criterion: 'Captured', validation: 'Read-back' }],
  outputs: Array.from({ length: 13 }, (_, index) => ({ id: index + 1, status: 'included', content: `Output ${index + 1}` })),
  design: { summary: 'Reuse the current deck', sourceIds: [] }, target: { repository: 'CleanExpo/Unite-Group', baseBranch: 'main' },
  risks: [], openDecisions: [],
}
function state(approved = false): IdeaLifecycle {
  let lifecycle = createIdeaLifecycle(capture, context)
  lifecycle = applyLifecycleCommand(lifecycle, { action: 'propose_brief', taskId, expectedRevision: 1, brief }, context)
  if (approved) lifecycle = applyLifecycleCommand(lifecycle, { action: 'approve_brief', taskId, expectedRevision: lifecycle.revision, briefHash: lifecycle.brief!.hash }, context)
  return lifecycle
}
function fixture(lifecycle = createIdeaLifecycle(capture, context)): CommandCentreTask {
  const delivery: DeliveryMetadata = {
    schemaVersion: 1, kind: 'software_delivery', lane: 'unknown', revision: 1, inputHash: 'a'.repeat(64),
    projectKey: null, originalIdea: capture.rawIdea.trim(), presetIds: [], recipeVersions: {}, answers: {}, questions: [],
    phase: 'captured', spec: null, specVersion: null, harness: [], sourceRefs: [], board: null, lease: null, approval: null,
    error: null, scope: 'branch_preview_only',
  }
  return { id: taskId, founder_id: actorId, external_ref: `delivery:research:${taskId}`, queue_id: null, project_id: null,
    project_key: null, title: capture.title, objective: delivery.originalIdea, priority: 'P2', status: 'proposed', agent_owner: null,
    risk_level: 'low', execution_mode: 'branch-preview', origin: 'idea', dependencies: [], human_approval_required: true,
    evidence_path: null, validation_required: [], linear_id: null, preview_url: null, metadata: { delivery, lifecycle, intent: { preserved: true } },
    created_at: context.now, updated_at: context.now }
}
function database(initial = fixture(), options: { lost?: boolean; tamper?: boolean; error?: boolean; readError?: boolean } = {}) {
  let row = structuredClone(initial)
  const filters: Array<[string, unknown]> = []
  const update = vi.fn((values: Record<string, unknown>) => {
    const chain = { eq: (key: string, value: unknown) => { filters.push([key, value]); return chain }, select: async () => {
      if (options.error) return { data: null, error: { message: 'Offline' } }
      if (options.lost || values.updated_at === row.updated_at) return { data: [], error: null }
      row = { ...row, ...structuredClone(values) } as CommandCentreTask
      if (options.tamper) row.metadata.intent = { overwritten: true }
      return { data: [row], error: null }
    } }
    return chain
  })
  const select = vi.fn(() => {
    const where: Record<string, unknown> = {}
    const chain = { eq: (column: string, value: unknown) => { where[column] = value; return chain }, single: async () => {
      if (options.readError) return { data: null, error: { code: '08006', message: 'Offline' } }
      const matches = where.founder_id === row.founder_id && where.id === row.id
      return matches ? { data: structuredClone(row), error: null } : { data: null, error: { code: 'PGRST116', message: 'No row' } }
    } }
    return chain
  })
  const client = { from: () => ({ update, select }) } as unknown as DeliveryStoreClient
  return { client, filters, update, current: () => row, set: (next: CommandCentreTask) => { row = next } }
}
afterEach(() => { vi.clearAllMocks(); vi.unstubAllEnvs() })

describe('research capture and guarded lifecycle persistence', () => {
  it('captures raw input in the existing proposed queue with valid inert delivery metadata and confirms the insert', async () => {
    const db = database()
    vi.mocked(createTaskOnce).mockImplementation(async input => {
      db.set({ ...fixture(), ...{ metadata: input.metadata!, objective: input.objective!, title: input.title } })
      return { task: db.current(), created: true }
    })
    const result = await captureIdeaLifecycle(actorId, capture, context, { client: db.client })
    expect(result.task.status).toBe('proposed')
    expect(readDeliveryMetadata(result.task)?.phase).toBe('captured')
    expect(result.task.metadata.lifecycle).toMatchObject({ rawIdea: capture.rawIdea })
    expect(db.update).not.toHaveBeenCalled()
  })
  it('reuses a request identity and refuses the same identity with changed contents', async () => {
    const db = database()
    vi.mocked(createTaskOnce).mockImplementationOnce(async input => {
      db.set({ ...fixture(), metadata: input.metadata! }); return { task: db.current(), created: false }
    })
    expect((await captureIdeaLifecycle(actorId, capture, context, { client: db.client })).deduplicated).toBe(true)
    vi.mocked(createTaskOnce).mockResolvedValueOnce({ task: db.current(), created: false })
    await expect(captureIdeaLifecycle(actorId, { ...capture, rawIdea: 'Different idea' }, context, { client: db.client })).rejects.toBeInstanceOf(DeliveryConflict)
  })
  it('confirms approvals that retain the material revision and preserves delivery/intent siblings', async () => {
    const initial = fixture(state())
    const db = database(initial)
    const next = state(true)
    const result = await saveIdeaLifecycle(initial, next, next.revision, { client: db.client })
    expect(result.metadata.lifecycle).toMatchObject({ approval: { actorId } })
    expect(result.metadata.delivery).toEqual(initial.metadata.delivery)
    expect(result.metadata.intent).toEqual(initial.metadata.intent)
    expect(db.filters).toEqual(expect.arrayContaining([['founder_id', actorId], ['updated_at', context.now], ['metadata->lifecycle->>revision', String(next.revision)]]))
  })
  it('rejects stale revision, zero-row CAS, altered siblings, and an unconfirmed capture', async () => {
    const initial = fixture(state())
    const next = state(true)
    await expect(saveIdeaLifecycle(initial, next, 99, { client: database(initial).client })).rejects.toBeInstanceOf(DeliveryConflict)
    await expect(saveIdeaLifecycle(initial, next, next.revision, { client: database(initial, { lost: true }).client })).rejects.toBeInstanceOf(DeliveryConflict)
    await expect(saveIdeaLifecycle(initial, next, next.revision, { client: database(initial, { tamper: true }).client })).rejects.toThrow(/could not be confirmed/)
    vi.mocked(createTaskOnce).mockResolvedValue({ task: fixture(), created: true })
    await expect(captureIdeaLifecycle(actorId, capture, context, { client: database().client })).rejects.toBeInstanceOf(DeliveryConflict)
  })
  it('isolates owners and rejects changes during active execution', async () => {
    const initial = fixture(state())
    const db = database(initial)
    await expect(getIdeaLifecycleTask('other-owner', taskId, db.client)).rejects.toThrow('Mission not found')
    await expect(saveIdeaLifecycle({ ...initial, status: 'running' }, state(true), state().revision, { client: db.client })).rejects.toThrow(/running/)
    expect(db.update).not.toHaveBeenCalled()
    await expect(getIdeaLifecycleTask(actorId, taskId, database(initial, { readError: true }).client)).rejects.toThrow(/persistence is unavailable/)
  })
  it('allows only exact revocation while a build or preparation lease is active', async () => {
    for (const running of [true, false]) {
      const initial = fixture(state(true))
      if (running) initial.status = 'running'
      else (initial.metadata.delivery as DeliveryMetadata).lease = { token: taskId, phase: 'prepare', expiresAt: '2999-01-01T00:00:00.000Z', revision: 1 }
      const db = database(initial)
      const revoked = applyLifecycleCommand(state(true), { action: 'revoke_approval', taskId, expectedRevision: 2 }, context)
      const saved = await saveIdeaLifecycle(initial, revoked, 2, { client: db.client })
      expect(saved.status).toBe(initial.status)
      expect(saved.metadata.delivery).toEqual(initial.metadata.delivery)
      expect(saved.metadata.lifecycle).toMatchObject({ approval: null, handoff: null })
      const tampered = structuredClone(revoked); tampered.title = 'Injected material edit'
      await expect(saveIdeaLifecycle(initial, tampered, 2, { client: db.client })).rejects.toThrow(/running/)
    }
  })
  it('keeps completed missions terminal while still allowing explicit revocation', async () => {
    const closed = { ...fixture(state(true)), status: 'done' as const }
    const db = database(closed)
    const edited = applyLifecycleCommand(state(true), { action: 'checkpoint', taskId, expectedRevision: 2, checkpoint: { status: 'partial', summary: 'New work', nextStep: 'Revise', blockers: [] } }, context)
    await expect(saveIdeaLifecycle(closed, edited, 2, { client: db.client })).rejects.toThrow(/completed mission is closed/)
    const revoked = applyLifecycleCommand(state(true), { action: 'revoke_approval', taskId, expectedRevision: 2 }, context)
    expect((await saveIdeaLifecycle(closed, revoked, 2, { client: db.client })).status).toBe('done')
  })
})

describe('trusted provider proof', () => {
  const observations: LifecycleObservations = { observedAt: context.now, lifecycleRevision: 2, briefHash: state(true).brief!.hash, outcomeHash: null,
    sources: { github: 'connected', stripe: 'not_connected', activation: 'not_connected', deployment: 'not_connected' },
    activations: [], payments: [], limitations: ['No activation connector'] }
  it('authenticates proof and rejects tampering, mission transplant and changed delivery context', async () => {
    vi.stubEnv('MISSION_PROVENANCE_SECRET', 'test-only-proof-key')
    const task = fixture(state(true)); const db = database(task)
    const saved = await saveLifecycleProof(task, observations, state().revision, { client: db.client })
    expect(readTrustedLifecycleObservations(saved)).toEqual(observations)
    expect(readTrustedLifecycleObservations({ ...saved, id: 'another-task' })).toBeUndefined()
    const tampered = structuredClone(saved)
    ;(tampered.metadata.lifecycleProof as { observations: LifecycleObservations }).observations.sources.stripe = 'connected'
    expect(readTrustedLifecycleObservations(tampered)).toBeUndefined()
    const changed = structuredClone(saved)
    ;(changed.metadata.delivery as DeliveryMetadata).revision++
    expect(readTrustedLifecycleObservations(changed)).toBeUndefined()
    expect(appendTaskEventOnce).toHaveBeenCalledWith(expect.objectContaining({
      founderId: actorId, taskId, type: 'evidence_added', eventKey: expect.stringMatching(/^lifecycle-proof:[a-f0-9]{64}$/),
      payload: expect.objectContaining({ paymentObservations: 0, activationObservations: 0 }),
    }), db.client)
  })
  it('fails closed when no existing signing key is available', async () => {
    vi.stubEnv('MISSION_PROVENANCE_SECRET', '')
    const task = fixture(state(true)); const db = database(task)
    await expect(saveLifecycleProof(task, observations, state().revision, { client: db.client })).rejects.toThrow(/signing is unavailable/)
    expect(db.update).not.toHaveBeenCalled()
  })
  it('surfaces audit persistence failure even after the confirmed task write', async () => {
    vi.stubEnv('MISSION_PROVENANCE_SECRET', 'test-only-proof-key')
    const task = fixture(state(true)); const db = database(task)
    vi.mocked(appendTaskEventOnce).mockRejectedValueOnce(new Error('Evidence journal offline'))
    await expect(saveLifecycleProof(task, observations, state().revision, { client: db.client })).rejects.toThrow(/Evidence journal offline/)
    expect(db.update).toHaveBeenCalledOnce()
    expect(readTrustedLifecycleObservations(db.current())).toBeUndefined()
    const pending = structuredClone(db.current().metadata.lifecycleProof)
    const recovered = await saveLifecycleProof(db.current(), { ...observations, observedAt: '2026-10-15T00:01:00.000Z' }, 2, { client: db.client })
    expect(readTrustedLifecycleObservations(recovered)).toEqual(observations)
    expect(recovered.metadata.lifecycleProof).toMatchObject({ ...(pending as object), pendingAudit: false, auditSignature: expect.any(String) })
    const events = vi.mocked(appendTaskEventOnce).mock.calls
    expect(events[events.length - 1][0].eventKey).toBe(events[events.length - 2][0].eventKey)
  })
})

describe('research-bound delivery consent', () => {
  it('cannot mint build consent from an unreviewed brief or a stale specification', () => {
    vi.stubEnv('MISSION_PROVENANCE_SECRET', 'test-only-proof-key')
    const approval = { id: 'approval', founderId: actorId, specVersion: 'a'.repeat(64), revision: 1, scope: 'branch_preview_only' as const, approvedAt: context.now }
    expect(signDeliveryApproval(fixture(state()), approval)).toBeNull()
    expect(signDeliveryApproval(fixture(state(true)), approval)).toBeNull()
    expect(getApprovedDelivery(fixture(state(true)))).toBeNull()
    const damaged = fixture(state(true))
    delete damaged.metadata.lifecycle
    expect(signDeliveryApproval(damaged, approval)).toBeNull()
  })
  it('projects the reviewed brief into existing branch preparation without paid providers or a fabricated Board verdict', async () => {
    const initial = fixture(state(true))
    const paidProvider = vi.fn()
    const deps: Partial<DeliveryPreparationDeps> = {
      getTaskById: vi.fn(async () => structuredClone(initial)),
      getProjects: vi.fn(async () => [{ name: 'Unite-Group', repo_path: '', github_repo: 'CleanExpo/Unite-Group', business_purpose: 'Operations', brand_rules_ref: '', deployment_target: 'Vercel', owner: 'Founder', status: 'active', evidence_vault_path: '', validation_commands: [], linear_prefix: 'UNI', production_url: null }]),
      classifyIdea: paidProvider, generateClarifyingQuestions: paidProvider, generateBuildPlan: paidProvider, runBoardReview: paidProvider,
      saveDelivery: vi.fn(async (task, delivery, options) => ({ ...task, status: options?.status ?? task.status, project_key: delivery.projectKey, metadata: { ...task.metadata, delivery } })),
    }
    const result = await prepareDeliveryMission(actorId, { action: 'resume', taskId }, deps)
    const delivery = readDeliveryMetadata(result.task)!
    expect(delivery).toMatchObject({ phase: 'ready', projectKey: 'Unite-Group', board: null, approval: null, spec: { summary: brief.objective } })
    expect(delivery.sourceRefs[0].reference).toBe(`idea-brief:${state(true).brief!.hash}`)
    expect(paidProvider).not.toHaveBeenCalled()
    vi.stubEnv('MISSION_PROVENANCE_SECRET', 'test-only-proof-key')
    const draft = intentFromReviewedLifecycle(state(true))
    if (!draft.ok) throw new Error(draft.reason)
    result.task.metadata.intent = { status: 'accepted', markdown: renderIntentMarkdown(draft.doc, { status: 'accepted', taskId, author: actorId, createdAt: context.now }), acceptedAt: context.now }
    vi.mocked(deps.getTaskById!).mockResolvedValue(result.task)
    const approved = await prepareDeliveryMission(actorId, { action: 'approve', taskId, specVersion: delivery.specVersion! }, {
      ...deps, listApprovalsForTask: vi.fn(async () => []),
      recordApproval: vi.fn(async input => ({ id: 'approval', founder_id: actorId, task_id: taskId, decision: 'approve', approver: 'founder', note: input.note!, at: context.now })),
    })
    expect(approved.task.status).toBe('queued')
    expect(getApprovedDelivery(approved.task)?.scope).toBe('branch_preview_only')
    expect(authorityFromApprovedDelivery(approved.task)?.intentHash).toBe(acceptedIntentBinding(approved.task)!.hash)
    expect(missionClaimVerdict(approved.task).claimable).toBe(true)
    expect(paidProvider).not.toHaveBeenCalled()
    const changed = applyLifecycleCommand(state(true), { action: 'checkpoint', taskId, expectedRevision: 2, checkpoint: { status: 'partial', summary: 'Material change', nextStep: 'Review again', blockers: [] } }, context)
    approved.task.metadata.lifecycle = changed
    expect(getApprovedDelivery(approved.task)).toBeNull()
    expect(authorityFromApprovedDelivery(approved.task)).toBeNull()
    expect(missionClaimVerdict(approved.task).claimable).toBe(false)
    let revised = applyLifecycleCommand(changed, { action: 'propose_brief', taskId, expectedRevision: changed.revision, brief: { ...brief, objective: 'Revised approved objective' } }, context)
    revised = applyLifecycleCommand(revised, { action: 'approve_brief', taskId, expectedRevision: revised.revision, briefHash: revised.brief!.hash }, context)
    const oldBuild = { status: 'awaiting_review' as const, prRef: 'https://github.com/CleanExpo/Unite-Group/pull/1', runnerId: 'runner', specRevision: delivery.revision, specFingerprint: delivery.specVersion!, completedAt: context.now }
    const built = { ...approved.task, status: 'awaiting_approval' as const, metadata: { ...approved.task.metadata, lifecycle: revised, delivery: { ...readDeliveryMetadata(approved.task)!, build: oldBuild } } }
    let current: CommandCentreTask = built
    const archive = vi.fn(async () => ({ event: null, created: false }))
    const revisions: Partial<DeliveryPreparationDeps> = { ...deps,
      getTaskById: vi.fn(async () => current), createTaskOnce: vi.fn(), appendTaskEventOnce: archive,
      saveDelivery: vi.fn(async (task, next, options) => {
        current = { ...task, status: options?.status ?? task.status, project_key: next.projectKey, metadata: { ...task.metadata, delivery: next } }
        return current
      }),
    }
    archive.mockRejectedValueOnce(new Error('Build archive unavailable'))
    await expect(prepareDeliveryMission(actorId, { action: 'resume', taskId }, revisions)).rejects.toThrow(/Build archive unavailable/)
    expect(revisions.saveDelivery).not.toHaveBeenCalled()
    expect(readDeliveryMetadata(current)?.build).toEqual(oldBuild)
    const replacement = await prepareDeliveryMission(actorId, { action: 'resume', taskId }, revisions)
    expect(replacement.task.id).toBe(taskId)
    expect(replacement.task.status).toBe('proposed')
    expect(readDeliveryMetadata(replacement.task)?.build).toBeUndefined()
    expect(archive).toHaveBeenCalledWith(expect.objectContaining({ type: 'evidence_added', payload: expect.objectContaining({ build: oldBuild, kind: 'prior_delivery_builder_report' }) }), undefined)
    expect(revisions.createTaskOnce).not.toHaveBeenCalled()
    expect((await prepareDeliveryMission(actorId, { action: 'resume', taskId }, revisions)).deduplicated).toBe(true)
    const newIntent = intentFromReviewedLifecycle(revised)
    if (!newIntent.ok) throw new Error(newIntent.reason)
    current.metadata.intent = { status: 'accepted', markdown: renderIntentMarkdown(newIntent.doc, { status: 'accepted', taskId, author: actorId, createdAt: context.now }), acceptedAt: context.now }
    const replacementDelivery = readDeliveryMetadata(current)!
    const replacementApproved = await prepareDeliveryMission(actorId, { action: 'approve', taskId, specVersion: replacementDelivery.specVersion! }, {
      ...revisions, listApprovalsForTask: vi.fn(async () => []),
      recordApproval: vi.fn(async input => ({ id: 'next-approval', founder_id: actorId, task_id: taskId, decision: 'approve', approver: 'founder', note: input.note!, at: context.now })),
    })
    expect(replacementApproved.task.status).toBe('queued')
    expect(missionClaimVerdict(replacementApproved.task).claimable).toBe(true)
    expect(paidProvider).not.toHaveBeenCalled()
    current = { ...current, status: 'done' }
    await expect(prepareDeliveryMission(actorId, { action: 'resume', taskId }, revisions)).rejects.toThrow(/completed mission is closed/)
    expect(revisions.createTaskOnce).not.toHaveBeenCalled()
  })
  it('blocks the legacy preparation entry point before any provider or lease when research is unapproved', async () => {
    const provider = vi.fn()
    await expect(prepareDeliveryMission(actorId, { action: 'resume', taskId }, {
      getTaskById: vi.fn(async () => fixture(state())), getProjects: provider,
      classifyIdea: provider, generateBuildPlan: provider, runBoardReview: provider, saveDelivery: provider,
    })).rejects.toThrow(/approve the current research brief/)
    expect(provider).not.toHaveBeenCalled()
  })
})
