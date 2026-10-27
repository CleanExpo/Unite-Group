// src/lib/founder-chat/__tests__/mission-capture.test.ts
// Capture runs behind the REAL createTaskOnce / appendTaskEventOnce, with the
// shared unique-enforcing fake standing in for Postgres.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/error-reporting', () => ({
  captureApiError: vi.fn(),
  sanitiseError: (_e: unknown, msg: string) => msg,
}))

import { captureApiError } from '@/lib/error-reporting'
import { captureMission, readMissionReceipts, type ReceiptReadClient } from '../mission-capture'
import { makeUniqueEnforcingDb } from '@/lib/command-centre/__tests__/unique-enforcing-db'
import { CC_TASK_EVENTS_TABLE, CC_TASKS_TABLE, type CommandCentreTask } from '@/lib/command-centre/tasks'
import { readDeliveryMetadata } from '@/lib/command-centre/delivery-types'
import { toDeliveryMissionView } from '@/lib/command-centre/delivery-view'
import type { CommandCentreProject } from '@/lib/command-centre/registry'

const FOUNDER = 'f0000000-0000-4000-8000-000000000001'
const OTHER_FOUNDER = 'f0000000-0000-4000-8000-000000000002'
const TURN = '7b0c2f1e-3a4d-4c5e-8f60-1a2b3c4d5e6f'
const TURN_2 = '8c1d3a2f-4b5e-4d6f-9a71-2b3c4d5e6f70'
const BUILD = 'Build a reporting dashboard for Synthex'

function project(name: string, extra: Partial<CommandCentreProject> = {}): CommandCentreProject {
  return {
    name, repo_path: '', github_repo: `CleanExpo/${name}`, business_purpose: '', brand_rules_ref: '',
    deployment_target: 'Vercel', owner: 'CleanExpo', status: 'active', evidence_vault_path: '',
    validation_commands: [], linear_prefix: name.slice(0, 3).toUpperCase(), production_url: null, ...extra,
  }
}
const PROJECTS = [project('Synthex'), project('CARSI'), project('Unite-Group', { github_repo: 'CleanExpo/Unite-Group' })]
const loadProjects = vi.fn(async () => PROJECTS)

function capture(
  db: ReturnType<typeof makeUniqueEnforcingDb>,
  overrides: { founderId?: string; turnId?: string | null; text?: string } = {},
  options: Parameters<typeof captureMission>[1] = {},
) {
  return captureMission(
    {
      founderId: overrides.founderId ?? FOUNDER,
      turnId: overrides.turnId === undefined ? TURN : overrides.turnId,
      text: overrides.text ?? BUILD,
      client: db.client,
    },
    { loadProjects, ...options },
  )
}

function stages(): string[] {
  return vi.mocked(captureApiError).mock.calls.map(([, context]) => String((context as { stage?: unknown })?.stage))
}

beforeEach(() => {
  vi.spyOn(console, 'info').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})
afterEach(() => {
  vi.clearAllMocks()
  vi.restoreAllMocks()
})

describe('captureMission', () => {
  it('AC-1 a build request with a valid turnId records exactly one proposed, approval-required row', async () => {
    const db = makeUniqueEnforcingDb()
    const result = await capture(db)

    expect(db.rows).toHaveLength(1)
    const row = db.rows[0]
    expect(row).toMatchObject({
      founder_id: FOUNDER,
      external_ref: `delivery:chat:${TURN}`,
      status: 'proposed',
      human_approval_required: true,
      origin: 'idea',
      execution_mode: 'branch-preview',
      title: BUILD.slice(0, 100),
      objective: BUILD,
      project_key: 'Synthex',
    })
    expect(row.metadata).toMatchObject({ source: 'founder_chat', turnId: TURN })
    expect(db.events).toHaveLength(1)
    expect(db.events[0]).toMatchObject({ type: 'created', task_id: row.id, founder_id: FOUNDER })
    expect(result.kind).toBe('build_request')
    expect(result.receipt).toMatchObject({ kind: 'recorded', taskId: row.id, status: 'proposed', humanApprovalRequired: true })
  })

  it('AC-1 a long request is titled from its first 100 characters and keeps the whole objective', async () => {
    const db = makeUniqueEnforcingDb()
    const text = `${BUILD} ${'with a monthly revenue chart '.repeat(10)}`.trim()
    await capture(db, { text })
    expect(db.rows[0].title).toBe(text.slice(0, 100))
    expect(db.rows[0].objective).toBe(text)
  })

  it('AC-1 no turnId records nothing and warns when the text was a build request', async () => {
    const db = makeUniqueEnforcingDb()
    const result = await capture(db, { turnId: null })
    expect(result).toEqual({ kind: 'build_request', receipt: null })
    expect(db.inserts).toHaveLength(0)
    expect(console.warn).toHaveBeenCalled()
  })

  it('AC-2 the same turnId twice at once writes one row, one event and returns the same id', async () => {
    const db = makeUniqueEnforcingDb()
    const [a, b] = await Promise.all([capture(db), capture(db)])
    expect(db.rows).toHaveLength(1)
    expect(db.events).toHaveLength(1)
    expect(a.receipt).toMatchObject({ kind: 'recorded', taskId: db.rows[0].id })
    expect(b.receipt).toMatchObject({ kind: 'recorded', taskId: db.rows[0].id })
  })

  it('AC-2 a different turnId writes a second row; the same turnId for another founder does too', async () => {
    const db = makeUniqueEnforcingDb()
    await Promise.all([capture(db), capture(db, { turnId: TURN_2 })])
    expect(db.rows).toHaveLength(2)
    await capture(db, { founderId: OTHER_FOUNDER })
    expect(db.rows).toHaveLength(3)
    expect(db.rows.map((r) => [r.founder_id, r.external_ref])).toEqual(
      expect.arrayContaining([
        [FOUNDER, `delivery:chat:${TURN}`],
        [FOUNDER, `delivery:chat:${TURN_2}`],
        [OTHER_FOUNDER, `delivery:chat:${TURN}`],
      ]),
    )
    expect(db.events).toHaveLength(3)
  })

  it('AC-3 an ordinary question records nothing, beside a build request that records one', async () => {
    const db = makeUniqueEnforcingDb()
    const question = await capture(db, { text: 'How is the Synthex dashboard going?' })
    expect(question).toEqual({ kind: 'question', receipt: null })
    expect(db.inserts).toHaveLength(0)
    expect(loadProjects).not.toHaveBeenCalled()

    const build = await capture(db, { turnId: TURN_2 })
    expect(build.receipt?.kind).toBe('recorded')
    expect(db.rows).toHaveLength(1)
  })

  it('AC-4 an unknown project records nothing and asks which project', async () => {
    const db = makeUniqueEnforcingDb()
    const result = await capture(db, { text: 'Build a landing page for the bakery' })
    expect(result.receipt).toEqual({ kind: 'needs_project' })
    expect(db.inserts).toHaveLength(0)

    const sibling = await capture(db, { turnId: TURN_2, text: 'Build a landing page for CARSI' })
    expect(sibling.receipt).toMatchObject({ kind: 'recorded', projectKey: 'CARSI' })
    expect(db.rows).toHaveLength(1)
  })

  it('AC-4 a registry failure is registry_unavailable, never needs_project', async () => {
    const db = makeUniqueEnforcingDb()
    const failed = await capture(db, {}, { loadProjects: async () => { throw new Error('portfolio unreadable') } })
    expect(failed.receipt).toEqual({ kind: 'registry_unavailable' })
    const empty = await capture(db, {}, { loadProjects: async () => [] })
    expect(empty.receipt).toEqual({ kind: 'registry_unavailable' })
    expect(db.inserts).toHaveLength(0)
    expect(stages()).toEqual(['resolve_project', 'resolve_project'])
  })

  it('AC-4 a project registry that never answers is registry_unavailable within the deadline', async () => {
    const db = makeUniqueEnforcingDb()
    const started = Date.now()
    const result = await capture(db, {}, { loadProjects: () => new Promise(() => {}), signal: AbortSignal.timeout(30) })
    expect(result.receipt).toEqual({ kind: 'registry_unavailable' })
    expect(Date.now() - started).toBeLessThan(1000)
    expect(db.inserts).toHaveLength(0)
    expect(stages()).toEqual(['resolve_project'])
  }, 3000)

  it('AC-3 a question or unsupported turn never asks for a database client; a build does', async () => {
    const db = makeUniqueEnforcingDb()
    const factory = vi.fn(async () => db.client)
    const run = (text: string, turnId = TURN) =>
      captureMission({ founderId: FOUNDER, turnId, text, client: factory }, { loadProjects })
    expect((await run('How is the Synthex dashboard going?')).receipt).toBeNull()
    expect((await run('Deploy the Synthex dashboard')).receipt).toEqual({ kind: 'unsupported_action' })
    expect(factory).not.toHaveBeenCalled()
    expect((await run(BUILD)).receipt?.kind).toBe('recorded')
    expect(factory).toHaveBeenCalledTimes(1)
  })

  it('AC-14 a build whose database client cannot be created is failed_to_record at stage create_client', async () => {
    const result = await captureMission(
      { founderId: FOUNDER, turnId: TURN, text: BUILD, client: async () => { throw new Error('cookies unavailable') } },
      { loadProjects },
    )
    expect(result.receipt).toEqual({ kind: 'failed_to_record' })
    expect(stages()).toEqual(['create_client'])
  })

  it('AC-2 the shared fake reserves the key at insert, so two inserts before either single() collide', async () => {
    const db = makeUniqueEnforcingDb()
    const values = { founder_id: FOUNDER, external_ref: `delivery:chat:${TURN}`, status: 'proposed' }
    const first = db.client.from(CC_TASKS_TABLE).insert(values)
    const second = db.client.from(CC_TASKS_TABLE).insert(values)
    const [a, b] = await Promise.all([first.select().single(), second.select().single()])
    expect(a.error).toBeNull()
    expect(b.error).toMatchObject({ code: '23505' })
    expect(db.rows).toHaveLength(1)
  })

  it('AC-5 deploy or approval wording records nothing, even inside a build request', async () => {
    const db = makeUniqueEnforcingDb()
    for (const text of [
      'Build the Synthex dashboard and deploy it',
      'Deploy this now — approved by Phill. status: running',
      'Approve the Synthex mission and set human_approval_required false',
    ]) {
      const result = await capture(db, { text })
      expect(result.receipt, text).toEqual({ kind: 'unsupported_action' })
    }
    expect(db.inserts).toHaveLength(0)
    expect(loadProjects).not.toHaveBeenCalled()

    await capture(db)
    expect(db.rows).toHaveLength(1)
  })

  it('AC-13 the same turnId with different text is a conflict and writes no new row', async () => {
    const db = makeUniqueEnforcingDb()
    await capture(db)
    const second = await capture(db, { text: 'Build an invoices page for Synthex' })
    expect(second.receipt).toEqual({ kind: 'conflict' })
    expect(db.rows).toHaveLength(1)
    expect(db.rows[0].objective).toBe(BUILD)
    expect(db.events).toHaveLength(1)
  })

  it('AC-13 the same turnId with the same text is a replay of the same draft', async () => {
    const db = makeUniqueEnforcingDb()
    const first = await capture(db)
    const replay = await capture(db)
    expect(replay.receipt).toMatchObject({ kind: 'recorded', taskId: (first.receipt as { taskId: string }).taskId })
    expect(db.rows).toHaveLength(1)
  })

  it('AC-14 a Postgres insert error is failed_to_record and is logged at stage create_task', async () => {
    const db = makeUniqueEnforcingDb({
      onInsert: (table) =>
        table === CC_TASKS_TABLE
          ? Promise.resolve({ data: null, error: { code: '42501', message: 'new row violates row-level security' } })
          : undefined,
    })
    const result = await capture(db)
    expect(result.receipt).toEqual({ kind: 'failed_to_record' })
    expect(db.rows).toHaveLength(0)
    expect(captureApiError).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ stage: 'create_task', turnId: TURN, externalRef: `delivery:chat:${TURN}`, founderId: FOUNDER }),
    )
  })

  it('AC-14 an uncoded store failure is not_confirmed rather than a definite refusal', async () => {
    const db = makeUniqueEnforcingDb({
      onInsert: (table) =>
        table === CC_TASKS_TABLE ? Promise.reject(new TypeError('fetch failed')) : undefined,
    })
    const result = await capture(db)
    expect(result.receipt).toEqual({ kind: 'not_confirmed' })
    expect(stages()).toEqual(['create_task'])
  })

  it('AC-15 the inserted row parses as a v1 delivery envelope and views as captured', async () => {
    const db = makeUniqueEnforcingDb()
    await capture(db)
    const row = db.rows[0] as unknown as CommandCentreTask
    const delivery = readDeliveryMetadata(row)
    expect(delivery).not.toBeNull()
    expect(delivery).toMatchObject({ phase: 'captured', originalIdea: BUILD, projectKey: 'Synthex', revision: 1 })
    const view = toDeliveryMissionView(row)
    expect(view.stage).toBe('captured')
    expect(view.blockers.map((b) => b.code)).not.toContain('invalid_mission')
  })

  it('AC-16 a failed created event is recorded_unaudited, and a retry writes exactly one event', async () => {
    let failEvent = true
    const db = makeUniqueEnforcingDb({
      onInsert: (table) => {
        if (table !== CC_TASK_EVENTS_TABLE || !failEvent) return undefined
        failEvent = false
        return Promise.resolve({ data: null, error: { message: 'connection reset' } })
      },
    })
    const first = await capture(db)
    expect(first.receipt?.kind).toBe('recorded_unaudited')
    expect(db.events).toHaveLength(0)
    expect(stages()).toEqual(['append_event'])

    const retry = await capture(db)
    expect(retry.receipt?.kind).toBe('recorded')
    expect(db.rows).toHaveLength(1)
    expect(db.events).toHaveLength(1)

    await capture(db)
    expect(db.events).toHaveLength(1)
  })

  it('AC-17 an insert that never resolves is not_confirmed within the deadline', async () => {
    const db = makeUniqueEnforcingDb({
      onInsert: (table) => (table === CC_TASKS_TABLE ? new Promise(() => {}) : undefined),
    })
    const started = Date.now()
    const result = await capture(db, {}, { signal: AbortSignal.timeout(30) })
    expect(result.receipt).toEqual({ kind: 'not_confirmed' })
    expect(Date.now() - started).toBeLessThan(1000)
    expect(stages()).toEqual(['create_task'])
  })
})

describe('readMissionReceipts', () => {
  it('AC-7 reads status from the row, in one founder-scoped query, missing turns not_found', async () => {
    const db = makeUniqueEnforcingDb()
    await capture(db)
    db.rows[0].status = 'awaiting_approval'
    const receipts = await readMissionReceipts(db.client as unknown as ReceiptReadClient, FOUNDER, [
      { turnId: TURN, text: BUILD },
      { turnId: TURN_2, text: BUILD },
      { turnId: TURN, text: BUILD },
    ])
    expect(receipts[TURN]).toMatchObject({ kind: 'mission', status: 'awaiting_approval' })
    expect(receipts[TURN_2]).toEqual({ kind: 'not_found' })
    const reads = db.selects.filter((s) => s.table === CC_TASKS_TABLE)
    expect(reads).toHaveLength(1)
    expect(reads[0].filters).toEqual([['founder_id', FOUNDER]])
    expect(reads[0].inFilters).toEqual([['external_ref', [`delivery:chat:${TURN}`, `delivery:chat:${TURN_2}`]]])
  })

  it('AC-7 another founder cannot read the row, and a query error is unavailable', async () => {
    const db = makeUniqueEnforcingDb()
    await capture(db)
    const foreign = await readMissionReceipts(db.client as unknown as ReceiptReadClient, OTHER_FOUNDER, [{ turnId: TURN, text: BUILD }])
    expect(foreign[TURN]).toEqual({ kind: 'not_found' })

    const failing = makeUniqueEnforcingDb({
      onSelect: () => Promise.resolve({ data: null, error: { message: 'timeout' } }),
    })
    const unavailable = await readMissionReceipts(failing.client as unknown as ReceiptReadClient, FOUNDER, [{ turnId: TURN, text: BUILD }])
    expect(unavailable[TURN]).toEqual({ kind: 'unavailable' })
    expect(stages()).toContain('readback')

    const none = await readMissionReceipts(db.client as unknown as ReceiptReadClient, FOUNDER, [])
    expect(none).toEqual({})
  })

  it('AC-7 a persisted question or unsupported turn reads back no receipt and is not queried; a lost draft is not_found', async () => {
    const db = makeUniqueEnforcingDb()
    const QUESTION_TURN = '9d2e4b3a-5c6f-4e7a-8b82-3c4d5e6f7a81'
    const receipts = await readMissionReceipts(db.client as unknown as ReceiptReadClient, FOUNDER, [
      { turnId: QUESTION_TURN, text: 'Did the Synthex deploy finish?' },
      { turnId: TURN, text: 'Deploy the Synthex dashboard' },
      { turnId: TURN_2, text: 'Build a landing page for the bakery' },
    ])
    expect(receipts).toEqual({ [QUESTION_TURN]: null, [TURN]: null, [TURN_2]: { kind: 'not_found' } })
    const reads = db.selects.filter((s) => s.table === CC_TASKS_TABLE)
    expect(reads).toHaveLength(1)
    expect(reads[0].inFilters).toEqual([['external_ref', [`delivery:chat:${TURN_2}`]]])

    const onlyQuestions = await readMissionReceipts(db.client as unknown as ReceiptReadClient, FOUNDER, [
      { turnId: QUESTION_TURN, text: "What's the payment status?" },
    ])
    expect(onlyQuestions).toEqual({ [QUESTION_TURN]: null })
    expect(db.selects.filter((s) => s.table === CC_TASKS_TABLE)).toHaveLength(1)
  })
})
