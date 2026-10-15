import { beforeEach, describe, expect, it, vi } from 'vitest'
vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn(), createClient: vi.fn() }))
vi.mock('@/lib/command-centre/idea-lifecycle-store', () => ({ captureIdeaLifecycle: vi.fn(), getIdeaLifecycleTask: vi.fn(), saveIdeaLifecycle: vi.fn(), saveLifecycleProof: vi.fn(), readTrustedLifecycleObservations: vi.fn() }))
vi.mock('@/lib/command-centre/idea-lifecycle-observations', () => ({ observeIdeaLifecycle: vi.fn() }))
vi.mock('@/lib/command-centre/delivery-projects', () => ({ getDeliveryProjectByName: vi.fn() }))
vi.mock('@/lib/integrations/stripe/client', () => ({ getStripe: vi.fn(() => null) }))
vi.mock('@/lib/command-centre/idea-factory-activation', () => ({ factoryEvidenceEnabled: () => process.env.IDEA_EVIDENCE_ENABLED === '1', persistFactoryReviewedHandoff: vi.fn(), readFactoryActivation: vi.fn() }))
import { getUser } from '@/lib/supabase/server'
import { captureIdeaLifecycle, getIdeaLifecycleTask, saveIdeaLifecycle, saveLifecycleProof } from '@/lib/command-centre/idea-lifecycle-store'
import { observeIdeaLifecycle } from '@/lib/command-centre/idea-lifecycle-observations'
import { DeliveryConflict, DeliveryNotFound } from '@/lib/command-centre/delivery-store'
import { applyLifecycleCommand, createIdeaLifecycle, type LifecycleBriefInput } from '@/lib/command-centre/idea-lifecycle'
import type { CommandCentreTask } from '@/lib/command-centre/tasks'
import { persistFactoryReviewedHandoff, readFactoryActivation } from '@/lib/command-centre/idea-factory-activation'
import { IdeaEvidenceError } from '@/lib/command-centre/idea-evidence-store'
import { GET, POST } from '../route'

const actorId = 'b0000000-0000-4000-8000-000000000001'
const taskId = 'b0000000-0000-4000-8000-000000000002'
const capture = { action: 'capture', rawIdea: 'Preserve this raw idea', title: 'Idea', requestId: taskId }
const context = { actorId, now: '2026-10-15T00:00:00.000Z' }
const lifecycle = createIdeaLifecycle(capture, context)
const task = { id: taskId, founder_id: actorId, external_ref: `delivery:research:${taskId}`, title: 'Idea', objective: 'Idea',
  metadata: { lifecycle }, project_key: null, status: 'proposed', updated_at: context.now } as CommandCentreTask
const req = (body: unknown) => new Request('https://app.test/api/command-centre/missions/lifecycle', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
const get = (id = taskId) => new Request(`https://app.test/api/command-centre/missions/lifecycle?taskId=${id}`)
beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv('IDEA_EVIDENCE_ENABLED', '')
  vi.mocked(readFactoryActivation).mockResolvedValue({ status: 'not_connected', classification: 'internal_factory_use', scope: 'this_mission', history: [], firstValue: null })
  vi.mocked(getUser).mockResolvedValue({ id: actorId } as never)
  vi.mocked(getIdeaLifecycleTask).mockResolvedValue(structuredClone(task))
  vi.mocked(captureIdeaLifecycle).mockResolvedValue({ task, deduplicated: false })
  vi.mocked(saveIdeaLifecycle).mockImplementation(async (original, updated) => ({ ...original, metadata: { ...original.metadata, lifecycle: updated } }))
  vi.mocked(saveLifecycleProof).mockResolvedValue(task)
})

describe('internal factory activation API boundary', () => {
  function reviewed(approved = true) {
    const brief: LifecycleBriefInput = { objective: 'Persist the handoff', user: 'Founder', payer: 'Internal budget', nonGoals: [], acceptanceCriteria: [{ id: 'saved', criterion: 'Save the reviewed handoff', validation: 'Read back the task' }], outputs: Array.from({ length: 13 }, (_, index) => ({ id: index + 1, status: 'included', content: 'Recorded research' })), design: { summary: 'Existing UI', sourceIds: [] }, target: { repository: 'CleanExpo/Unite-Group', baseBranch: 'main' }, risks: [], openDecisions: [] }
    let state = applyLifecycleCommand(lifecycle, { action: 'propose_brief', taskId, expectedRevision: 1, brief }, context)
    if (approved) state = applyLifecycleCommand(state, { action: 'approve_brief', taskId, expectedRevision: state.revision, briefHash: state.brief!.hash }, context)
    return { ...task, metadata: { lifecycle: state } }
  }
  it.each([false, true])('retains ordinary draft persistence when builtin admission is inapplicable: enabled=%s', async enabled => {
    vi.stubEnv('IDEA_EVIDENCE_ENABLED', enabled ? '1' : '')
    vi.mocked(getIdeaLifecycleTask).mockResolvedValue(reviewed(!enabled))
    const response = await POST(req({ action: 'create_handoff', taskId, expectedRevision: 2 }))
    const body = await response.json()
    expect({ status: response.status, source: body.source, builtin: vi.mocked(persistFactoryReviewedHandoff).mock.calls.length, ordinary: vi.mocked(saveIdeaLifecycle).mock.calls.length, activation: body.factoryActivation.status }).toEqual({ status: 200, source: 'supabase', builtin: 0, ordinary: 1, activation: 'not_connected' })
  })
  it('uses only the authenticated atomic writer for an approved enabled handoff', async () => {
    vi.stubEnv('IDEA_EVIDENCE_ENABLED', '1')
    const original = reviewed()
    vi.mocked(getIdeaLifecycleTask).mockResolvedValue(original)
    vi.mocked(persistFactoryReviewedHandoff).mockResolvedValue(original)
    const response = await POST(req({ action: 'create_handoff', taskId, expectedRevision: 2 }))
    const body = await response.json()
    const call = vi.mocked(persistFactoryReviewedHandoff).mock.calls[0]
    expect({ status: response.status, actor: call?.[2].actorId, task: call?.[0].id, command: call?.[1], ordinary: vi.mocked(saveIdeaLifecycle).mock.calls.length, eligibleClients: body.progress.commercial.eligibleClients }).toEqual({ status: 200, actor: actorId, task: taskId, command: { action: 'create_handoff', taskId, expectedRevision: 2 }, ordinary: 0, eligibleClients: 0 })
  })
  it.each([['conflict', 409], ['unavailable', 503]] as const)('does not fall back after atomic %s failure', async (kind, status) => {
    vi.stubEnv('IDEA_EVIDENCE_ENABLED', '1')
    vi.mocked(getIdeaLifecycleTask).mockResolvedValue(reviewed())
    vi.mocked(persistFactoryReviewedHandoff).mockRejectedValue(new IdeaEvidenceError(kind))
    const response = await POST(req({ action: 'create_handoff', taskId, expectedRevision: 2 }))
    expect({ status: response.status, ordinary: vi.mocked(saveIdeaLifecycle).mock.calls.length, writerCalls: vi.mocked(persistFactoryReviewedHandoff).mock.calls.length }).toEqual({ status, ordinary: 0, writerCalls: 1 })
  })
  it.each(['source_id', 'grant_id', 'subject', 'release_id'])('rejects browser-selected producer authority: %s', async field => {
    vi.stubEnv('IDEA_EVIDENCE_ENABLED', '1')
    const response = await POST(req({ action: 'create_handoff', taskId, expectedRevision: 2, [field]: 'forged' }))
    expect({ status: response.status, reads: vi.mocked(getIdeaLifecycleTask).mock.calls.length, writerCalls: vi.mocked(persistFactoryReviewedHandoff).mock.calls.length }).toEqual({ status: 400, reads: 0, writerCalls: 0 })
  })
  it('returns operator history separately without counting it as paying clients', async () => {
    const entry = { id: taskId, occurredAt: context.now, admittedAt: context.now, briefHash: 'a'.repeat(64), revision: 1, releaseId: 'dpl_PreviousRuntime', environment: 'production' as const, withdrawn: false }
    vi.mocked(readFactoryActivation).mockResolvedValue({ status: 'available', classification: 'internal_factory_use', scope: 'this_mission', history: [entry], firstValue: entry })
    const response = await GET(get())
    const body = await response.json()
    expect({ status: response.status, internal: body.factoryActivation.firstValue.id, classification: body.factoryActivation.classification, eligibleClients: body.progress.commercial.eligibleClients, requiredClients: body.progress.commercial.requiredClients, net: body.progress.commercial.netByCurrency }).toEqual({ status: 200, internal: taskId, classification: 'internal_factory_use', eligibleClients: 0, requiredClients: null, net: {} })
  })
})

describe('authenticated lifecycle API', () => {
  it('requires auth before reading or mutating and never calls providers on capture', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    expect((await GET(get())).status).toBe(401)
    expect((await POST(req(capture))).status).toBe(401)
    expect(getIdeaLifecycleTask).not.toHaveBeenCalled()
    expect(captureIdeaLifecycle).not.toHaveBeenCalled()
    expect(observeIdeaLifecycle).not.toHaveBeenCalled()
  })
  it('rejects unknown client proof/actor/status fields and malformed identity', async () => {
    for (const extra of [{ actorId }, { observations: {} }, { status: 'done' }, { verified: true }]) {
      expect((await POST(req({ ...capture, ...extra }))).status).toBe(400)
    }
    expect((await GET(get('invalid'))).status).toBe(400)
    expect((await POST(req({ action: 'refresh_proof', taskId, expectedRevision: 1, payments: [] }))).status).toBe(400)
    expect(captureIdeaLifecycle).not.toHaveBeenCalled()
    expect(observeIdeaLifecycle).not.toHaveBeenCalled()
  })
  it('bounds actual streamed bytes even when the client omits or understates content length', async () => {
    const oversized = new Request('https://app.test/api/command-centre/missions/lifecycle', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': '1' }, body: JSON.stringify({ ...capture, rawIdea: 'x'.repeat(1024 * 1024) }),
    })
    expect((await POST(oversized)).status).toBe(400)
    expect(captureIdeaLifecycle).not.toHaveBeenCalled()
  })
  it('rejects cross-site and sibling-origin writes, requires JSON, and permits same-origin or terminal requests', async () => {
    for (const headers of [{ 'Origin': 'https://evil.test' }, { 'Sec-Fetch-Site': 'cross-site' }, { 'Origin': 'https://sibling.app.test', 'Sec-Fetch-Site': 'same-site' }]) {
      const request = req(capture)
      for (const [key, value] of Object.entries(headers)) if (value) request.headers.set(key, value)
      expect((await POST(request)).status).toBe(403)
    }
    const plain = req(capture); plain.headers.set('Content-Type', 'text/plain')
    expect((await POST(plain)).status).toBe(400)
    expect(captureIdeaLifecycle).not.toHaveBeenCalled()
    const same = req(capture); same.headers.set('Origin', 'https://app.test')
    expect((await POST(same)).status).toBe(200)
    expect((await POST(req(capture))).status).toBe(200)
  })
  it('captures using authenticated identity, returns saved proof boundaries and supports reload', async () => {
    const response = await POST(req(capture))
    expect(response.status).toBe(200)
    expect(captureIdeaLifecycle).toHaveBeenCalledWith(actorId, { rawIdea: capture.rawIdea, title: capture.title, requestId: taskId }, { actorId, now: expect.any(String) })
    expect(await response.json()).toMatchObject({ taskId, lifecycle: { rawIdea: capture.rawIdea }, source: 'supabase', handoff: null })
    expect((await GET(get())).status).toBe(200)
    expect(getIdeaLifecycleTask).toHaveBeenCalledWith(actorId, taskId)
    expect(observeIdeaLifecycle).not.toHaveBeenCalled()
  })
  it('keeps large valid research on the server while compact terminal status shares the same progress', async () => {
    const detail = 'Research context '.repeat(300).slice(0, 3500)
    const brief: LifecycleBriefInput = { objective: 'Large reviewed brief', user: 'Founder', payer: 'Founder',
      nonGoals: Array.from({ length: 25 }, () => detail),
      acceptanceCriteria: Array.from({ length: 30 }, (_, index) => ({ id: `criterion-${index}`, criterion: detail, validation: detail })),
      outputs: Array.from({ length: 13 }, (_, index) => ({ id: index + 1, status: 'included', content: detail })),
      design: { summary: detail, sourceIds: [] }, target: { repository: 'CleanExpo/Unite-Group', baseBranch: 'main' },
      risks: Array.from({ length: 25 }, () => detail), openDecisions: [] }
    const large = applyLifecycleCommand(lifecycle, { action: 'propose_brief', taskId, expectedRevision: 1, brief }, context)
    vi.mocked(getIdeaLifecycleTask).mockResolvedValue({ ...task, metadata: { lifecycle: large } })
    const fullResponse = await GET(get())
    const fullText = await fullResponse.text()
    expect(fullResponse.status).toBe(200)
    expect(new TextEncoder().encode(JSON.stringify(large)).byteLength).toBeLessThan(512 * 1024)
    expect(new TextEncoder().encode(fullText).byteLength).toBeGreaterThan(1024 * 1024)
    const full = JSON.parse(fullText)
    const compactResponse = await GET(new Request(`${get().url}&view=status`))
    const compactText = await compactResponse.text()
    const compact = JSON.parse(compactText)
    expect(compact.progress).toEqual(full.progress)
    expect(compact.lifecycle).toMatchObject({ title: large.title, revision: large.revision, sources: [], brief: { hash: large.brief!.hash } })
    expect(new TextEncoder().encode(compactText).byteLength).toBeLessThan(10000)
    expect(compact.lifecycle.rawIdea).toBeUndefined()
    expect(compact.handoff).toBeUndefined()
    expect(compact.mission).toBeUndefined()
    expect(full.lifecycle).toEqual(large)
  })
  it('derives the command actor from auth and persists only a validated transition', async () => {
    const response = await POST(req({ action: 'checkpoint', taskId, expectedRevision: 1,
      checkpoint: { status: 'partial', summary: 'Research paused', nextStep: 'Collect sources', blockers: [] } }))
    expect(response.status).toBe(200)
    expect(saveIdeaLifecycle).toHaveBeenCalledWith(task, expect.objectContaining({ revision: 2, history: expect.arrayContaining([expect.objectContaining({ actorId, action: 'checkpoint' })]) }), 1)
  })
  it('returns owner404, stale409 and persistence503 without false success', async () => {
    vi.mocked(getIdeaLifecycleTask).mockRejectedValueOnce(new DeliveryNotFound())
    expect((await GET(get())).status).toBe(404)
    vi.mocked(getIdeaLifecycleTask).mockRejectedValueOnce(new Error('database connection unavailable'))
    const unavailable = await GET(get())
    expect(unavailable.status).toBe(503)
    expect(await unavailable.json()).toMatchObject({ source: 'error' })
    expect((await POST(req({ action: 'revoke_approval', taskId, expectedRevision: 99 }))).status).toBe(409)
    expect(saveIdeaLifecycle).not.toHaveBeenCalled()
    vi.mocked(captureIdeaLifecycle).mockRejectedValueOnce(new Error('db offline'))
    expect((await POST(req(capture))).status).toBe(503)
    vi.mocked(saveIdeaLifecycle).mockRejectedValueOnce(new DeliveryConflict())
    expect((await POST(req({ action: 'revoke_approval', taskId, expectedRevision: 1 }))).status).toBe(409)
  })
  it('refreshes evidence only through the trusted server adapter and CAS writer', async () => {
    const observations = { observedAt: context.now, sources: { github: 'not_connected', stripe: 'not_connected', activation: 'not_connected', deployment: 'not_connected' }, activations: [], payments: [], limitations: [] } as Awaited<ReturnType<typeof observeIdeaLifecycle>>
    vi.mocked(observeIdeaLifecycle).mockResolvedValue(observations)
    expect((await POST(req({ action: 'refresh_proof', taskId, expectedRevision: 1 }))).status).toBe(200)
    expect(observeIdeaLifecycle).toHaveBeenCalledWith(task, undefined, null, expect.objectContaining({ stripe: null }))
    expect(saveLifecycleProof).toHaveBeenCalledWith(task, observations, 1)
  })
})
