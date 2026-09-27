import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn(), createClient: vi.fn() }))
vi.mock('@/lib/command-centre/tasks', async (importActual) => ({
  ...(await importActual<typeof import('@/lib/command-centre/tasks')>()),
  getTaskById: vi.fn(),
  mergeTaskMetadata: vi.fn(),
  appendTaskEvent: vi.fn(),
}))
vi.mock('@/lib/command-centre/intent-store', async (importActual) => ({
  ...(await importActual<typeof import('@/lib/command-centre/intent-store')>()),
  saveMissionIntent: vi.fn(),
}))
vi.mock('../intent-authority', async (importActual) => {
  const actual = await importActual<typeof import('../intent-authority')>()
  return { ...actual, mintAuthorityFromAcceptedIntent: vi.fn(actual.mintAuthorityFromAcceptedIntent) }
})

import { getUser } from '@/lib/supabase/server'
import { getTaskById as mockedGetTaskById, appendTaskEvent, type CommandCentreTask } from '@/lib/command-centre/tasks'
import { saveMissionIntent } from '@/lib/command-centre/intent-store'
import { DeliveryConflict, deliveryFingerprint, getApprovedDelivery, signDeliveryApproval } from '@/lib/command-centre/delivery-store'
import { readDeliveryMetadata, type DeliveryMetadata } from '@/lib/command-centre/delivery-types'
import type { DeliveryPreparationDeps } from '@/lib/command-centre/delivery-prepare'
import type { Approval } from '@/lib/command-centre/approvals'
import { renderIntentMarkdown } from '@/lib/command-centre/intent'
import { PUT } from '@/app/api/command-centre/intent/route'
import { hashIntentMarkdown, INTENT_BINDING_VERSION } from '../intent-binding'
import { mintAuthorityFromAcceptedIntent } from '../intent-authority'
import { claimNextQueuedTask, type RunnerClaimClientLike } from '@/lib/command-centre/runner-claim'

// UNI-2779 — accepting the intent IS the founder's build consent. When the
// mission is already admitted (ready spec, Board APPROVED), accepting mints
// the signed approval through the existing approve() path with no second
// founder action, and the approval is bound to the exact accepted markdown.

const FOUNDER = 'c0000000-0000-4000-8000-000000000001'
const TASK_ID = 'c0000000-0000-4000-8000-000000000002'
const IDEA = 'Contractors can see whether their claim report was sent'
const INTENT_MD = renderIntentMarkdown(
  {
    title: 'Contractors see claim report status',
    problem: 'Contractors phone the office to ask whether a report was sent.',
    proposedOutcome: 'One page shows each report status.',
    affectedUsersAndSystems: 'Contractors, office staff, the reports module.',
    constraints: ['No new login system'],
    openQuestions: ['Do insurers expose a status we can read?'],
  },
  { author: 'phill@example.com', status: 'accepted', createdAt: '2026-09-27T01:00:00.000Z', taskId: TASK_ID },
)

function readyDelivery(overrides: Partial<DeliveryMetadata> = {}): DeliveryMetadata {
  const d: DeliveryMetadata = {
    schemaVersion: 1, kind: 'software_delivery', lane: 'software', revision: 1, inputHash: 'a'.repeat(64),
    originalIdea: IDEA, projectKey: 'Unite-Group', presetIds: [], recipeVersions: {}, answers: {}, questions: [],
    phase: 'ready',
    spec: { title: 'Report status', summary: 'Show report status', requirements: [IDEA], acceptanceCriteria: ['Status visible'], steps: ['Build'], presetIds: [] },
    specVersion: null, harness: [], sourceRefs: [],
    board: { verdict: 'APPROVED', rationale: 'Proceed', decisionId: 'decision-1' },
    lease: null, approval: null, error: null, scope: 'branch_preview_only',
    ...overrides,
  }
  return { ...d, specVersion: deliveryFingerprint(d) }
}

function harness(intent: Record<string, unknown> | null, delivery = readyDelivery()) {
  let clock = Date.parse('2026-09-27T02:00:00Z')
  let write = 0
  const receipts: Approval[] = []
  let row: CommandCentreTask = {
    id: TASK_ID, founder_id: FOUNDER, external_ref: 'delivery:req-1', queue_id: null, project_id: null,
    project_key: 'Unite-Group', title: IDEA, objective: IDEA, priority: 'P2', status: 'proposed', agent_owner: null,
    risk_level: 'low', execution_mode: 'branch-preview', origin: 'idea', dependencies: [], human_approval_required: true,
    evidence_path: null, validation_required: ['test'], linear_id: null, preview_url: null,
    metadata: { delivery, ...(intent ? { intent } : {}) },
    created_at: new Date(clock).toISOString(), updated_at: new Date(clock).toISOString(),
  }
  const clone = <T>(value: T): T => structuredClone(value)
  const deps: Partial<DeliveryPreparationDeps> = {
    getTaskById: vi.fn(async (input) => (input.founderId === FOUNDER && input.taskId === TASK_ID ? clone(row) : null)),
    getProjects: vi.fn(async () => [{
      name: 'Unite-Group', repo_path: '', github_repo: 'CleanExpo/Unite-Group', business_purpose: '', brand_rules_ref: '',
      deployment_target: 'Vercel', owner: 'Phill', status: 'active', evidence_vault_path: '', validation_commands: [],
      linear_prefix: 'UNI', production_url: null,
    }]) as never,
    listApprovalsForTask: vi.fn(async () => receipts),
    recordApproval: vi.fn(async (input) => {
      const receipt: Approval = {
        id: `approval-${receipts.length}`, founder_id: FOUNDER, task_id: TASK_ID, decision: input.decision,
        approver: 'founder', note: input.note ?? null, at: new Date(clock).toISOString(),
      }
      receipts.unshift(receipt)
      return receipt
    }),
    verifyDeliveryApproval: vi.fn(async (task) => !!getApprovedDelivery(task)),
    saveDelivery: vi.fn(async (expected, next, options) => {
      if (row.updated_at !== expected.updated_at || row.status !== expected.status) throw new DeliveryConflict()
      row = {
        ...row,
        metadata: { ...row.metadata, delivery: clone(next) },
        status: options?.status ?? row.status,
        updated_at: new Date(clock + ++write).toISOString(),
      }
      return clone(row)
    }),
    now: () => clock,
    newId: () => 'c0000000-0000-4000-8000-000000000003',
  }
  return {
    deps,
    receipts,
    get row() { return clone(row) },
    setIntent: (next: Record<string, unknown>) => { row = { ...row, metadata: { ...row.metadata, intent: next } } },
    setStatus: (status: CommandCentreTask['status']) => { row = { ...row, status, updated_at: new Date(clock + ++write).toISOString() } },
    advance: (ms: number) => { clock += ms },
  }
}

const ACCEPTED = { status: 'accepted', markdown: INTENT_MD, acceptedAt: '2026-09-27T01:00:00.000Z', author: 'phill@example.com' }

beforeEach(() => {
  vi.stubEnv('MISSION_PROVENANCE_SECRET', 'test-intent-provenance')
})
afterEach(() => {
  vi.unstubAllEnvs()
  vi.clearAllMocks()
})

describe('mintAuthorityFromAcceptedIntent', () => {
  it('an accepted intent on an admitted mission mints the signed approval with no second founder action', async () => {
    const h = harness(ACCEPTED)
    const result = await mintAuthorityFromAcceptedIntent(FOUNDER, TASK_ID, h.deps)

    expect(result).toMatchObject({ minted: true })
    expect(h.row.status).toBe('queued')
    expect(h.deps.recordApproval).toHaveBeenCalledOnce()
    const approval = readDeliveryMetadata(h.row)!.approval!
    expect(approval.intent).toEqual({ hash: hashIntentMarkdown(INTENT_MD), version: INTENT_BINDING_VERSION, acceptedAt: ACCEPTED.acceptedAt })
    expect(approval.signature).toMatch(/^[a-f0-9]{64}$/)
    expect(getApprovedDelivery(h.row)).not.toBeNull()
  })

  it('a draft intent mints nothing', async () => {
    const h = harness({ ...ACCEPTED, status: 'draft' })
    expect(await mintAuthorityFromAcceptedIntent(FOUNDER, TASK_ID, h.deps)).toMatchObject({ minted: false, reason: 'intent_not_accepted' })
    expect(h.row.status).toBe('proposed')
    expect(h.deps.recordApproval).not.toHaveBeenCalled()
    expect(h.deps.saveDelivery).not.toHaveBeenCalled()
  })

  it('no intent mints nothing', async () => {
    const h = harness(null)
    expect(await mintAuthorityFromAcceptedIntent(FOUNDER, TASK_ID, h.deps)).toMatchObject({ minted: false })
    expect(h.deps.recordApproval).not.toHaveBeenCalled()
  })

  it.each([
    ['a Board HOLD', { board: { verdict: 'HOLD' as const, rationale: 'Concerns', decisionId: 'd' } }],
    ['a spec still being prepared', { phase: 'board' as const }],
    ['a non-software lane', { lane: 'content' as const }],
  ])('an accepted intent without admission mints nothing (%s)', async (_label, overrides) => {
    const h = harness(ACCEPTED, readyDelivery(overrides))
    expect(await mintAuthorityFromAcceptedIntent(FOUNDER, TASK_ID, h.deps)).toMatchObject({ minted: false })
    expect(h.deps.recordApproval).not.toHaveBeenCalled()
    expect(h.row.status).toBe('proposed')
  })

  it('an accepted intent whose markdown later changes invalidates the approval', async () => {
    const h = harness(ACCEPTED)
    await mintAuthorityFromAcceptedIntent(FOUNDER, TASK_ID, h.deps)
    expect(getApprovedDelivery(h.row)).not.toBeNull()

    h.setIntent({ ...ACCEPTED, markdown: `${INTENT_MD}\nOne more requirement slipped in.` })
    expect(getApprovedDelivery(h.row)).toBeNull()
  })

  it('an intent that falls back to draft invalidates the approval', async () => {
    const h = harness(ACCEPTED)
    await mintAuthorityFromAcceptedIntent(FOUNDER, TASK_ID, h.deps)
    h.setIntent({ ...ACCEPTED, status: 'draft' })
    expect(getApprovedDelivery(h.row)).toBeNull()
  })

  it('the binding is inside the signed payload: re-pointing it at new markdown breaks the signature', async () => {
    const h = harness(ACCEPTED)
    await mintAuthorityFromAcceptedIntent(FOUNDER, TASK_ID, h.deps)
    const changed = `${INTENT_MD}\nWidened scope.`
    h.setIntent({ ...ACCEPTED, markdown: changed })
    const row = h.row
    const d = readDeliveryMetadata(row)!
    const forged = { ...d, approval: { ...d.approval!, intent: { ...d.approval!.intent!, hash: hashIntentMarkdown(changed) } } }
    expect(getApprovedDelivery({ ...row, metadata: { ...row.metadata, delivery: forged } })).toBeNull()
  })

  it('an approval signed before intent binding existed still verifies (no silent revocation)', () => {
    const h = harness(null)
    const row = h.row
    const d = readDeliveryMetadata(row)!
    const approval = { id: 'approval-legacy', founderId: FOUNDER, specVersion: d.specVersion!, revision: d.revision, scope: d.scope, approvedAt: '2026-09-27T02:00:00.000Z' }
    const signed = { ...d, approval: { ...approval, signature: signDeliveryApproval(row, approval)! } }
    expect(getApprovedDelivery({ ...row, metadata: { ...row.metadata, delivery: signed } })).not.toBeNull()
  })
})

// A runner-claim client over a single task row and its approval receipts.
function claimClient(task: CommandCentreTask, receipts: Approval[]) {
  const client: RunnerClaimClientLike = {
    from: (table: string) => ({
      select: () => {
        const chain = {
          eq: () => chain,
          order: () => chain,
          limit: async () => ({ data: table === 'cc_tasks' ? [structuredClone(task)] : receipts, error: null }),
        }
        return chain
      },
      update: (values: Record<string, unknown>) => {
        const chain = {
          eq: () => chain,
          select: async () => ({ data: [{ ...structuredClone(task), ...values }], error: null }),
        }
        return chain
      },
    }),
  }
  return client
}

const EDITED_MD = renderIntentMarkdown(
  {
    title: 'Contractors see claim report status and insurer receipt',
    problem: 'Contractors phone the office to ask whether a report was sent.',
    proposedOutcome: 'One page shows each report status and whether the insurer received it.',
    affectedUsersAndSystems: 'Contractors, office staff, the reports module.',
    constraints: ['No new login system'],
    openQuestions: ['Do insurers expose a status we can read?'],
  },
  { author: 'phill@example.com', status: 'accepted', createdAt: '2026-09-27T03:00:00.000Z', taskId: TASK_ID },
)
const EDITED = { ...ACCEPTED, markdown: EDITED_MD, acceptedAt: '2026-09-27T03:00:00.000Z' }

describe('re-accepting an edited intent on a queued mission (UNI-2779 supersession)', () => {
  it('supersedes the old hash, re-binds consent to the new hash and re-queues through approve()', async () => {
    const h = harness(ACCEPTED)
    const append = vi.fn(async () => ({}) as never)
    await mintAuthorityFromAcceptedIntent(FOUNDER, TASK_ID, { ...h.deps, appendTaskEvent: append })
    expect(h.row.status).toBe('queued')
    const oldHash = hashIntentMarkdown(INTENT_MD)
    const newHash = hashIntentMarkdown(EDITED_MD)

    h.setIntent(EDITED)
    const stranded = h.row
    // Before the re-bind the queued build is unclaimable: its consent names the old intent.
    expect(await claimNextQueuedTask(claimClient(stranded, h.receipts), { founderId: FOUNDER, runnerId: 'runner-a' })).toBeNull()

    const result = await mintAuthorityFromAcceptedIntent(FOUNDER, TASK_ID, { ...h.deps, appendTaskEvent: append })
    expect(result).toMatchObject({ minted: true })
    expect(h.row.status).toBe('queued')
    expect(readDeliveryMetadata(h.row)!.approval!.intent!.hash).toBe(newHash)
    expect(append).toHaveBeenCalledOnce()
    expect(append).toHaveBeenCalledWith(
      expect.objectContaining({ taskId: TASK_ID, payload: { kind: 'intent_superseded', oldHash, newHash } }),
      undefined,
    )
    // The stale consent was withdrawn through the guarded CAS writer, not a direct status write.
    const statuses = vi.mocked(h.deps.saveDelivery!).mock.calls.map(([, , options]) => options?.status)
    expect(statuses).toContain('awaiting_approval')

    // The runner claims the new binding...
    const claimed = await claimNextQueuedTask(claimClient(h.row, h.receipts), { founderId: FOUNDER, runnerId: 'runner-a' })
    expect(claimed?.approvedDelivery?.approval.intent?.hash).toBe(newHash)
    // ...and a row presenting the old binding against the new intent is refused.
    const staleApproval = readDeliveryMetadata(stranded)!.approval
    const replay = { ...h.row, metadata: { ...h.row.metadata, delivery: { ...readDeliveryMetadata(h.row)!, approval: staleApproval } } }
    expect(await claimNextQueuedTask(claimClient(replay, h.receipts), { founderId: FOUNDER, runnerId: 'runner-a' })).toBeNull()
  })

  it('a queued build still bound to the current intent is left alone (no withdrawal, no supersession)', async () => {
    const h = harness(ACCEPTED)
    const append = vi.fn(async () => ({}) as never)
    await mintAuthorityFromAcceptedIntent(FOUNDER, TASK_ID, { ...h.deps, appendTaskEvent: append })
    const saves = vi.mocked(h.deps.saveDelivery!).mock.calls.length
    const before = h.row

    expect(await mintAuthorityFromAcceptedIntent(FOUNDER, TASK_ID, { ...h.deps, appendTaskEvent: append })).toMatchObject({ minted: false })
    expect(vi.mocked(h.deps.saveDelivery!).mock.calls.length).toBe(saves)
    expect(append).not.toHaveBeenCalled()
    expect(h.row).toEqual(before)
  })

  it('an intent edited back to draft re-queues nothing and records no supersession', async () => {
    const h = harness(ACCEPTED)
    const append = vi.fn(async () => ({}) as never)
    await mintAuthorityFromAcceptedIntent(FOUNDER, TASK_ID, { ...h.deps, appendTaskEvent: append })
    const saves = vi.mocked(h.deps.saveDelivery!).mock.calls.length
    const before = readDeliveryMetadata(h.row)!.approval

    h.setIntent({ ...EDITED, status: 'draft' })
    expect(await mintAuthorityFromAcceptedIntent(FOUNDER, TASK_ID, { ...h.deps, appendTaskEvent: append })).toMatchObject({ minted: false, reason: 'intent_not_accepted' })
    expect(vi.mocked(h.deps.saveDelivery!).mock.calls.length).toBe(saves)
    expect(append).not.toHaveBeenCalled()
    expect(readDeliveryMetadata(h.row)!.approval).toEqual(before)
    expect(getApprovedDelivery(h.row)).toBeNull()
  })

  it('a runner that claims the build first wins: the re-bind withdraws nothing from a running task', async () => {
    const h = harness(ACCEPTED)
    await mintAuthorityFromAcceptedIntent(FOUNDER, TASK_ID, h.deps)
    h.setIntent(EDITED)
    const queuedSnapshot = h.row
    h.setStatus('running') // the runner's claim lands between the read and the demotion
    const approvalBefore = readDeliveryMetadata(h.row)!.approval
    const read = vi.fn(async () => structuredClone(queuedSnapshot))

    const result = await mintAuthorityFromAcceptedIntent(FOUNDER, TASK_ID, { ...h.deps, getTaskById: read, appendTaskEvent: vi.fn(async () => ({}) as never) })
    expect(result).toMatchObject({ minted: false, reason: 'approval_refused' })
    expect(h.row.status).toBe('running')
    expect(readDeliveryMetadata(h.row)!.approval).toEqual(approvalBefore)
  })
})

describe('wired: PUT /api/command-centre/intent mints authority on accept', () => {
  beforeEach(() => {
    vi.mocked(getUser).mockResolvedValue({ id: FOUNDER, email: 'phill@example.com' } as never)
    vi.mocked(appendTaskEvent).mockResolvedValue(undefined as never)
  })

  it('accepting a delivery intent calls the mint with the founder and task, and reports the outcome', async () => {
    const h = harness(null, readyDelivery({ phase: 'awaiting_answers' }))
    vi.mocked(mockedGetTaskById).mockImplementation(h.deps.getTaskById as never)
    vi.mocked(saveMissionIntent).mockResolvedValue(h.row as never)

    const res = await PUT(new Request('https://app.test/api/command-centre/intent', {
      method: 'PUT',
      body: JSON.stringify({ taskId: TASK_ID, markdown: INTENT_MD }),
    }))

    expect(res.status).toBe(200)
    expect(mintAuthorityFromAcceptedIntent).toHaveBeenCalledWith(FOUNDER, TASK_ID)
    expect((await res.json()).authority).toMatchObject({ minted: false })
  })

  it('refuses to change the intent of a mission a runner is building (409, nothing saved, nothing minted)', async () => {
    const h = harness(ACCEPTED)
    await mintAuthorityFromAcceptedIntent(FOUNDER, TASK_ID, h.deps)
    h.setStatus('running')
    vi.mocked(mockedGetTaskById).mockImplementation(h.deps.getTaskById as never)
    vi.mocked(mintAuthorityFromAcceptedIntent).mockClear()

    const res = await PUT(new Request('https://app.test/api/command-centre/intent', {
      method: 'PUT',
      body: JSON.stringify({ taskId: TASK_ID, markdown: EDITED_MD }),
    }))

    expect(res.status).toBe(409)
    expect(saveMissionIntent).not.toHaveBeenCalled()
    expect(mintAuthorityFromAcceptedIntent).not.toHaveBeenCalled()
    expect(getApprovedDelivery(h.row)).not.toBeNull()
  })
})
