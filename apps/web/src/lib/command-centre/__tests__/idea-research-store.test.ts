import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
vi.mock('../tasks', async original => ({ ...await original<typeof import('../tasks')>(), appendTaskEventOnce: vi.fn(async () => ({ event: null, created: false })) }))
import { createIdeaLifecycle, applyLifecycleCommand } from '../idea-lifecycle'
import { startIdeaResearch, readIdeaResearch, changeIdeaResearch, operateIdeaResearch, readSignedResearchRun } from '../idea-research-store'
import { type ResearchResult, type ResearchStart } from '../idea-research'
import type { CommandCentreTask } from '../tasks'
import { appendTaskEventOnce } from '../tasks'
import type { DeliveryStoreClient } from '../delivery-store'

const founderId = 'b0000000-0000-4000-8000-000000000001'
const taskId = 'b0000000-0000-4000-8000-000000000002'
const requestId = 'b0000000-0000-4000-8000-000000000003'
const runId = 'b0000000-0000-4000-8000-000000000004'
const token = 'b0000000-0000-4000-8000-000000000005'
const stamp = '2026-10-15T00:00:00.000Z'
const context = { actorId: founderId, now: stamp }
const input: ResearchStart = { action: 'start', taskId, expectedRevision: 2, requestId, allowedDomains: ['example.com'], limits: { maximumSources: 5, timeLimitMinutes: 10, maxTurns: 6, concurrency: 1 } }
const result: ResearchResult = { schemaVersion: 1, kind: 'untrusted_research_proposal', summary: 'A proposed direction requiring review', sources: [], claims: [], openDecisions: ['Confirm payer'], options: [], proposedBrief: null }
function fixture(): CommandCentreTask {
  let lifecycle = createIdeaLifecycle({ title: 'Idea', rawIdea: 'Research an application', requestId }, context)
  lifecycle = applyLifecycleCommand(lifecycle, { action: 'set_mandate', taskId, expectedRevision: 1, mandate: { objective: 'Compare public options', allowedSources: ['Public documentation'], maximumSources: 5, spendLimitMinor: 0, currency: 'AUD', paidApiAllowed: false } }, context)
  return { id: taskId, founder_id: founderId, external_ref: `delivery:research:${requestId}`, status: 'proposed', title: 'Idea', objective: 'Idea', metadata: { lifecycle, delivery: { preserved: true }, intent: { preserved: true } }, updated_at: stamp } as unknown as CommandCentreTask
}
function database(flags: { lost?: boolean; tamper?: boolean; readError?: boolean } = {}) {
  let row = fixture()
  let clock = stamp
  let nextId = runId
  let writes = 0
  const client = { from: () => ({
    select: () => {
      const where: Record<string, unknown> = {}
      const chain = { eq: (key: string, value: unknown) => { where[key] = value; return chain }, single: async () => {
        if (flags.readError) return { data: null, error: { code: '08006', message: 'Offline' } }
        if (where.founder_id !== row.founder_id || where.id !== row.id) return { data: null, error: { code: 'PGRST116', message: 'No row' } }
        return { data: structuredClone(row), error: null }
      } }
      return chain
    },
    update: (values: Record<string, unknown>) => {
      const where: Record<string, unknown> = {}
      const chain = { eq: (key: string, value: unknown) => { where[key] = value; return chain }, select: async () => {
        if (flags.lost || Object.entries(where).some(([key, value]) => (row as unknown as Record<string, unknown>)[key] !== value)) return { data: [], error: null }
        row = structuredClone({ ...row, ...values }) as CommandCentreTask; writes++
        if (flags.tamper) row.metadata.intent = { overwritten: true }
        return { data: [structuredClone(row)], error: null }
      } }
      return chain
    },
  }) } as unknown as DeliveryStoreClient
  return { options: { client, now: () => clock, newId: () => nextId }, row: () => row, set: (next: CommandCentreTask) => { row = next },
    clock: (value: string) => { clock = value }, id: (value: string) => { nextId = value }, writes: () => writes }
}
beforeEach(() => {
  vi.stubEnv('MISSION_PROVENANCE_SECRET', 'test-only-research-key')
  const receipts = new Set<string>()
  vi.mocked(appendTaskEventOnce).mockImplementation(async input => {
    const key = `${input.taskId}:${input.eventKey}`
    const created = !receipts.has(key); receipts.add(key)
    return { event: null, created }
  })
})
afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks() })
const command = { taskId, runId, runnerId: 'research-runner' }

describe('signed research on the existing proposed mission', () => {
  it('starts idempotently with an immutable mandate and preserves all existing siblings and task status', async () => {
    const db = database(); const before = structuredClone(db.row())
    expect((await startIdeaResearch(founderId, input, db.options)).deduplicated).toBe(false)
    expect((await startIdeaResearch(founderId, input, db.options)).deduplicated).toBe(true)
    expect(db.writes()).toBe(1)
    expect(db.row().status).toBe('proposed')
    for (const key of ['lifecycle', 'delivery', 'intent']) expect(db.row().metadata[key]).toEqual(before.metadata[key])
    expect(readSignedResearchRun(db.row())).toMatchObject({ state: 'queued', authority: { paidApiAllowed: false, subscriptionCredits: 'unknown', scope: 'public_research_only' } })
    await expect(startIdeaResearch(founderId, { ...input, limits: { ...input.limits, maxTurns: 5 } }, db.options)).rejects.toThrow(/different research permission/)
  })
  it('isolates owners, reports persistence outages, fails signing closed and rejects forged state', async () => {
    const db = database()
    await expect(readIdeaResearch(requestId, taskId, db.options)).rejects.toThrow(/not found/)
    await expect(readIdeaResearch(founderId, taskId, database({ readError: true }).options)).rejects.toThrow(/unavailable/)
    vi.stubEnv('MISSION_PROVENANCE_SECRET', '')
    await expect(startIdeaResearch(founderId, input, db.options)).rejects.toThrow(/signing is unavailable/)
    expect(db.writes()).toBe(0)
    vi.stubEnv('MISSION_PROVENANCE_SECRET', 'test-only-research-key')
    await startIdeaResearch(founderId, input, db.options)
    const forged = structuredClone(db.row()); (forged.metadata.research as { state: string }).state = 'completed'
    expect(() => readSignedResearchRun(forged)).toThrow(/invalid|authenticated/)
  })
  it('uses row CAS for competing starts and rejects unconfirmed writes', async () => {
    const db = database()
    const attempts = await Promise.allSettled([startIdeaResearch(founderId, input, db.options), startIdeaResearch(founderId, input, db.options)])
    expect(attempts.filter(attempt => attempt.status === 'fulfilled')).toHaveLength(1)
    expect(attempts.filter(attempt => attempt.status === 'rejected')).toHaveLength(1)
    await expect(startIdeaResearch(founderId, { ...input, requestId: runId }, database({ lost: true }).options)).rejects.toThrow(/changed/)
    await expect(startIdeaResearch(founderId, { ...input, requestId: token }, database({ tamper: true }).options)).rejects.toThrow(/confirmed/)
  })
  it('claims once, checkpoints monotonically, recovers reconciled partial work without extending its deadline and finishes idempotently', async () => {
    const db = database(); await startIdeaResearch(founderId, input, db.options); db.id(token)
    const claim = await operateIdeaResearch(founderId, { ...command, action: 'claim' }, db.options)
    const initial = readSignedResearchRun(claim.task)!
    expect(initial).toMatchObject({ state: 'running', lease: { token, runnerId: command.runnerId }, attempts: 1 })
    await expect(operateIdeaResearch(founderId, { ...command, action: 'claim' }, db.options)).rejects.toThrow(/Only queued research/)
    const checkpoint = { sequence: 1, summary: 'Partial public research', nextStep: 'Compare candidates', sourceIds: [], toolCalls: 1, turnsUsed: 1 }
    await operateIdeaResearch(founderId, { ...command, action: 'checkpoint', leaseToken: token, checkpoint }, db.options)
    const writes = db.writes()
    await operateIdeaResearch(founderId, { ...command, action: 'checkpoint', leaseToken: token, checkpoint }, db.options)
    expect(db.writes()).toBe(writes)
    await expect(operateIdeaResearch(founderId, { ...command, action: 'checkpoint', leaseToken: token, checkpoint: { ...checkpoint, summary: 'Changed replay' } }, db.options)).rejects.toThrow(/monotonically/)
    await operateIdeaResearch(founderId, { ...command, action: 'checkpoint', leaseToken: token, checkpoint: { ...checkpoint, sequence: 2, usageFinal: true } }, db.options)
    await operateIdeaResearch(founderId, { ...command, action: 'block', leaseToken: token, reason: 'Stopped after checkpoint', usageReconciled: true }, db.options)
    expect(readSignedResearchRun(db.row())?.state).toBe('partial')
    await changeIdeaResearch(founderId, { action: 'retry', taskId, runId, expectedRevision: 2 }, db.options)
    const resumed = await operateIdeaResearch(founderId, { ...command, action: 'claim' }, db.options)
    expect(readSignedResearchRun(resumed.task)?.deadlineAt).toBe(initial.deadlineAt)
    await operateIdeaResearch(founderId, { ...command, action: 'checkpoint', leaseToken: token, checkpoint: { ...checkpoint, sequence: 3, turnsUsed: 2, usageFinal: true } }, db.options)
    const finished = await operateIdeaResearch(founderId, { ...command, action: 'finish', leaseToken: token, result }, db.options)
    expect(finished.continue).toBe(false)
    expect(readSignedResearchRun(finished.task)).toMatchObject({ state: 'completed', result: { kind: 'untrusted_research_proposal' } })
    expect((await operateIdeaResearch(founderId, { ...command, action: 'finish', leaseToken: token, result }, db.options)).continue).toBe(false)
    await expect(operateIdeaResearch(founderId, { ...command, action: 'finish', leaseToken: token, result: { ...result, summary: 'Changed result' } }, db.options)).rejects.toThrow(/cannot be changed/)
    expect(db.row().status).toBe('proposed')
  })
  it('cancels and rejects stale workers, and terminates leases at a material edit or expiry', async () => {
    const db = database(); await startIdeaResearch(founderId, input, db.options); db.id(token)
    await operateIdeaResearch(founderId, { ...command, action: 'claim' }, db.options)
    await expect(operateIdeaResearch(founderId, { ...command, action: 'heartbeat', leaseToken: requestId }, db.options)).rejects.toThrow(/lease changed/)
    await changeIdeaResearch(founderId, { action: 'cancel', taskId, runId, expectedRevision: 2 }, db.options)
    await expect(operateIdeaResearch(founderId, { ...command, action: 'heartbeat', leaseToken: token }, db.options)).rejects.toThrow(/cancelled/)
    expect(readSignedResearchRun(db.row())?.lease).toBeNull()
    const edited = database(); await startIdeaResearch(founderId, { ...input, requestId: runId }, edited.options); edited.id(token)
    await operateIdeaResearch(founderId, { ...command, action: 'claim' }, edited.options)
    const lifecycle = applyLifecycleCommand(edited.row().metadata.lifecycle as Parameters<typeof applyLifecycleCommand>[0], { action: 'checkpoint', taskId, expectedRevision: 2, checkpoint: { status: 'partial', summary: 'Changed research', nextStep: 'Review again', blockers: [] } }, context)
    edited.set({ ...edited.row(), metadata: { ...edited.row().metadata, lifecycle } })
    await expect(operateIdeaResearch(founderId, { ...command, action: 'heartbeat', leaseToken: token }, edited.options)).rejects.toThrow(/permission expired or changed/)
    expect(readSignedResearchRun(edited.row())).toMatchObject({ state: 'cancelled', lease: null })
    const expired = database(); await startIdeaResearch(founderId, { ...input, requestId: token }, expired.options); expired.id(token)
    await operateIdeaResearch(founderId, { ...command, action: 'claim' }, expired.options)
    expired.clock('2026-10-15T00:02:00.000Z')
    await expect(operateIdeaResearch(founderId, { ...command, action: 'heartbeat', leaseToken: token }, expired.options)).rejects.toThrow(/lease or fixed time/)
    expect(readSignedResearchRun(expired.row())?.lease).toBeNull()
  })
  it('never reuses an archived request identity to grant fresh research allowance', async () => {
    const db = database()
    await startIdeaResearch(founderId, input, db.options)
    await changeIdeaResearch(founderId, { action: 'cancel', taskId, runId, expectedRevision: 2 }, db.options)
    db.id(token)
    const second = { ...input, requestId: token }
    await startIdeaResearch(founderId, second, db.options)
    await changeIdeaResearch(founderId, { action: 'cancel', taskId, runId: token, expectedRevision: 2 }, db.options)
    const writes = db.writes()
    await expect(startIdeaResearch(founderId, input, db.options)).rejects.toThrow(/previously used or reserved/)
    await expect(startIdeaResearch(founderId, { ...input, allowedDomains: ['docs.example.com'], limits: { ...input.limits, maxTurns: 2 } }, db.options)).rejects.toThrow(/previously used or reserved/)
    expect(db.writes()).toBe(writes)
    expect(readSignedResearchRun(db.row())?.requestId).toBe(second.requestId)
  })
})
