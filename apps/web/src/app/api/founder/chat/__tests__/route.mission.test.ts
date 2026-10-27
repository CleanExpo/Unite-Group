// Mission Control chat W1a — route-level proof. Every POST is drained to
// [DONE] before asserting; capture runs behind the REAL createTaskOnce /
// appendTaskEventOnce with the shared unique-enforcing fake as the database.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  getUser: vi.fn(),
  createClient: vi.fn(),
}))
vi.mock('@/lib/error-reporting', () => ({
  captureApiError: vi.fn(),
  sanitiseError: (_e: unknown, msg: string) => msg,
}))
vi.mock('@/lib/ai/client', () => ({ getAIClient: vi.fn() }))
vi.mock('@/lib/site-agent/grounding', () => ({
  ground: vi.fn(),
  formatGroundingContext: vi.fn(() => ''),
}))
vi.mock('@/lib/command-centre/registry', () => ({ getProjects: vi.fn() }))

import { getUser, createClient } from '@/lib/supabase/server'
import { captureApiError } from '@/lib/error-reporting'
import { getAIClient } from '@/lib/ai/client'
import { ground } from '@/lib/site-agent/grounding'
import { getProjects, type CommandCentreProject } from '@/lib/command-centre/registry'
import { makeUniqueEnforcingDb, type UniqueEnforcingDbOptions } from '@/lib/command-centre/__tests__/unique-enforcing-db'
import { CC_TASKS_TABLE } from '@/lib/command-centre/tasks'
import { buildFounderSystemPrompt } from '@/lib/founder-chat/messages'
import { GET, POST, PUT } from '../route'

const FOUNDER = 'f0000000-0000-4000-8000-000000000001'
const SECOND_FOUNDER = 'f0000000-0000-4000-8000-000000000002'
const STRANGER = 'f0000000-0000-4000-8000-000000000003'
const TURN = '7b0c2f1e-3a4d-4c5e-8f60-1a2b3c4d5e6f'
const TURN_2 = '8c1d3a2f-4b5e-4d6f-9a71-2b3c4d5e6f70'
const TURN_3 = '9d2e4b3a-5c6f-4e7a-8b82-3c4d5e6f7a81'
const TURN_4 = 'ae3f5c4b-6d7a-4f8b-9c93-4d5e6f7a8b92'
const BUILD = 'Build a reporting dashboard for Synthex'
const QUESTION = 'How is the Synthex dashboard going?'

function project(name: string): CommandCentreProject {
  return {
    name, repo_path: '', github_repo: `CleanExpo/${name}`, business_purpose: '', brand_rules_ref: '',
    deployment_target: 'Vercel', owner: 'CleanExpo', status: 'active', evidence_vault_path: '',
    validation_commands: [], linear_prefix: name.slice(0, 3).toUpperCase(), production_url: null,
  }
}

type Frame = Record<string, unknown>

let db: ReturnType<typeof makeUniqueEnforcingDb>
let threads: Map<string, Record<string, unknown>>
let modelCreate: ReturnType<typeof vi.fn>
let selectError = false

function setup(options: UniqueEnforcingDbOptions = {}) {
  db = makeUniqueEnforcingDb({
    ...options,
    onSelect: (table) =>
      selectError && table === CC_TASKS_TABLE
        ? Promise.resolve({ data: null, error: { message: 'statement timeout' } })
        : undefined,
  })
  threads = new Map()
  const threadTable = {
    select: () => ({
      eq: (_column: string, founderId: string) => ({
        maybeSingle: async () => ({ data: threads.get(founderId) ?? null, error: null }),
      }),
    }),
    upsert: (values: Record<string, unknown>) => ({
      select: () => ({
        single: async () => {
          const stored = structuredClone(values)
          threads.set(values.founder_id as string, stored)
          return { data: stored, error: null }
        },
      }),
    }),
  }
  vi.mocked(createClient).mockImplementation(async () =>
    ({ from: (table: string) => (table === 'founder_chat_threads' ? threadTable : db.client.from(table)) }) as never,
  )
}

function asUser(id: string) {
  vi.mocked(getUser).mockResolvedValue({ id, email: `${id}@example.test` } as never)
}

function post(body: Record<string, unknown>) {
  return POST(
    new Request('https://unit.test/api/founder/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  )
}

function turn(text: string, turnId: string | null = TURN, extra: Record<string, unknown> = {}) {
  return { messages: [{ role: 'user', content: text }], ...(turnId ? { turnId } : {}), ...extra }
}

/** Drain the whole SSE body to [DONE] and return the parsed frames. */
async function drain(res: Response): Promise<Frame[]> {
  const text = await res.text()
  const payloads = text
    .split('\n\n')
    .filter((segment) => segment.startsWith('data: '))
    .map((segment) => segment.slice('data: '.length))
  expect(payloads.at(-1)).toBe('[DONE]')
  return payloads.slice(0, -1).map((payload) => JSON.parse(payload) as Frame)
}

function cc(): Array<Record<string, unknown>> {
  return db.rows
}

function stages(): string[] {
  return vi.mocked(captureApiError).mock.calls.map(([, context]) => String((context as { stage?: unknown })?.stage))
}

beforeEach(() => {
  vi.clearAllMocks()
  selectError = false
  vi.stubEnv('FOUNDER_ALLOWED_USER_IDS', `${FOUNDER},${SECOND_FOUNDER}`)
  vi.stubEnv('FOUNDER_ALLOWED_EMAILS', '')
  vi.spyOn(console, 'info').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.mocked(getProjects).mockResolvedValue([project('Synthex'), project('CARSI')])
  modelCreate = vi.fn(async () =>
    (async function* () {
      yield { type: 'content_block_delta', delta: { type: 'text_delta', text: 'On ' } }
      yield { type: 'content_block_delta', delta: { type: 'text_delta', text: 'it.' } }
    })(),
  )
  vi.mocked(getAIClient).mockReturnValue({ messages: { create: modelCreate } } as never)
  asUser(FOUNDER)
  setup()
})
afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('POST /api/founder/chat — mission capture', () => {
  it('AC-1 a build request with a turnId records one proposed, approval-required row and streams its receipt first', async () => {
    const frames = await drain(await post(turn(BUILD)))
    expect(cc()).toHaveLength(1)
    expect(cc()[0]).toMatchObject({
      founder_id: FOUNDER,
      external_ref: `delivery:chat:${TURN}`,
      status: 'proposed',
      human_approval_required: true,
      project_key: 'Synthex',
    })
    expect(db.events).toHaveLength(1)
    expect(frames[0]).toEqual({
      mission: expect.objectContaining({ kind: 'recorded', taskId: cc()[0].id, status: 'proposed' }),
    })
    expect(frames.slice(1)).toEqual([{ delta: 'On ' }, { delta: 'it.' }])
  })

  it('AC-2 the same turnId posted twice at once writes one row and both receipts name it', async () => {
    const [a, b] = await Promise.all([post(turn(BUILD)), post(turn(BUILD))])
    const [fa, fb] = await Promise.all([drain(a), drain(b)])
    expect(cc()).toHaveLength(1)
    expect(db.events).toHaveLength(1)
    expect(fa[0].mission).toMatchObject({ kind: 'recorded', taskId: cc()[0].id })
    expect(fb[0].mission).toMatchObject({ kind: 'recorded', taskId: cc()[0].id })
  })

  it('AC-2 a different turnId, or the same turnId from another founder, writes its own row', async () => {
    await drain(await post(turn(BUILD)))
    await drain(await post(turn(BUILD, TURN_2)))
    asUser(SECOND_FOUNDER)
    await drain(await post(turn(BUILD)))
    expect(cc()).toHaveLength(3)
    expect(cc().filter((r) => r.external_ref === `delivery:chat:${TURN}`).map((r) => r.founder_id)).toEqual([
      FOUNDER,
      SECOND_FOUNDER,
    ])
  })

  it('AC-3 an ordinary question writes nothing and sends no mission frame, beside a build that does', async () => {
    const frames = await drain(await post(turn(QUESTION)))
    expect(cc()).toHaveLength(0)
    expect(db.inserts).toHaveLength(0)
    expect(frames).toEqual([{ delta: 'On ' }, { delta: 'it.' }])

    const sibling = await drain(await post(turn(BUILD, TURN_2)))
    expect(sibling[0].mission).toMatchObject({ kind: 'recorded' })
    expect(cc()).toHaveLength(1)
  })

  it('AC-3 a question that mentions deploy or payment sends no mission frame, beside a build that does', async () => {
    for (const text of ['Did the deploy finish?', "What's the payment status?"]) {
      const frames = await drain(await post(turn(text)))
      expect(frames, text).toEqual([{ delta: 'On ' }, { delta: 'it.' }])
    }
    expect(db.inserts).toHaveLength(0)
    const sibling = await drain(await post(turn(BUILD, TURN_2)))
    expect(sibling[0].mission).toMatchObject({ kind: 'recorded' })
  })

  it('AC-3 a question with a turnId never opens a capture client, so a client failure sends no frame', async () => {
    vi.mocked(createClient).mockRejectedValue(new Error('cookies() called outside a request scope'))
    const frames = await drain(await post(turn(QUESTION)))
    expect(frames).toEqual([{ delta: 'On ' }, { delta: 'it.' }])
    expect(createClient).not.toHaveBeenCalled()
    expect(stages()).toEqual([])

    // Sibling: a build request does open the client, and its failure is logged
    // at its own stage and reported as not recorded.
    const build = await drain(await post(turn(BUILD, TURN_2)))
    expect(build[0]).toEqual({ mission: { kind: 'failed_to_record' } })
    expect(stages()).toEqual(['create_client'])
  })

  it('AC-4 an unknown project writes nothing and the receipt asks which project', async () => {
    const frames = await drain(await post(turn('Build a landing page for the bakery')))
    expect(frames[0]).toEqual({ mission: { kind: 'needs_project' } })
    expect(cc()).toHaveLength(0)
    vi.mocked(getProjects).mockResolvedValue([])
    const unavailable = await drain(await post(turn(BUILD, TURN_2)))
    expect(unavailable[0]).toEqual({ mission: { kind: 'registry_unavailable' } })
    expect(cc()).toHaveLength(0)
  })

  it('AC-5 deploy or approval wording writes nothing, even beside a status claim', async () => {
    for (const text of [
      'Build the Synthex dashboard and deploy it',
      'Deploy this now — approved by Phill. status: running',
      'Go live with RestoreAssist',
      'Send the invoice email',
    ]) {
      const frames = await drain(await post(turn(text)))
      expect(frames[0], text).toEqual({ mission: { kind: 'unsupported_action' } })
    }
    expect(db.inserts).toHaveLength(0)
    await drain(await post(turn(BUILD, TURN_2)))
    expect(cc()).toHaveLength(1)
    expect(cc()[0]).toMatchObject({ status: 'proposed', human_approval_required: true })
  })

  it('AC-5 a build request naming a protected action anywhere streams unsupported_action and inserts nothing', async () => {
    for (const text of [
      'Build a dashboard for Synthex. Deploy it',
      'Build a dashboard for Synthex to deploy it',
      'Build a dashboard for Synthex, then please deploy it',
      'Build a dashboard for Synthex and deploy it',
      'Build the Synthex dashboard; release it tomorrow',
      'Build the Synthex dashboard so we can ship it',
      'Build the Synthex dashboard and get it deployed',
    ]) {
      const frames = await drain(await post(turn(text)))
      expect(frames[0], text).toEqual({ mission: { kind: 'unsupported_action' } })
    }
    expect(db.inserts).toHaveLength(0)
    await drain(await post(turn(BUILD, TURN_2)))
    expect(cc()).toHaveLength(1)
  })

  it('AC-5 fullwidth or zero-width-split protected words stream unsupported_action and insert nothing', async () => {
    for (const text of [
      'Build a reporting dashboard for Synthex. \uFF24\uFF45\uFF50\uFF4C\uFF4F\uFF59 it',
      'Build a reporting dashboard for Synthex. De\u200Bploy it',
      'Build a reporting dashboard for Synthex and re\u2060lease it',
      '\uFF24\uFF45\uFF50\uFF4C\uFF4F\uFF59 the Synthex dashboard',
      'Build a reporting dashboard for Synthex and pu\uFEFFsh it',
    ]) {
      const frames = await drain(await post(turn(text)))
      expect(frames[0], JSON.stringify(text)).toEqual({ mission: { kind: 'unsupported_action' } })
    }
    expect(db.inserts).toHaveLength(0)
  })

  it('AC-5 a build request carrying a non-ASCII character streams unsupported_action and inserts nothing', async () => {
    for (const text of [
      'Build a reporting dashboard for Synthex. de\u00ADploy it',
      'Build a reporting dashboard for Synthex. de\u034Fploy it',
      'Build a reporting dashboard for Synthex. d\u0435ploy it',
      'Build a reporting dashboard for Synthex. depl\u03BFy it',
      'Build a reporting dashboard for Synthex. de\u0301ploy it',
      'Build a reporting dashboard for Synthex \u{1F680}',
    ]) {
      const frames = await drain(await post(turn(text)))
      expect(frames[0], JSON.stringify(text)).toEqual({ mission: { kind: 'unsupported_action' } })
    }
    expect(db.inserts).toHaveLength(0)
    const emDashed = await drain(await post(turn('Build a reporting dashboard for Synthex \u2014 monthly view', TURN_2)))
    expect(emDashed[0].mission).toMatchObject({ kind: 'recorded' })
  })

  it('AC-5 a protected verb disguised by hyphens, punctuation or spacing streams unsupported_action and inserts nothing', async () => {
    for (const text of [
      'Build a reporting dashboard for Synthex and go-live with it',
      'Build a reporting dashboard for Synthex and roll-back the deployment',
      'Build a reporting dashboard for Synthex and de\u2019ploy it',
      'Build a reporting dashboard for Synthex and de\u2014ploy it',
      'Build a reporting dashboard for Synthex and de\u2026ploy it',
      "Build a reporting dashboard for Synthex and de'ploy it",
      'Build a reporting dashboard for Synthex and de-ploy it',
      'Build a reporting dashboard for Synthex and d e p l o y it',
      'Build a reporting dashboard for Synthex and de_ploy it',
      'Build a reporting dashboard for Synthex and re-lease it',
      'Build a reporting dashboard for Synthex and p.u.s.h it live',
    ]) {
      const frames = await drain(await post(turn(text)))
      expect(frames[0], JSON.stringify(text)).toEqual({ mission: { kind: 'unsupported_action' } })
    }
    expect(db.inserts).toHaveLength(0)
    const signUp = await drain(await post(turn('Build a sign-up form for CARSI', TURN_2)))
    expect(signUp[0].mission).toMatchObject({ kind: 'recorded' })
  })

  it('AC-6 no session is 401 and a session off the allow-list is 403, with no task in either', async () => {
    vi.mocked(getUser).mockResolvedValue(null as never)
    const unauthorised = await post(turn(BUILD))
    expect(unauthorised.status).toBe(401)

    asUser(STRANGER)
    const forbidden = await post(turn(BUILD))
    expect(forbidden.status).toBe(403)
    expect(db.inserts).toHaveLength(0)
    expect(modelCreate).not.toHaveBeenCalled()

    // Sibling: the allow-listed founder with the same body does record one.
    asUser(FOUNDER)
    await drain(await post(turn(BUILD)))
    expect(cc()).toHaveLength(1)
  })

  it('AC-6 GET and PUT off the allow-list are 403 and touch no table, beside an allow-listed founder who can', async () => {
    asUser(STRANGER)
    const get = await GET()
    expect(get.status).toBe(403)
    expect(await get.json()).toEqual({ error: 'Forbidden' })
    const put = await PUT(
      new Request('https://unit.test/api/founder/chat', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: 'hi' }], businessKey: null }),
      }),
    )
    expect(put.status).toBe(403)
    expect(await put.json()).toEqual({ error: 'Forbidden' })
    expect(createClient).not.toHaveBeenCalled()
    expect(threads.size).toBe(0)

    asUser(FOUNDER)
    expect((await GET()).status).toBe(200)
  })

  it('AC-18 a 503 or a grounding failure returns a fixed message and logs the raw error server-side', async () => {
    vi.mocked(getAIClient).mockImplementationOnce(() => {
      throw new Error('ANTHROPIC_API_KEY missing in /var/task/.env')
    })
    const unavailable = await post(turn(BUILD))
    expect(unavailable.status).toBe(503)
    const unavailableBody = JSON.stringify(await unavailable.json())
    expect(unavailableBody).not.toContain('ANTHROPIC_API_KEY')
    expect(unavailableBody).not.toContain('/var/task')

    vi.mocked(ground).mockRejectedValueOnce(new Error('relation "businesses" does not exist at 10.0.0.4'))
    const failed = await post(turn(BUILD, TURN, { businessKey: 'carsi' }))
    expect(failed.status).toBe(500)
    const failedBody = JSON.stringify(await failed.json())
    expect(failedBody).not.toContain('businesses')
    expect(failedBody).not.toContain('10.0.0.4')

    expect(stages()).toEqual(['ai_client', 'grounding'])
    expect(db.inserts).toHaveLength(0)
  })

  it('AC-13 the same turnId with different text is a conflict frame and no new row', async () => {
    await drain(await post(turn(BUILD)))
    const frames = await drain(await post(turn('Build an invoices page for Synthex')))
    expect(frames[0]).toEqual({ mission: { kind: 'conflict' } })
    expect(cc()).toHaveLength(1)
  })

  it('AC-14 an insert error is failed_to_record, logged at create_task, and the answer still streams', async () => {
    setup({
      onInsert: (table) =>
        table === CC_TASKS_TABLE
          ? Promise.resolve({ data: null, error: { code: '23502', message: 'null value in column' } })
          : undefined,
    })
    const frames = await drain(await post(turn(BUILD)))
    expect(frames[0]).toEqual({ mission: { kind: 'failed_to_record' } })
    expect(frames.slice(1)).toEqual([{ delta: 'On ' }, { delta: 'it.' }])
    expect(stages()).toContain('create_task')
    expect(cc()).toHaveLength(0)
  })

  it('AC-14 a model failure is logged server-side and the founder gets a sanitised terminal message', async () => {
    modelCreate.mockRejectedValueOnce(new Error('upstream 529 overloaded at 10.0.0.4'))
    const frames = await drain(await post(turn(BUILD)))
    expect(frames[0].mission).toMatchObject({ kind: 'recorded' })
    expect(frames[1]).toEqual({ error: 'The answer stopped before it finished. Try again.' })
    expect(stages()).toContain('stream')
  })

  it('AC-16 a failed created event streams recorded_unaudited; the retry records the one event', async () => {
    let failEvent = true
    setup({
      onInsert: (table) => {
        if (table !== 'cc_task_events' || !failEvent) return undefined
        failEvent = false
        return Promise.resolve({ data: null, error: { message: 'connection reset' } })
      },
    })
    const first = await drain(await post(turn(BUILD)))
    expect(first[0].mission).toMatchObject({ kind: 'recorded_unaudited' })
    expect(stages()).toContain('append_event')
    const retry = await drain(await post(turn(BUILD)))
    expect(retry[0].mission).toMatchObject({ kind: 'recorded' })
    expect(cc()).toHaveLength(1)
    expect(db.events).toHaveLength(1)
  })

  it('AC-17 an insert that never resolves is not_confirmed within the deadline and the answer streams', async () => {
    const realTimeout = AbortSignal.timeout.bind(AbortSignal)
    vi.spyOn(AbortSignal, 'timeout').mockImplementation(() => realTimeout(30))
    setup({ onInsert: (table) => (table === CC_TASKS_TABLE ? new Promise(() => {}) : undefined) })
    const started = Date.now()
    const frames = await drain(await post(turn(BUILD)))
    expect(Date.now() - started).toBeLessThan(2000)
    expect(frames[0]).toEqual({ mission: { kind: 'not_confirmed' } })
    expect(frames.slice(1)).toEqual([{ delta: 'On ' }, { delta: 'it.' }])
  })

  it('AC-18 frame[0] is the receipt alone and the model is called once with unchanged system and messages', async () => {
    const history = [
      { role: 'assistant', content: 'Earlier answer' },
      { role: 'user', content: 'Earlier question', turnId: TURN_2 },
      { role: 'assistant', content: 'Reply' },
      { role: 'user', content: BUILD },
    ]
    const frames = await drain(await post({ messages: history, turnId: TURN }))
    expect(Object.keys(frames[0])).toEqual(['mission'])
    expect(frames.filter((f) => 'mission' in f)).toHaveLength(1)
    expect(modelCreate).toHaveBeenCalledTimes(1)
    const call = modelCreate.mock.calls[0][0] as { system: string; messages: unknown[] }
    expect(call.system).toBe(buildFounderSystemPrompt(null, ''))
    expect(call.messages).toEqual([
      { role: 'user', content: 'Earlier question' },
      { role: 'assistant', content: 'Reply' },
      { role: 'user', content: BUILD },
    ])
    expect(cc()).toHaveLength(1)
  })

  it('AC-18 no row when the request returns 400, 503 or 404 before the stream', async () => {
    const badTurn = await post(turn(BUILD, 'not-a-uuid'))
    expect(badTurn.status).toBe(400)

    vi.mocked(getAIClient).mockImplementationOnce(() => {
      throw new Error('ANTHROPIC_API_KEY missing')
    })
    expect((await post(turn(BUILD))).status).toBe(503)

    vi.mocked(ground).mockResolvedValueOnce({ businessName: null, snippets: [], source: 'off' } as never)
    expect((await post(turn(BUILD, TURN, { businessKey: 'nope' }))).status).toBe(404)

    expect(db.inserts).toHaveLength(0)
    expect(modelCreate).not.toHaveBeenCalled()
  })

  it('AC-18 without a turnId nothing is recorded and no mission frame is sent', async () => {
    const frames = await drain(await post(turn(BUILD, null)))
    expect(frames).toEqual([{ delta: 'On ' }, { delta: 'it.' }])
    expect(db.inserts).toHaveLength(0)
  })
})

describe('GET/PUT /api/founder/chat — receipt readback', () => {
  async function put(messages: unknown[]) {
    return PUT(
      new Request('https://unit.test/api/founder/chat', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages, businessKey: null }),
      }),
    )
  }

  it('AC-7 GET reads status from the cc_tasks row now, not from what was captured or stored', async () => {
    const frames = await drain(await post(turn(BUILD)))
    expect(frames[0].mission).toMatchObject({ status: 'proposed' })
    cc()[0].status = 'awaiting_approval'
    await put([
      { role: 'user', content: BUILD, turnId: TURN, mission: { kind: 'recorded', status: 'proposed' }, status: 'proposed' },
      { role: 'assistant', content: 'On it.' },
      { role: 'user', content: 'Build a page for nobody', turnId: TURN_2 },
      { role: 'assistant', content: 'Which project?' },
      { role: 'user', content: 'Did the deploy finish?', turnId: TURN_3 },
      { role: 'assistant', content: 'Yes.' },
      { role: 'user', content: 'Deploy the Synthex dashboard', turnId: TURN_4 },
    ])
    const selectsBefore = db.selects.filter((s) => s.table === CC_TASKS_TABLE).length

    const body = await (await GET()).json()
    expect(body.receipts[TURN]).toMatchObject({ kind: 'mission', status: 'awaiting_approval', taskId: cc()[0].id })
    expect(body.receipts[TURN_2]).toEqual({ kind: 'not_found' })
    // A question or an unsupported action never owed a draft: no receipt, not not_found.
    expect(body.receipts[TURN_3]).toBeNull()
    expect(body.receipts[TURN_4]).toBeNull()
    const reads = db.selects.filter((s) => s.table === CC_TASKS_TABLE).slice(selectsBefore)
    expect(reads).toHaveLength(1)
    expect(reads[0].filters).toEqual([['founder_id', FOUNDER]])
  })

  it('AC-7 a recorded draft still reads back after PUT edits its turn text into a question', async () => {
    await drain(await post(turn(BUILD)))
    expect(cc()).toHaveLength(1)
    await put([{ role: 'user', content: 'What happened?', turnId: TURN }])
    const body = await (await GET()).json()
    expect(body.receipts[TURN]).toMatchObject({ kind: 'mission', taskId: cc()[0].id, status: 'proposed' })
  })

  it('AC-7 another founder sees not_found for a foreign turnId, and a failed read is unavailable', async () => {
    await drain(await post(turn(BUILD)))
    asUser(SECOND_FOUNDER)
    await put([{ role: 'user', content: BUILD, turnId: TURN }])
    expect((await (await GET()).json()).receipts).toEqual({ [TURN]: { kind: 'not_found' } })

    selectError = true
    expect((await (await GET()).json()).receipts).toEqual({ [TURN]: { kind: 'unavailable' } })
    expect(stages()).toContain('readback')
  })

  it('AC-19 PUT then GET keeps turnId, drops forged status and title and malformed turnIds, and old threads load', async () => {
    const res = await put([
      { role: 'user', content: BUILD, turnId: TURN, status: 'running', title: 'Forged' },
      { role: 'assistant', content: 'On it.', status: 'done' },
      { role: 'user', content: 'Another', turnId: 'garbage' },
    ])
    expect(res.status).toBe(200)
    const stored = threads.get(FOUNDER)?.messages
    expect(stored).toEqual([
      { role: 'user', content: BUILD, turnId: TURN },
      { role: 'assistant', content: 'On it.' },
      { role: 'user', content: 'Another' },
    ])
    const body = await (await GET()).json()
    expect(body.messages).toEqual(stored)
    expect(body.receipts).toEqual({ [TURN]: { kind: 'not_found' } })

    threads.set(FOUNDER, { messages: [{ role: 'user', content: 'old shape' }], business_key: null, updated_at: null })
    const old = await (await GET()).json()
    expect(old.messages).toEqual([{ role: 'user', content: 'old shape' }])
    expect(old.receipts).toEqual({})
  })
})
