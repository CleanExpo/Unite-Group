import { EventEmitter } from 'node:events'
import { PassThrough } from 'node:stream'
import type { ChildProcess } from 'node:child_process'
import { describe, expect, it, vi } from 'vitest'
import {
  MAX_MISSION_TEXT_LENGTH,
  buildMissionContract,
  computeMissionDigest,
  generateIntegrityNonce,
  idempotencyKey,
  redactMissionText,
  sha256Digest,
} from './policy.js'
import {
  HERMES_PROCESS_KILL_GRACE_MS,
  HERMES_PROCESS_STDERR_MAX_BYTES,
  HERMES_PROCESS_STDOUT_MAX_BYTES,
  HERMES_PROCESS_TIMEOUT_MS,
  MAX_VALIDATION_TEXT_LENGTH,
  createProcessRunner,
  createHermesClient,
  defaultProcessRunner,
  mapHermesPriority,
} from './hermes.js'
import type {
  CcTask,
  HardenedOwnestStateV1,
  HermesTask,
  OwnestConfig,
  OwnestMissionContractV1,
  ProcessResult,
  ProcessRunner,
} from './types.js'

const integrityNonce = generateIntegrityNonce()

const config: OwnestConfig = {
  supabaseUrl: 'https://example.invalid',
  serviceRoleKey: 'unused-in-hermes-adapter',
  founderId: 'founder-1',
  workerId: 'worker-1',
  hermesCwd: '/tmp/hermes-workspace',
  hermesProfile: 'ownest',
  hermesBoard: 'unite-group-ownest',
  rolloutId: 'rollout-1',
  canaryTaskId: 'task-1',
  live: true,
  canaryLimit: 1,
  maxInProgress: 1,
  leaseMs: 300_000,
  dailyDispatchLimit: 1,
}

function task(overrides: Partial<CcTask> = {}): CcTask {
  return {
    id: 'task-1',
    founder_id: 'founder-1',
    title: 'Research customer retention patterns',
    objective: 'Prepare an internal advisory brief with cited evidence.',
    priority: 'P2',
    status: 'queued',
    agent_owner: 'Hermes',
    risk_level: 'low',
    execution_mode: 'advisory',
    dependencies: [],
    human_approval_required: false,
    validation_required: ['Cite the source data', 'Explain material uncertainty'],
    metadata: {},
    created_at: '2026-07-12T00:00:00.000Z',
    updated_at: '2026-07-12T00:00:00.000Z',
    ...overrides,
  }
}

function claimedTask(
  overrides: Partial<CcTask> = {},
  stateOverrides: Partial<HardenedOwnestStateV1> = {},
): CcTask {
  const missionTask = task({ ...overrides, status: 'running' })
  const state: HardenedOwnestStateV1 = {
    version: 1,
    crmTaskId: missionTask.id,
    idempotencyKey: idempotencyKey(
      missionTask.id,
      'rollout-1',
      'attempt-1',
      config.hermesProfile,
      config.hermesBoard,
    ),
    hermesTaskId: null,
    attemptId: 'attempt-1',
    leaseOwner: 'worker-1',
    leaseExpiresAt: '2099-01-01T00:00:00.000Z',
    lastHeartbeatAt: '2026-07-12T00:00:00.000Z',
    dispatchedAt: null,
    reconciledAt: null,
    evidenceUri: null,
    gateState: 'eligible',
    lastError: null,
    claimedAt: '2026-07-12T00:00:00.000Z',
    rolloutId: 'rollout-1',
    hermesProfile: config.hermesProfile,
    hermesBoard: config.hermesBoard,
    integrityNonce,
    missionDigest: computeMissionDigest(missionTask, integrityNonce),
    failureCount: 0,
    failureClass: null,
    failureCode: null,
    nextRetryAt: null,
    completionPhase: 'claimed',
    receiptSha256: null,
    cancelRequestedAt: null,
    cancelReason: null,
    stopPhase: null,
    ...stateOverrides,
  }
  return {
    ...missionTask,
    metadata: { ...missionTask.metadata, ownest: state },
  }
}

function contractFor(
  taskValue: CcTask = task(),
  overrides: Partial<OwnestMissionContractV1> = {},
): OwnestMissionContractV1 {
  return {
    ...buildMissionContract(
      taskValue,
      'attempt-1',
      'rollout-1',
      integrityNonce,
      config.hermesProfile,
      config.hermesBoard,
    ),
    ...overrides,
  }
}

function createWithContract(
  client: ReturnType<typeof createHermesClient>,
  taskValue: CcTask = claimedTask(),
) {
  return client.createMission(taskValue, contractFor(taskValue))
}

function showWithContract(
  client: ReturnType<typeof createHermesClient>,
  hermesTaskId: string,
) {
  return client.showMission(hermesTaskId, contractFor())
}

function stopWithContract(
  client: ReturnType<typeof createHermesClient>,
  cause: 'cancel-requested' | 'authority-revoked' | 'lease-expired' | 'operator-stop' =
    'cancel-requested',
) {
  return client.stopMission('hermes-1', contractFor(), cause)
}

/** Exact task object emitted by the installed Hermes 0.18.2 `_task_to_dict`. */
function liveTask(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'hermes-1',
    title: 'Research customer retention patterns',
    body: 'Mission body',
    assignee: 'ownest',
    status: 'running',
    priority: 60,
    tenant: 'unite-group',
    workspace_kind: 'scratch',
    workspace_path: null,
    branch_name: null,
    project_id: null,
    created_by: 'crm-ownest',
    created_at: 1_784_000_000,
    started_at: null,
    completed_at: null,
    result: null,
    skills: ['nexus', 'forward-planner', 'verify-test'],
    max_retries: 2,
    session_id: null,
    workflow_template_id: null,
    current_step_key: null,
    ...overrides,
  }
}

function liveShow(
  taskValue: Record<string, unknown> = liveTask(),
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    task: taskValue,
    latest_summary: null,
    parents: [],
    children: [],
    comments: [],
    events: [],
    runs: [],
    ...overrides,
  }
}

function liveRun(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 7,
    profile: 'ownest',
    step_key: null,
    status: 'done',
    outcome: 'completed',
    summary: 'Completed the retention evidence brief.',
    error: null,
    metadata: null,
    worker_pid: 4321,
    started_at: 1_784_000_000,
    ended_at: 1_784_000_120,
    ...overrides,
  }
}

function completionReceipt(
  hermesTaskId = 'hermes-1',
  contract: OwnestMissionContractV1 = contractFor(),
): Record<string, unknown> {
  return {
    schema: 'ownest.completion.v1',
    crmTaskId: contract.crmTaskId,
    hermesTaskId,
    attemptId: contract.attemptId,
    rolloutId: contract.rolloutId,
    missionDigest: contract.missionDigest,
    verdict: 'passed',
    evidence: [
      {
        id: 'ev-001',
        kind: 'research',
        uri: 'https://evidence.example.com/reports/retention',
        digest: sha256Digest('retention-evidence'),
      },
    ],
    validationResults: contract.validationRequirements.map((requirement) => ({
      requirementId: requirement.id,
      requirementDigest: requirement.digest,
      status: 'passed',
      evidenceIds: ['ev-001'],
    })),
  }
}

function completionEvidence(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'ev-001',
    kind: 'research',
    uri: 'https://evidence.example.com/reports/retention',
    digest: sha256Digest('retention-evidence'),
    ...overrides,
  }
}

function completionValidation(
  index = 0,
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  const requirement = contractFor().validationRequirements[index]
  if (!requirement) throw new Error(`missing validation requirement ${index}`)
  return {
    requirementId: requirement.id,
    requirementDigest: requirement.digest,
    status: 'passed',
    evidenceIds: ['ev-001'],
    ...overrides,
  }
}

function completedLiveShow(
  hermesTaskId = 'hermes-1',
  contract: OwnestMissionContractV1 = contractFor(),
  options: {
    receipt?: Record<string, unknown>
    metadata?: unknown
    run?: Record<string, unknown>
    task?: Record<string, unknown>
    show?: Record<string, unknown>
    runs?: readonly unknown[]
  } = {},
): Record<string, unknown> {
  const summary = 'Completed the retention evidence brief.'
  const receipt = { ...completionReceipt(hermesTaskId, contract), ...options.receipt }
  const metadata = Object.prototype.hasOwnProperty.call(options, 'metadata')
    ? options.metadata
    : { ownest: receipt }
  const run = liveRun({ summary, metadata, ...options.run })
  return liveShow(
    liveTask({
      id: hermesTaskId,
      status: 'done',
      completed_at: 1_784_000_120,
      ...options.task,
    }),
    {
      latest_summary: run.summary,
      runs: options.runs ?? [run],
      ...options.show,
    },
  )
}

function normalisedTask(overrides: Partial<HermesTask> = {}): HermesTask {
  return {
    id: 'hermes-1',
    status: 'running',
    title: 'Research customer retention patterns',
    assignee: 'ownest',
    idempotencyKey: idempotencyKey(
      'task-1',
      'rollout-1',
      'attempt-1',
      config.hermesProfile,
      config.hermesBoard,
    ),
    summary: null,
    runId: null,
    completedAt: null,
    receipt: null,
    receiptSha256: null,
    latestRun: null,
    evidenceUri: null,
    error: null,
    ...overrides,
  }
}

function jsonResult(payload: unknown, overrides: Partial<ProcessResult> = {}): ProcessResult {
  return {
    exitCode: 0,
    stdout: JSON.stringify(payload),
    stderr: '',
    ...overrides,
  }
}

function mockRunner(result: ProcessResult = jsonResult(liveTask())) {
  return vi.fn<ProcessRunner>().mockResolvedValue(result)
}

function mockSequence(...results: ProcessResult[]) {
  const run = vi.fn<ProcessRunner>()
  for (const result of results) run.mockResolvedValueOnce(result)
  return run
}

const STOP_REASON = 'ownest:cancel-requested:attempt-1'
const STOP_BASE_ARGS = [
  '--profile',
  'ownest',
  'kanban',
  '--board',
  'unite-group-ownest',
] as const

function terminationMetadata(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    prevPid: 4321,
    hostLocal: true,
    terminationAttempted: true,
    terminated: true,
    sigkill: false,
    ...overrides,
  }
}

function activeStopShow(): Record<string, unknown> {
  const active = liveRun({
    status: 'running',
    outcome: null,
    summary: null,
    error: null,
    metadata: null,
    ended_at: null,
  })
  return liveShow(liveTask({ status: 'running', assignee: 'ownest' }), {
    latest_summary: null,
    runs: [active],
  })
}

function reclaimedRun(
  metadata: unknown = terminationMetadata(),
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return liveRun({
    status: 'reclaimed',
    outcome: 'reclaimed',
    summary: null,
    error: `manual_reclaim: ${STOP_REASON}`,
    metadata,
    worker_pid: null,
    ended_at: 1_784_000_121,
    ...overrides,
  })
}

function stoppedShow(
  status: 'ready' | 'blocked' | 'review' | 'archived' = 'ready',
  assignee: string | null = 'ownest',
  run: Record<string, unknown> | null = reclaimedRun(),
): Record<string, unknown> {
  return liveShow(liveTask({ status, assignee }), {
    latest_summary: null,
    runs: run ? [run] : [],
  })
}

function successfulStopResults(
  metadata: Record<string, unknown> = terminationMetadata(),
  reclaimResult: ProcessResult = { exitCode: 0, stdout: '', stderr: '' },
): ProcessResult[] {
  const reclaimed = reclaimedRun(metadata)
  return [
    jsonResult(activeStopShow()),
    reclaimResult,
    jsonResult(stoppedShow('ready', 'ownest', reclaimed)),
    { exitCode: 0, stdout: '', stderr: '' },
    jsonResult(stoppedShow('ready', null, reclaimed)),
    { exitCode: 0, stdout: '', stderr: '' },
    jsonResult(stoppedShow('archived', null, reclaimed)),
  ]
}

async function showPayload(
  payload: unknown,
  hermesTaskId = 'hermes-1',
  contract: OwnestMissionContractV1 = contractFor(),
  configValue: OwnestConfig = config,
): Promise<HermesTask> {
  const run = mockRunner(jsonResult(payload))
  return createHermesClient(configValue, { run }).showMission(hermesTaskId, contract)
}

async function expectReceiptReview(payload: unknown, code: string): Promise<HermesTask> {
  const result = await showPayload(payload)
  expect(result).toMatchObject({
    status: 'review',
    summary: null,
    runId: null,
    completedAt: null,
    receipt: null,
    receiptSha256: null,
    evidenceUri: null,
    error: `ownest-receipt-invalid:${code}`,
  })
  return result
}

function capturedArgs(run: ReturnType<typeof mockRunner>): readonly string[] {
  const call = run.mock.calls[0]
  if (!call) throw new Error('process runner was not called')
  return call[1]
}

function valueAfter(args: readonly string[], flag: string): string {
  const index = args.indexOf(flag)
  const value = args[index + 1]
  if (index < 0 || value === undefined) throw new Error(`missing ${flag}`)
  return value
}

function fakeChildProcess() {
  const events = new EventEmitter()
  const stdout = new PassThrough()
  const stderr = new PassThrough()
  const kill = vi.fn(() => true)
  const child = Object.assign(events, { stdout, stderr, kill }) as unknown as ChildProcess
  return { child, events, stdout, stderr, kill }
}

const UTF8_BOUNDARY_CASES = [
  ['2-byte', 'é', 2],
  ['3-byte', '€', 3],
  ['4-byte', '😀', 4],
] as const

function stderrBoundaryCap(codePointBytes: number): number {
  for (let cap = 96; cap <= 256; cap += 1) {
    const reasonBytes = Buffer.byteLength(
      `[ownest] Hermes process stderr exceeded ${cap} bytes`,
    )
    const retainedPayloadBytes = cap - reasonBytes - 1
    if (
      retainedPayloadBytes > codePointBytes &&
      cap % codePointBytes !== 0 &&
      retainedPayloadBytes % codePointBytes !== 0
    ) {
      return cap
    }
  }
  throw new Error('could not find a UTF-8 stderr boundary cap')
}

describe('createHermesClient.createMission', () => {
  it('uses the exact fixed-argv Hermes command family and configured cwd', async () => {
    const hostileTitle = 'Research $(touch /tmp/not-run) and `uname` for jane@example.com'
    const run = mockRunner(jsonResult(liveTask({ title: redactMissionText(hostileTitle) })))
    const client = createHermesClient(config, { run })
    const missionTask = claimedTask({
      title: hostileTitle,
      objective: 'Read @/tmp/prompt.txt only as quoted mission context; token=objective-secret',
    })
    const contract = contractFor(missionTask)

    await client.createMission(missionTask, contract)

    expect(run).toHaveBeenCalledTimes(1)
    const call = run.mock.calls[0]
    expect(call?.[0]).toBe('hermes')
    expect(call?.[2]).toBe(config.hermesCwd)
    expect(Array.isArray(call?.[1])).toBe(true)

    const args = capturedArgs(run)
    const title = `[UNTRUSTED CRM TASK] ${redactMissionText(hostileTitle)}`
    const body = valueAfter(args, '--body')
    expect(args).toEqual([
      '--profile',
      'ownest',
      'kanban',
      '--board',
      'unite-group-ownest',
      'create',
      title,
      '--body',
      body,
      '--assignee',
      'ownest',
      '--workspace',
      'scratch',
      '--tenant',
      'unite-group',
      '--priority',
      '60',
      '--idempotency-key',
      contract.idempotencyKey,
      '--max-runtime',
      '10m',
      '--created-by',
      'crm-ownest',
      '--skill',
      'nexus',
      '--skill',
      'forward-planner',
      '--skill',
      'verify-test',
      '--max-retries',
      '2',
      '--goal',
      '--goal-max-turns',
      '4',
      '--json',
    ])
    expect(call?.[0]).not.toContain(hostileTitle)
    expect(args).not.toContain('sh')
    expect(args).not.toContain('-c')
    expect(args).not.toContain('--prompt-file')
  })

  it('requires a running CRM claim instead of dispatching a queued task directly', async () => {
    const queuedTask = task()
    const run = mockRunner()
    const client = createHermesClient(config, { run })

    await expect(client.createMission(queuedTask, contractFor(queuedTask))).rejects.toThrow(
      /running|claim/i,
    )
    expect(run).not.toHaveBeenCalled()
  })

  it('refuses to invoke Hermes while OWNEST live mode is off', async () => {
    const missionTask = claimedTask()
    const run = mockRunner()
    const client = createHermesClient({ ...config, live: false }, { run })

    await expect(client.createMission(missionTask, contractFor(missionTask))).rejects.toThrow(
      /live|armed/i,
    )
    expect(run).not.toHaveBeenCalled()
  })

  it('rejects a claimed task outside the configured founder scope', async () => {
    const missionTask = claimedTask({ founder_id: 'other-founder' })
    const run = mockRunner()
    const client = createHermesClient(config, { run })

    await expect(client.createMission(missionTask, contractFor(missionTask))).rejects.toThrow(
      /founder|scope/i,
    )
    expect(run).not.toHaveBeenCalled()
  })

  it.each([
    ['missing nominated task', { canaryTaskId: null }],
    ['wrong nominated task', { canaryTaskId: 'task-2' }],
    ['missing rollout', { rolloutId: null }],
  ])('rejects a live create with %s', async (_label, override) => {
    const missionTask = claimedTask()
    const run = mockRunner()
    const client = createHermesClient({ ...config, ...override }, { run })

    await expect(client.createMission(missionTask, contractFor(missionTask))).rejects.toThrow(
      /canary|nominated|rollout/i,
    )
    expect(run).not.toHaveBeenCalled()
  })

  it('rejects a claim leased to a different worker', async () => {
    const missionTask = claimedTask()
    const run = mockRunner()
    const client = createHermesClient({ ...config, workerId: 'other-worker' }, { run })

    await expect(client.createMission(missionTask, contractFor(missionTask))).rejects.toThrow(
      /lease|worker/i,
    )
    expect(run).not.toHaveBeenCalled()
  })

  it.each([
    ['profile', 'agent7', config.hermesBoard],
    ['board', config.hermesProfile, 'other-board'],
  ])('rejects a claim projected to a different Hermes %s', async (_field, profile, board) => {
    const missionTask = claimedTask({}, {
      hermesProfile: profile,
      hermesBoard: board,
      idempotencyKey: idempotencyKey(
        'task-1',
        'rollout-1',
        'attempt-1',
        profile,
        board,
      ),
    })
    const run = mockRunner()
    const client = createHermesClient(config, { run })

    await expect(client.createMission(missionTask, contractFor(missionTask))).rejects.toThrow(
      /profile|board|authority/i,
    )
    expect(run).not.toHaveBeenCalled()
  })

  it.each([
    ['cancellation timestamp', { cancelRequestedAt: '2026-07-12T00:01:00.000Z' }],
    ['cancellation reason', { cancelReason: 'Founder requested a safe stop' }],
    ['stop phase', { stopPhase: 'requested' }],
  ] as const)('rejects a claimed task carrying a %s', async (_label, stateOverrides) => {
    const missionTask = claimedTask({}, stateOverrides)
    const run = mockRunner()
    const client = createHermesClient(config, { run })

    await expect(client.createMission(missionTask, contractFor(missionTask))).rejects.toThrow(
      /cancel|stop/i,
    )
    expect(run).not.toHaveBeenCalled()
  })

  it('rejects an expired or exactly-expiring claim lease', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-12T00:05:00.000Z'))
    try {
      for (const leaseExpiresAt of [
        '2026-07-12T00:04:59.999Z',
        '2026-07-12T00:05:00.000Z',
      ]) {
        const missionTask = claimedTask({}, { leaseExpiresAt })
        const run = mockRunner()
        const client = createHermesClient(config, { run })

        await expect(client.createMission(missionTask, contractFor(missionTask))).rejects.toThrow(
          /lease|expired|active/i,
        )
        expect(run).not.toHaveBeenCalled()
      }
    } finally {
      vi.useRealTimers()
    }
  })

  it.each([
    ['missing hardened state', (value: CcTask) => ({ ...value, metadata: {} })],
    [
      'gated claim',
      (value: CcTask) => ({
        ...value,
        metadata: {
          ...value.metadata,
          ownest: { ...(value.metadata.ownest as object), gateState: 'gated' },
        },
      }),
    ],
    [
      'wrong completion phase',
      (value: CcTask) => ({
        ...value,
        metadata: {
          ...value.metadata,
          ownest: { ...(value.metadata.ownest as object), completionPhase: 'dispatched' },
        },
      }),
    ],
    [
      'existing Hermes mirror',
      (value: CcTask) => ({
        ...value,
        metadata: {
          ...value.metadata,
          ownest: { ...(value.metadata.ownest as object), hermesTaskId: 'hermes-existing' },
        },
      }),
    ],
  ])('rejects a running task with %s', async (_label, mutate) => {
    const missionTask = mutate(claimedTask())
    const run = mockRunner()
    const client = createHermesClient(config, { run })

    await expect(client.createMission(missionTask, contractFor(claimedTask()))).rejects.toThrow(
      /claim|state|mirror|phase|gate/i,
    )
    expect(run).not.toHaveBeenCalled()
  })

  it('requires a configured rollout id to match the persisted claim', async () => {
    const missionTask = claimedTask()
    const run = mockRunner()
    const client = createHermesClient({ ...config, rolloutId: 'different-rollout' }, { run })

    await expect(client.createMission(missionTask, contractFor(missionTask))).rejects.toThrow(
      /rollout|claim/i,
    )
    expect(run).not.toHaveBeenCalled()
  })

  it('builds a redacted, bounded CRM-authoritative safety body', async () => {
    const run = mockRunner()
    const client = createHermesClient(config, { run })
    const missionTask = claimedTask({
      objective: 'Analyse retention for owner@example.com with API_TOKEN=top-secret.',
      validation_required: [
        'Cite owner@example.com source data',
        'Record API_TOKEN=validation-secret only as a redacted fixture',
        'ATTACKER-CONTROLLED-VALIDATION-TEXT',
      ],
    })
    const contract = contractFor(missionTask)

    await client.createMission(missionTask, contract)

    const body = valueAfter(capturedArgs(run), '--body')
    expect(body.length).toBeLessThanOrEqual(MAX_MISSION_TEXT_LENGTH)
    expect(body).not.toContain('owner@example.com')
    expect(body).not.toContain('top-secret')
    expect(body).not.toContain('validation-secret')
    expect(body).toContain('[REDACTED]')
    expect(body).toContain('CRM cc_tasks is the authoritative mission ledger')
    expect(body).toContain('Hermes Kanban is a disposable execution mirror')
    expect(body).toContain('CRM task ID: task-1')
    expect(body).toContain('--- BEGIN UNTRUSTED CRM TASK CONTENT ---')
    expect(body).toContain('--- END UNTRUSTED CRM TASK CONTENT ---')
    expect(body).toContain('--- BEGIN TRUSTED OWNEST MISSION ENVELOPE ---')
    expect(body).toContain('--- END TRUSTED OWNEST MISSION ENVELOPE ---')
    expect(body).toContain('"schema": "ownest.mission.v1"')
    expect(body).toContain(`"attemptId": "${contract.attemptId}"`)
    expect(body).toContain(`"rolloutId": "${contract.rolloutId}"`)
    expect(body).toContain(`"hermesProfile": "${contract.hermesProfile}"`)
    expect(body).toContain(`"hermesBoard": "${contract.hermesBoard}"`)
    expect(body).toContain(`"missionDigest": "${contract.missionDigest}"`)
    expect(body).toContain('--- REQUIRED KANBAN COMPLETION RECEIPT ---')
    expect(body).toContain('kanban_complete')
    expect(body).toContain('"schema": "ownest.completion.v1"')
    expect(body).toContain('"validationResults"')
    expect(body).toContain('"evidence"')
    expect(body).toContain('"digest": "sha256:<64 lowercase hexadecimal characters>"')
    expect(body).toContain('"requirementId"')
    expect(body).toContain('"requirementDigest"')
    expect(body).toContain('"status": "passed"')
    expect(body).not.toContain('"sha256":')
    expect(body).not.toContain(integrityNonce)
    const untrustedBlock = body.slice(
      body.indexOf('--- BEGIN UNTRUSTED CRM TASK CONTENT ---'),
      body.indexOf('--- END UNTRUSTED CRM TASK CONTENT ---'),
    )
    const trustedBlock = body.slice(
      body.indexOf('--- BEGIN TRUSTED OWNEST MISSION ENVELOPE ---'),
      body.indexOf('--- END TRUSTED OWNEST MISSION ENVELOPE ---'),
    )
    expect(untrustedBlock).toContain('ATTACKER-CONTROLLED-VALIDATION-TEXT')
    expect(trustedBlock).not.toContain('ATTACKER-CONTROLLED-VALIDATION-TEXT')
    expect(trustedBlock).not.toContain('"text"')
    for (const requirement of contract.validationRequirements) {
      expect(trustedBlock).toContain(`"id": "${requirement.id}"`)
      expect(trustedBlock).toContain(`"digest": "${requirement.digest}"`)
    }
    expect(body).toContain('--- NON-NEGOTIABLE OWNEST SAFETY FOOTER ---')
    expect(body).toContain('"objective":')
    expect(body).toContain('"validationRequirements":')
    expect(body).toContain('Cite')
    expect(body).toMatch(/no production deployment or production database mutation/i)
    expect(body).toMatch(/no payment, purchase, invoice, or spend/i)
    expect(body).toMatch(/no secret access, credential disclosure, or privilege change/i)
    expect(body).toMatch(/no outbound email, message, publication, or other external action/i)
    expect(body).toMatch(/no destructive deletion or access-control change/i)
    expect(body).toMatch(/no merge or branch-protection change/i)
    expect(body).toMatch(/return verifiable evidence/i)
    expect(body).toMatch(/leave all gated actions blocked/i)
    expect(body).toMatch(
      /Nexus should use configured browser, Playwright, or computer-use tools when materially useful/i,
    )

    const untrustedEnd = body.indexOf('--- END UNTRUSTED CRM TASK CONTENT ---')
    const safetyFooter = body.indexOf('--- NON-NEGOTIABLE OWNEST SAFETY FOOTER ---')
    expect(untrustedEnd).toBeGreaterThan(body.indexOf('--- BEGIN UNTRUSTED CRM TASK CONTENT ---'))
    expect(safetyFooter).toBeGreaterThan(untrustedEnd)
    expect(body.toLowerCase().lastIndexOf('no production deployment')).toBeGreaterThan(safetyFooter)
    expect(body.trim()).toMatch(/leave all gated actions blocked\.$/i)
  })

  it.each([
    ['CRM task id', (contract: OwnestMissionContractV1) => ({ ...contract, crmTaskId: 'other-task' })],
    [
      'idempotency key',
      (contract: OwnestMissionContractV1) => ({ ...contract, idempotencyKey: 'cc-task:other:v1' }),
    ],
    ['rollout id', (contract: OwnestMissionContractV1) => ({ ...contract, rolloutId: 'bad rollout' })],
    [
      'mission digest',
      (contract: OwnestMissionContractV1) => ({
        ...contract,
        missionDigest: `sha256:${'a'.repeat(64)}` as never,
      }),
    ],
    [
      'validation text',
      (contract: OwnestMissionContractV1) => ({
        ...contract,
        validationRequirements: contract.validationRequirements.map((requirement, index) =>
          index === 0 ? { ...requirement, text: 'Changed validation text' } : requirement,
        ),
      }),
    ],
    [
      'validation digest',
      (contract: OwnestMissionContractV1) => ({
        ...contract,
        validationRequirements: contract.validationRequirements.map((requirement, index) =>
          index === 0 ? { ...requirement, digest: `sha256:${'b'.repeat(64)}` as never } : requirement,
        ),
      }),
    ],
  ])('rejects a mismatched mission contract: %s', async (_label, mutate) => {
    const missionTask = claimedTask()
    const run = mockRunner()
    const client = createHermesClient(config, { run })
    const contract = mutate(contractFor(missionTask)) as OwnestMissionContractV1

    await expect(client.createMission(missionTask, contract)).rejects.toThrow(/mission contract/i)
    expect(run).not.toHaveBeenCalled()
  })

  it.each([
    [
      'valid alternate attempt',
      (contract: OwnestMissionContractV1) => ({ ...contract, attemptId: 'attempt-2' }),
    ],
    [
      'valid alternate rollout',
      (contract: OwnestMissionContractV1) => ({ ...contract, rolloutId: 'rollout-2' }),
    ],
    [
      'valid alternate Hermes profile',
      (contract: OwnestMissionContractV1) => ({ ...contract, hermesProfile: 'agent7' }),
    ],
    [
      'valid alternate Hermes board',
      (contract: OwnestMissionContractV1) => ({ ...contract, hermesBoard: 'other-board' }),
    ],
    [
      'valid alternate mission HMAC',
      (contract: OwnestMissionContractV1) => ({
        ...contract,
        missionDigest: `hmac-sha256:${'c'.repeat(64)}` as never,
      }),
    ],
    [
      'valid alternate requirement HMAC',
      (contract: OwnestMissionContractV1) => ({
        ...contract,
        validationRequirements: contract.validationRequirements.map((requirement, index) =>
          index === 0
            ? { ...requirement, digest: `hmac-sha256:${'d'.repeat(64)}` as never }
            : requirement,
        ),
      }),
    ],
  ])('rejects a syntactically valid but unauthoritative contract: %s', async (_label, mutate) => {
    const missionTask = claimedTask()
    const run = mockRunner()
    const client = createHermesClient(config, { run })

    await expect(
      client.createMission(missionTask, mutate(contractFor(missionTask)) as OwnestMissionContractV1),
    ).rejects.toThrow(/mission contract|claim/i)
    expect(run).not.toHaveBeenCalled()
  })

  it('rejects a persisted claim carrying a different valid mission HMAC', async () => {
    const missionTask = claimedTask({}, {
      missionDigest: `hmac-sha256:${'e'.repeat(64)}` as never,
    })
    const run = mockRunner()
    const client = createHermesClient(config, { run })

    await expect(client.createMission(missionTask, contractFor(missionTask))).rejects.toThrow(
      /mission digest|claim|contract/i,
    )
    expect(run).not.toHaveBeenCalled()
  })

  it('rejects a persisted claim carrying a different idempotency key', async () => {
    const missionTask = claimedTask({}, { idempotencyKey: 'cc-task:other-task:v1' })
    const run = mockRunner()
    const client = createHermesClient(config, { run })

    await expect(client.createMission(missionTask, contractFor(missionTask))).rejects.toThrow(
      /idempotency|claim state/i,
    )
    expect(run).not.toHaveBeenCalled()
  })

  it('inherits the authoritative maximum of 64 validation requirements', async () => {
    const missionTask = claimedTask()
    const validationRequired = Array.from({ length: 65 }, (_, index) => `Check ${index + 1}`)
    const oversizedTask = { ...missionTask, validation_required: validationRequired }
    const baseContract = contractFor(missionTask)
    const oversizedContract = {
      ...baseContract,
      validationRequirements: validationRequired.map((text, index) => ({
        id: `vr-${String(index + 1).padStart(3, '0')}`,
        text,
        digest: `hmac-sha256:${'f'.repeat(64)}` as never,
      })),
    } as OwnestMissionContractV1
    const run = mockRunner()
    const client = createHermesClient(config, { run })

    await expect(client.createMission(oversizedTask, oversizedContract)).rejects.toThrow(
      /64|mission contract|validation/i,
    )
    expect(run).not.toHaveBeenCalled()
  })

  it('redacts and caps both title and composed body', async () => {
    const run = mockRunner()
    const client = createHermesClient(config, { run })
    const longSuffix = 'x'.repeat(2 * 1024)

    const missionTask = claimedTask({
      title: `Research long input for title@example.com ${longSuffix}`,
      objective: `Analyse token=objective-secret ${longSuffix}`,
      validation_required: [
        `Record API_TOKEN=validation-secret as a redacted fixture ${longSuffix}`,
      ],
    })
    await createWithContract(client, missionTask)

    const args = capturedArgs(run)
    const title = args[6]
    const body = valueAfter(args, '--body')
    expect(title?.length).toBeLessThanOrEqual(MAX_MISSION_TEXT_LENGTH)
    expect(body.length).toBeLessThanOrEqual(MAX_MISSION_TEXT_LENGTH)
    expect(title).not.toContain('title@example.com')
    expect(body).not.toContain('objective-secret')
    expect(body).not.toContain('validation-secret')
  })

  it('forces only the nexus, forward-planner, and verify-test skills', async () => {
    const run = mockRunner()
    const client = createHermesClient(config, { run })

    const missionTask = claimedTask({
      metadata: {
        skills: ['arbitrary-skill', 'shell-control'],
        skill: 'metadata-injected-skill',
      },
    })
    await createWithContract(client, missionTask)

    const args = capturedArgs(run)
    const skills = args.flatMap((value, index) => (value === '--skill' ? [args[index + 1]] : []))
    expect(skills).toEqual(['nexus', 'forward-planner', 'verify-test'])
    expect(args).not.toContain('arbitrary-skill')
    expect(args).not.toContain('shell-control')
    expect(args).not.toContain('metadata-injected-skill')
  })

  it.each([
    ['P0', '100'],
    ['P1', '80'],
    ['P2', '60'],
    ['P3', '40'],
  ] as const)('maps CRM %s to Hermes integer priority %s', async (priority, expected) => {
    const run = mockRunner()
    const client = createHermesClient(config, { run })

    await createWithContract(client, claimedTask({ priority }))

    expect(valueAfter(capturedArgs(run), '--priority')).toBe(expected)
    expect(mapHermesPriority(priority)).toBe(expected)
    expect(Number.isInteger(Number(expected))).toBe(true)
  })

  it('accepts the installed CLI raw task response for a newly-created task', async () => {
    const run = mockRunner(jsonResult(liveTask()))
    const client = createHermesClient(config, { run })

    await expect(createWithContract(client)).resolves.toEqual({
      id: 'hermes-1',
      status: 'running',
      title: 'Research customer retention patterns',
      assignee: 'ownest',
      idempotencyKey: null,
      summary: null,
      runId: null,
      completedAt: null,
      receipt: null,
      receiptSha256: null,
      latestRun: null,
      evidenceUri: null,
      error: null,
    })
  })

  it('accepts the documented idempotent-existing response', async () => {
    const existing = normalisedTask({ id: 'hermes-existing', status: 'ready' })
    const run = mockRunner(jsonResult({ task: existing, created: false }))
    const client = createHermesClient(config, { run })

    await expect(createWithContract(client)).resolves.toEqual(existing)
  })

  it('accepts the documented newly-created response', async () => {
    const created = normalisedTask({ id: 'hermes-created', status: 'running' })
    const run = mockRunner(jsonResult({ task: created, created: true }))
    const client = createHermesClient(config, { run })

    await expect(createWithContract(client)).resolves.toEqual(created)
  })

  it('rejects an empty CRM task ID without invoking Hermes', async () => {
    const run = mockRunner()
    const client = createHermesClient(config, { run })

    await expect(
      client.createMission(task({ id: '   ' }), contractFor()),
    ).rejects.toThrow(/CRM task ID/i)
    expect(run).not.toHaveBeenCalled()
  })

  it.each([
    ['empty stdout', ''],
    ['whitespace stdout', '   \n'],
    ['invalid JSON', '{not-json'],
    ['null', 'null'],
    ['array', '[]'],
    ['empty object', '{}'],
    ['partial live task', JSON.stringify({ id: 'hermes-1', status: 'running' })],
    ['wrong documented created type', JSON.stringify({ task: normalisedTask(), created: 'yes' })],
  ])('fails closed for malformed create output: %s', async (_label, stdout) => {
    const run = mockRunner({ exitCode: 0, stdout, stderr: '' })
    const client = createHermesClient(config, { run })

    await expect(createWithContract(client)).rejects.toThrow(/Hermes create/i)
  })

  it('rejects an empty returned task ID', async () => {
    const run = mockRunner(jsonResult(liveTask({ id: '   ' })))
    const client = createHermesClient(config, { run })

    await expect(createWithContract(client)).rejects.toThrow(/Hermes create/i)
  })

  it('rejects an unknown returned status', async () => {
    const run = mockRunner(jsonResult(liveTask({ status: 'complete-ish' })))
    const client = createHermesClient(config, { run })

    await expect(createWithContract(client)).rejects.toThrow(/Hermes create/i)
  })

  it('rejects a documented response carrying the wrong idempotency key', async () => {
    const response = {
      task: normalisedTask({ idempotencyKey: 'cc-task:different-task:v1' }),
      created: false,
    }
    const run = mockRunner(jsonResult(response))
    const client = createHermesClient(config, { run })

    await expect(createWithContract(client)).rejects.toThrow(/Hermes create/i)
  })

  it.each([
    ['external publish', 'Publish the completed report to customers'],
    ['secret access', 'Read the service role key'],
    ['payment', 'Pay the supplier invoice'],
    ['destructive action', 'Delete all customer records'],
    ['merge', 'Merge pull request 42 into main'],
  ])('rejects dangerous validation instructions before invoking Hermes: %s', async (_label, requirement) => {
    const run = mockRunner()
    const client = createHermesClient(config, { run })

    await expect(
      client.createMission(
        { ...claimedTask(), validation_required: [requirement] },
        contractFor(),
      ),
    ).rejects.toThrow(/dangerous-language|mission policy/i)
    expect(run).not.toHaveBeenCalled()
  })

  it.each([
    ['non-array', 'not-an-array' as unknown as string[]],
    ['non-string item', ['Cite the source', 42] as unknown as string[]],
    ['blank item', ['Cite the source', '   ']],
    ['oversized aggregate', ['x'.repeat(MAX_VALIDATION_TEXT_LENGTH + 1)]],
  ])('rejects invalid validation requirements before invoking Hermes: %s', async (_label, requirements) => {
    const run = mockRunner()
    const client = createHermesClient(config, { run })

    await expect(
      client.createMission(
        { ...claimedTask(), validation_required: requirements },
        contractFor(),
      ),
    ).rejects.toThrow(/validation requirement/i)
    expect(run).not.toHaveBeenCalled()
  })

  it('re-applies the mission-text admission bound before invoking Hermes', async () => {
    const run = mockRunner()
    const client = createHermesClient(config, { run })

    await expect(
      client.createMission(
        {
          ...claimedTask(),
          objective: 'x'.repeat(MAX_MISSION_TEXT_LENGTH + 1),
          validation_required: [],
        },
        contractFor(),
      ),
    ).rejects.toThrow(/mission-text-too-long|mission policy/i)
    expect(run).not.toHaveBeenCalled()
  })
})

describe('createHermesClient.showMission', () => {
  it('uses the exact fixed-argv show command and configured cwd', async () => {
    const run = mockRunner(jsonResult(liveShow()))
    const client = createHermesClient(config, { run })

    await showWithContract(client, 'hermes-1')

    expect(run).toHaveBeenCalledWith(
      'hermes',
      [
        '--profile',
        'ownest',
        'kanban',
        '--board',
        'unite-group-ownest',
        'show',
        'hermes-1',
        '--json',
      ],
      config.hermesCwd,
    )
  })

  it('normalises one valid installed completed run into a canonical OWNEST receipt', async () => {
    const contract = contractFor()
    const receipt = completionReceipt('hermes-1', contract)
    const run = mockRunner(jsonResult(completedLiveShow('hermes-1', contract)))
    const client = createHermesClient(config, { run })

    await expect(showWithContract(client, 'hermes-1')).resolves.toEqual({
      id: 'hermes-1',
      status: 'done',
      title: 'Research customer retention patterns',
      assignee: 'ownest',
      idempotencyKey: null,
      summary: 'Completed the retention evidence brief.',
      runId: 7,
      completedAt: new Date(1_784_000_120_000).toISOString(),
      receipt,
      receiptSha256: sha256Digest(JSON.stringify(receipt)),
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
    })
  })

  it.each([
    [
      'missing contract key',
      () => {
        const value = { ...contractFor() } as Record<string, unknown>
        delete value.hermesBoard
        return value
      },
    ],
    ['unknown contract key', () => ({ ...contractFor(), unexpected: true })],
    ['wrong idempotency key', () => ({ ...contractFor(), idempotencyKey: 'ownest:wrong' })],
    [
      'unknown validation key',
      () => ({
        ...contractFor(),
        validationRequirements: contractFor().validationRequirements.map((requirement) => ({
          ...requirement,
          unexpected: true,
        })),
      }),
    ],
  ])('rejects an unsafe expected contract with %s before invoking Hermes', async (_label, build) => {
    const run = mockRunner(jsonResult(completedLiveShow()))
    const client = createHermesClient(config, { run })

    await expect(
      client.showMission('hermes-1', build() as OwnestMissionContractV1),
    ).rejects.toThrow(/contract|profile|board/i)
    expect(run).not.toHaveBeenCalled()
  })

  it.each([
    ['profile', { ...config, hermesProfile: 'agent7' }],
    ['board', { ...config, hermesBoard: 'other-board' }],
  ])('rejects expected-contract/config %s drift before invoking Hermes', async (_label, drifted) => {
    const run = mockRunner(jsonResult(completedLiveShow()))
    const client = createHermesClient(drifted, { run })

    await expect(client.showMission('hermes-1', contractFor())).rejects.toThrow(
      /contract|profile|board/i,
    )
    expect(run).not.toHaveBeenCalled()
  })

  it.each([
    ['missing nominated canary', { ...config, canaryTaskId: null }],
    ['wrong nominated canary', { ...config, canaryTaskId: 'task-2' }],
    ['missing rollout', { ...config, rolloutId: null }],
    ['wrong rollout', { ...config, rolloutId: 'rollout-2' }],
  ])('rejects SHOW contract scope with %s before invoking Hermes', async (_label, scopedConfig) => {
    const run = mockRunner(jsonResult(completedLiveShow()))
    const client = createHermesClient(scopedConfig, { run })

    await expect(client.showMission('hermes-1', contractFor())).rejects.toThrow(/contract|scope/i)
    expect(run).not.toHaveBeenCalled()
  })

  it('allows scoped reconciliation while live mode is off', async () => {
    const run = mockRunner(jsonResult(completedLiveShow()))
    const client = createHermesClient({ ...config, live: false }, { run })

    await expect(client.showMission('hermes-1', contractFor())).resolves.toMatchObject({
      status: 'done',
    })
    expect(run).toHaveBeenCalledTimes(1)
  })

  it.each([
    [
      'out-of-order runs',
      [
        liveRun({ id: 8, started_at: 1_784_000_100 }),
        liveRun({ id: 7, started_at: 1_784_000_000 }),
      ],
    ],
    [
      'duplicate run ids',
      [
        liveRun({ id: 7, started_at: 1_784_000_000 }),
        liveRun({ id: 7, started_at: 1_784_000_100 }),
      ],
    ],
    ['nonpositive run id', [liveRun({ id: 0 })]],
    ['negative run start', [liveRun({ started_at: -1 })]],
    [
      'run end before start',
      [liveRun({ started_at: 1_784_000_120, ended_at: 1_784_000_119 })],
    ],
  ])('rejects a structurally unsafe live SHOW with %s', async (_label, runs) => {
    const payload = liveShow(liveTask(), { runs })

    await expect(showPayload(payload)).rejects.toThrow(/Hermes show/i)
  })

  it.each([
    ['missing ownest metadata', () => completedLiveShow('hermes-1', contractFor(), { metadata: {} })],
    [
      'unknown outer metadata key',
      () => completedLiveShow('hermes-1', contractFor(), {
        metadata: { ownest: completionReceipt(), unexpected: true },
      }),
    ],
    [
      'blank worker session id',
      () => completedLiveShow('hermes-1', contractFor(), {
        metadata: { ownest: completionReceipt(), worker_session_id: ' ' },
      }),
    ],
    [
      'credential-like worker session id',
      () => completedLiveShow('hermes-1', contractFor(), {
        metadata: { ownest: completionReceipt(), worker_session_id: 'token=secret' },
      }),
    ],
    [
      'oversized worker session id',
      () => completedLiveShow('hermes-1', contractFor(), {
        metadata: { ownest: completionReceipt(), worker_session_id: 'w'.repeat(129) },
      }),
    ],
  ])('downgrades done when receipt outer metadata has %s', async (_label, build) => {
    await expectReceiptReview(build(), 'metadata-shape')
  })

  it.each([
    [
      'missing ownest key',
      () => {
        const receipt = completionReceipt()
        delete receipt.verdict
        return completedLiveShow('hermes-1', contractFor(), { metadata: { ownest: receipt } })
      },
    ],
    [
      'unknown ownest key',
      () => completedLiveShow('hermes-1', contractFor(), {
        metadata: { ownest: { ...completionReceipt(), unexpected: true } },
      }),
    ],
  ])('downgrades done when receipt has an exact-key violation: %s', async (_label, build) => {
    await expectReceiptReview(build(), 'receipt-shape')
  })

  it.each([
    ['CRM task', { crmTaskId: 'task-2' }],
    ['Hermes task', { hermesTaskId: 'hermes-2' }],
    ['attempt', { attemptId: 'attempt-2' }],
    ['rollout', { rolloutId: 'rollout-2' }],
    ['mission digest', { missionDigest: `hmac-sha256:${'a'.repeat(64)}` }],
  ])('downgrades done when receipt %s identity differs', async (_label, receipt) => {
    await expectReceiptReview(
      completedLiveShow('hermes-1', contractFor(), { receipt }),
      'receipt-identity',
    )
  })

  it('downgrades an oversized serialized receipt before accepting its fields', async () => {
    const evidence = [completionEvidence({
      uri: `https://evidence.example.com/${'a'.repeat(33 * 1024)}`,
    })]

    await expectReceiptReview(
      completedLiveShow('hermes-1', contractFor(), { receipt: { evidence } }),
      'receipt-oversize',
    )
  })

  it('downgrades deeply nested receipt metadata with a stable oversize result', async () => {
    const marker = '__DEEPLY_NESTED_OWNEST__'
    const payload = completedLiveShow('hermes-1', contractFor(), {
      metadata: { ownest: marker },
    })
    const nested = `${'{"nested":'.repeat(12_000)}null${'}'.repeat(12_000)}`
    const stdout = JSON.stringify(payload).replace(JSON.stringify(marker), nested)
    const run = mockRunner({ exitCode: 0, stdout, stderr: '' })
    const client = createHermesClient(config, { run })

    await expect(client.showMission('hermes-1', contractFor())).resolves.toMatchObject({
      status: 'review',
      receipt: null,
      receiptSha256: null,
      evidenceUri: null,
      error: 'ownest-receipt-invalid:receipt-oversize',
    })
  })

  it.each([
    ['empty evidence', [], 'evidence-count'],
    [
      'duplicate evidence ids',
      [completionEvidence(), completionEvidence()],
      'evidence-id',
    ],
    [
      'more than 32 evidence items',
      Array.from({ length: 33 }, (_, index) =>
        completionEvidence({ id: `ev-${String(index + 1).padStart(3, '0')}` }),
      ),
      'evidence-count',
    ],
    [
      'unknown evidence key',
      [completionEvidence({ unexpected: true })],
      'evidence-shape',
    ],
    ['unknown evidence kind', [completionEvidence({ kind: 'note' })], 'evidence-kind'],
    [
      'uppercase evidence digest',
      [completionEvidence({ digest: `sha256:${'A'.repeat(64)}` })],
      'evidence-digest',
    ],
  ])('downgrades done for %s', async (_label, evidence, code) => {
    await expectReceiptReview(
      completedLiveShow('hermes-1', contractFor(), { receipt: { evidence } }),
      code,
    )
  })

  it.each([
    ['HTTP', 'http://evidence.example/report'],
    ['userinfo credentials', 'https://user:secret@evidence.example/report'],
    ['query credentials', 'https://evidence.example/report?token=secret'],
    ['file', 'file:/tmp/report.md'],
    ['data', 'data:text/plain,evidence'],
    ['plain text', 'evidence report'],
    ['relative path', './report.md'],
    ['absolute path', '/tmp/report.md'],
    ['scratch path', 'scratch:/report.md'],
    ['undotted intranet hostname', 'https://intranet/report'],
    ['internal suffix', 'https://evidence.internal/report'],
    ['LAN suffix', 'https://evidence.lan/report'],
    ['home suffix', 'https://evidence.home/report'],
    ['corp suffix', 'https://evidence.corp/report'],
    ['local suffix', 'https://evidence.local/report'],
    ['localhost suffix', 'https://evidence.localhost/report'],
    ['test suffix', 'https://evidence.test/report'],
    ['invalid suffix', 'https://evidence.invalid/report'],
    ['example suffix', 'https://evidence.example/report'],
    ['localhost', 'https://localhost/report'],
    ['private IPv4', 'https://192.168.1.8/report'],
    ['loopback IPv6', 'https://[::1]/report'],
    ['global IPv6', 'https://[2001:4860:4860::8888]/report'],
    ['site-local IPv6', 'https://[fec0::1]/report'],
    ['multicast IPv6', 'https://[ff02::1]/report'],
    ['over 2048 bytes', `https://evidence.example.com/${'a'.repeat(2030)}`],
  ])('downgrades done for a non-durable %s evidence URI', async (_label, uri) => {
    await expectReceiptReview(
      completedLiveShow('hermes-1', contractFor(), {
        receipt: { evidence: [completionEvidence({ uri })] },
      }),
      'evidence-uri',
    )
  })

  it.each([
    ['missing validation', [completionValidation(0)], 'validation-count'],
    [
      'extra validation',
      [completionValidation(0), completionValidation(1), completionValidation(1)],
      'validation-count',
    ],
    [
      'duplicate validation',
      [completionValidation(0), completionValidation(0)],
      'validation-identity',
    ],
    [
      'reordered validation',
      [completionValidation(1), completionValidation(0)],
      'validation-identity',
    ],
    [
      'failed validation',
      [completionValidation(0, { status: 'failed' }), completionValidation(1)],
      'validation-status',
    ],
    [
      'unknown evidence reference',
      [completionValidation(0, { evidenceIds: ['ev-999'] }), completionValidation(1)],
      'validation-evidence',
    ],
    [
      'duplicate evidence reference',
      [completionValidation(0, { evidenceIds: ['ev-001', 'ev-001'] }), completionValidation(1)],
      'validation-evidence',
    ],
    [
      'empty evidence reference',
      [completionValidation(0, { evidenceIds: [] }), completionValidation(1)],
      'validation-evidence',
    ],
    [
      'unknown validation key',
      [completionValidation(0, { unexpected: true }), completionValidation(1)],
      'validation-shape',
    ],
  ])('downgrades done for %s', async (_label, validationResults, code) => {
    await expectReceiptReview(
      completedLiveShow('hermes-1', contractFor(), { receipt: { validationResults } }),
      code,
    )
  })

  it.each([
    ['missing latest run', { runs: [] }, 'latest-run-missing'],
    ['missing task completion time', { task: { completed_at: null } }, 'task-completed-at'],
    ['negative task completion time', { task: { completed_at: -1 } }, 'task-completed-at'],
    [
      'task completion after latest run end',
      { task: { completed_at: 1_784_000_121 } },
      'task-completed-at',
    ],
    [
      'task completion more than one second before latest run end',
      { task: { completed_at: 1_784_000_118 } },
      'task-completed-at',
    ],
    ['wrong latest run profile', { run: { profile: 'agent7' } }, 'latest-run-profile'],
    ['active latest run status', { run: { status: 'running' } }, 'latest-run-status'],
    ['wrong latest run outcome', { run: { outcome: 'failed' } }, 'latest-run-outcome'],
    ['missing latest run end', { run: { ended_at: null } }, 'latest-run-ended-at'],
    ['latest run error', { run: { error: 'completion failed' } }, 'latest-run-error'],
    ['blank latest run summary', { run: { summary: '' } }, 'latest-run-summary'],
    [
      'oversized latest run summary',
      { run: { summary: 'x'.repeat(32 * 1024 + 1) } },
      'latest-run-summary',
    ],
    ['latest summary mismatch', { show: { latest_summary: 'different summary' } }, 'summary-mismatch'],
  ] as const)('downgrades a structurally valid done task with %s', async (_label, options, code) => {
    await expectReceiptReview(
      completedLiveShow('hermes-1', contractFor(), options),
      code,
    )
  })

  it('rejects a structurally unsafe done task with a negative latest run end', async () => {
    await expect(
      showPayload(completedLiveShow('hermes-1', contractFor(), { run: { ended_at: -1 } })),
    ).rejects.toThrow(/Hermes show/i)
  })

  it('uses only the latest run when an earlier run has a valid receipt', async () => {
    const earlier = liveRun({
      id: 6,
      started_at: 1_783_999_000,
      ended_at: 1_783_999_120,
      metadata: { ownest: completionReceipt() },
    })
    const latest = liveRun({
      id: 7,
      started_at: 1_784_000_000,
      metadata: { ownest: { ...completionReceipt(), verdict: 'failed' } },
    })
    const payload = completedLiveShow('hermes-1', contractFor(), {
      runs: [earlier, latest],
      show: { latest_summary: latest.summary },
    })

    await expectReceiptReview(payload, 'receipt-verdict')
  })

  it('accepts task completion one second before the latest run end', async () => {
    const result = await showPayload(
      completedLiveShow('hermes-1', contractFor(), {
        task: { completed_at: 1_784_000_119 },
      }),
    )

    expect(result.status).toBe('done')
  })

  it('does not let an older valid receipt override a later active run', async () => {
    const earlier = liveRun({
      id: 6,
      started_at: 1_783_999_000,
      ended_at: 1_783_999_120,
      metadata: { ownest: completionReceipt() },
    })
    const active = liveRun({
      id: 7,
      status: 'running',
      outcome: null,
      summary: null,
      ended_at: null,
      metadata: null,
    })
    const payload = completedLiveShow('hermes-1', contractFor(), {
      runs: [earlier, active],
      show: { latest_summary: null },
    })

    await expectReceiptReview(payload, 'latest-run-status')
  })

  it('accepts the optional nonempty worker session id without changing the canonical receipt hash', async () => {
    const receipt = completionReceipt()
    const payload = completedLiveShow('hermes-1', contractFor(), {
      metadata: { ownest: receipt, worker_session_id: 'worker-session-7' },
    })
    const result = await showPayload(payload)

    expect(result.status).toBe('done')
    expect(result.receipt).toEqual(receipt)
    expect(result.receiptSha256).toBe(sha256Digest(JSON.stringify(receipt)))
    expect(result.latestRun?.metadata).toBeNull()
  })

  it.each([
    'https://fcorp.example.com/reports/retention',
    'wiki:/evidence/retention-report',
    'git:/unite-group/nexus/commit/abcdef1',
    'github:/unite-group/nexus/pull/42',
  ])('accepts conservative durable evidence URI %s', async (uri) => {
    const result = await showPayload(
      completedLiveShow('hermes-1', contractFor(), {
        receipt: { evidence: [completionEvidence({ uri })] },
      }),
    )

    expect(result.status).toBe('done')
    expect(result.receipt?.evidence[0]?.uri).toBe(uri)
  })

  it('redacts a valid done summary without splitting a Unicode code point', async () => {
    const summary = `${'a'.repeat(16_383)}😀 token=summary-secret owner@example.com`
    const result = await showPayload(
      completedLiveShow('hermes-1', contractFor(), { run: { summary } }),
    )

    expect(result.status).toBe('done')
    expect(result.summary).not.toContain('summary-secret')
    expect(result.summary).not.toContain('owner@example.com')
    expect(result.summary).not.toContain('\uFFFD')
    expect(Buffer.byteLength(result.summary ?? '', 'utf8')).toBeLessThanOrEqual(32 * 1024)
  })

  it('surfaces the latest closed blocked error with bounded redaction and ignores older success', async () => {
    const earlier = liveRun({
      id: 6,
      started_at: 1_783_999_000,
      ended_at: 1_783_999_120,
      metadata: { ownest: completionReceipt() },
    })
    const latest = liveRun({
      id: 7,
      status: 'blocked',
      outcome: 'failed',
      error: `token=blocked-secret owner@example.com ${'😀'.repeat(300)}`,
      metadata: null,
    })
    const payload = liveShow(liveTask({ status: 'blocked' }), {
      latest_summary: latest.summary,
      runs: [earlier, latest],
    })
    const result = await showPayload(payload)

    expect(result.status).toBe('blocked')
    expect(result.receipt).toBeNull()
    expect(result.evidenceUri).toBeNull()
    expect(result.latestRun?.id).toBe(7)
    expect(result.error).toContain('[REDACTED]')
    expect(result.error).not.toContain('blocked-secret')
    expect(result.error).not.toContain('owner@example.com')
    expect(result.error).not.toContain('\uFFFD')
    expect(Buffer.byteLength(result.error ?? '', 'utf8')).toBeLessThanOrEqual(800)
  })

  it.each([
    ['blocked summary', 'blocked', 'Blocked after dependency review.', null, 'Blocked after dependency review.'],
    ['blocked fallback', 'blocked', null, null, 'hermes-run-blocked'],
    ['review fallback', 'review', null, null, 'hermes-run-review'],
  ] as const)(
    'uses the fixed precedence for %s',
    async (_label, status, runSummary, runError, expectedError) => {
      const latest = liveRun({
        status,
        outcome: 'failed',
        summary: runSummary,
        error: runError,
        metadata: null,
      })
      const result = await showPayload(
        liveShow(liveTask({ status }), { latest_summary: runSummary, runs: [latest] }),
      )

      expect(result.status).toBe(status)
      expect(result.error).toBe(expectedError)
      expect(result.receipt).toBeNull()
      expect(result.evidenceUri).toBeNull()
    },
  )

  it('normalises archived as terminal review even when its latest run has a valid receipt', async () => {
    const receipt = completionReceipt()
    const latest = liveRun({ metadata: { ownest: receipt } })
    const result = await showPayload(
      liveShow(
        liveTask({ status: 'archived', completed_at: 1_784_000_120 }),
        { latest_summary: latest.summary, runs: [latest] },
      ),
    )

    expect(result).toMatchObject({
      status: 'review',
      summary: null,
      runId: null,
      completedAt: null,
      receipt: null,
      receiptSha256: null,
      evidenceUri: null,
      error: 'hermes-task-archived',
    })
  })

  it.each(['ready', 'running', 'scheduled', 'todo', 'triage'] as const)(
    'keeps %s nonterminal when an older run has a valid receipt',
    async (status) => {
      const earlier = liveRun({
        id: 6,
        started_at: 1_783_999_000,
        ended_at: 1_783_999_120,
        metadata: { ownest: completionReceipt() },
      })
      const active = liveRun({
        id: 7,
        status: 'running',
        outcome: null,
        summary: null,
        error: null,
        metadata: null,
        ended_at: null,
      })
      const result = await showPayload(
        liveShow(liveTask({ status }), { latest_summary: null, runs: [earlier, active] }),
      )

      expect(result).toMatchObject({
        status,
        summary: null,
        runId: null,
        completedAt: null,
        receipt: null,
        receiptSha256: null,
        latestRun: null,
        evidenceUri: null,
        error: null,
      })
    },
  )

  it('accepts and normalises the installed CLI show response', async () => {
    const run = mockRunner(
      jsonResult(
        liveShow(
          liveTask({
            id: 'hermes-2',
            title: 'Existing task',
            status: 'review',
            assignee: null,
          }),
        ),
      ),
    )
    const client = createHermesClient(config, { run })

    await expect(showWithContract(client, 'hermes-2')).resolves.toEqual({
      id: 'hermes-2',
      status: 'review',
      title: 'Existing task',
      assignee: null,
      idempotencyKey: null,
      summary: null,
      runId: null,
      completedAt: null,
      receipt: null,
      receiptSha256: null,
      latestRun: null,
      evidenceUri: null,
      error: 'hermes-run-review',
    })
  })

  it('downgrades a documented done response that has no installed run receipt', async () => {
    const shown = normalisedTask({ id: 'hermes-3', status: 'done' })
    const run = mockRunner(jsonResult({ task: shown }))
    const client = createHermesClient(config, { run })

    await expect(showWithContract(client, 'hermes-3')).resolves.toMatchObject({
      id: 'hermes-3',
      status: 'review',
      receipt: null,
      receiptSha256: null,
      evidenceUri: null,
      error: 'ownest-receipt-invalid:latest-run-missing',
    })
  })

  it('rejects an empty requested task ID without invoking Hermes', async () => {
    const run = mockRunner(jsonResult(liveShow()))
    const client = createHermesClient(config, { run })

    await expect(showWithContract(client, ' \n ')).rejects.toThrow(/Hermes task ID/i)
    expect(run).not.toHaveBeenCalled()
  })

  it.each([
    ['empty stdout', ''],
    ['invalid JSON', '{bad-json'],
    ['empty object', '{}'],
    ['empty task object', '{"task":{}}'],
    ['raw task without show envelope', JSON.stringify(liveTask())],
    ['partial live envelope', JSON.stringify({ task: liveTask(), latest_summary: null })],
  ])('fails closed for malformed show output: %s', async (_label, stdout) => {
    const run = mockRunner({ exitCode: 0, stdout, stderr: '' })
    const client = createHermesClient(config, { run })

    await expect(showWithContract(client, 'hermes-1')).rejects.toThrow(/Hermes show/i)
  })

  it('rejects an empty returned task ID', async () => {
    const run = mockRunner(jsonResult(liveShow(liveTask({ id: '' }))))
    const client = createHermesClient(config, { run })

    await expect(showWithContract(client, 'hermes-1')).rejects.toThrow(/Hermes show/i)
  })

  it('rejects an unknown returned status', async () => {
    const run = mockRunner(jsonResult(liveShow(liveTask({ status: 'unknown' }))))
    const client = createHermesClient(config, { run })

    await expect(showWithContract(client, 'hermes-1')).rejects.toThrow(/Hermes show/i)
  })

  it('rejects a response whose task ID differs from the requested ID', async () => {
    const run = mockRunner(jsonResult(liveShow(liveTask({ id: 'different-task' }))))
    const client = createHermesClient(config, { run })

    await expect(showWithContract(client, 'hermes-1')).rejects.toThrow(/Hermes show/i)
  })
})

describe('createHermesClient.stopMission', () => {
  it('reclaims, unassigns, and archives with exact fixed argv and normalized termination', async () => {
    const run = mockSequence(...successfulStopResults())
    const client = createHermesClient(config, { run })

    await expect(stopWithContract(client)).resolves.toMatchObject({
      outcome: 'stopped',
      reclaimAttempted: true,
      safeToRedispatch: true,
      termination: {
        prevPid: 4321,
        hostLocal: true,
        terminationAttempted: true,
        terminated: true,
        sigkill: false,
      },
      task: {
        id: 'hermes-1',
        status: 'archived',
        assignee: null,
        latestRun: { metadata: null },
      },
    })

    expect(run.mock.calls).toEqual([
      ['hermes', [...STOP_BASE_ARGS, 'show', 'hermes-1', '--json'], config.hermesCwd],
      [
        'hermes',
        [...STOP_BASE_ARGS, 'reclaim', 'hermes-1', '--reason', STOP_REASON],
        config.hermesCwd,
      ],
      ['hermes', [...STOP_BASE_ARGS, 'show', 'hermes-1', '--json'], config.hermesCwd],
      ['hermes', [...STOP_BASE_ARGS, 'assign', 'hermes-1', 'none'], config.hermesCwd],
      ['hermes', [...STOP_BASE_ARGS, 'show', 'hermes-1', '--json'], config.hermesCwd],
      ['hermes', [...STOP_BASE_ARGS, 'archive', 'hermes-1'], config.hermesCwd],
      ['hermes', [...STOP_BASE_ARGS, 'show', 'hermes-1', '--json'], config.hermesCwd],
    ])
    expect(run.mock.calls.every(([command]) => command === 'hermes')).toBe(true)
  })

  it.each([
    [
      'no previous PID',
      terminationMetadata({
        prevPid: null,
        terminationAttempted: false,
        terminated: false,
      }),
      true,
    ],
    [
      'remote unattempted PID',
      terminationMetadata({
        hostLocal: false,
        terminationAttempted: false,
        terminated: false,
      }),
      false,
    ],
    [
      'surviving local PID',
      terminationMetadata({ terminationAttempted: true, terminated: false }),
      false,
    ],
  ] as const)(
    'archives %s while preserving redispatch safety',
    async (_label, metadata, safeToRedispatch) => {
      const run = mockSequence(...successfulStopResults({ ...metadata }))
      const client = createHermesClient(config, { run })

      const result = await stopWithContract(client)

      expect(result).toMatchObject({
        outcome: 'stopped',
        safeToRedispatch,
        termination: metadata,
        task: { status: 'archived', assignee: null },
      })
      expect(result.task.latestRun?.metadata).toBeNull()
    },
  )

  it.each([
    ['cancel-requested', 'ownest:cancel-requested:attempt-1'],
    ['authority-revoked', 'ownest:authority-revoked:attempt-1'],
    ['lease-expired', 'ownest:lease-expired:attempt-1'],
    ['operator-stop', 'ownest:operator-stop:attempt-1'],
  ] as const)('accepts reclaim exit 1 when %s loses a race to valid completion', async (cause, reason) => {
    const run = mockSequence(
      jsonResult(activeStopShow()),
      { exitCode: 1, stdout: '', stderr: 'run already ended' },
      jsonResult(completedLiveShow()),
    )
    const client = createHermesClient(config, { run })

    await expect(stopWithContract(client, cause)).resolves.toMatchObject({
      outcome: 'completed',
      reclaimAttempted: true,
      safeToRedispatch: false,
      termination: null,
      task: { status: 'done', receipt: completionReceipt(), latestRun: { metadata: null } },
    })
    expect(run.mock.calls[1]?.[1]).toEqual([
      ...STOP_BASE_ARGS,
      'reclaim',
      'hermes-1',
      '--reason',
      reason,
    ])
    expect(run).toHaveBeenCalledTimes(3)
  })

  it('accepts reclaim exit 1 when post-SHOW proves the same run was reclaimed', async () => {
    const run = mockSequence(
      ...successfulStopResults(terminationMetadata(), {
        exitCode: 1,
        stdout: '',
        stderr: 'already reclaimed',
      }),
    )
    const client = createHermesClient(config, { run })

    await expect(stopWithContract(client)).resolves.toMatchObject({
      outcome: 'stopped',
      reclaimAttempted: true,
      safeToRedispatch: true,
    })
  })

  it('accepts reclaim exit 1 when another stopper already archived the matching reclaimed run', async () => {
    const reclaimed = reclaimedRun(terminationMetadata(), {
      error: 'manual_reclaim: ownest:operator-stop:attempt-1',
    })
    const run = mockSequence(
      jsonResult(activeStopShow()),
      { exitCode: 1, stdout: '', stderr: 'already reclaimed and archived' },
      jsonResult(stoppedShow('archived', null, reclaimed)),
    )
    const client = createHermesClient(config, { run })

    await expect(stopWithContract(client)).resolves.toMatchObject({
      outcome: 'already-archived',
      reclaimAttempted: true,
      safeToRedispatch: true,
      termination: terminationMetadata(),
      task: { status: 'archived', assignee: null, latestRun: { metadata: null } },
    })
    expect(run).toHaveBeenCalledTimes(3)
  })

  it('returns a valid completion that won before reclaim without mutating Hermes', async () => {
    const run = mockSequence(jsonResult(completedLiveShow()))
    const client = createHermesClient(config, { run })

    await expect(stopWithContract(client)).resolves.toMatchObject({
      outcome: 'completed',
      reclaimAttempted: false,
      safeToRedispatch: false,
      termination: null,
      task: { status: 'done', receipt: completionReceipt() },
    })
    expect(run).toHaveBeenCalledTimes(1)
  })

  it('returns an already archived task without recreating or mutating it', async () => {
    const run = mockSequence(jsonResult(stoppedShow('archived', null, null)))
    const client = createHermesClient(config, { run })

    await expect(stopWithContract(client)).resolves.toMatchObject({
      outcome: 'already-archived',
      reclaimAttempted: false,
      safeToRedispatch: false,
      termination: null,
      task: { status: 'archived', assignee: null },
    })
    expect(run).toHaveBeenCalledTimes(1)
  })

  it('keeps an archived stop idempotent when a retry supplies a different valid cause', async () => {
    const run = mockSequence(jsonResult(stoppedShow('archived', null, reclaimedRun())))
    const client = createHermesClient(config, { run })

    await expect(stopWithContract(client, 'operator-stop')).resolves.toMatchObject({
      outcome: 'already-archived',
      reclaimAttempted: false,
      safeToRedispatch: true,
      termination: terminationMetadata(),
      task: { status: 'archived', assignee: null, latestRun: { metadata: null } },
    })
    expect(run).toHaveBeenCalledTimes(1)
  })

  it('resumes a ready task from its matching reclaimed run', async () => {
    const reclaimed = reclaimedRun()
    const run = mockSequence(
      jsonResult(stoppedShow('ready', 'ownest', reclaimed)),
      { exitCode: 0, stdout: '', stderr: '' },
      jsonResult(stoppedShow('ready', null, reclaimed)),
      { exitCode: 0, stdout: '', stderr: '' },
      jsonResult(stoppedShow('archived', null, reclaimed)),
    )
    const client = createHermesClient(config, { run })

    await expect(stopWithContract(client)).resolves.toMatchObject({
      outcome: 'stopped',
      reclaimAttempted: false,
      safeToRedispatch: true,
      termination: terminationMetadata(),
    })
    expect(run.mock.calls.map((call) => call[1])).toEqual([
      [...STOP_BASE_ARGS, 'show', 'hermes-1', '--json'],
      [...STOP_BASE_ARGS, 'assign', 'hermes-1', 'none'],
      [...STOP_BASE_ARGS, 'show', 'hermes-1', '--json'],
      [...STOP_BASE_ARGS, 'archive', 'hermes-1'],
      [...STOP_BASE_ARGS, 'show', 'hermes-1', '--json'],
    ])
  })

  it('resumes after unassignment by archiving without repeating assign', async () => {
    const reclaimed = reclaimedRun(terminationMetadata({ terminated: false }))
    const run = mockSequence(
      jsonResult(stoppedShow('ready', null, reclaimed)),
      { exitCode: 0, stdout: '', stderr: '' },
      jsonResult(stoppedShow('archived', null, reclaimed)),
    )
    const client = createHermesClient(config, { run })

    await expect(stopWithContract(client)).resolves.toMatchObject({
      outcome: 'stopped',
      reclaimAttempted: false,
      safeToRedispatch: false,
      termination: { prevPid: 4321, terminated: false },
    })
    expect(run.mock.calls.map((call) => call[1])).toEqual([
      [...STOP_BASE_ARGS, 'show', 'hermes-1', '--json'],
      [...STOP_BASE_ARGS, 'archive', 'hermes-1'],
      [...STOP_BASE_ARGS, 'show', 'hermes-1', '--json'],
    ])
  })

  it.each(['blocked', 'review'] as const)(
    'continues crash recovery from an inactive %s task without inventing termination proof',
    async (status) => {
      const run = mockSequence(
        jsonResult(stoppedShow(status, 'ownest', null)),
        { exitCode: 0, stdout: '', stderr: '' },
        jsonResult(stoppedShow(status, null, null)),
        { exitCode: 0, stdout: '', stderr: '' },
        jsonResult(stoppedShow('archived', null, null)),
      )
      const client = createHermesClient(config, { run })

      await expect(stopWithContract(client)).resolves.toMatchObject({
        outcome: 'stopped',
        reclaimAttempted: false,
        safeToRedispatch: false,
        termination: null,
        task: { status: 'archived', assignee: null },
      })
    },
  )

  it.each([
    [
      'missing termination field',
      reclaimedRun(
        Object.fromEntries(
          Object.entries(terminationMetadata()).filter(([key]) => key !== 'sigkill'),
        ),
      ),
    ],
    ['wrong termination type', reclaimedRun(terminationMetadata({ prevPid: '4321' }))],
    ['extra termination field', reclaimedRun(terminationMetadata({ signal: 'SIGTERM' }))],
    [
      'wrong reclaim reason',
      reclaimedRun(terminationMetadata(), {
        error: 'manual_reclaim: ownest:operator-stop:attempt-1',
      }),
    ],
    ['missing termination metadata', reclaimedRun(null)],
  ])('fails closed on a reclaimed run with %s', async (_label, latestRun) => {
    const run = mockSequence(jsonResult(stoppedShow('ready', 'ownest', latestRun)))
    const client = createHermesClient(config, { run })

    await expect(stopWithContract(client)).rejects.toThrow(/Hermes stop/i)
    expect(run).toHaveBeenCalledTimes(1)
  })

  it('fails closed when an active run survives the mandatory post-reclaim SHOW', async () => {
    const run = mockSequence(
      jsonResult(activeStopShow()),
      { exitCode: 0, stdout: '', stderr: '' },
      jsonResult(activeStopShow()),
    )
    const client = createHermesClient(config, { run })

    await expect(stopWithContract(client)).rejects.toThrow(/Hermes stop/i)
    expect(run).toHaveBeenCalledTimes(3)
  })

  it('fails closed when any earlier run remains active behind a later reclaimed run', async () => {
    const earlierActive = liveRun({
      id: 6,
      status: 'running',
      outcome: null,
      summary: null,
      error: null,
      metadata: null,
      started_at: 1_783_999_000,
      ended_at: null,
    })
    const payload = liveShow(liveTask({ status: 'archived', assignee: null }), {
      latest_summary: null,
      runs: [earlierActive, reclaimedRun()],
    })
    const run = mockSequence(jsonResult(payload))
    const client = createHermesClient(config, { run })

    await expect(stopWithContract(client)).rejects.toThrow(/active run/i)
    expect(run).toHaveBeenCalledTimes(1)
  })

  it.each([
    [
      'assign',
      [
        jsonResult(stoppedShow('ready', 'ownest', reclaimedRun())),
        {
          exitCode: 2,
          stdout: 'owner@example.com token=stop-secret',
          stderr: '😀'.repeat(1_000),
        },
      ],
    ],
    [
      'archive',
      [
        jsonResult(stoppedShow('ready', null, reclaimedRun())),
        {
          exitCode: 2,
          stdout: 'owner@example.com token=stop-secret',
          stderr: '😀'.repeat(1_000),
        },
      ],
    ],
  ] as const)('throws a bounded redacted error when %s fails', async (_operation, results) => {
    const run = mockSequence(...results)
    const client = createHermesClient(config, { run })

    const error = await stopWithContract(client).catch((value: unknown) => value)

    expect(error).toBeInstanceOf(Error)
    const message = (error as Error).message
    expect(message).not.toContain('owner@example.com')
    expect(message).not.toContain('stop-secret')
    expect(message).toContain('[REDACTED]')
    expect(message).not.toContain('\uFFFD')
    expect(Buffer.byteLength(message, 'utf8')).toBeLessThanOrEqual(900)
    expect(run).toHaveBeenCalledTimes(2)
  })

  it.each([
    ['not archived', stoppedShow('ready', null, reclaimedRun())],
    ['wrong assignee', stoppedShow('archived', 'ownest', reclaimedRun())],
    ['active run', stoppedShow('archived', null, (activeStopShow().runs as unknown[])[0] as Record<string, unknown>)],
  ])('fails closed when final SHOW has %s', async (_label, finalShow) => {
    const run = mockSequence(
      jsonResult(stoppedShow('ready', null, reclaimedRun())),
      { exitCode: 0, stdout: '', stderr: '' },
      jsonResult(finalShow),
    )
    const client = createHermesClient(config, { run })

    await expect(stopWithContract(client)).rejects.toThrow(/Hermes stop/i)
    expect(run).toHaveBeenCalledTimes(3)
  })

  it('fails closed when assign succeeds but SHOW does not prove a null assignee', async () => {
    const reclaimed = reclaimedRun()
    const run = mockSequence(
      jsonResult(stoppedShow('ready', 'ownest', reclaimed)),
      { exitCode: 0, stdout: '', stderr: '' },
      jsonResult(stoppedShow('ready', 'ownest', reclaimed)),
    )
    const client = createHermesClient(config, { run })

    await expect(stopWithContract(client)).rejects.toThrow(/Hermes stop/i)
    expect(run).toHaveBeenCalledTimes(3)
  })

  it.each([
    ['missing canary', { ...config, canaryTaskId: null }, contractFor(), 'hermes-1', 'cancel-requested'],
    ['wrong canary', { ...config, canaryTaskId: 'task-2' }, contractFor(), 'hermes-1', 'cancel-requested'],
    ['missing rollout', { ...config, rolloutId: null }, contractFor(), 'hermes-1', 'cancel-requested'],
    ['wrong rollout', { ...config, rolloutId: 'rollout-2' }, contractFor(), 'hermes-1', 'cancel-requested'],
    [
      'non-OWNEST profile',
      { ...config, hermesProfile: 'agent7' },
      buildMissionContract(
        task(),
        'attempt-1',
        'rollout-1',
        integrityNonce,
        'agent7',
        config.hermesBoard,
      ),
      'hermes-1',
      'cancel-requested',
    ],
    [
      'non-OWNEST board',
      { ...config, hermesBoard: 'other-board' },
      buildMissionContract(
        task(),
        'attempt-1',
        'rollout-1',
        integrityNonce,
        config.hermesProfile,
        'other-board',
      ),
      'hermes-1',
      'cancel-requested',
    ],
    ['invalid task id', config, contractFor(), 'bad task', 'cancel-requested'],
    ['invalid cause', config, contractFor(), 'hermes-1', 'shutdown-now'],
  ] as const)(
    'rejects %s before any Hermes process mutation',
    async (_label, configValue, contract, hermesTaskId, cause) => {
      const run = mockRunner(jsonResult(activeStopShow()))
      const client = createHermesClient(configValue, { run })

      await expect(
        client.stopMission(hermesTaskId, contract, cause as 'cancel-requested'),
      ).rejects.toThrow()
      expect(run).not.toHaveBeenCalled()
    },
  )

  it('does not echo malformed raw termination metadata in STOP errors', async () => {
    const payload = {
      runs: [reclaimedRun('raw-termination-secret')],
      task: liveTask({ status: 'ready' }),
      latest_summary: null,
      parents: [],
      children: [],
      comments: [],
      events: [],
    }
    const run = mockSequence(jsonResult(payload))
    const client = createHermesClient(config, { run })

    const error = await stopWithContract(client).catch((value: unknown) => value)

    expect(error).toBeInstanceOf(Error)
    expect((error as Error).message).not.toContain('raw-termination-secret')
  })

  it('works with live mode off for board-state reconciliation', async () => {
    const run = mockSequence(jsonResult(stoppedShow('archived', null, null)))
    const client = createHermesClient({ ...config, live: false }, { run })

    await expect(stopWithContract(client)).resolves.toMatchObject({
      outcome: 'already-archived',
    })
    expect(run).toHaveBeenCalledTimes(1)
  })
})

describe('Hermes process failures', () => {
  it('exports finite production process bounds', () => {
    expect(HERMES_PROCESS_TIMEOUT_MS).toBe(60_000)
    expect(HERMES_PROCESS_STDOUT_MAX_BYTES).toBe(1024 * 1024)
    expect(HERMES_PROCESS_STDERR_MAX_BYTES).toBe(1024 * 1024)
    expect(HERMES_PROCESS_KILL_GRACE_MS).toBeGreaterThan(0)
    expect(HERMES_PROCESS_KILL_GRACE_MS).toBeLessThan(HERMES_PROCESS_TIMEOUT_MS)
  })

  it('bounds stdout bytes and fails closed when a real child exceeds the cap', async () => {
    const result = await defaultProcessRunner(
      process.execPath,
      [
        '-e',
        `process.stdout.write(Buffer.alloc(${HERMES_PROCESS_STDOUT_MAX_BYTES + 1024}, 120))`,
      ],
      process.cwd(),
    )

    expect(result.exitCode).toBe(-1)
    expect(Buffer.byteLength(result.stdout)).toBeLessThanOrEqual(
      HERMES_PROCESS_STDOUT_MAX_BYTES,
    )
    expect(Buffer.byteLength(result.stderr)).toBeLessThanOrEqual(
      HERMES_PROCESS_STDERR_MAX_BYTES,
    )
    expect(result.stderr).toMatch(/stdout.*exceeded/i)
  })

  it('bounds stderr independently and fails closed when a real child exceeds the cap', async () => {
    const result = await defaultProcessRunner(
      process.execPath,
      [
        '-e',
        `process.stderr.write(Buffer.alloc(${HERMES_PROCESS_STDERR_MAX_BYTES + 1024}, 101))`,
      ],
      process.cwd(),
    )

    expect(result.exitCode).toBe(-1)
    expect(result.stdout).toBe('')
    expect(Buffer.byteLength(result.stderr)).toBeLessThanOrEqual(
      HERMES_PROCESS_STDERR_MAX_BYTES,
    )
    expect(result.stderr).toMatch(/stderr.*exceeded/i)
  })

  it('counts UTF-8 bytes rather than JavaScript characters', async () => {
    const run = createProcessRunner({
      timeoutMs: 1_000,
      stdoutMaxBytes: 1_024,
      stderrMaxBytes: 1_024,
      killGraceMs: 50,
    })
    const result = await run(
      process.execPath,
      ['-e', "process.stdout.write('é'.repeat(600)); setInterval(() => {}, 1_000)"],
      process.cwd(),
    )

    expect(result.exitCode).toBe(-1)
    expect(result.stdout.length).toBeLessThan(1_024)
    expect(Buffer.byteLength(result.stdout)).toBeLessThanOrEqual(1_024)
    expect(result.stderr).toMatch(/stdout.*exceeded/i)
  })

  it.each(UTF8_BOUNDARY_CASES)(
    'returns the longest complete %s UTF-8 prefix within the stdout cap',
    async (_label, character, codePointBytes) => {
      const cap = codePointBytes + 1
      const { child, events, stdout } = fakeChildProcess()
      const run = createProcessRunner(
        {
          timeoutMs: 1_000,
          stdoutMaxBytes: cap,
          stderrMaxBytes: 128,
          killGraceMs: 25,
        },
        () => child,
      )
      const pending = run('hermes', [], process.cwd())

      stdout.write(Buffer.from(character.repeat(2)))
      events.emit('close', null, 'SIGTERM')
      const result = await pending

      expect(result.exitCode).toBe(-1)
      expect(result.stdout).toBe(character)
      expect(result.stdout).not.toContain('\uFFFD')
      expect(Buffer.byteLength(result.stdout)).toBeLessThanOrEqual(cap)
    },
  )

  it.each(UTF8_BOUNDARY_CASES)(
    'keeps the synthetic stderr reason within cap without splitting a %s UTF-8 code point',
    async (_label, character, codePointBytes) => {
      const cap = stderrBoundaryCap(codePointBytes)
      const { child, events, stderr } = fakeChildProcess()
      const run = createProcessRunner(
        {
          timeoutMs: 1_000,
          stdoutMaxBytes: 128,
          stderrMaxBytes: cap,
          killGraceMs: 25,
        },
        () => child,
      )
      const pending = run('hermes', [], process.cwd())
      const charactersToOverflow = Math.ceil((cap + codePointBytes) / codePointBytes)

      stderr.write(Buffer.from(character.repeat(charactersToOverflow)))
      events.emit('close', null, 'SIGTERM')
      const result = await pending

      expect(result.exitCode).toBe(-1)
      expect(result.stderr).toMatch(/stderr.*exceeded/i)
      expect(result.stderr).not.toContain('\uFFFD')
      expect(Buffer.byteLength(result.stderr)).toBeLessThanOrEqual(cap)
    },
  )

  it('times out a real child, terminates it, and returns only after close', async () => {
    const run = createProcessRunner({
      timeoutMs: 30,
      stdoutMaxBytes: 1_024,
      stderrMaxBytes: 1_024,
      killGraceMs: 50,
    })

    const result = await run(
      process.execPath,
      ['-e', 'setInterval(() => {}, 1_000)'],
      process.cwd(),
    )

    expect(result.exitCode).toBe(-1)
    expect(result.stderr).toMatch(/timed out after 30ms/i)
  })

  it('uses SIGTERM then bounded SIGKILL fallback and waits for close on overflow', async () => {
    vi.useFakeTimers()
    try {
      const { child, events, stdout, kill } = fakeChildProcess()
      const run = createProcessRunner(
        {
          timeoutMs: 10_000,
          stdoutMaxBytes: 4,
          stderrMaxBytes: 128,
          killGraceMs: 25,
        },
        () => child,
      )
      let resolutions = 0
      const pending = run('hermes', [], process.cwd()).then((result) => {
        resolutions += 1
        return result
      })

      stdout.write(Buffer.from('abcdef'))
      await Promise.resolve()
      expect(kill).toHaveBeenCalledWith('SIGTERM')
      expect(resolutions).toBe(0)

      await vi.advanceTimersByTimeAsync(25)
      expect(kill).toHaveBeenCalledWith('SIGKILL')
      expect(resolutions).toBe(0)

      events.emit('close', null, 'SIGKILL')
      const result = await pending
      events.emit('close', 0, null)
      await Promise.resolve()

      expect(resolutions).toBe(1)
      expect(result.exitCode).toBe(-1)
      expect(Buffer.byteLength(result.stdout)).toBe(4)
      expect(Buffer.byteLength(result.stderr)).toBeLessThanOrEqual(128)
      expect(result.stderr).toMatch(/stdout.*exceeded/i)
      expect(vi.getTimerCount()).toBe(0)
      expect(events.listenerCount('close')).toBe(0)
      expect(events.listenerCount('error')).toBe(0)
      expect(stdout.listenerCount('data')).toBe(0)
    } finally {
      vi.useRealTimers()
    }
  })

  it('settles once when child error is followed by close', async () => {
    const { child, events } = fakeChildProcess()
    const run = createProcessRunner(
      {
        timeoutMs: 1_000,
        stdoutMaxBytes: 1_024,
        stderrMaxBytes: 1_024,
        killGraceMs: 50,
      },
      () => child,
    )
    let resolutions = 0
    const pending = run('missing-hermes', [], process.cwd()).then((result) => {
      resolutions += 1
      return result
    })

    events.emit('error', new Error('spawn failed'))
    await Promise.resolve()
    expect(resolutions).toBe(0)
    expect(events.listenerCount('close')).toBe(1)

    events.emit('close', 0, null)
    const result = await pending
    events.emit('close', 0, null)
    await Promise.resolve()

    expect(resolutions).toBe(1)
    expect(result.exitCode).toBe(-1)
    expect(result.stderr).toContain('spawn failed')
  })

  it('decodes a byte-truncated child-error reason as a complete UTF-8 prefix', async () => {
    const { child, events } = fakeChildProcess()
    const run = createProcessRunner(
      {
        timeoutMs: 1_000,
        stdoutMaxBytes: 128,
        stderrMaxBytes: 18,
        killGraceMs: 25,
      },
      () => child,
    )
    const pending = run('missing-hermes', [], process.cwd())

    events.emit('error', new Error('€'))
    events.emit('close', null, null)
    const result = await pending

    expect(result.exitCode).toBe(-1)
    expect(result.stderr).toBe('[ownest] Error: ')
    expect(result.stderr).not.toContain('\uFFFD')
    expect(Buffer.byteLength(result.stderr)).toBeLessThanOrEqual(18)
  })

  it.each([
    ['create', (client: ReturnType<typeof createHermesClient>) => createWithContract(client)],
    ['show', (client: ReturnType<typeof createHermesClient>) => showWithContract(client, 'hermes-1')],
  ] as const)('fails closed when Hermes %s exits non-zero', async (_operation, invoke) => {
    const run = mockRunner({
      exitCode: 2,
      stdout: 'owner@example.com token=stdout-secret ' + 's'.repeat(1_200),
      stderr: 'password=stderr-secret ' + 'e'.repeat(1_200),
    })
    const client = createHermesClient(config, { run })

    const error = await invoke(client).catch((value: unknown) => value)
    expect(error).toBeInstanceOf(Error)
    const message = (error as Error).message
    expect(message).not.toContain('owner@example.com')
    expect(message).not.toContain('stdout-secret')
    expect(message).not.toContain('stderr-secret')
    expect(message).toContain('[REDACTED]')
    expect(message.length).toBeLessThanOrEqual(900)
  })

  it('redacts and caps a rejected process-runner error', async () => {
    const run = vi
      .fn<ProcessRunner>()
      .mockRejectedValue(new Error(`token=spawn-secret owner@example.com ${'x'.repeat(1_500)}`))
    const client = createHermesClient(config, { run })

    const error = await createWithContract(client).catch((value: unknown) => value)
    expect(error).toBeInstanceOf(Error)
    const message = (error as Error).message
    expect(message).not.toContain('spawn-secret')
    expect(message).not.toContain('owner@example.com')
    expect(message).toContain('[REDACTED]')
    expect(message.length).toBeLessThanOrEqual(900)
  })

  it('default runner converts child spawn errors into an exitCode -1 result', async () => {
    const result = await defaultProcessRunner(
      '/definitely/missing/ownest-hermes-adapter-command',
      [],
      process.cwd(),
    )

    expect(result.exitCode).toBe(-1)
    expect(result.stdout).toBe('')
    expect(result.stderr).not.toBe('')
  })
})
