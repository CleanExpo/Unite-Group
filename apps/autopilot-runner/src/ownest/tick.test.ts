import { describe, expect, it, vi } from 'vitest'
import {
  buildMissionContract,
  extractHardenedOwnestState,
  sha256Digest,
} from './policy.js'
import { runOwnestTick } from './tick.js'
import type {
  CcTask,
  CompareAndSetTaskInput,
  HardenedOwnestStateV1,
  HermesStopResult,
  HermesTask,
  IntegrityNonce,
  OwnestCompletionReceiptV1,
  OwnestConfig,
  OwnestCrmClient,
  OwnestHermesClient,
  OwnestMissionContractV1,
  OwnestStopCause,
  OwnestTickDeps,
} from './types.js'

const NOW_ISO = '2026-07-12T00:04:00.000Z'
const ATTEMPT_ID = '11111111-1111-4111-8111-111111111111'
const NONCE = '000102030405060708090a0b0c0d0e0f'.repeat(2) as IntegrityNonce

const baseConfig: OwnestConfig = {
  supabaseUrl: 'https://example.supabase.co',
  serviceRoleKey: 'service-role-secret-DO-NOT-LEAK',
  founderId: 'founder-1',
  workerId: 'ownest-worker-1',
  hermesCwd: '/tmp/hermes-workspace',
  hermesProfile: 'ownest',
  hermesBoard: 'unite-group-ownest',
  rolloutId: 'rollout-2026-07-12',
  canaryTaskId: 'task-1',
  live: true,
  canaryLimit: 1,
  maxInProgress: 1,
  leaseMs: 300_000,
  dailyDispatchLimit: 1,
}

function config(overrides: Partial<OwnestConfig> = {}): OwnestConfig {
  return { ...baseConfig, ...overrides }
}

function task(overrides: Partial<CcTask> = {}): CcTask {
  return {
    id: 'task-1',
    founder_id: baseConfig.founderId,
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
    metadata: { unrelated: { preserve: true } },
    created_at: '2026-07-12T00:00:00.000Z',
    updated_at: '2026-07-12T00:00:00.000Z',
    ...overrides,
  }
}

function claimedTask(
  taskOverrides: Partial<CcTask> = {},
  stateOverrides: Partial<HardenedOwnestStateV1> = {},
): CcTask {
  const value = task({ status: 'running', ...taskOverrides })
  const rolloutId = baseConfig.rolloutId
  if (!rolloutId) throw new Error('test rollout is required')
  const contract = buildMissionContract(
    value,
    ATTEMPT_ID,
    rolloutId,
    NONCE,
    baseConfig.hermesProfile,
    baseConfig.hermesBoard,
  )
  const hermesTaskId = stateOverrides.hermesTaskId === undefined ? 'hermes-1' : stateOverrides.hermesTaskId
  const state: HardenedOwnestStateV1 = {
    version: 1,
    crmTaskId: value.id,
    idempotencyKey: contract.idempotencyKey,
    hermesTaskId,
    attemptId: ATTEMPT_ID,
    leaseOwner: baseConfig.workerId,
    leaseExpiresAt: '2026-07-12T00:10:00.000Z',
    lastHeartbeatAt: '2026-07-12T00:00:00.000Z',
    dispatchedAt: hermesTaskId === null ? null : '2026-07-12T00:00:00.000Z',
    reconciledAt: null,
    evidenceUri: null,
    gateState: 'eligible',
    lastError: null,
    claimedAt: '2026-07-12T00:00:00.000Z',
    rolloutId,
    hermesProfile: baseConfig.hermesProfile,
    hermesBoard: baseConfig.hermesBoard,
    integrityNonce: NONCE,
    missionDigest: contract.missionDigest,
    failureCount: 0,
    failureClass: null,
    failureCode: null,
    nextRetryAt: null,
    completionPhase: hermesTaskId === null ? 'claimed' : 'dispatched',
    receiptSha256: null,
    cancelRequestedAt: null,
    cancelReason: null,
    stopPhase: null,
    ...stateOverrides,
  }
  return { ...value, metadata: { ...value.metadata, ownest: state } }
}

function stateOf(value: CcTask): HardenedOwnestStateV1 {
  const state = extractHardenedOwnestState(value.metadata, value.id)
  if (!state) throw new Error(`test task ${value.id} has invalid OWNEST state`)
  return state
}

function contractOf(value: CcTask): OwnestMissionContractV1 {
  const state = stateOf(value)
  return buildMissionContract(
    value,
    state.attemptId,
    state.rolloutId,
    state.integrityNonce,
    state.hermesProfile,
    state.hermesBoard,
  )
}

function hermesTask(
  id = 'hermes-1',
  status: HermesTask['status'] = 'running',
  overrides: Partial<HermesTask> = {},
): HermesTask {
  return {
    id,
    status,
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
    ...overrides,
  }
}

function completedHermes(value: CcTask): HermesTask {
  const state = stateOf(value)
  if (!state.hermesTaskId) throw new Error('completion fixture requires a Hermes task id')
  const contract = contractOf(value)
  const receipt: OwnestCompletionReceiptV1 = {
    schema: 'ownest.completion.v1',
    crmTaskId: value.id,
    hermesTaskId: state.hermesTaskId,
    attemptId: state.attemptId,
    rolloutId: state.rolloutId,
    missionDigest: state.missionDigest,
    verdict: 'passed',
    evidence: [
      {
        id: 'ev-001',
        kind: 'research',
        uri: 'https://evidence.example.com/reports/retention',
        digest: sha256Digest('retention evidence'),
      },
    ],
    validationResults: contract.validationRequirements.map((requirement) => ({
      requirementId: requirement.id,
      requirementDigest: requirement.digest,
      status: 'passed',
      evidenceIds: ['ev-001'],
    })),
  }
  return hermesTask(state.hermesTaskId, 'done', {
    summary: 'Completed the retention brief.',
    runId: 7,
    completedAt: '2026-07-12T00:03:00.000Z',
    receipt,
    receiptSha256: sha256Digest(JSON.stringify(receipt)),
    latestRun: {
      id: 7,
      profile: 'ownest',
      status: 'done',
      outcome: 'completed',
      summary: 'Completed the retention brief.',
      error: null,
      metadata: null,
      workerPid: 4321,
      startedAt: 1_783_814_400,
      endedAt: 1_783_814_580,
    },
    evidenceUri: `hermes-kanban:/boards/unite-group-ownest/tasks/${state.hermesTaskId}/runs/7`,
  })
}

function stoppedResult(safeToRedispatch = true): HermesStopResult {
  return {
    outcome: 'stopped',
    task: hermesTask('hermes-1', 'archived', { assignee: null }),
    reclaimAttempted: true,
    safeToRedispatch,
    termination: {
      prevPid: 4321,
      hostLocal: true,
      terminationAttempted: true,
      terminated: true,
      sigkill: false,
    },
  }
}

type CrmHarnessOptions = {
  tasks?: readonly CcTask[]
  managedRows?: readonly CcTask[]
  rolloutClaims?: number
  dailyClaims?: number
}

function crmHarness(options: CrmHarnessOptions = {}) {
  const store = new Map((options.tasks ?? []).map((value) => [value.id, structuredClone(value)]))
  const calls: string[] = []
  let updateSequence = 0

  const applyCas = async (input: CompareAndSetTaskInput): Promise<CcTask | null> => {
    calls.push(`cas:${input.taskId}:${input.patch.status ?? 'metadata'}`)
    const current = store.get(input.taskId)
    if (
      !current ||
      current.status !== input.expectedStatus ||
      current.updated_at !== input.expectedUpdatedAt
    ) {
      return null
    }
    updateSequence += 1
    const updated: CcTask = {
      ...current,
      ...input.patch,
      metadata: input.patch.metadata ?? current.metadata,
      updated_at: new Date(Date.parse(current.updated_at) + updateSequence).toISOString(),
    }
    store.set(updated.id, structuredClone(updated))
    return structuredClone(updated)
  }

  const listManagedTasks = vi.fn(async () => {
    calls.push('listManaged')
    const rows =
      options.managedRows ??
      [...store.values()].filter(
        (value) =>
          ['running', 'blocked', 'awaiting_approval', 'failed'].includes(value.status) &&
          extractHardenedOwnestState(value.metadata, value.id) !== null,
      )
    return rows.map((value) => structuredClone(value))
  })
  const getOwnedTask = vi.fn(async (taskId: string) => {
    calls.push(`get:${taskId}`)
    const value = store.get(taskId)
    return value ? structuredClone(value) : null
  })
  const countRolloutClaims = vi.fn(async () => {
    calls.push('countRollout')
    return options.rolloutClaims ?? 0
  })
  const countDailyClaims = vi.fn(async () => {
    calls.push('countDaily')
    return options.dailyClaims ?? 0
  })
  const compareAndSetTask = vi.fn(applyCas)
  const appendTaskEvent = vi.fn(async (input: Parameters<OwnestCrmClient['appendTaskEvent']>[0]) => {
    calls.push(`event:${input.type}`)
  })
  const appendEvidence = vi.fn(async () => {
    calls.push('appendEvidence')
  })
  const ensureCompletionArtifacts = vi.fn(async () => {
    calls.push('artifacts')
    return {
      validationRunIds: ['validation-1'],
      evidenceRecordId: 'evidence-1',
      evidenceAddedEventId: 'evidence-event-1',
      completionEventId: 'completion-event-1',
    }
  })

  const client: OwnestCrmClient = {
    listCandidateTasks: vi.fn(async () => {
      calls.push('listCandidates')
      return []
    }),
    listMirroredTasks: vi.fn(async () => {
      calls.push('listMirrored')
      return []
    }),
    getOwnedTask,
    listManagedTasks,
    countRolloutClaims,
    countDailyClaims,
    compareAndSetTask,
    appendTaskEvent,
    appendEvidence,
    ensureCompletionArtifacts,
  }

  return {
    client,
    calls,
    store,
    applyCas,
    listManagedTasks,
    getOwnedTask,
    countRolloutClaims,
    countDailyClaims,
    compareAndSetTask,
    appendTaskEvent,
    ensureCompletionArtifacts,
    getTask(taskId = 'task-1') {
      const value = store.get(taskId)
      return value ? structuredClone(value) : null
    },
    setTask(value: CcTask) {
      store.set(value.id, structuredClone(value))
    },
  }
}

function hermesHarness() {
  const calls: string[] = []
  const createMission = vi.fn(async (value: CcTask, _contract: OwnestMissionContractV1) => {
    calls.push(`create:${value.id}`)
    return hermesTask('hermes-created', 'ready', { idempotencyKey: stateOf(value).idempotencyKey })
  })
  const showMission = vi.fn(async (taskId: string, _contract: OwnestMissionContractV1) => {
    calls.push(`show:${taskId}`)
    return hermesTask(taskId, 'running')
  })
  const stopMission = vi.fn(async (
    taskId: string,
    _contract: OwnestMissionContractV1,
    _cause: OwnestStopCause,
  ) => {
    calls.push(`stop:${taskId}`)
    return stoppedResult(true)
  })
  const client: OwnestHermesClient = { createMission, showMission, stopMission }
  return { client, calls, createMission, showMission, stopMission }
}

function tickDeps(
  crm: OwnestCrmClient,
  hermes: OwnestHermesClient,
  options: { nowIso?: string; randomUUID?: string } = {},
) {
  const now = vi.fn(() => new Date(options.nowIso ?? NOW_ISO))
  const randomUUID = vi.fn(() => options.randomUUID ?? ATTEMPT_ID)
  const deps: OwnestTickDeps = { crm, hermes, now, randomUUID }
  return { deps, now, randomUUID }
}

describe('runOwnestTick reconciliation and bounded admission', () => {
  it('reconciles an existing mirror while live is off and does not evaluate admission quotas', async () => {
    const managed = claimedTask()
    const crm = crmHarness({ tasks: [managed] })
    const hermes = hermesHarness()
    const { deps } = tickDeps(crm.client, hermes.client)

    const result = await runOwnestTick(config({ live: false }), deps)

    expect(result).toEqual({ outcome: 'reconciled', reconciled: 1, dispatched: 0, taskId: managed.id })
    expect(hermes.showMission).toHaveBeenCalledOnce()
    expect(hermes.createMission).not.toHaveBeenCalled()
    expect(crm.countRolloutClaims).not.toHaveBeenCalled()
    expect(crm.countDailyClaims).not.toHaveBeenCalled()
    const updated = crm.getTask()
    expect(updated?.status).toBe('running')
    expect(stateOf(updated as CcTask)).toMatchObject({
      lastHeartbeatAt: NOW_ISO,
      leaseExpiresAt: '2026-07-12T00:09:00.000Z',
      failureCount: 0,
      failureClass: null,
      nextRetryAt: null,
    })
  })

  it('uses the fresh persisted rollout contract for live-off reconciliation when admission scope is null', async () => {
    const managed = claimedTask()
    const crm = crmHarness({ tasks: [managed] })
    const hermes = hermesHarness()
    const { deps } = tickDeps(crm.client, hermes.client)

    const result = await runOwnestTick(
      config({ live: false, rolloutId: null, canaryTaskId: null }),
      deps,
    )

    expect(result).toMatchObject({ outcome: 'reconciled', reconciled: 1, dispatched: 0 })
    expect(hermes.showMission).toHaveBeenCalledWith('hermes-1', contractOf(managed))
    expect(hermes.stopMission).not.toHaveBeenCalled()
    expect(hermes.createMission).not.toHaveBeenCalled()
  })

  it('returns drained only after checking the managed set and exact canary while live is off', async () => {
    const crm = crmHarness()
    const hermes = hermesHarness()
    const { deps } = tickDeps(crm.client, hermes.client)

    await expect(runOwnestTick(config({ live: false }), deps)).resolves.toEqual({
      outcome: 'drained',
      reconciled: 0,
      dispatched: 0,
    })
    expect(crm.calls.slice(0, 2)).toEqual(['listManaged', 'get:task-1'])
    expect(hermes.showMission).not.toHaveBeenCalled()
  })

  it('deduplicates the canary from the managed set and never uses legacy candidate fallbacks', async () => {
    const managed = claimedTask()
    const crm = crmHarness({ tasks: [managed], managedRows: [managed, structuredClone(managed)] })
    const hermes = hermesHarness()
    const { deps } = tickDeps(crm.client, hermes.client)

    await runOwnestTick(config({ live: false }), deps)

    expect(hermes.showMission).toHaveBeenCalledOnce()
    expect(crm.client.listCandidateTasks).not.toHaveBeenCalled()
    expect(crm.client.listMirroredTasks).not.toHaveBeenCalled()
  })

  it('reconciles the deduplicated managed union in deterministic task-id order', async () => {
    const first = claimedTask()
    const second = claimedTask(
      { id: 'task-2' },
      { hermesTaskId: 'hermes-2', completionPhase: 'dispatched' },
    )
    const crm = crmHarness({ tasks: [first, second], managedRows: [second, first] })
    const hermes = hermesHarness()
    const { deps } = tickDeps(crm.client, hermes.client)

    await runOwnestTick(config({ live: false }), deps)

    expect(hermes.showMission.mock.calls.map(([taskId]) => taskId)).toEqual([
      'hermes-1',
      'hermes-2',
    ])
  })

  it('never falls back when the nominated canary is absent or ineligible', async () => {
    const ineligible = task({ human_approval_required: true })
    const crm = crmHarness({ tasks: [ineligible] })
    const hermes = hermesHarness()
    const { deps } = tickDeps(crm.client, hermes.client)

    await expect(runOwnestTick(config(), deps)).resolves.toMatchObject({
      outcome: 'idle',
      dispatched: 0,
    })
    expect(hermes.createMission).not.toHaveBeenCalled()
    expect(crm.client.listCandidateTasks).not.toHaveBeenCalled()
  })

  it('claims the exact queued canary before create, preserves metadata, then mirrors and audits it', async () => {
    const candidate = task({ metadata: { unrelated: { preserve: true }, ownerNote: 'keep' } })
    const crm = crmHarness({ tasks: [candidate] })
    const hermes = hermesHarness()
    const { deps, randomUUID } = tickDeps(crm.client, hermes.client)

    const result = await runOwnestTick(config(), deps)

    expect(result).toEqual({ outcome: 'dispatched', reconciled: 0, dispatched: 1, taskId: candidate.id })
    expect(crm.calls.indexOf('cas:task-1:running')).toBeLessThan(crm.calls.indexOf('event:started'))
    expect(hermes.createMission).toHaveBeenCalledOnce()
    expect(randomUUID).toHaveBeenCalledOnce()
    const createCall = hermes.createMission.mock.calls[0]
    if (!createCall) throw new Error('expected create call')
    expect(createCall[0].status).toBe('running')
    const claimedState = stateOf(createCall[0])
    expect(claimedState).toMatchObject({
      crmTaskId: candidate.id,
      attemptId: ATTEMPT_ID,
      rolloutId: baseConfig.rolloutId,
      hermesTaskId: null,
      leaseOwner: baseConfig.workerId,
      claimedAt: NOW_ISO,
      completionPhase: 'claimed',
      cancelRequestedAt: null,
      cancelReason: null,
      stopPhase: null,
    })
    expect(claimedState.integrityNonce).toMatch(/^[0-9a-f]{64}$/)
    expect(createCall[0].metadata).toMatchObject({ unrelated: { preserve: true }, ownerNote: 'keep' })
    expect(createCall[1]).toEqual(contractOf(createCall[0]))
    const stored = crm.getTask()
    expect(stored?.status).toBe('running')
    expect(stateOf(stored as CcTask)).toMatchObject({
      hermesTaskId: 'hermes-created',
      completionPhase: 'dispatched',
      dispatchedAt: NOW_ISO,
    })
    expect(crm.appendTaskEvent).toHaveBeenCalledWith(expect.objectContaining({ type: 'started' }))
  })

  it('rejects an unsafe injected attempt id before claim or Hermes create', async () => {
    const crm = crmHarness({ tasks: [task()] })
    const hermes = hermesHarness()
    const { deps } = tickDeps(crm.client, hermes.client, { randomUUID: 'unsafe attempt id' })

    const result = await runOwnestTick(config(), deps)

    expect(result).toMatchObject({ outcome: 'failed', dispatched: 0 })
    expect(crm.compareAndSetTask).not.toHaveBeenCalled()
    expect(hermes.createMission).not.toHaveBeenCalled()
  })

  it('treats a queued claim CAS loss as contention and never creates or selects another task', async () => {
    const crm = crmHarness({ tasks: [task()] })
    crm.compareAndSetTask.mockResolvedValueOnce(null)
    const hermes = hermesHarness()
    const { deps } = tickDeps(crm.client, hermes.client)

    const result = await runOwnestTick(config(), deps)

    expect(result).toMatchObject({ outcome: 'idle', dispatched: 0 })
    expect(crm.getOwnedTask).toHaveBeenCalledTimes(4)
    expect(hermes.createMission).not.toHaveBeenCalled()
    expect(crm.client.listCandidateTasks).not.toHaveBeenCalled()
  })

  it('recovers a running null-mirror claim with the same attempt and no new UUID', async () => {
    const claimed = claimedTask({}, { hermesTaskId: null, completionPhase: 'claimed' })
    const crm = crmHarness({ tasks: [claimed] })
    const hermes = hermesHarness()
    const { deps, randomUUID } = tickDeps(crm.client, hermes.client)

    const result = await runOwnestTick(config(), deps)

    expect(result).toEqual({ outcome: 'reconciled', reconciled: 1, dispatched: 0, taskId: claimed.id })
    expect(randomUUID).not.toHaveBeenCalled()
    expect(hermes.createMission).toHaveBeenCalledOnce()
    expect(hermes.createMission.mock.calls[0]?.[1]).toEqual(contractOf(claimed))
    expect(stateOf(crm.getTask() as CcTask)).toMatchObject({
      attemptId: ATTEMPT_ID,
      hermesTaskId: 'hermes-created',
      completionPhase: 'dispatched',
    })
  })

  it('reclaims an expired null-mirror lease and creates with the same persisted attempt', async () => {
    const claimed = claimedTask({}, {
      hermesTaskId: null,
      completionPhase: 'claimed',
      leaseOwner: 'previous-worker',
      leaseExpiresAt: NOW_ISO,
    })
    const crm = crmHarness({ tasks: [claimed] })
    const hermes = hermesHarness()
    const { deps, randomUUID } = tickDeps(crm.client, hermes.client)

    const result = await runOwnestTick(config(), deps)

    expect(result).toMatchObject({ outcome: 'reconciled', reconciled: 1, dispatched: 0 })
    expect(randomUUID).not.toHaveBeenCalled()
    expect(hermes.stopMission).not.toHaveBeenCalled()
    expect(hermes.createMission).toHaveBeenCalledOnce()
    expect(hermes.createMission.mock.calls[0]?.[1]).toEqual(contractOf(claimed))
    expect(stateOf(crm.getTask() as CcTask)).toMatchObject({
      attemptId: ATTEMPT_ID,
      leaseOwner: baseConfig.workerId,
      hermesTaskId: 'hermes-created',
    })
  })

  it('reports an expired null-mirror lease reclaim as reconciliation while live is off', async () => {
    const claimed = claimedTask({}, {
      hermesTaskId: null,
      completionPhase: 'claimed',
      leaseOwner: 'previous-worker',
      leaseExpiresAt: NOW_ISO,
    })
    const crm = crmHarness({ tasks: [claimed] })
    const hermes = hermesHarness()
    const { deps } = tickDeps(crm.client, hermes.client)

    const result = await runOwnestTick(config({ live: false }), deps)

    expect(result).toMatchObject({ outcome: 'reconciled', reconciled: 1, dispatched: 0 })
    expect(hermes.createMission).not.toHaveBeenCalled()
    expect(stateOf(crm.getTask() as CcTask)).toMatchObject({
      attemptId: ATTEMPT_ID,
      leaseOwner: baseConfig.workerId,
      leaseExpiresAt: '2026-07-12T00:09:00.000Z',
      hermesTaskId: null,
    })
  })

  it('recovers create-then-mirror-CAS loss idempotently without minting a second attempt', async () => {
    const claimed = claimedTask({}, { hermesTaskId: null, completionPhase: 'claimed' })
    const crm = crmHarness({ tasks: [claimed] })
    crm.compareAndSetTask.mockResolvedValueOnce(null)
    const hermes = hermesHarness()
    const { deps, randomUUID } = tickDeps(crm.client, hermes.client)

    await expect(runOwnestTick(config(), deps)).resolves.toMatchObject({ outcome: 'failed' })
    await expect(runOwnestTick(config(), deps)).resolves.toMatchObject({ outcome: 'reconciled' })

    expect(hermes.createMission).toHaveBeenCalledTimes(2)
    expect(hermes.createMission.mock.calls[0]?.[1]).toEqual(hermes.createMission.mock.calls[1]?.[1])
    expect(randomUUID).not.toHaveBeenCalled()
    expect(stateOf(crm.getTask() as CcTask).attemptId).toBe(ATTEMPT_ID)
  })

  it('records and stops the created mirror when cancellation wins the mirror CAS race', async () => {
    const candidate = task()
    const crm = crmHarness({ tasks: [candidate] })
    crm.compareAndSetTask
      .mockImplementationOnce(crm.applyCas)
      .mockImplementationOnce(async () => {
        const current = crm.getTask()
        if (!current) throw new Error('expected claimed task')
        const state = stateOf(current)
        crm.setTask({
          ...current,
          metadata: {
            ...current.metadata,
            ownest: {
              ...state,
              cancelRequestedAt: '2026-07-12T00:04:00.000Z',
              cancelReason: 'Founder cancellation won the mirror race',
            },
          },
          updated_at: '2026-07-12T00:00:01.000Z',
        })
        return null
      })
    const hermes = hermesHarness()
    const { deps, randomUUID } = tickDeps(crm.client, hermes.client)

    const result = await runOwnestTick(config(), deps)

    expect(result).toMatchObject({ outcome: 'blocked', dispatched: 0, taskId: candidate.id })
    expect(randomUUID).toHaveBeenCalledOnce()
    expect(hermes.createMission).toHaveBeenCalledOnce()
    expect(hermes.stopMission).toHaveBeenCalledWith(
      'hermes-created',
      expect.objectContaining({ crmTaskId: candidate.id, attemptId: ATTEMPT_ID }),
      'cancel-requested',
    )
    expect(crm.appendTaskEvent).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: 'started' }),
    )
    expect(crm.getTask()?.status).toBe('blocked')
    expect(stateOf(crm.getTask() as CcTask)).toMatchObject({
      attemptId: ATTEMPT_ID,
      hermesTaskId: 'hermes-created',
      gateState: 'gated',
      completionPhase: 'terminal',
      stopPhase: 'archived',
    })
  })

  it('treats a fresh same-attempt null-to-mirrored CAS as authoritative progress', async () => {
    const snapshot = claimedTask({}, { hermesTaskId: null, completionPhase: 'claimed' })
    const fresh = claimedTask({}, { hermesTaskId: 'hermes-raced', completionPhase: 'dispatched' })
    const crm = crmHarness({ tasks: [fresh], managedRows: [snapshot] })
    const hermes = hermesHarness()
    hermes.showMission.mockResolvedValueOnce(hermesTask('hermes-raced', 'running'))
    const { deps, randomUUID } = tickDeps(crm.client, hermes.client)

    const result = await runOwnestTick(config({ live: false }), deps)

    expect(result).toMatchObject({ outcome: 'reconciled', reconciled: 1, dispatched: 0 })
    expect(randomUUID).not.toHaveBeenCalled()
    expect(hermes.createMission).not.toHaveBeenCalled()
    expect(hermes.stopMission).not.toHaveBeenCalled()
    expect(hermes.showMission).toHaveBeenCalledWith('hermes-raced', contractOf(fresh))
    expect(crm.getTask()?.status).toBe('running')
    expect(stateOf(crm.getTask() as CcTask).gateState).toBe('eligible')
  })

  it('dead-letters and stops a confirmed mirror when the started audit is unconfirmed', async () => {
    const candidate = task()
    const crm = crmHarness({ tasks: [candidate] })
    crm.appendTaskEvent.mockRejectedValueOnce(new Error('started response lost'))
    const hermes = hermesHarness()
    const { deps } = tickDeps(crm.client, hermes.client)

    const result = await runOwnestTick(config(), deps)

    expect(result).toMatchObject({ outcome: 'failed', dispatched: 0, taskId: candidate.id })
    expect(hermes.createMission).toHaveBeenCalledOnce()
    expect(hermes.stopMission).toHaveBeenCalledWith(
      'hermes-created',
      expect.objectContaining({ crmTaskId: candidate.id, attemptId: ATTEMPT_ID }),
      'operator-stop',
    )
    expect(crm.getTask()?.status).toBe('failed')
    expect(stateOf(crm.getTask() as CcTask)).toMatchObject({
      gateState: 'dead_letter',
      failureClass: 'integrity',
      completionPhase: 'terminal',
      stopPhase: 'archived',
    })
  })

  it('reconciles before checking persisted rollout and daily quotas', async () => {
    const managed = claimedTask({ id: 'task-2' })
    const candidate = task()
    const crm = crmHarness({ tasks: [managed, candidate], rolloutClaims: 1, dailyClaims: 1 })
    const hermes = hermesHarness()
    hermes.showMission.mockResolvedValueOnce(hermesTask('hermes-1', 'blocked', { error: 'needs repair' }))
    const { deps } = tickDeps(crm.client, hermes.client)

    await runOwnestTick(config(), deps)

    expect(crm.calls.indexOf('event:blocked')).toBeLessThan(crm.calls.indexOf('countRollout'))
    expect(crm.calls.indexOf('countRollout')).toBeLessThan(crm.calls.indexOf('countDaily'))
    expect(hermes.createMission).not.toHaveBeenCalled()
  })

  it('uses exact half-open UTC day bounds and does not claim when a quota is full', async () => {
    const crm = crmHarness({ tasks: [task()], rolloutClaims: 0, dailyClaims: 1 })
    const hermes = hermesHarness()
    const { deps } = tickDeps(crm.client, hermes.client, { nowIso: '2026-12-31T23:59:59.999Z' })

    const result = await runOwnestTick(config(), deps)

    expect(result).toMatchObject({ outcome: 'idle', dispatched: 0 })
    expect(crm.countDailyClaims).toHaveBeenCalledWith(
      '2026-12-31T00:00:00.000Z',
      '2027-01-01T00:00:00.000Z',
    )
    expect(crm.compareAndSetTask).not.toHaveBeenCalled()
    expect(hermes.createMission).not.toHaveBeenCalled()
  })
})

describe('runOwnestTick authority, completion, and failure recovery', () => {
  it.each([
    [
      'cancel-requested',
      (snapshot: CcTask, fresh: CcTask) => {
        const cancelAt = '2026-07-12T00:03:00.000Z'
        ;(snapshot.metadata.ownest as HardenedOwnestStateV1).cancelRequestedAt = cancelAt
        ;(fresh.metadata.ownest as HardenedOwnestStateV1).cancelRequestedAt = cancelAt
      },
    ],
    [
      'lease-expired',
      (snapshot: CcTask, fresh: CcTask) => {
        const expired = '2026-07-12T00:03:59.999Z'
        ;(snapshot.metadata.ownest as HardenedOwnestStateV1).leaseExpiresAt = expired
        ;(fresh.metadata.ownest as HardenedOwnestStateV1).leaseExpiresAt = expired
      },
    ],
  ] as const)('stops a revoked projection with exact %s cause before show', async (cause, mutate) => {
    const snapshot = claimedTask()
    const fresh = structuredClone(snapshot)
    mutate(snapshot, fresh)
    const crm = crmHarness({ tasks: [fresh], managedRows: [snapshot] })
    const hermes = hermesHarness()
    const { deps } = tickDeps(crm.client, hermes.client)

    const result = await runOwnestTick(config(), deps)

    expect(result).toMatchObject({ outcome: 'blocked', reconciled: 1, dispatched: 0 })
    expect(hermes.showMission).not.toHaveBeenCalled()
    expect(hermes.stopMission).toHaveBeenCalledWith('hermes-1', contractOf(snapshot), cause)
    const updated = crm.getTask()
    expect(updated?.status).toBe('blocked')
    expect(stateOf(updated as CcTask)).toMatchObject({
      gateState: 'gated',
      stopPhase: 'archived',
      completionPhase: 'terminal',
    })
  })

  it('dead-letters unprovable mission drift without calling stop with a stale contract', async () => {
    const snapshot = claimedTask()
    const fresh = structuredClone(snapshot)
    fresh.title = 'Changed mission title'
    const crm = crmHarness({ tasks: [fresh], managedRows: [snapshot] })
    const hermes = hermesHarness()
    const { deps } = tickDeps(crm.client, hermes.client)

    const result = await runOwnestTick(config(), deps)

    expect(result).toMatchObject({ outcome: 'blocked', reconciled: 1, dispatched: 0 })
    expect(hermes.stopMission).not.toHaveBeenCalled()
    expect(hermes.showMission).not.toHaveBeenCalled()
    expect(crm.getTask()?.status).toBe('failed')
    expect(stateOf(crm.getTask() as CcTask)).toMatchObject({
      gateState: 'dead_letter',
      failureClass: 'integrity',
      completionPhase: 'terminal',
    })
  })

  it('rebuilds full authority after stop request CAS and aborts stop if mission digest changes', async () => {
    const cancelled = claimedTask({}, { cancelRequestedAt: '2026-07-12T00:03:00.000Z' })
    const crm = crmHarness({ tasks: [cancelled] })
    let reads = 0
    crm.getOwnedTask.mockImplementation(async (taskId: string) => {
      reads += 1
      const current = crm.getTask(taskId)
      if (!current) return null
      if (reads === 3) {
        const changed = { ...current, title: 'Changed during stop request' }
        crm.setTask(changed)
        return changed
      }
      return current
    })
    const hermes = hermesHarness()
    const { deps } = tickDeps(crm.client, hermes.client)

    const result = await runOwnestTick(config(), deps)

    expect(result).toMatchObject({ outcome: 'blocked', dispatched: 0 })
    expect(hermes.stopMission).not.toHaveBeenCalled()
    expect(crm.getTask()?.status).toBe('failed')
    expect(stateOf(crm.getTask() as CcTask).gateState).toBe('dead_letter')
  })

  it('uses authority-revoked when the lease owner changes', async () => {
    const snapshot = claimedTask()
    const fresh = structuredClone(snapshot)
    ;(fresh.metadata.ownest as HardenedOwnestStateV1).leaseOwner = 'other-worker'
    const crm = crmHarness({ tasks: [fresh], managedRows: [snapshot] })
    const hermes = hermesHarness()
    const { deps } = tickDeps(crm.client, hermes.client)

    await runOwnestTick(config(), deps)

    expect(hermes.stopMission).toHaveBeenCalledWith(
      'hermes-1',
      contractOf(snapshot),
      'authority-revoked',
    )
  })

  it('dead-letters an unsafe or unconfirmed stop and never shows or recreates it', async () => {
    const cancelled = claimedTask({}, { cancelRequestedAt: '2026-07-12T00:03:00.000Z' })
    const crm = crmHarness({ tasks: [cancelled] })
    const hermes = hermesHarness()
    hermes.stopMission.mockResolvedValueOnce(stoppedResult(false))
    const { deps } = tickDeps(crm.client, hermes.client)

    const result = await runOwnestTick(config(), deps)

    expect(result).toMatchObject({ outcome: 'blocked', dispatched: 0 })
    expect(crm.getTask()?.status).toBe('failed')
    expect(stateOf(crm.getTask() as CcTask)).toMatchObject({
      gateState: 'dead_letter',
      completionPhase: 'terminal',
    })
    expect(hermes.showMission).not.toHaveBeenCalled()
    expect(hermes.createMission).not.toHaveBeenCalled()
  })

  it('dead-letters when stop verification throws because termination is unconfirmed', async () => {
    const cancelled = claimedTask({}, { cancelRequestedAt: '2026-07-12T00:03:00.000Z' })
    const crm = crmHarness({ tasks: [cancelled] })
    const hermes = hermesHarness()
    hermes.stopMission.mockRejectedValueOnce(new Error('Hermes stop termination unconfirmed'))
    const { deps } = tickDeps(crm.client, hermes.client)

    await expect(runOwnestTick(config(), deps)).resolves.toMatchObject({ outcome: 'blocked' })
    expect(crm.getTask()?.status).toBe('failed')
    expect(stateOf(crm.getTask() as CcTask).gateState).toBe('dead_letter')
  })

  it('renews a live show only through updated_at CAS and resets prior failure state', async () => {
    const managed = claimedTask({}, {
      failureCount: 2,
      failureClass: 'transient',
      failureCode: 'hermes-transient',
      nextRetryAt: null,
      lastError: 'old failure',
    })
    const crm = crmHarness({ tasks: [managed] })
    const hermes = hermesHarness()
    const { deps } = tickDeps(crm.client, hermes.client)

    await runOwnestTick(config({ live: false }), deps)

    expect(crm.compareAndSetTask).toHaveBeenCalledOnce()
    const input = crm.compareAndSetTask.mock.calls[0]?.[0]
    expect(input?.expectedUpdatedAt).toBe(managed.updated_at)
    expect(input?.patch.status).toBeUndefined()
    expect(stateOf(crm.getTask() as CcTask)).toMatchObject({
      failureCount: 0,
      failureClass: null,
      failureCode: null,
      nextRetryAt: null,
      lastError: null,
      lastHeartbeatAt: NOW_ISO,
      leaseExpiresAt: '2026-07-12T00:09:00.000Z',
    })
  })

  it.each(['blocked', 'review'] as const)('maps Hermes %s to a gated CRM blocker, never done', async (status) => {
    const managed = claimedTask()
    const crm = crmHarness({ tasks: [managed] })
    const hermes = hermesHarness()
    hermes.showMission.mockResolvedValueOnce(hermesTask('hermes-1', status, { error: 'needs review' }))
    const { deps } = tickDeps(crm.client, hermes.client)

    const result = await runOwnestTick(config(), deps)

    expect(result).toMatchObject({ outcome: 'blocked', reconciled: 1 })
    expect(crm.getTask()?.status).toBe('blocked')
    expect(stateOf(crm.getTask() as CcTask)).toMatchObject({
      gateState: 'gated',
      completionPhase: 'terminal',
    })
    expect(crm.appendTaskEvent).toHaveBeenCalledWith(expect.objectContaining({ type: 'blocked' }))
    expect(crm.ensureCompletionArtifacts).not.toHaveBeenCalled()
  })

  it('maps archived Hermes to an immediate dead letter and never done', async () => {
    const managed = claimedTask()
    const crm = crmHarness({ tasks: [managed] })
    const hermes = hermesHarness()
    hermes.showMission.mockResolvedValueOnce(hermesTask('hermes-1', 'archived'))
    const { deps } = tickDeps(crm.client, hermes.client)

    await runOwnestTick(config(), deps)

    expect(crm.getTask()?.status).toBe('failed')
    expect(stateOf(crm.getTask() as CcTask)).toMatchObject({ gateState: 'dead_letter' })
    expect(crm.ensureCompletionArtifacts).not.toHaveBeenCalled()
  })

  it('dead-letters a missing Hermes projection immediately', async () => {
    const managed = claimedTask()
    const crm = crmHarness({ tasks: [managed] })
    const hermes = hermesHarness()
    hermes.showMission.mockRejectedValueOnce(new Error('Hermes show task not found'))
    const { deps } = tickDeps(crm.client, hermes.client)

    await runOwnestTick(config(), deps)

    expect(crm.getTask()?.status).toBe('failed')
    expect(stateOf(crm.getTask() as CcTask)).toMatchObject({
      gateState: 'dead_letter',
      failureClass: 'permanent',
    })
  })

  it('repairs completion artifacts before the final done and terminal CAS', async () => {
    const managed = claimedTask()
    const crm = crmHarness({ tasks: [managed] })
    const hermes = hermesHarness()
    const completion = completedHermes(managed)
    hermes.showMission.mockResolvedValueOnce(completion)
    const { deps } = tickDeps(crm.client, hermes.client)

    const result = await runOwnestTick(config(), deps)

    expect(result).toEqual({ outcome: 'reconciled', reconciled: 1, dispatched: 0, taskId: managed.id })
    const firstCas = crm.calls.indexOf('cas:task-1:metadata')
    const artifacts = crm.calls.indexOf('artifacts')
    const doneCas = crm.calls.indexOf('cas:task-1:done')
    expect(firstCas).toBeGreaterThanOrEqual(0)
    expect(firstCas).toBeLessThan(artifacts)
    expect(artifacts).toBeLessThan(doneCas)
    expect(crm.ensureCompletionArtifacts).toHaveBeenCalledWith({
      taskId: managed.id,
      expectedContract: contractOf(managed),
      completion,
      nowIso: NOW_ISO,
    })
    const stored = crm.getTask()
    expect(stored?.status).toBe('done')
    expect(stateOf(stored as CcTask)).toMatchObject({
      completionPhase: 'terminal',
      receiptSha256: completion.receiptSha256,
      evidenceUri: completion.evidenceUri,
      failureCount: 0,
    })
  })

  it('dead-letters a done projection with a missing or invalid completion receipt', async () => {
    const managed = claimedTask()
    const crm = crmHarness({ tasks: [managed] })
    const hermes = hermesHarness()
    hermes.showMission.mockResolvedValueOnce(hermesTask('hermes-1', 'done', { summary: 'done' }))
    const { deps } = tickDeps(crm.client, hermes.client)

    await runOwnestTick(config(), deps)

    expect(crm.ensureCompletionArtifacts).not.toHaveBeenCalled()
    expect(crm.getTask()?.status).toBe('failed')
    expect(stateOf(crm.getTask() as CcTask).gateState).toBe('dead_letter')
  })

  it('dead-letters private-network completion evidence before artifact repair', async () => {
    const managed = claimedTask()
    const crm = crmHarness({ tasks: [managed] })
    const hermes = hermesHarness()
    const completion = completedHermes(managed)
    const receipt = structuredClone(completion.receipt)
    if (!receipt) throw new Error('expected completion receipt')
    const evidence = receipt.evidence as unknown as Array<Record<string, unknown>>
    evidence[0] = { ...evidence[0], uri: 'https://127.0.0.1/internal-evidence' }
    completion.receipt = receipt
    completion.receiptSha256 = sha256Digest(JSON.stringify(receipt))
    hermes.showMission.mockResolvedValueOnce(completion)
    const { deps } = tickDeps(crm.client, hermes.client)

    await runOwnestTick(config(), deps)

    expect(crm.ensureCompletionArtifacts).not.toHaveBeenCalled()
    expect(crm.getTask()?.status).toBe('failed')
    expect(stateOf(crm.getTask() as CcTask).gateState).toBe('dead_letter')
  })

  it('dead-letters an impossible running terminal phase without calling Hermes', async () => {
    const managed = claimedTask({}, { completionPhase: 'terminal' })
    const crm = crmHarness({ tasks: [managed] })
    const hermes = hermesHarness()
    const { deps } = tickDeps(crm.client, hermes.client)

    await runOwnestTick(config(), deps)

    expect(hermes.showMission).not.toHaveBeenCalled()
    expect(crm.getTask()?.status).toBe('failed')
    expect(stateOf(crm.getTask() as CcTask).gateState).toBe('dead_letter')
  })

  it('never marks done or dispatches when completion artifact repair fails', async () => {
    const managed = claimedTask()
    const candidate = task({ id: 'task-2' })
    const crm = crmHarness({ tasks: [managed, candidate] })
    crm.ensureCompletionArtifacts.mockRejectedValueOnce(new Error('CRM audit write failed'))
    const hermes = hermesHarness()
    hermes.showMission.mockResolvedValueOnce(completedHermes(managed))
    const { deps } = tickDeps(crm.client, hermes.client)

    const result = await runOwnestTick(config({ canaryTaskId: 'task-2' }), deps)

    expect(result).toMatchObject({ outcome: 'failed', dispatched: 0 })
    expect(crm.getTask('task-1')?.status).toBe('running')
    expect(stateOf(crm.getTask('task-1') as CcTask).completionPhase).toBe('receipt_validated')
    expect(hermes.createMission).not.toHaveBeenCalled()
    expect(crm.countRolloutClaims).not.toHaveBeenCalled()
  })

  it('stops dispatch when a reconciliation audit event fails', async () => {
    const managed = claimedTask({ id: 'task-2' })
    const candidate = task()
    const crm = crmHarness({ tasks: [managed, candidate] })
    crm.appendTaskEvent.mockRejectedValueOnce(new Error('audit event failed'))
    const hermes = hermesHarness()
    hermes.showMission.mockResolvedValueOnce(hermesTask('hermes-1', 'blocked'))
    const { deps } = tickDeps(crm.client, hermes.client)

    const result = await runOwnestTick(config(), deps)

    expect(result).toMatchObject({ outcome: 'failed', dispatched: 0 })
    expect(crm.countRolloutClaims).not.toHaveBeenCalled()
    expect(hermes.createMission).not.toHaveBeenCalled()
  })

  it.each([
    [0, 60_000, 'running', 'eligible'],
    [1, 300_000, 'running', 'eligible'],
    [2, null, 'failed', 'dead_letter'],
  ] as const)(
    'applies deterministic transient retry policy from prior failure count %s',
    async (priorCount, delayMs, expectedStatus, expectedGate) => {
      const managed = claimedTask({}, {
        failureCount: priorCount,
        failureClass: priorCount === 0 ? null : 'transient',
        failureCode: priorCount === 0 ? null : 'hermes-transient',
        nextRetryAt: null,
      })
      const crm = crmHarness({ tasks: [managed] })
      const hermes = hermesHarness()
      hermes.showMission.mockRejectedValueOnce(new Error('Hermes show process rejected: timeout'))
      const { deps } = tickDeps(crm.client, hermes.client)

      const result = await runOwnestTick(config(), deps)

      expect(result).toMatchObject({ outcome: priorCount === 2 ? 'blocked' : 'failed' })
      const stored = crm.getTask()
      expect(stored?.status).toBe(expectedStatus)
      const state = stateOf(stored as CcTask)
      expect(state.failureCount).toBe(priorCount + 1)
      expect(state.gateState).toBe(expectedGate)
      expect(state.nextRetryAt).toBe(
        delayMs === null ? null : new Date(Date.parse(NOW_ISO) + delayMs).toISOString(),
      )
    },
  )

  it('skips Hermes until a persisted transient retry is due and consumes concurrency', async () => {
    const managed = claimedTask({}, {
      failureCount: 1,
      failureClass: 'transient',
      failureCode: 'hermes-transient',
      nextRetryAt: '2026-07-12T00:05:00.000Z',
    })
    const crm = crmHarness({ tasks: [managed] })
    const hermes = hermesHarness()
    const { deps } = tickDeps(crm.client, hermes.client)

    await expect(runOwnestTick(config(), deps)).resolves.toMatchObject({ dispatched: 0 })
    expect(hermes.showMission).not.toHaveBeenCalled()
    expect(hermes.createMission).not.toHaveBeenCalled()
  })

  it('returns a bounded redacted failure and performs no Hermes work when CRM discovery fails', async () => {
    const crm = crmHarness()
    crm.listManagedTasks.mockRejectedValueOnce(
      new Error(`owner@example.com token=secret ${baseConfig.serviceRoleKey} ${'x'.repeat(2_000)}`),
    )
    const hermes = hermesHarness()
    const { deps } = tickDeps(crm.client, hermes.client)

    const result = await runOwnestTick(config(), deps)

    expect(result.outcome).toBe('failed')
    expect(result.error).toContain('[REDACTED]')
    expect(result.error).not.toContain('owner@example.com')
    expect(result.error).not.toContain('token=secret')
    expect(result.error).not.toContain(baseConfig.serviceRoleKey)
    expect(result.error?.length).toBeLessThanOrEqual(800)
    expect(hermes.showMission).not.toHaveBeenCalled()
    expect(hermes.createMission).not.toHaveBeenCalled()
  })

  it.each([
    ['undefined rejection', undefined],
    [
      'hostile unstringifiable rejection',
      {
        toJSON() {
          throw new Error('toJSON denied')
        },
        toString() {
          throw new Error('toString denied')
        },
      },
    ],
  ])('always returns a bounded failure for %s', async (_label, rejection) => {
    const crm = crmHarness()
    crm.listManagedTasks.mockRejectedValueOnce(rejection)
    const hermes = hermesHarness()
    const { deps } = tickDeps(crm.client, hermes.client)

    await expect(runOwnestTick(config(), deps)).resolves.toMatchObject({
      outcome: 'failed',
      reconciled: 0,
      dispatched: 0,
      error: expect.any(String),
    })
  })
})
