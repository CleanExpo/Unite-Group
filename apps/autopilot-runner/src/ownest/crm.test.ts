import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  appendEvidence,
  appendTaskEvent,
  compareAndSetTask,
  countDailyClaims,
  countRolloutClaims,
  createCrmClient,
  getOwnedTask,
  listCandidateTasks,
  listManagedTasks,
  listMirroredTasks,
  loadOwnestConfig,
} from './crm.js'
import {
  buildMissionContract,
  deterministicUuid,
  idempotencyKey,
  sha256Digest,
} from './policy.js'
import type {
  CcTask,
  CrmDeps,
  HermesTask,
  OwnestCompletionReceiptV1,
  OwnestConfig,
  OwnestMissionContractV1,
} from './types.js'

const TASK_COLUMNS = [
  'id',
  'founder_id',
  'title',
  'objective',
  'priority',
  'status',
  'agent_owner',
  'risk_level',
  'execution_mode',
  'dependencies',
  'human_approval_required',
  'validation_required',
  'metadata',
  'created_at',
  'updated_at',
].join(',')

const serviceRoleKey = 'service-role-secret-DO-NOT-LEAK'

const config: OwnestConfig = {
  supabaseUrl: 'https://example.supabase.co',
  serviceRoleKey,
  founderId: 'founder-1',
  workerId: 'ownest-worker-1',
  hermesCwd: '/tmp/hermes-workspace',
  hermesProfile: 'ownest',
  hermesBoard: 'unite-group-ownest',
  rolloutId: null,
  canaryTaskId: null,
  live: false,
  canaryLimit: 1,
  maxInProgress: 1,
  leaseMs: 300_000,
  dailyDispatchLimit: 3,
}

const artifactConfig: OwnestConfig = {
  ...config,
  rolloutId: 'rollout-2026-07-12',
  canaryTaskId: 'task-1',
}

const expectedUpdatedAt = '2026-07-12T00:00:00.000Z'
const completionNowIso = '2026-07-12T00:04:00.000Z'

const validEnv: NodeJS.ProcessEnv = {
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey,
  FOUNDER_USER_ID: 'founder-1',
  CC_OWNEST_WORKER_ID: 'ownest-worker-1',
}

function ownestState(taskId: string, hermesTaskId: string | null = 'hermes-1') {
  return {
    version: 1,
    crmTaskId: taskId,
    idempotencyKey: `cc-task:${taskId}:v1`,
    hermesTaskId,
    attemptId: 'attempt-1',
    leaseOwner: 'ownest-worker-1',
    leaseExpiresAt: '2026-07-12T00:05:00.000Z',
    lastHeartbeatAt: '2026-07-12T00:00:00.000Z',
    dispatchedAt: '2026-07-12T00:00:00.000Z',
    reconciledAt: null,
    evidenceUri: null,
    gateState: 'eligible',
    lastError: null,
  }
}

function hardenedOwnestState(taskId: string, hermesTaskId: string | null = null) {
  return {
    ...ownestState(taskId, hermesTaskId),
    idempotencyKey: idempotencyKey(
      taskId,
      'rollout-2026-07-12',
      'attempt-1',
      'ownest',
      'unite-group-ownest',
    ),
    claimedAt: '2026-07-12T00:00:00.000Z',
    rolloutId: 'rollout-2026-07-12',
    hermesProfile: 'ownest',
    hermesBoard: 'unite-group-ownest',
    integrityNonce: '000102030405060708090a0b0c0d0e0f'.repeat(2),
    missionDigest: `hmac-sha256:${'b'.repeat(64)}`,
    failureCount: 0,
    failureClass: null,
    failureCode: null,
    nextRetryAt: null,
    completionPhase: 'claimed',
    receiptSha256: null,
    cancelRequestedAt: null,
    cancelReason: null,
    stopPhase: null,
  }
}

function task(overrides: Partial<CcTask> = {}): CcTask {
  return {
    id: 'task-1',
    founder_id: config.founderId,
    title: 'Research customer retention patterns',
    objective: 'Prepare an internal advisory brief with cited evidence.',
    priority: 'P2',
    status: 'queued',
    agent_owner: 'Hermes',
    risk_level: 'low',
    execution_mode: 'advisory',
    dependencies: [],
    human_approval_required: false,
    validation_required: ['Cite the source data'],
    metadata: {},
    created_at: '2026-07-12T00:00:00.000Z',
    updated_at: '2026-07-12T00:00:00.000Z',
    ...overrides,
  }
}

interface CompletionFixture {
  freshTask: CcTask
  expectedContract: OwnestMissionContractV1
  completion: HermesTask
}

function completionFixture(): CompletionFixture {
  const integrityNonce = '000102030405060708090a0b0c0d0e0f'.repeat(2) as never
  const missionTask = task({
    status: 'running',
    validation_required: ['Cite the source data', 'Explain material uncertainty'],
  })
  const expectedContract = buildMissionContract(
    missionTask,
    'attempt-1',
    'rollout-2026-07-12',
    integrityNonce,
    artifactConfig.hermesProfile,
    artifactConfig.hermesBoard,
  )
  const receipt: OwnestCompletionReceiptV1 = {
    schema: 'ownest.completion.v1',
    crmTaskId: missionTask.id,
    hermesTaskId: 'hermes-1',
    attemptId: expectedContract.attemptId,
    rolloutId: expectedContract.rolloutId,
    missionDigest: expectedContract.missionDigest,
    verdict: 'passed',
    evidence: [
      {
        id: 'ev-001',
        kind: 'research',
        uri: 'https://evidence.example.com/reports/retention',
        digest: sha256Digest('retention-evidence'),
      },
    ],
    validationResults: expectedContract.validationRequirements.map((requirement) => ({
      requirementId: requirement.id,
      requirementDigest: requirement.digest,
      status: 'passed',
      evidenceIds: ['ev-001'],
    })),
  }
  const receiptSha256 = sha256Digest(JSON.stringify(receipt))
  const completion: HermesTask = {
    id: 'hermes-1',
    status: 'done',
    title: missionTask.title,
    assignee: 'ownest',
    idempotencyKey: null,
    summary: 'Completed the retention evidence brief.',
    runId: 7,
    completedAt: '2026-07-14T03:35:20.000Z',
    receipt,
    receiptSha256,
    latestRun: {
      id: 7,
      profile: 'ownest',
      status: 'done',
      outcome: 'completed',
      summary: 'Completed the retention evidence brief.',
      error: null,
      metadata: null,
      workerPid: 4321,
      startedAt: 1_784_000_000,
      endedAt: 1_784_000_120,
    },
    evidenceUri: 'hermes-kanban:/boards/unite-group-ownest/tasks/hermes-1/runs/7',
    error: null,
  }
  const state = {
    ...hardenedOwnestState(missionTask.id, completion.id),
    idempotencyKey: expectedContract.idempotencyKey,
    missionDigest: expectedContract.missionDigest,
    completionPhase: 'receipt_validated' as const,
    receiptSha256,
  }
  return {
    freshTask: { ...missionTask, metadata: { ownest: state } },
    expectedContract,
    completion,
  }
}

function artifactId(fixture: CompletionFixture, kind: string): string {
  return deterministicUuid(
    'ownest.completion.artifact.v1',
    artifactConfig.founderId,
    fixture.freshTask.id,
    fixture.expectedContract.attemptId,
    fixture.expectedContract.rolloutId,
    kind,
  )
}

function expectedArtifactRows(fixture: CompletionFixture) {
  const receipt = fixture.completion.receipt
  if (!receipt || !fixture.completion.evidenceUri || !fixture.completion.completedAt) {
    throw new Error('completion fixture is incomplete')
  }
  const validationRunIds = fixture.expectedContract.validationRequirements.map((requirement) =>
    artifactId(fixture, `validation:${requirement.id}`),
  )
  const evidenceRecordId = artifactId(fixture, 'evidence')
  const evidenceAddedEventId = artifactId(fixture, 'event:evidence_added')
  const completionEventId = artifactId(fixture, 'event:completed')
  const evidenceById = new Map(receipt.evidence.map((item) => [item.id, item]))
  const validationRows = receipt.validationResults.map((result, index) => ({
    id: validationRunIds[index],
    founder_id: artifactConfig.founderId,
    task_id: fixture.freshTask.id,
    gate: `ownest:${result.requirementId}:${result.requirementDigest}`,
    command: null,
    result: 'pass',
    evidence_path: evidenceById.get(result.evidenceIds[0] ?? '')?.uri ?? null,
    ran_at: fixture.completion.completedAt,
  }))
  const evidenceRow = {
    id: evidenceRecordId,
    founder_id: artifactConfig.founderId,
    task_id: fixture.freshTask.id,
    kind: 'validation',
    wiki_path: fixture.completion.evidenceUri,
    sources: receipt.evidence,
    confidence: 'high',
    created_at: fixture.completion.completedAt,
  }
  const sharedPayload = {
    schema: 'ownest.completion-artifacts.v1',
    taskId: fixture.freshTask.id,
    hermesTaskId: fixture.completion.id,
    attemptId: fixture.expectedContract.attemptId,
    rolloutId: fixture.expectedContract.rolloutId,
    receiptSha256: fixture.completion.receiptSha256,
    validationRunIds,
    evidenceRecordId,
    evidenceUri: fixture.completion.evidenceUri,
  }
  const evidenceEventRow = {
    id: evidenceAddedEventId,
    founder_id: artifactConfig.founderId,
    task_id: fixture.freshTask.id,
    type: 'evidence_added',
    actor: artifactConfig.workerId,
    payload: { ...sharedPayload, evidenceCount: receipt.evidence.length },
    at: fixture.completion.completedAt,
  }
  const completionEventRow = {
    id: completionEventId,
    founder_id: artifactConfig.founderId,
    task_id: fixture.freshTask.id,
    type: 'completed',
    actor: artifactConfig.workerId,
    payload: {
      ...sharedPayload,
      runId: fixture.completion.runId,
      completedAt: fixture.completion.completedAt,
    },
    at: fixture.completion.completedAt,
  }
  return {
    result: { validationRunIds, evidenceRecordId, evidenceAddedEventId, completionEventId },
    validationRows,
    evidenceRow,
    evidenceEventRow,
    completionEventRow,
  }
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

function countResponse(contentRange?: string, status = 206): Response {
  return new Response(null, {
    status,
    headers: contentRange === undefined ? undefined : { 'content-range': contentRange },
  })
}

function streamingResponse(body: string, status = 200): {
  response: Response
  wasCancelled: () => boolean
} {
  const bytes = new TextEncoder().encode(body)
  let offset = 0
  let cancelled = false
  const stream = new ReadableStream<Uint8Array>({
    pull(controller) {
      const nextOffset = Math.min(offset + 8 * 1024, bytes.byteLength)
      controller.enqueue(bytes.subarray(offset, nextOffset))
      offset = nextOffset
      if (offset === bytes.byteLength) controller.close()
    },
    cancel() {
      cancelled = true
    },
  })

  return {
    response: new Response(stream, { status, headers: { 'content-type': 'application/json' } }),
    wasCancelled: () => cancelled,
  }
}

function mockFetch(response: Response = jsonResponse([])) {
  return vi.fn<typeof fetch>().mockResolvedValue(response)
}

function deps(fetchImpl: typeof fetch): CrmDeps {
  return { fetch: fetchImpl }
}

function firstRequest(fetchImpl: ReturnType<typeof mockFetch>): {
  url: URL
  init: RequestInit
} {
  const call = fetchImpl.mock.calls[0]
  if (!call) throw new Error('fetch was not called')
  return { url: new URL(String(call[0])), init: call[1] ?? {} }
}

function requestBody(init: RequestInit): Record<string, unknown> {
  if (typeof init.body !== 'string') throw new Error('request body was not JSON text')
  return JSON.parse(init.body) as Record<string, unknown>
}

const ARTIFACT_TABLES = [
  'cc_validation_runs',
  'cc_evidence_records',
  'cc_task_events',
] as const

type ArtifactTable = (typeof ARTIFACT_TABLES)[number]
type ArtifactStore = Record<ArtifactTable, Map<string, Record<string, unknown>>>

function completionArtifactApi(
  freshTask: CcTask,
  options: {
    initial?: Partial<Record<ArtifactTable, readonly Record<string, unknown>[]>>
    failOnce?: (table: ArtifactTable, row: Record<string, unknown>) => boolean
    taskReads?: readonly CcTask[]
  } = {},
): { fetchImpl: ReturnType<typeof mockFetch>; store: ArtifactStore } {
  const store = Object.fromEntries(
    ARTIFACT_TABLES.map((table) => [
      table,
      new Map(
        (options.initial?.[table] ?? []).map((row) => {
          if (typeof row.id !== 'string') throw new Error('initial artifact requires an id')
          return [row.id, structuredClone(row)]
        }),
      ),
    ]),
  ) as ArtifactStore
  let failureConsumed = false
  let taskReadIndex = 0
  const fetchImpl = vi.fn<typeof fetch>().mockImplementation(async (input, init) => {
    const url = new URL(String(input))
    const table = url.pathname.split('/').at(-1)
    const method = init?.method ?? 'GET'
    if (table === 'cc_tasks' && method === 'GET') {
      const configuredTaskReads = options.taskReads ?? []
      const taskForRead =
        configuredTaskReads[Math.min(taskReadIndex, configuredTaskReads.length - 1)] ?? freshTask
      taskReadIndex += 1
      return jsonResponse([taskForRead])
    }
    if (!ARTIFACT_TABLES.includes(table as ArtifactTable)) {
      throw new Error(`unexpected artifact table ${String(table)}`)
    }
    const artifactTable = table as ArtifactTable
    if (method === 'POST') {
      const row = requestBody(init ?? {})
      if (!failureConsumed && options.failOnce?.(artifactTable, row)) {
        failureConsumed = true
        return new Response(
          `${serviceRoleKey} token=artifact-secret owner@example.com ${'x'.repeat(1_200)}`,
          { status: 500 },
        )
      }
      if (typeof row.id !== 'string') throw new Error('artifact insert requires an id')
      if (!store[artifactTable].has(row.id)) {
        store[artifactTable].set(row.id, structuredClone(row))
      }
      return new Response(null, { status: 201 })
    }
    if (method === 'GET') {
      const idFilter = url.searchParams.get('id')
      const founderFilter = url.searchParams.get('founder_id')
      const id = idFilter?.startsWith('eq.') ? idFilter.slice(3) : null
      const founderId = founderFilter?.startsWith('eq.') ? founderFilter.slice(3) : null
      const row = id ? store[artifactTable].get(id) : undefined
      return jsonResponse(row && row.founder_id === founderId ? [row] : [])
    }
    throw new Error(`unexpected artifact method ${method}`)
  }) as ReturnType<typeof mockFetch>
  return { fetchImpl, store }
}

async function capturedError(run: () => Promise<unknown>): Promise<Error> {
  try {
    await run()
  } catch (error) {
    if (error instanceof Error) return error
    throw new Error('operation rejected with a non-Error value')
  }
  throw new Error('operation unexpectedly resolved')
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('loadOwnestConfig', () => {
  it('fails closed and names every missing required environment variable', () => {
    const result = loadOwnestConfig({})

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toContain('SUPABASE_URL')
    expect(result.error).toContain('NEXT_PUBLIC_SUPABASE_URL')
    expect(result.error).toContain('SUPABASE_SERVICE_ROLE_KEY')
    expect(result.error).toContain('FOUNDER_USER_ID')
    expect(result.error).toContain('CC_OWNEST_WORKER_ID')
    expect(result.error).toContain('HERMES_AGENT_ID')
  })

  it('never exposes configured values when URL validation fails', () => {
    const unsafeValues = {
      SUPABASE_URL: 'http://remote.example/secret-url-fragment',
      SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey,
      FOUNDER_USER_ID: 'founder-secret-value',
      CC_OWNEST_WORKER_ID: 'worker-secret-value',
    }

    const result = loadOwnestConfig(unsafeValues)

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toContain('SUPABASE_URL')
    for (const value of Object.values(unsafeValues)) {
      expect(result.error).not.toContain(value)
    }
  })

  it.each([
    ['https URL', { ...validEnv, SUPABASE_URL: '  https://EXAMPLE.supabase.co///  ' }, 'https://example.supabase.co'],
    [
      'NEXT_PUBLIC fallback',
      { ...validEnv, SUPABASE_URL: undefined, NEXT_PUBLIC_SUPABASE_URL: 'http://localhost:54321/' },
      'http://localhost:54321',
    ],
  ])('normalises a valid %s', (_label, env, expectedUrl) => {
    const result = loadOwnestConfig(env)

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.config.supabaseUrl).toBe(expectedUrl)
  })

  it.each([
    'http://example.com',
    'http://localhost.evil.example',
    'ftp://localhost',
    'https://user:password@example.com',
    'not a URL',
  ])('rejects an unsafe Supabase URL without echoing it: %s', (supabaseUrl) => {
    const result = loadOwnestConfig({ ...validEnv, SUPABASE_URL: supabaseUrl })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toContain('SUPABASE_URL')
    expect(result.error).not.toContain(supabaseUrl)
  })

  it.each([
    [undefined, false],
    ['0', false],
    ['true', false],
    [' 1 ', false],
    ['1', true],
  ])('enables live mode only for the exact value "1" (%s)', (raw, expected) => {
    const result = loadOwnestConfig({
      ...validEnv,
      CC_OWNEST_LIVE: raw,
      ...(raw === '1'
        ? {
            NEXT_PUBLIC_SUPABASE_URL: validEnv.SUPABASE_URL,
            CC_OWNEST_ROLLOUT_ID: 'rollout-live-mode-test',
            CC_OWNEST_CANARY_TASK_ID: 'task-live-mode-test',
          }
        : {}),
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.config.live).toBe(expected)
  })

  it('applies safe defaults for absent or invalid numeric controls', () => {
    const result = loadOwnestConfig({
      ...validEnv,
      CC_OWNEST_CANARY_LIMIT: 'NaN',
      CC_OWNEST_MAX_IN_PROGRESS: '1.5',
      CC_OWNEST_LEASE_MS: 'Infinity',
      CC_OWNEST_DAILY_DISPATCH_LIMIT: '3tasks',
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.config).toMatchObject({
      canaryLimit: 1,
      maxInProgress: 1,
      leaseMs: 300_000,
      dailyDispatchLimit: 1,
    })
    for (const value of [
      result.config.canaryLimit,
      result.config.maxInProgress,
      result.config.leaseMs,
      result.config.dailyDispatchLimit,
    ]) {
      expect(Number.isSafeInteger(value)).toBe(true)
    }
  })

  it('clamps valid integer controls to their documented bounds', () => {
    const result = loadOwnestConfig({
      ...validEnv,
      CC_OWNEST_CANARY_LIMIT: '99',
      CC_OWNEST_MAX_IN_PROGRESS: '-2',
      CC_OWNEST_LEASE_MS: '2000000',
      CC_OWNEST_DAILY_DISPATCH_LIMIT: '0',
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.config).toMatchObject({
      canaryLimit: 3,
      maxInProgress: 1,
      leaseMs: 1_800_000,
      dailyDispatchLimit: 1,
    })
  })

  it('uses an explicit Hermes cwd or the existing process cwd as a safe default', () => {
    const explicit = loadOwnestConfig({ ...validEnv, HERMES_CWD: '  /tmp/hermes-explicit  ' })
    const fallback = loadOwnestConfig(validEnv)

    expect(explicit.ok).toBe(true)
    expect(fallback.ok).toBe(true)
    if (explicit.ok) expect(explicit.config.hermesCwd).toBe('/tmp/hermes-explicit')
    if (fallback.ok) expect(fallback.config.hermesCwd).toBe(process.cwd())
  })

  it('accepts HERMES_AGENT_ID as the explicit worker identity fallback', () => {
    const result = loadOwnestConfig({
      ...validEnv,
      CC_OWNEST_WORKER_ID: undefined,
      HERMES_AGENT_ID: ' hermes-agent-1 ',
    })

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.config.workerId).toBe('hermes-agent-1')
  })

  it('selects the Hermes board by OWNEST override, Hermes fallback, then safe default', () => {
    const explicit = loadOwnestConfig({
      ...validEnv,
      CC_OWNEST_HERMES_BOARD: ' ownest_primary ',
      HERMES_KANBAN_BOARD: 'hermes-fallback',
    })
    const fallback = loadOwnestConfig({
      ...validEnv,
      HERMES_KANBAN_BOARD: ' hermes_fallback ',
    })
    const defaulted = loadOwnestConfig(validEnv)

    expect(explicit.ok).toBe(true)
    expect(fallback.ok).toBe(true)
    expect(defaulted.ok).toBe(true)
    if (explicit.ok) expect(explicit.config.hermesBoard).toBe('ownest_primary')
    if (fallback.ok) expect(fallback.config.hermesBoard).toBe('hermes_fallback')
    if (defaulted.ok) expect(defaulted.config.hermesBoard).toBe('unite-group-ownest')
  })

  it('selects a strict dedicated Hermes profile with ownest as the default', () => {
    const explicit = loadOwnestConfig({
      ...validEnv,
      CC_OWNEST_HERMES_PROFILE: ' agent7 ',
    })
    const defaulted = loadOwnestConfig(validEnv)

    expect(explicit.ok).toBe(true)
    expect(defaulted.ok).toBe(true)
    if (explicit.ok) expect(explicit.config.hermesProfile).toBe('agent7')
    if (defaulted.ok) expect(defaulted.config.hermesProfile).toBe('ownest')
  })

  it.each(['Ownest', 'own-est', 'own_est', 'contains space', 'a'.repeat(65)])(
    'rejects an unsafe Hermes profile without echoing it: %s',
    (hermesProfile) => {
      const result = loadOwnestConfig({
        ...validEnv,
        CC_OWNEST_HERMES_PROFILE: hermesProfile,
      })

      expect(result.ok).toBe(false)
      if (result.ok) return
      expect(result.error).toContain('CC_OWNEST_HERMES_PROFILE')
      expect(result.error).not.toContain(hermesProfile)
    },
  )

  it.each([
    'Uppercase',
    '-leading-hyphen',
    'contains space',
    `a${'b'.repeat(64)}`,
  ])('rejects an unsafe Hermes board without echoing it: %s', (hermesBoard) => {
    const result = loadOwnestConfig({ ...validEnv, CC_OWNEST_HERMES_BOARD: hermesBoard })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toContain('CC_OWNEST_HERMES_BOARD')
    expect(result.error).not.toContain(hermesBoard)
  })

  it('keeps rollout and canary identities null while live mode is off', () => {
    const result = loadOwnestConfig(validEnv)

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.config.rolloutId).toBeNull()
    expect(result.config.canaryTaskId).toBeNull()
  })

  it('requires and trims explicit rollout and one-task canary identities in live mode', () => {
    const missing = loadOwnestConfig({ ...validEnv, CC_OWNEST_LIVE: '1' })
    const configured = loadOwnestConfig({
      ...validEnv,
      NEXT_PUBLIC_SUPABASE_URL: validEnv.SUPABASE_URL,
      CC_OWNEST_LIVE: '1',
      CC_OWNEST_ROLLOUT_ID: ' rollout-2026-07-12 ',
      CC_OWNEST_CANARY_TASK_ID: ' task_123 ',
    })

    expect(missing.ok).toBe(false)
    if (!missing.ok) {
      expect(missing.error).toContain('CC_OWNEST_ROLLOUT_ID')
      expect(missing.error).toContain('CC_OWNEST_CANARY_TASK_ID')
    }
    expect(configured.ok).toBe(true)
    if (configured.ok) {
      expect(configured.config.rolloutId).toBe('rollout-2026-07-12')
      expect(configured.config.canaryTaskId).toBe('task_123')
    }
  })

  it.each([
    ['non-dedicated profile', { CC_OWNEST_HERMES_PROFILE: 'empire' }],
    ['non-dedicated board', { CC_OWNEST_HERMES_BOARD: 'other-board' }],
  ])('fails live configuration for a %s', (_label, override) => {
    const result = loadOwnestConfig({
      ...validEnv,
      NEXT_PUBLIC_SUPABASE_URL: validEnv.SUPABASE_URL,
      CC_OWNEST_LIVE: '1',
      CC_OWNEST_ROLLOUT_ID: 'rollout-safe',
      CC_OWNEST_CANARY_TASK_ID: 'task-safe',
      ...override,
    })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toMatch(/Hermes.*(?:profile|board)|CC_OWNEST_HERMES/i)
  })

  it.each([
    ['CC_OWNEST_CANARY_LIMIT', '2'],
    ['CC_OWNEST_MAX_IN_PROGRESS', '2'],
    ['CC_OWNEST_DAILY_DISPATCH_LIMIT', '2'],
  ])('rejects live configuration when %s exceeds one', (variable, value) => {
    const result = loadOwnestConfig({
      ...validEnv,
      NEXT_PUBLIC_SUPABASE_URL: validEnv.SUPABASE_URL,
      CC_OWNEST_LIVE: '1',
      CC_OWNEST_ROLLOUT_ID: 'rollout-safe',
      CC_OWNEST_CANARY_TASK_ID: 'task-safe',
      [variable]: value,
    })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toContain(variable)
  })

  it.each([
    ['CC_OWNEST_ROLLOUT_ID', 'unsafe/value'],
    ['CC_OWNEST_CANARY_TASK_ID', 'task?founder=other'],
    ['CC_OWNEST_ROLLOUT_ID', `r${'x'.repeat(128)}`],
    ['CC_OWNEST_CANARY_TASK_ID', `t${'x'.repeat(128)}`],
  ])('rejects unsafe %s without exposing its value', (variable, unsafeValue) => {
    const env = {
      ...validEnv,
      NEXT_PUBLIC_SUPABASE_URL: validEnv.SUPABASE_URL,
      CC_OWNEST_LIVE: '1',
      CC_OWNEST_ROLLOUT_ID: 'rollout-safe',
      CC_OWNEST_CANARY_TASK_ID: 'task-safe',
      [variable]: unsafeValue,
    }
    const result = loadOwnestConfig(env)

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toContain(variable)
    expect(result.error).not.toContain(unsafeValue)
  })

  it('accepts matching normalized Supabase origins when both URL variables are present', () => {
    const result = loadOwnestConfig({
      ...validEnv,
      SUPABASE_URL: ' https://EXAMPLE.supabase.co/// ',
      NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
    })

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.config.supabaseUrl).toBe('https://example.supabase.co')
  })

  it('rejects mismatched Supabase origins without exposing either configured URL', () => {
    const privateUrl = 'https://private-project.supabase.co'
    const publicUrl = 'https://public-project.supabase.co'
    const result = loadOwnestConfig({
      ...validEnv,
      SUPABASE_URL: privateUrl,
      NEXT_PUBLIC_SUPABASE_URL: publicUrl,
    })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toContain('SUPABASE_URL')
    expect(result.error).toContain('NEXT_PUBLIC_SUPABASE_URL')
    expect(result.error).not.toContain(privateUrl)
    expect(result.error).not.toContain(publicUrl)
  })

  it.each([
    [
      'SUPABASE_URL',
      {
        ...validEnv,
        SUPABASE_URL: undefined,
        NEXT_PUBLIC_SUPABASE_URL: 'https://public-only.supabase.co',
      },
      'https://public-only.supabase.co',
    ],
    [
      'NEXT_PUBLIC_SUPABASE_URL',
      {
        ...validEnv,
        NEXT_PUBLIC_SUPABASE_URL: undefined,
      },
      validEnv.SUPABASE_URL,
    ],
  ])('requires %s independently in live mode without exposing the other URL', (variable, env, otherUrl) => {
    const result = loadOwnestConfig({
      ...env,
      CC_OWNEST_LIVE: '1',
      CC_OWNEST_ROLLOUT_ID: 'rollout-live-origin-test',
      CC_OWNEST_CANARY_TASK_ID: 'task-live-origin-test',
    })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toContain(`${variable} is required when live`)
    if (otherUrl) expect(result.error).not.toContain(otherUrl)
  })
})

describe('listCandidateTasks', () => {
  it('uses the exact bounded founder-scoped queued query and header-only credentials', async () => {
    const fetchImpl = mockFetch(jsonResponse([task()]))

    await expect(listCandidateTasks(config, deps(fetchImpl))).resolves.toEqual([task()])

    const { url, init } = firstRequest(fetchImpl)
    expect(url.pathname).toBe('/rest/v1/cc_tasks')
    expect(url.searchParams.get('select')).toBe(TASK_COLUMNS)
    expect(url.searchParams.get('founder_id')).toBe(`eq.${config.founderId}`)
    expect(url.searchParams.get('status')).toBe('eq.queued')
    expect(url.searchParams.get('order')).toBe('priority.asc,created_at.asc')
    expect(url.searchParams.get('limit')).toBe('100')
    expect(init.method).toBe('GET')
    expect(url.toString()).not.toContain(serviceRoleKey)
    expect(init.body ?? '').not.toContain(serviceRoleKey)

    const headers = new Headers(init.headers)
    expect(headers.get('apikey')).toBe(serviceRoleKey)
    expect(headers.get('authorization')).toBe(`Bearer ${serviceRoleKey}`)
  })

  it('encodes founder filters so configured values cannot inject query clauses', async () => {
    const founderId = 'founder&status=eq.done#fragment'
    const scopedConfig = { ...config, founderId }
    const fetchImpl = mockFetch(jsonResponse([task({ founder_id: founderId })]))

    await listCandidateTasks(scopedConfig, deps(fetchImpl))

    const { url } = firstRequest(fetchImpl)
    expect(url.searchParams.get('founder_id')).toBe(`eq.${founderId}`)
    expect(url.searchParams.getAll('status')).toEqual(['eq.queued'])
    expect(url.hash).toBe('')
    expect(url.toString()).toContain('founder%26status%3Deq.done%23fragment')
  })

  it.each([
    ['non-array JSON', jsonResponse({ rows: [task()] })],
    ['malformed JSON', new Response('{', { status: 200 })],
    ['missing column', jsonResponse([{ ...task(), updated_at: undefined }])],
    ['unexpected column', jsonResponse([{ ...task(), origin: 'idea' }])],
    ['wrong enum', jsonResponse([{ ...task(), priority: 'urgent' }])],
    ['wrong founder', jsonResponse([task({ founder_id: 'other-founder' })])],
    ['invalid timestamp', jsonResponse([task({ created_at: 'yesterday' })])],
  ])('fails closed for %s', async (_label, response) => {
    const fetchImpl = mockFetch(response)

    await expect(listCandidateTasks(config, deps(fetchImpl))).rejects.toThrow()
  })

  it('parses a successful body once from its bounded stream without clone/text/json helpers', async () => {
    const response = jsonResponse([task()])
    const clone = vi.spyOn(response, 'clone')
    const text = vi.spyOn(response, 'text')
    const json = vi.spyOn(response, 'json')
    const fetchImpl = mockFetch(response)

    await expect(listCandidateTasks(config, deps(fetchImpl))).resolves.toEqual([task()])

    expect(clone).not.toHaveBeenCalled()
    expect(text).not.toHaveBeenCalled()
    expect(json).not.toHaveBeenCalled()
  })

  it('cancels and rejects an oversized successful response with a redacted capped error', async () => {
    const oversized = streamingResponse(
      JSON.stringify([task({ title: `${serviceRoleKey}:${'x'.repeat(2 * 1024 * 1024)}` })]),
    )
    const fetchImpl = mockFetch(oversized.response)

    const error = await capturedError(() => listCandidateTasks(config, deps(fetchImpl)))

    expect(oversized.wasCancelled()).toBe(true)
    expect(error.message).toContain('Failed to list candidate CRM tasks')
    expect(error.message).not.toContain(serviceRoleKey)
    expect(error.message.length).toBeLessThanOrEqual(800)
  })

  it('wraps malformed successful JSON in a redacted capped request error', async () => {
    const fetchImpl = mockFetch(new Response(`{${serviceRoleKey}`, { status: 200 }))

    const error = await capturedError(() => listCandidateTasks(config, deps(fetchImpl)))

    expect(error.message).toContain('Failed to list candidate CRM tasks')
    expect(error.message).not.toContain(serviceRoleKey)
    expect(error.message.length).toBeLessThanOrEqual(800)
  })
})

describe('listMirroredTasks', () => {
  it('selects only founder-scoped running/blocked rows carrying an OWNEST mirror', async () => {
    const running = task({
      status: 'running',
      metadata: { ownest: ownestState('task-1') },
    })
    const blocked = task({
      id: 'task-2',
      status: 'blocked',
      metadata: { ownest: ownestState('task-2', 'hermes-2') },
    })
    const fetchImpl = mockFetch(jsonResponse([running, blocked]))

    await expect(listMirroredTasks(config, deps(fetchImpl))).resolves.toEqual([running, blocked])

    const { url, init } = firstRequest(fetchImpl)
    expect(url.pathname).toBe('/rest/v1/cc_tasks')
    expect(url.searchParams.get('select')).toBe(TASK_COLUMNS)
    expect(url.searchParams.get('founder_id')).toBe(`eq.${config.founderId}`)
    expect(url.searchParams.get('status')).toBe('in.(running,blocked)')
    expect(url.searchParams.get('metadata->ownest->>hermesTaskId')).toBe('not.is.null')
    expect(url.searchParams.get('limit')).toBe('100')
    expect(init.method).toBe('GET')
  })

  it('fails closed when an alleged mirrored row has malformed OWNEST state', async () => {
    const malformed = task({
      status: 'running',
      metadata: { ownest: { ...ownestState('task-1'), hermesTaskId: 42 } },
    })
    const fetchImpl = mockFetch(jsonResponse([malformed]))

    await expect(listMirroredTasks(config, deps(fetchImpl))).rejects.toThrow()
  })
})

describe('getOwnedTask', () => {
  it('reads one exact founder-owned task with bounded explicit columns', async () => {
    const owned = task()
    const fetchImpl = mockFetch(jsonResponse([owned]))

    await expect(getOwnedTask('task-1', config, deps(fetchImpl))).resolves.toEqual(owned)

    const { url, init } = firstRequest(fetchImpl)
    expect(url.pathname).toBe('/rest/v1/cc_tasks')
    expect(url.searchParams.get('select')).toBe(TASK_COLUMNS)
    expect(url.searchParams.get('founder_id')).toBe(`eq.${config.founderId}`)
    expect(url.searchParams.get('id')).toBe('eq.task-1')
    expect(url.searchParams.get('limit')).toBe('1')
    expect(init.method).toBe('GET')
    expect(init.redirect).toBe('error')
  })

  it('returns null when the nominated task is missing', async () => {
    const fetchImpl = mockFetch(jsonResponse([]))

    await expect(getOwnedTask('missing-task', config, deps(fetchImpl))).resolves.toBeNull()
  })

  it('encodes the task id without allowing query injection', async () => {
    const taskId = 'task-1&founder_id=eq.attacker&limit=100'
    const fetchImpl = mockFetch(jsonResponse([task({ id: taskId })]))

    await getOwnedTask(taskId, config, deps(fetchImpl))

    const { url } = firstRequest(fetchImpl)
    expect(url.searchParams.getAll('id')).toEqual([`eq.${taskId}`])
    expect(url.searchParams.getAll('founder_id')).toEqual([`eq.${config.founderId}`])
    expect(url.searchParams.getAll('limit')).toEqual(['1'])
    expect(url.toString()).toContain('task-1%26founder_id%3Deq.attacker%26limit%3D100')
  })

  it.each([
    ['more than one row', [task(), task({ id: 'task-2' })]],
    ['wrong row identity', [task({ id: 'task-2' })]],
    ['wrong founder', [task({ founder_id: 'other-founder' })]],
  ])('fails closed for %s', async (_label, rows) => {
    const fetchImpl = mockFetch(jsonResponse(rows))

    await expect(getOwnedTask('task-1', config, deps(fetchImpl))).rejects.toThrow()
  })
})

describe('listManagedTasks', () => {
  function managedTask(index: number): CcTask {
    const id = `task-${String(index).padStart(4, '0')}`
    return task({
      id,
      status: 'running',
      metadata: { ownest: hardenedOwnestState(id, null) },
    })
  }

  function taskIdentities(rows: readonly CcTask[]) {
    return rows.map(({ id, updated_at }) => ({ id, updated_at }))
  }

  it('returns every row through identity-attested id-keyset pagination', async () => {
    const allRows = Array.from({ length: 101 }, (_, index) => managedTask(index))
    const firstPage = allRows.slice(0, 100)
    const secondPage = allRows.slice(100)
    const identities = taskIdentities(allRows)
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(countResponse('0-0/101'))
      .mockResolvedValueOnce(jsonResponse(identities))
      .mockResolvedValueOnce(jsonResponse(firstPage))
      .mockResolvedValueOnce(jsonResponse(secondPage))
      .mockResolvedValueOnce(jsonResponse(identities))

    await expect(listManagedTasks(config, deps(fetchImpl))).resolves.toEqual(allRows)

    const requests = fetchImpl.mock.calls.map(([input, init]) => ({
      url: new URL(String(input)),
      init,
    }))
    const identityReads = requests.filter(
      ({ url, init }) => init?.method === 'GET' && url.searchParams.get('select') === 'id,updated_at',
    )
    const fullReads = requests.filter(
      ({ url, init }) => init?.method === 'GET' && url.searchParams.get('select') === TASK_COLUMNS,
    )
    expect(requests).toHaveLength(5)
    expect(identityReads).toHaveLength(2)
    expect(fullReads).toHaveLength(2)
    for (const { url } of requests) {
      expect(url.pathname).toBe('/rest/v1/cc_tasks')
      expect(url.searchParams.getAll('founder_id')).toEqual([`eq.${config.founderId}`])
      expect(url.searchParams.getAll('status')).toEqual([
        'in.(running,blocked,awaiting_approval,failed)',
      ])
      expect(url.searchParams.getAll('metadata->ownest->>version')).toEqual(['eq.1'])
    }
    for (const { url } of identityReads) {
      expect(url.searchParams.get('order')).toBe('id.asc')
      expect(url.searchParams.get('limit')).toBe('501')
      expect(url.searchParams.has('id')).toBe(false)
      expect(url.searchParams.has('offset')).toBe(false)
    }
    expect(fullReads.map(({ url }) => url.searchParams.get('order'))).toEqual([
      'id.asc',
      'id.asc',
    ])
    expect(fullReads.map(({ url }) => url.searchParams.get('limit'))).toEqual(['100', '1'])
    expect(fullReads.map(({ url }) => url.searchParams.get('id'))).toEqual([
      null,
      'gt.task-0099',
    ])
    expect(fullReads.every(({ url }) => !url.searchParams.has('offset'))).toBe(true)
  })

  it('fails closed when keyset pagination repeats or moves backwards', async () => {
    const allRows = Array.from({ length: 101 }, (_, index) => managedTask(index))
    const firstPage = Array.from({ length: 100 }, (_, index) => managedTask(index))
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(countResponse('0-0/101'))
      .mockResolvedValueOnce(jsonResponse(taskIdentities(allRows)))
      .mockResolvedValueOnce(jsonResponse(firstPage))
      .mockResolvedValueOnce(jsonResponse([managedTask(50)]))

    await expect(listManagedTasks(config, deps(fetchImpl))).rejects.toThrow(/pagination|order/i)
  })

  it('fails closed when keyset pagination ends before the identity snapshot', async () => {
    const row = managedTask(0)
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(countResponse('0-0/1'))
      .mockResolvedValueOnce(jsonResponse(taskIdentities([row])))
      .mockResolvedValueOnce(jsonResponse([]))

    await expect(listManagedTasks(config, deps(fetchImpl))).rejects.toThrow(
      /pagination|ended|identity/i,
    )
  })

  it('rejects the first short full-row page without amplifying requests', async () => {
    const rows = Array.from({ length: 500 }, (_, index) => managedTask(index))
    let fullRowReads = 0
    const fetchImpl = vi.fn<typeof fetch>().mockImplementation(async (input, init) => {
      const url = new URL(String(input))
      if (init?.method === 'HEAD') return countResponse('0-0/500')
      if (url.searchParams.get('select') === 'id,updated_at') {
        return jsonResponse(taskIdentities(rows))
      }

      fullRowReads += 1
      if (fullRowReads === 1) return jsonResponse([rows[0]])
      throw new Error('short-page amplification continued')
    })

    const error = await capturedError(() => listManagedTasks(config, deps(fetchImpl)))

    expect(error.message).toMatch(/short|page size/i)
    expect(fullRowReads).toBe(1)
    expect(fetchImpl).toHaveBeenCalledTimes(3)
  })

  it('fails closed instead of truncating when the managed-task hard cap is exceeded', async () => {
    const fetchImpl = mockFetch(countResponse('0-0/501'))

    await expect(listManagedTasks(config, deps(fetchImpl))).rejects.toThrow(/hard cap|overflow/i)

    expect(fetchImpl).toHaveBeenCalledTimes(1)
    expect(firstRequest(fetchImpl).init.method).toBe('HEAD')
  })

  it('fails closed when exact count and the initial identity snapshot disagree', async () => {
    const rows = Array.from({ length: 100 }, (_, index) => managedTask(index))
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(countResponse('0-0/101'))
      .mockResolvedValueOnce(jsonResponse(taskIdentities(rows)))

    await expect(listManagedTasks(config, deps(fetchImpl))).rejects.toThrow(/count|identity|attest/i)
  })

  it('rejects same-count membership replacement that offset pagination would omit', async () => {
    const initialRows = Array.from({ length: 101 }, (_, index) => managedTask(index))
    const replacedRows = [...initialRows.slice(1), managedTask(101)]
    let membershipReplaced = false
    const fetchImpl = vi.fn<typeof fetch>().mockImplementation(async (input, init) => {
      const url = new URL(String(input))
      if (init?.method === 'HEAD') return countResponse('0-0/101')

      if (url.searchParams.get('select') === 'id,updated_at') {
        return jsonResponse(taskIdentities(membershipReplaced ? replacedRows : initialRows))
      }

      const source = membershipReplaced ? replacedRows : initialRows
      const limit = Number(url.searchParams.get('limit'))
      const cursor = url.searchParams.get('id')?.replace(/^gt\./, '')
      const offset = Number(url.searchParams.get('offset') ?? '0')
      const candidates = cursor ? source.filter(({ id }) => id > cursor) : source.slice(offset)
      const page = candidates.slice(0, limit)
      membershipReplaced = true
      return jsonResponse(page)
    })

    await expect(listManagedTasks(config, deps(fetchImpl))).rejects.toThrow(
      /identity|membership|changed|attest/i,
    )
  })

  it('rejects updated_at churn between the two identity snapshots', async () => {
    const original = managedTask(0)
    const changed = { ...original, updated_at: '2026-07-12T00:00:00.001Z' }
    let churned = false
    const fetchImpl = vi.fn<typeof fetch>().mockImplementation(async (input, init) => {
      const url = new URL(String(input))
      if (init?.method === 'HEAD') return countResponse('0-0/1')
      if (url.searchParams.get('select') === 'id,updated_at') {
        return jsonResponse(taskIdentities([churned ? changed : original]))
      }

      const response = jsonResponse([original])
      churned = true
      return response
    })

    await expect(listManagedTasks(config, deps(fetchImpl))).rejects.toThrow(
      /identity|updated|changed|attest/i,
    )
  })

  it('rejects a full row whose identity differs from the initial attestation', async () => {
    const original = managedTask(0)
    const changed = { ...original, updated_at: '2026-07-12T00:00:00.001Z' }
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(countResponse('0-0/1'))
      .mockResolvedValueOnce(jsonResponse(taskIdentities([original])))
      .mockResolvedValueOnce(jsonResponse([changed]))

    await expect(listManagedTasks(config, deps(fetchImpl))).rejects.toThrow(
      /identity|updated|attest/i,
    )
  })

  it.each([
    ['non-array body', { id: 'task-0000', updated_at: expectedUpdatedAt }, 1],
    ['missing field', [{ id: 'task-0000' }], 1],
    [
      'extra field',
      [{ id: 'task-0000', updated_at: expectedUpdatedAt, status: 'running' }],
      1,
    ],
    ['blank id', [{ id: ' ', updated_at: expectedUpdatedAt }], 1],
    ['invalid timestamp', [{ id: 'task-0000', updated_at: 'recently' }], 1],
    [
      'duplicate ids',
      [
        { id: 'task-0000', updated_at: expectedUpdatedAt },
        { id: 'task-0000', updated_at: expectedUpdatedAt },
      ],
      2,
    ],
    [
      'out-of-order ids',
      [
        { id: 'task-0001', updated_at: expectedUpdatedAt },
        { id: 'task-0000', updated_at: expectedUpdatedAt },
      ],
      2,
    ],
  ])('strictly rejects an identity snapshot with %s', async (_label, body, count) => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(countResponse(`0-0/${count}`))
      .mockResolvedValueOnce(jsonResponse(body))

    await expect(listManagedTasks(config, deps(fetchImpl))).rejects.toThrow(/identity|attest/i)
  })

  it('rejects an identity snapshot above the explicit hard cap', async () => {
    const rows = Array.from({ length: 501 }, (_, index) => managedTask(index))
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(countResponse('0-0/500'))
      .mockResolvedValueOnce(jsonResponse(taskIdentities(rows)))

    await expect(listManagedTasks(config, deps(fetchImpl))).rejects.toThrow(/hard cap|identity/i)
  })

  it.each([
    [
      'legacy state',
      task({ status: 'running', metadata: { ownest: ownestState('task-1', null) } }),
    ],
    [
      'partial hardened state',
      task({
        status: 'running',
        metadata: {
          ownest: (() => {
            const partial = { ...hardenedOwnestState('task-1') }
            delete (partial as Partial<typeof partial>).missionDigest
            return partial
          })(),
        },
      }),
    ],
    [
      'malformed hardened state',
      task({
        status: 'running',
        metadata: { ownest: { ...hardenedOwnestState('task-1'), failureCount: 4 } },
      }),
    ],
    [
      'status outside the managed set',
      task({ status: 'done', metadata: { ownest: hardenedOwnestState('task-1') } }),
    ],
  ])('fails closed for a %s row', async (_label, row) => {
    const validIdentity = taskIdentities([managedTask(0)])
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(countResponse('0-0/1'))
      .mockResolvedValueOnce(jsonResponse(validIdentity))
      .mockResolvedValueOnce(jsonResponse([row]))

    await expect(listManagedTasks(config, deps(fetchImpl))).rejects.toThrow()
  })
})

describe('persistent claim quotas', () => {
  it('counts rollout claims exactly across every task status using metadata only', async () => {
    const rolloutId = 'rollout:2026.07_12-test'
    const fetchImpl = mockFetch(countResponse('0-0/7'))

    await expect(countRolloutClaims(rolloutId, config, deps(fetchImpl))).resolves.toBe(7)

    const { url, init } = firstRequest(fetchImpl)
    expect(url.pathname).toBe('/rest/v1/cc_tasks')
    expect(url.searchParams.get('select')).toBe('id')
    expect(url.searchParams.get('founder_id')).toBe(`eq.${config.founderId}`)
    expect(url.searchParams.get('metadata->ownest->>rolloutId')).toBe(`eq.${rolloutId}`)
    expect(url.searchParams.has('metadata->ownest->>claimedAt')).toBe(false)
    expect(url.searchParams.has('status')).toBe(false)
    expect(url.toString()).toContain('rollout%3A2026.07_12-test')
    expect(init.method).toBe('HEAD')
    expect(init.redirect).toBe('error')
    expect(init.body).toBeUndefined()
    expect(url.toString()).not.toContain(serviceRoleKey)
    const headers = new Headers(init.headers)
    expect(headers.get('prefer')).toBe('count=exact')
    expect(headers.get('range')).toBe('0-0')
    expect(headers.get('apikey')).toBe(serviceRoleKey)
    expect(headers.get('authorization')).toBe(`Bearer ${serviceRoleKey}`)
  })

  it('returns zero only from the canonical empty exact-count response', async () => {
    const fetchImpl = mockFetch(countResponse('*/0', 200))

    await expect(countRolloutClaims('rollout-zero', config, deps(fetchImpl))).resolves.toBe(0)
  })

  it.each(['', 'bad rollout', 'rollout-safe&status=eq.queued', `r${'x'.repeat(128)}`])(
    'rejects unsafe rollout input before fetch: %s',
    async (rolloutId) => {
      const fetchImpl = mockFetch(countResponse('*/0', 200))

      await expect(countRolloutClaims(rolloutId, config, deps(fetchImpl))).rejects.toThrow(
        /rollout/i,
      )
      expect(fetchImpl).not.toHaveBeenCalled()
    },
  )

  it('counts a half-open UTC claim interval with two injection-safe timestamp filters', async () => {
    const fromIso = '2026-07-12T00:00:00.000Z'
    const toIso = '2026-07-13T00:00:00.000Z'
    const fetchImpl = mockFetch(countResponse('0-0/3'))

    await expect(countDailyClaims(fromIso, toIso, config, deps(fetchImpl))).resolves.toBe(3)

    const { url, init } = firstRequest(fetchImpl)
    expect(url.searchParams.get('select')).toBe('id')
    expect(url.searchParams.get('founder_id')).toBe(`eq.${config.founderId}`)
    expect(url.searchParams.getAll('metadata->ownest->>claimedAt')).toEqual([
      `gte.${fromIso}`,
      `lt.${toIso}`,
    ])
    expect(url.searchParams.has('status')).toBe(false)
    expect(url.toString()).toContain('2026-07-12T00%3A00%3A00.000Z')
    expect(init.method).toBe('HEAD')
    expect(new Headers(init.headers).get('prefer')).toBe('count=exact')
    expect(new Headers(init.headers).get('range')).toBe('0-0')
  })

  it.each([
    ['missing from', '', '2026-07-13T00:00:00.000Z'],
    ['invalid calendar from', '2026-02-30T00:00:00.000Z', '2026-07-13T00:00:00.000Z'],
    [
      'from query injection',
      '2026-07-12T00:00:00.000Z&status=eq.queued',
      '2026-07-13T00:00:00.000Z',
    ],
    [
      'to query injection',
      '2026-07-12T00:00:00.000Z',
      '2026-07-13T00:00:00.000Z&founder_id=eq.attacker',
    ],
    ['equal bounds', '2026-07-12T00:00:00.000Z', '2026-07-12T00:00:00.000Z'],
    ['reversed bounds', '2026-07-13T00:00:00.000Z', '2026-07-12T00:00:00.000Z'],
    [
      'offset bounds',
      '2026-07-12T00:00:00.000+10:00',
      '2026-07-13T00:00:00.000+10:00',
    ],
    ['missing milliseconds', '2026-07-12T00:00:00Z', '2026-07-13T00:00:00Z'],
    ['non-midnight from', '2026-07-12T00:00:00.001Z', '2026-07-13T00:00:00.000Z'],
    ['non-midnight to', '2026-07-12T00:00:00.000Z', '2026-07-13T00:00:00.001Z'],
    ['two-day interval', '2026-07-12T00:00:00.000Z', '2026-07-14T00:00:00.000Z'],
  ])('rejects %s before fetch', async (_label, fromIso, toIso) => {
    const fetchImpl = mockFetch(countResponse('*/0', 200))

    await expect(countDailyClaims(fromIso, toIso, config, deps(fetchImpl))).rejects.toThrow()
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it.each([
    ['missing', undefined],
    ['negative', '0-0/-1'],
    ['unknown total', '0-0/*'],
    ['nonempty wildcard range', '*/5'],
    ['wrong returned range', '1-1/2'],
    ['leading-zero total', '0-0/01'],
    ['over-safe total', '0-0/9007199254740992'],
    ['overlong header', `0-0/1${'x'.repeat(10_000)}`],
  ])('rejects a %s Content-Range count', async (_label, contentRange) => {
    const fetchImpl = mockFetch(countResponse(contentRange))

    await expect(countRolloutClaims('rollout-count-test', config, deps(fetchImpl))).rejects.toThrow(
      /count|content-range/i,
    )
  })

  it('rejects an overlong digit count before invoking BigInt', async () => {
    const bigint = vi.spyOn(globalThis, 'BigInt')
    const fetchImpl = mockFetch(countResponse(`0-0/${'9'.repeat(10_000)}`))

    await expect(countRolloutClaims('rollout-count-test', config, deps(fetchImpl))).rejects.toThrow(
      /count|content-range/i,
    )
    expect(bigint).not.toHaveBeenCalled()
  })

  it('rejects non-2xx count responses through the shared redacted request boundary', async () => {
    const fetchImpl = mockFetch(
      new Response(serviceRoleKey, {
        status: 503,
        headers: { 'content-range': '0-0/1' },
      }),
    )

    const error = await capturedError(() =>
      countRolloutClaims('rollout-count-test', config, deps(fetchImpl)),
    )
    expect(error.message).toContain('503')
    expect(error.message).not.toContain(serviceRoleKey)
  })
})

describe('compareAndSetTask', () => {
  it('uses founder/id/expected-status CAS filters and returns one validated representation', async () => {
    const metadata = { ownest: ownestState('task-1') }
    const updated = task({ status: 'running', metadata })
    const fetchImpl = mockFetch(jsonResponse([updated]))

    await expect(
      compareAndSetTask(
        {
          taskId: 'task-1',
          expectedStatus: 'queued',
          expectedUpdatedAt,
          patch: { status: 'running', metadata },
        },
        config,
        deps(fetchImpl),
      ),
    ).resolves.toEqual(updated)

    const { url, init } = firstRequest(fetchImpl)
    expect(url.pathname).toBe('/rest/v1/cc_tasks')
    expect(url.searchParams.get('id')).toBe('eq.task-1')
    expect(url.searchParams.get('founder_id')).toBe(`eq.${config.founderId}`)
    expect(url.searchParams.get('status')).toBe('eq.queued')
    expect(url.searchParams.get('updated_at')).toBe(`eq.${expectedUpdatedAt}`)
    expect(url.searchParams.get('select')).toBe(TASK_COLUMNS)
    expect(init.method).toBe('PATCH')
    expect(new Headers(init.headers).get('prefer')).toBe('return=representation')
    expect(requestBody(init)).toEqual({ status: 'running', metadata })
  })

  it('encodes the task id so it cannot inject or replace the founder filter', async () => {
    const taskId = 'task-1&founder_id=eq.attacker&status=eq.done'
    const updated = task({ id: taskId, status: 'running' })
    const fetchImpl = mockFetch(jsonResponse([updated]))

    await compareAndSetTask(
      { taskId, expectedStatus: 'queued', expectedUpdatedAt, patch: { status: 'running' } },
      config,
      deps(fetchImpl),
    )

    const { url } = firstRequest(fetchImpl)
    expect(url.searchParams.get('id')).toBe(`eq.${taskId}`)
    expect(url.searchParams.getAll('founder_id')).toEqual([`eq.${config.founderId}`])
    expect(url.searchParams.getAll('status')).toEqual(['eq.queued'])
    expect(url.searchParams.getAll('updated_at')).toEqual([`eq.${expectedUpdatedAt}`])
    expect(url.toString()).toContain('task-1%26founder_id%3Deq.attacker%26status%3Deq.done')
  })

  it('encodes a valid offset timestamp as one exact CAS filter', async () => {
    const offsetTimestamp = '2026-07-12T10:00:00+10:00'
    const fetchImpl = mockFetch(jsonResponse([task({ status: 'running' })]))

    await compareAndSetTask(
      {
        taskId: 'task-1',
        expectedStatus: 'queued',
        expectedUpdatedAt: offsetTimestamp,
        patch: { status: 'running' },
      },
      config,
      deps(fetchImpl),
    )

    const { url } = firstRequest(fetchImpl)
    expect(url.searchParams.getAll('updated_at')).toEqual([`eq.${offsetTimestamp}`])
    expect(url.searchParams.getAll('status')).toEqual(['eq.queued'])
    expect(url.toString()).toContain('%2B10%3A00')
  })

  it.each([
    ['missing', undefined],
    ['empty', ''],
    ['invalid calendar date', '2026-02-30T00:00:00.000Z'],
    ['query injection', '2026-07-12T00:00:00.000Z&status=eq.done'],
  ])('rejects a %s expected updated timestamp before fetching', async (_label, value) => {
    const fetchImpl = mockFetch()

    await expect(
      compareAndSetTask(
        {
          taskId: 'task-1',
          expectedStatus: 'queued',
          expectedUpdatedAt: value,
          patch: { status: 'running' },
        } as never,
        config,
        deps(fetchImpl),
      ),
    ).rejects.toThrow(/updated timestamp/i)
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('returns null when zero rows are returned because the race was lost', async () => {
    const fetchImpl = mockFetch(jsonResponse([]))

    await expect(
      compareAndSetTask(
        { taskId: 'task-1', expectedStatus: 'queued', expectedUpdatedAt, patch: { status: 'running' } },
        config,
        deps(fetchImpl),
      ),
    ).resolves.toBeNull()
  })

  it.each([
    ['multiple rows', [task({ status: 'running' }), task({ id: 'task-2', status: 'running' })]],
    ['malformed row', [{ ...task({ status: 'running' }), metadata: null }]],
    ['wrong task', [task({ id: 'other-task', status: 'running' })]],
    ['wrong founder', [task({ founder_id: 'other-founder', status: 'running' })]],
    ['unconfirmed status', [task({ status: 'queued' })]],
  ])('fails closed for a %s response', async (_label, body) => {
    const fetchImpl = mockFetch(jsonResponse(body))

    await expect(
      compareAndSetTask(
        { taskId: 'task-1', expectedStatus: 'queued', expectedUpdatedAt, patch: { status: 'running' } },
        config,
        deps(fetchImpl),
      ),
    ).rejects.toThrow()
  })

  it('rejects runtime patch fields other than status and metadata before fetching', async () => {
    const fetchImpl = mockFetch()
    const unsafeInput = {
      taskId: 'task-1',
      expectedStatus: 'queued',
      expectedUpdatedAt,
      patch: { status: 'running', founder_id: 'attacker' },
    }

    await expect(
      compareAndSetTask(unsafeInput as never, config, deps(fetchImpl)),
    ).rejects.toThrow()
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it.each([
    ['missing metadata', {}],
    ['altered metadata', { ownest: ownestState('task-1'), nested: { expected: false } }],
  ])('rejects a returned row with %s when patched metadata is not confirmed', async (_label, returnedMetadata) => {
    const metadata = { ownest: ownestState('task-1'), nested: { expected: true } }
    const fetchImpl = mockFetch(
      jsonResponse([task({ status: 'running', metadata: returnedMetadata })]),
    )

    await expect(
      compareAndSetTask(
        {
          taskId: 'task-1',
          expectedStatus: 'queued',
          expectedUpdatedAt,
          patch: { status: 'running', metadata },
        },
        config,
        deps(fetchImpl),
      ),
    ).rejects.toThrow(/metadata/i)
  })

  it('accepts JSON-semantically identical metadata regardless of object key order', async () => {
    const metadata = { alpha: 1, nested: { beta: true, gamma: ['x'] } }
    const returnedMetadata = { nested: { gamma: ['x'], beta: true }, alpha: 1 }
    const updated = task({ status: 'running', metadata: returnedMetadata })
    const fetchImpl = mockFetch(jsonResponse([updated]))

    await expect(
      compareAndSetTask(
        {
          taskId: 'task-1',
          expectedStatus: 'queued',
          expectedUpdatedAt,
          patch: { status: 'running', metadata },
        },
        config,
        deps(fetchImpl),
      ),
    ).resolves.toEqual(updated)
  })

  it.each([
    [
      'cyclic metadata',
      () => {
        const metadata: Record<string, unknown> = { marker: serviceRoleKey }
        metadata.self = metadata
        return { status: 'running' as const, metadata }
      },
    ],
    [
      'BigInt metadata',
      () => ({ status: 'running' as const, metadata: { marker: serviceRoleKey, value: 1n } }),
    ],
    [
      'oversized metadata',
      () => ({
        status: 'running' as const,
        metadata: { marker: serviceRoleKey, value: 'x'.repeat(2 * 1024 * 1024) },
      }),
    ],
  ])('rejects %s deterministically before fetch with a redacted capped error', async (_label, makePatch) => {
    const fetchImpl = mockFetch()

    const error = await capturedError(() =>
      compareAndSetTask(
        { taskId: 'task-1', expectedStatus: 'queued', expectedUpdatedAt, patch: makePatch() },
        config,
        deps(fetchImpl),
      ),
    )

    expect(fetchImpl).not.toHaveBeenCalled()
    expect(error.message).toContain('Failed to serialise CRM task update')
    expect(error.message).not.toContain(serviceRoleKey)
    expect(error.message.length).toBeLessThanOrEqual(800)
  })
})

describe('createCrmClient.ensureCompletionArtifacts', () => {
  it('writes existing validation, evidence, and event schemas in strict deterministic order', async () => {
    const fixture = completionFixture()
    const expected = expectedArtifactRows(fixture)
    const { fetchImpl } = completionArtifactApi(fixture.freshTask)
    const client = createCrmClient(artifactConfig, deps(fetchImpl))

    await expect(
      client.ensureCompletionArtifacts({
        taskId: fixture.freshTask.id,
        expectedContract: fixture.expectedContract,
        completion: fixture.completion,
        nowIso: completionNowIso,
      }),
    ).resolves.toEqual(expected.result)

    expect(fetchImpl.mock.calls.map(([input, init]) => [
      init?.method ?? 'GET',
      new URL(String(input)).pathname,
    ])).toEqual([
      ['GET', '/rest/v1/cc_tasks'],
      ['POST', '/rest/v1/cc_validation_runs'],
      ['GET', '/rest/v1/cc_validation_runs'],
      ['POST', '/rest/v1/cc_validation_runs'],
      ['GET', '/rest/v1/cc_validation_runs'],
      ['POST', '/rest/v1/cc_evidence_records'],
      ['GET', '/rest/v1/cc_evidence_records'],
      ['POST', '/rest/v1/cc_task_events'],
      ['GET', '/rest/v1/cc_task_events'],
      ['GET', '/rest/v1/cc_tasks'],
      ['POST', '/rest/v1/cc_task_events'],
      ['GET', '/rest/v1/cc_task_events'],
    ])
    const inserted = fetchImpl.mock.calls
      .filter(([, init]) => init?.method === 'POST')
      .map(([, init]) => requestBody(init ?? {}))
    expect(inserted).toEqual([
      ...expected.validationRows,
      expected.evidenceRow,
      expected.evidenceEventRow,
      expected.completionEventRow,
    ])
    for (const [input, init] of fetchImpl.mock.calls.filter(([, value]) => value?.method === 'POST')) {
      const url = new URL(String(input))
      expect(url.searchParams.get('on_conflict')).toBe('id')
      expect(init?.headers).toMatchObject({
        Prefer: 'resolution=ignore-duplicates,return=minimal',
      })
    }
    const taskReads = fetchImpl.mock.calls.filter(
      ([input, init]) =>
        (init?.method ?? 'GET') === 'GET' &&
        new URL(String(input)).pathname === '/rest/v1/cc_tasks',
    )
    expect(taskReads).toHaveLength(2)
    for (const [input] of taskReads) {
      const url = new URL(String(input))
      expect(url.searchParams.get('founder_id')).toBe(`eq.${artifactConfig.founderId}`)
      expect(url.searchParams.get('id')).toBe(`eq.${fixture.freshTask.id}`)
      expect(url.searchParams.get('select')).toBe(TASK_COLUMNS)
    }
    for (const [input] of fetchImpl.mock.calls.filter(
      ([request, init]) =>
        init?.method === 'GET' &&
        new URL(String(request)).pathname !== '/rest/v1/cc_tasks',
    )) {
      const url = new URL(String(input))
      expect(url.searchParams.get('founder_id')).toBe(`eq.${artifactConfig.founderId}`)
      expect(url.searchParams.get('id')).toMatch(/^eq\.[0-9a-f-]{36}$/)
      expect(url.searchParams.get('select')).not.toBeNull()
    }
    expect(fetchImpl.mock.calls.some(([, init]) => init?.method === 'PATCH')).toBe(false)
  })

  it('treats repeated inserts, JSON key order, and equivalent timestamptz text as the same artifacts', async () => {
    const fixture = completionFixture()
    const expected = expectedArtifactRows(fixture)
    const { fetchImpl, store } = completionArtifactApi(fixture.freshTask)
    const client = createCrmClient(artifactConfig, deps(fetchImpl))
    const input = {
      taskId: fixture.freshTask.id,
      expectedContract: fixture.expectedContract,
      completion: fixture.completion,
      nowIso: completionNowIso,
    }

    const first = await client.ensureCompletionArtifacts(input)
    const evidence = store.cc_evidence_records.get(expected.result.evidenceRecordId)
    const event = store.cc_task_events.get(expected.result.evidenceAddedEventId)
    if (!evidence || !event || !Array.isArray(evidence.sources) || typeof event.payload !== 'object') {
      throw new Error('expected stored completion artifacts')
    }
    evidence.sources = evidence.sources.map((source) =>
      Object.fromEntries(Object.entries(source as Record<string, unknown>).reverse()),
    )
    event.payload = Object.fromEntries(
      Object.entries(event.payload as Record<string, unknown>).reverse(),
    )
    for (const row of store.cc_validation_runs.values()) {
      row.ran_at = '2026-07-14T03:35:20+00:00'
    }
    evidence.created_at = '2026-07-14T03:35:20+00:00'
    for (const row of store.cc_task_events.values()) {
      row.at = '2026-07-14T03:35:20+00:00'
    }

    await expect(client.ensureCompletionArtifacts(input)).resolves.toEqual(first)
    expect(store.cc_validation_runs.size).toBe(2)
    expect(store.cc_evidence_records.size).toBe(1)
    expect(store.cc_task_events.size).toBe(2)
    expect(fetchImpl.mock.calls.filter(([, init]) => init?.method === 'POST')).toHaveLength(10)
  })

  it('fails with integrity classification when a deterministic id contains different content', async () => {
    const fixture = completionFixture()
    const expected = expectedArtifactRows(fixture)
    const conflicting = { ...expected.validationRows[0], result: 'fail' }
    const { fetchImpl, store } = completionArtifactApi(fixture.freshTask, {
      initial: { cc_validation_runs: [conflicting] },
    })
    const client = createCrmClient(artifactConfig, deps(fetchImpl))

    await expect(
      client.ensureCompletionArtifacts({
        taskId: fixture.freshTask.id,
        expectedContract: fixture.expectedContract,
        completion: fixture.completion,
        nowIso: completionNowIso,
      }),
    ).rejects.toThrow(/integrity/i)
    expect(fetchImpl).toHaveBeenCalledTimes(3)
    expect(store.cc_evidence_records.size).toBe(0)
    expect(store.cc_task_events.size).toBe(0)
  })

  it('repairs a partial write without duplicates and keeps evidence before completion', async () => {
    const fixture = completionFixture()
    const expected = expectedArtifactRows(fixture)
    const { fetchImpl, store } = completionArtifactApi(fixture.freshTask, {
      failOnce: (table, row) => table === 'cc_task_events' && row.type === 'evidence_added',
    })
    const client = createCrmClient(artifactConfig, deps(fetchImpl))
    const input = {
      taskId: fixture.freshTask.id,
      expectedContract: fixture.expectedContract,
      completion: fixture.completion,
      nowIso: completionNowIso,
    }

    const firstError = await capturedError(() => client.ensureCompletionArtifacts(input))
    expect(firstError.message).not.toContain(serviceRoleKey)
    expect(firstError.message).not.toContain('artifact-secret')
    expect(firstError.message).not.toContain('owner@example.com')
    expect(firstError.message).toContain('[REDACTED]')
    expect(firstError.message.length).toBeLessThanOrEqual(800)
    expect(store.cc_validation_runs.size).toBe(2)
    expect(store.cc_evidence_records.size).toBe(1)
    expect(store.cc_task_events.size).toBe(0)

    await expect(client.ensureCompletionArtifacts(input)).resolves.toEqual(expected.result)
    expect(store.cc_validation_runs.size).toBe(2)
    expect(store.cc_evidence_records.size).toBe(1)
    expect(store.cc_task_events.size).toBe(2)
    expect(store.cc_task_events.has(expected.result.evidenceAddedEventId)).toBe(true)
    expect(store.cc_task_events.has(expected.result.completionEventId)).toBe(true)
    expect(fetchImpl.mock.calls.some(([, init]) => init?.method === 'PATCH')).toBe(false)
  })

  it.each([
    ['cancellation is requested', (freshTask: CcTask) => {
      ;(freshTask.metadata.ownest as Record<string, unknown>).cancelRequestedAt =
        '2026-07-12T00:04:30.000Z'
    }],
    ['the mission contract changes', (freshTask: CcTask) => {
      freshTask.title = 'Tampered mission title'
    }],
  ] as const)(
    're-attests full completion authority before the immutable completed event when %s',
    async (_label, mutate) => {
      const fixture = completionFixture()
      const expected = expectedArtifactRows(fixture)
      const changedTask = structuredClone(fixture.freshTask)
      mutate(changedTask)
      const { fetchImpl, store } = completionArtifactApi(fixture.freshTask, {
        taskReads: [fixture.freshTask, changedTask],
      })
      const client = createCrmClient(artifactConfig, deps(fetchImpl))

      await expect(
        client.ensureCompletionArtifacts({
          taskId: fixture.freshTask.id,
          expectedContract: fixture.expectedContract,
          completion: fixture.completion,
          nowIso: completionNowIso,
        }),
      ).rejects.toThrow()

      expect(fetchImpl.mock.calls.filter(([, init]) => init?.method === 'POST')).toHaveLength(4)
      expect(store.cc_validation_runs.size).toBe(2)
      expect(store.cc_evidence_records.size).toBe(1)
      expect(store.cc_task_events.has(expected.result.evidenceAddedEventId)).toBe(true)
      expect(store.cc_task_events.has(expected.result.completionEventId)).toBe(false)
    },
  )

  it.each([
    ['changed mission field', (value: CompletionFixture) => {
      value.freshTask.title = 'Tampered mission title'
    }],
    ['changed validation digest', (value: CompletionFixture) => {
      const requirements = value.expectedContract.validationRequirements as unknown as Array<Record<string, unknown>>
      requirements[0] = { ...requirements[0], digest: `hmac-sha256:${'a'.repeat(64)}` }
    }],
    ['wrong state attempt', (value: CompletionFixture) => {
      ;(value.freshTask.metadata.ownest as Record<string, unknown>).attemptId = 'attempt-2'
    }],
    ['wrong state rollout', (value: CompletionFixture) => {
      ;(value.freshTask.metadata.ownest as Record<string, unknown>).rolloutId = 'rollout-2'
    }],
    ['wrong Hermes task projection', (value: CompletionFixture) => {
      ;(value.freshTask.metadata.ownest as Record<string, unknown>).hermesTaskId = 'hermes-2'
    }],
    ['wrong Hermes profile projection', (value: CompletionFixture) => {
      ;(value.freshTask.metadata.ownest as Record<string, unknown>).hermesProfile = 'agent7'
    }],
    ['wrong Hermes board projection', (value: CompletionFixture) => {
      ;(value.freshTask.metadata.ownest as Record<string, unknown>).hermesBoard = 'other-board'
    }],
    ['wrong completion phase', (value: CompletionFixture) => {
      ;(value.freshTask.metadata.ownest as Record<string, unknown>).completionPhase = 'dispatched'
    }],
    ['cancel requested timestamp', (value: CompletionFixture) => {
      ;(value.freshTask.metadata.ownest as Record<string, unknown>).cancelRequestedAt =
        '2026-07-12T00:03:00.000Z'
    }],
    ['cancel reason', (value: CompletionFixture) => {
      ;(value.freshTask.metadata.ownest as Record<string, unknown>).cancelReason =
        'Founder requested cancellation'
    }],
    ['requested stop phase', (value: CompletionFixture) => {
      ;(value.freshTask.metadata.ownest as Record<string, unknown>).stopPhase = 'requested'
    }],
    ['reclaimed stop phase', (value: CompletionFixture) => {
      ;(value.freshTask.metadata.ownest as Record<string, unknown>).stopPhase = 'reclaimed'
    }],
    ['unassigned stop phase', (value: CompletionFixture) => {
      ;(value.freshTask.metadata.ownest as Record<string, unknown>).stopPhase = 'unassigned'
    }],
    ['archived stop phase', (value: CompletionFixture) => {
      ;(value.freshTask.metadata.ownest as Record<string, unknown>).stopPhase = 'archived'
    }],
    ['wrong lease owner', (value: CompletionFixture) => {
      ;(value.freshTask.metadata.ownest as Record<string, unknown>).leaseOwner = 'other-worker'
    }],
    ['expired lease', (value: CompletionFixture) => {
      ;(value.freshTask.metadata.ownest as Record<string, unknown>).leaseExpiresAt =
        '2026-07-12T00:03:59.999Z'
    }],
    ['lease expiring at trusted now', (value: CompletionFixture) => {
      ;(value.freshTask.metadata.ownest as Record<string, unknown>).leaseExpiresAt = completionNowIso
    }],
    ['wrong persisted receipt digest', (value: CompletionFixture) => {
      ;(value.freshTask.metadata.ownest as Record<string, unknown>).receiptSha256 = `sha256:${'a'.repeat(64)}`
    }],
    ['wrong receipt attempt', (value: CompletionFixture) => {
      ;(value.completion.receipt as unknown as Record<string, unknown>).attemptId = 'attempt-2'
    }],
    ['wrong receipt Hermes task', (value: CompletionFixture) => {
      ;(value.completion.receipt as unknown as Record<string, unknown>).hermesTaskId = 'hermes-2'
    }],
    ['wrong receipt validation digest', (value: CompletionFixture) => {
      const results = value.completion.receipt?.validationResults as unknown as Array<Record<string, unknown>>
      results[0] = { ...results[0], requirementDigest: `hmac-sha256:${'a'.repeat(64)}` }
    }],
    ['ephemeral receipt evidence', (value: CompletionFixture) => {
      const evidence = value.completion.receipt?.evidence as unknown as Array<Record<string, unknown>>
      evidence[0] = { ...evidence[0], uri: 'file:///tmp/evidence.json' }
    }],
    ['oversized completion summary', (value: CompletionFixture) => {
      value.completion.summary = 'x'.repeat(32 * 1024 + 1)
    }],
  ] as const)('rejects %s after the founder-scoped preflight read and before writes', async (_label, mutate) => {
    const fixture = structuredClone(completionFixture())
    mutate(fixture)
    const { fetchImpl } = completionArtifactApi(fixture.freshTask)
    const client = createCrmClient(artifactConfig, deps(fetchImpl))

    await expect(
      client.ensureCompletionArtifacts({
        taskId: fixture.freshTask.id,
        expectedContract: fixture.expectedContract,
        completion: fixture.completion,
        nowIso: completionNowIso,
      }),
    ).rejects.toThrow()
    expect(fetchImpl).toHaveBeenCalledTimes(1)
    expect(fetchImpl.mock.calls[0]?.[1]?.method).toBe('GET')
  })

  it.each([
    ['missing canary', { ...artifactConfig, canaryTaskId: null }],
    ['wrong canary', { ...artifactConfig, canaryTaskId: 'task-2' }],
    ['missing rollout', { ...artifactConfig, rolloutId: null }],
    ['wrong rollout', { ...artifactConfig, rolloutId: 'rollout-2' }],
    ['wrong profile', { ...artifactConfig, hermesProfile: 'agent7' }],
    ['wrong board', { ...artifactConfig, hermesBoard: 'other-board' }],
  ])('rejects %s before service-role fetch', async (_label, invalidConfig) => {
    const fixture = completionFixture()
    const { fetchImpl } = completionArtifactApi(fixture.freshTask)
    const client = createCrmClient(invalidConfig, deps(fetchImpl))

    await expect(
      client.ensureCompletionArtifacts({
        taskId: fixture.freshTask.id,
        expectedContract: fixture.expectedContract,
        completion: fixture.completion,
        nowIso: completionNowIso,
      }),
    ).rejects.toThrow()
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('rejects a cross-founder task returned through service-role bypass before writes', async () => {
    const fixture = completionFixture()
    fixture.freshTask.founder_id = 'different-founder'
    const { fetchImpl } = completionArtifactApi(fixture.freshTask)
    const client = createCrmClient(artifactConfig, deps(fetchImpl))

    await expect(
      client.ensureCompletionArtifacts({
        taskId: fixture.freshTask.id,
        expectedContract: fixture.expectedContract,
        completion: fixture.completion,
        nowIso: completionNowIso,
      }),
    ).rejects.toThrow(/founder/i)
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  it.each([
    ['non-timestamp text', 'not-a-time'],
    ['non-canonical offset', '2026-07-12T10:04:00.000+10:00'],
    ['impossible calendar date', '2026-02-30T00:04:00.000Z'],
  ])('rejects malformed trusted now (%s) before service-role fetch', async (_label, nowIso) => {
    const fixture = completionFixture()
    const { fetchImpl } = completionArtifactApi(fixture.freshTask)
    const client = createCrmClient(artifactConfig, deps(fetchImpl))

    await expect(
      client.ensureCompletionArtifacts({
        taskId: fixture.freshTask.id,
        expectedContract: fixture.expectedContract,
        completion: fixture.completion,
        nowIso,
      }),
    ).rejects.toThrow(/input/i)
    expect(fetchImpl).not.toHaveBeenCalled()
  })
})

describe('append-only writes', () => {
  it('appends a founder-owned event with the configured worker as default actor', async () => {
    const fetchImpl = mockFetch(new Response(null, { status: 201 }))

    await appendTaskEvent(
      { taskId: 'task-1', type: 'started', payload: { attemptId: 'attempt-1' } },
      config,
      deps(fetchImpl),
    )

    const { url, init } = firstRequest(fetchImpl)
    expect(url.pathname).toBe('/rest/v1/cc_task_events')
    expect(url.search).toBe('')
    expect(init.method).toBe('POST')
    expect(requestBody(init)).toEqual({
      founder_id: config.founderId,
      task_id: 'task-1',
      type: 'started',
      actor: config.workerId,
      payload: { attemptId: 'attempt-1' },
    })
  })

  it('accepts only an allowed event type', async () => {
    const fetchImpl = mockFetch(new Response(null, { status: 201 }))

    await expect(
      appendTaskEvent(
        { taskId: 'task-1', type: 'arbitrary-event' } as never,
        config,
        deps(fetchImpl),
      ),
    ).rejects.toThrow()
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('appends founder-owned evidence with explicit values and safe defaults', async () => {
    const fetchImpl = mockFetch(new Response(null, { status: 201 }))

    await appendEvidence(
      {
        taskId: 'task-1',
        wikiPath: 'Wiki/OWNEST/task-1.md',
        kind: 'validation',
        sources: [{ url: 'https://example.invalid/evidence' }],
        confidence: 'high',
      },
      config,
      deps(fetchImpl),
    )
    await appendEvidence(
      { taskId: 'task-2', wikiPath: 'Wiki/OWNEST/task-2.md' },
      config,
      deps(fetchImpl),
    )

    const first = fetchImpl.mock.calls[0]
    const second = fetchImpl.mock.calls[1]
    if (!first || !second) throw new Error('expected two evidence requests')
    expect(new URL(String(first[0])).pathname).toBe('/rest/v1/cc_evidence_records')
    expect(first[1]?.method).toBe('POST')
    expect(requestBody(first[1] ?? {})).toEqual({
      founder_id: config.founderId,
      task_id: 'task-1',
      wiki_path: 'Wiki/OWNEST/task-1.md',
      kind: 'validation',
      sources: [{ url: 'https://example.invalid/evidence' }],
      confidence: 'high',
    })
    expect(requestBody(second[1] ?? {})).toEqual({
      founder_id: config.founderId,
      task_id: 'task-2',
      wiki_path: 'Wiki/OWNEST/task-2.md',
      kind: 'brief',
      sources: [],
      confidence: 'medium',
    })
  })
})

describe('request failure handling', () => {
  it.each([
    [
      'candidate GET',
      (fetchImpl: typeof fetch) => listCandidateTasks(config, deps(fetchImpl)),
    ],
    [
      'mirrored GET',
      (fetchImpl: typeof fetch) => listMirroredTasks(config, deps(fetchImpl)),
    ],
    [
      'CAS PATCH',
      (fetchImpl: typeof fetch) =>
        compareAndSetTask(
          { taskId: 'task-1', expectedStatus: 'queued', expectedUpdatedAt, patch: { status: 'running' } },
          config,
          deps(fetchImpl),
        ),
    ],
    [
      'event POST',
      (fetchImpl: typeof fetch) =>
        appendTaskEvent({ taskId: 'task-1', type: 'started' }, config, deps(fetchImpl)),
    ],
    [
      'evidence POST',
      (fetchImpl: typeof fetch) =>
        appendEvidence(
          { taskId: 'task-1', wikiPath: 'Wiki/OWNEST/task-1.md' },
          config,
          deps(fetchImpl),
        ),
    ],
  ])('rejects a non-2xx %s with a redacted capped error', async (_label, run) => {
    const body = `${serviceRoleKey}:${'x'.repeat(2_000)}`
    const fetchImpl = mockFetch(new Response(body, { status: 503, statusText: serviceRoleKey }))

    const error = await capturedError(() => run(fetchImpl))

    expect(error.message).toContain('503')
    expect(error.message).not.toContain(serviceRoleKey)
    expect(error.message.length).toBeLessThanOrEqual(800)
  })

  it('redacts and caps a fetch rejection without logging request secrets', async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockRejectedValue(new Error(`${serviceRoleKey}:${'network-detail'.repeat(200)}`))
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined)
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    const error = await capturedError(() => listCandidateTasks(config, deps(fetchImpl)))

    expect(error.message).not.toContain(serviceRoleKey)
    expect(error.message.length).toBeLessThanOrEqual(800)
    expect(log).not.toHaveBeenCalled()
    expect(errorLog).not.toHaveBeenCalled()
  })

  it('streams, cancels, and caps an oversized non-2xx response without response helpers', async () => {
    const oversized = streamingResponse(`${serviceRoleKey}:${'x'.repeat(2 * 1024 * 1024)}`, 503)
    const clone = vi.spyOn(oversized.response, 'clone')
    const text = vi.spyOn(oversized.response, 'text')
    const json = vi.spyOn(oversized.response, 'json')
    const fetchImpl = mockFetch(oversized.response)

    const error = await capturedError(() => listCandidateTasks(config, deps(fetchImpl)))

    expect(oversized.wasCancelled()).toBe(true)
    expect(clone).not.toHaveBeenCalled()
    expect(text).not.toHaveBeenCalled()
    expect(json).not.toHaveBeenCalled()
    expect(error.message).toContain('503')
    expect(error.message).not.toContain(serviceRoleKey)
    expect(error.message.length).toBeLessThanOrEqual(800)
  })

  it('attaches a deterministic bounded timeout signal without sleeping', async () => {
    const timeout = vi.spyOn(AbortSignal, 'timeout')
    const fetchImpl = mockFetch(jsonResponse([]))

    await listCandidateTasks(config, deps(fetchImpl))

    expect(timeout).toHaveBeenCalledTimes(1)
    const timeoutMs = timeout.mock.calls[0]?.[0]
    expect(timeoutMs).toBe(10_000)
    const { init } = firstRequest(fetchImpl)
    expect(init.signal).toBe(timeout.mock.results[0]?.value)
  })

  it('refuses a cross-origin redirect before credentials can be forwarded', async () => {
    const attackerFetch = vi.fn<typeof fetch>()
    const fetchImpl = vi.fn<typeof fetch>().mockImplementation(async (_input, init) => {
      if (init?.redirect !== 'error') {
        await attackerFetch('https://attacker.example/collect', init)
      }
      return new Response(null, {
        status: 302,
        headers: { location: 'https://attacker.example/collect' },
      })
    })

    await expect(listCandidateTasks(config, deps(fetchImpl))).rejects.toThrow(/302/)

    expect(fetchImpl).toHaveBeenCalledTimes(1)
    expect(attackerFetch).not.toHaveBeenCalled()
    const { init } = firstRequest(fetchImpl as ReturnType<typeof mockFetch>)
    expect(init.redirect).toBe('error')
  })
})

describe('createCrmClient', () => {
  it('binds the configured founder scope and injected fetch to every operation', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockImplementation(async (_input, init) =>
      init?.method === 'HEAD' ? countResponse('*/0', 200) : jsonResponse([]),
    )
    const client = createCrmClient(config, deps(fetchImpl))

    await client.listCandidateTasks()
    await client.listMirroredTasks()
    await client.getOwnedTask('task-1')
    await client.listManagedTasks()
    await client.countRolloutClaims('rollout-client-test')
    await client.countDailyClaims(
      '2026-07-12T00:00:00.000Z',
      '2026-07-13T00:00:00.000Z',
    )
    await client.compareAndSetTask({
      taskId: 'task-1',
      expectedStatus: 'queued',
      expectedUpdatedAt,
      patch: { status: 'running' },
    })
    await client.appendTaskEvent({ taskId: 'task-1', type: 'started' })
    await client.appendEvidence({ taskId: 'task-1', wikiPath: 'Wiki/OWNEST/task-1.md' })

    expect(fetchImpl).toHaveBeenCalledTimes(11)
    for (const [, init] of fetchImpl.mock.calls) {
      expect(init?.redirect).toBe('error')
    }
    for (const [input] of fetchImpl.mock.calls.slice(0, 9)) {
      const url = new URL(String(input))
      expect(url.pathname).toBe('/rest/v1/cc_tasks')
      expect(url.searchParams.get('founder_id')).toBe(`eq.${config.founderId}`)
    }
    expect(
      new URL(String(fetchImpl.mock.calls[6]?.[0])).searchParams.get(
        'metadata->ownest->>rolloutId',
      ),
    ).toBe('eq.rollout-client-test')
    expect(
      new URL(String(fetchImpl.mock.calls[7]?.[0])).searchParams.getAll(
        'metadata->ownest->>claimedAt',
      ),
    ).toEqual([
      'gte.2026-07-12T00:00:00.000Z',
      'lt.2026-07-13T00:00:00.000Z',
    ])
  })
})
