import { isDeepStrictEqual } from 'node:util'
import {
  buildMissionContract,
  evaluateEligibility,
  extractHardenedOwnestState,
  generateIntegrityNonce,
  isCanonicalUtcTimestamp,
  redactMissionText,
  sha256Digest,
} from './policy.js'
import type {
  CcTask,
  CcTaskStatus,
  HardenedOwnestStateV1,
  HermesTask,
  OwnestFailureClass,
  OwnestGateState,
  OwnestMissionContractV1,
  OwnestStopCause,
  OwnestTickDeps,
  OwnestTickSummary,
  OwnestConfig,
} from './types.js'

const ERROR_LIMIT = 800
const SAFE_TOKEN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/
const LIVE_HERMES_STATUSES = new Set(['ready', 'running', 'scheduled', 'todo', 'triage'])
const UTC_DAY_MS = 24 * 60 * 60 * 1_000

interface TickContext {
  readonly config: OwnestConfig
  readonly deps: OwnestTickDeps
  readonly nowIso: string
  readonly nowMs: number
  readonly leaseExpiresAt: string
}

interface ReconcileResult {
  readonly changed: boolean
  readonly active: boolean
  readonly blocked: boolean
  readonly failed: boolean
  readonly taskId?: string
  readonly error?: string
}

interface FreshAuthority {
  readonly task: CcTask
  readonly state: HardenedOwnestStateV1
  readonly contract: OwnestMissionContractV1
}

function errorText(error: unknown): string {
  try {
    if (error instanceof Error) return `${error.name}: ${error.message}`
    if (typeof error === 'string') return error
  } catch {}
  try {
    const serialised = JSON.stringify(error)
    if (typeof serialised === 'string') return serialised
  } catch {}
  try {
    return String(error)
  } catch {}
  return '[unprintable error]'
}

function boundedError(error: unknown, config: OwnestConfig): string {
  let value = redactMissionText(errorText(error))
  if (config.serviceRoleKey) value = value.split(config.serviceRoleKey).join('[REDACTED]')
  return value.slice(0, ERROR_LIMIT)
}

function tickContext(config: OwnestConfig, deps: OwnestTickDeps): TickContext {
  const now = deps.now()
  if (!(now instanceof Date) || !Number.isFinite(now.getTime())) {
    throw new Error('OWNEST tick requires a valid injected time')
  }
  const nowIso = now.toISOString()
  if (!isCanonicalUtcTimestamp(nowIso)) {
    throw new Error('OWNEST tick requires canonical injected time')
  }
  if (!Number.isSafeInteger(config.leaseMs) || config.leaseMs <= 0) {
    throw new Error('OWNEST tick lease duration is invalid')
  }
  return {
    config,
    deps,
    nowIso,
    nowMs: now.getTime(),
    leaseExpiresAt: new Date(now.getTime() + config.leaseMs).toISOString(),
  }
}

function metadataWithState(task: CcTask, state: HardenedOwnestStateV1): Record<string, unknown> {
  return { ...task.metadata, ownest: state }
}

function rebuildContract(
  task: CcTask,
  state: HardenedOwnestStateV1,
): OwnestMissionContractV1 | null {
  try {
    const contract = buildMissionContract(
      task,
      state.attemptId,
      state.rolloutId,
      state.integrityNonce,
      state.hermesProfile,
      state.hermesBoard,
    )
    if (
      contract.idempotencyKey !== state.idempotencyKey ||
      contract.missionDigest !== state.missionDigest
    ) {
      return null
    }
    return contract
  } catch {
    return null
  }
}

function projectionIdentityMatches(
  left: HardenedOwnestStateV1,
  right: HardenedOwnestStateV1,
): boolean {
  return (
    left.crmTaskId === right.crmTaskId &&
    left.attemptId === right.attemptId &&
    left.rolloutId === right.rolloutId &&
    left.hermesProfile === right.hermesProfile &&
    left.hermesBoard === right.hermesBoard &&
    left.integrityNonce === right.integrityNonce &&
    left.idempotencyKey === right.idempotencyKey &&
    left.missionDigest === right.missionDigest &&
    left.hermesTaskId === right.hermesTaskId
  )
}

function isTerminalState(task: CcTask, state: HardenedOwnestStateV1): boolean {
  return (
    state.completionPhase === 'terminal' &&
    (task.status === 'blocked' || task.status === 'failed' || task.status === 'done')
  )
}

async function compareAndSet(
  ctx: TickContext,
  task: CcTask,
  status: CcTaskStatus | undefined,
  state: HardenedOwnestStateV1,
): Promise<CcTask> {
  const updated = await ctx.deps.crm.compareAndSetTask({
    taskId: task.id,
    expectedStatus: task.status,
    expectedUpdatedAt: task.updated_at,
    patch: {
      ...(status === undefined ? {} : { status }),
      metadata: metadataWithState(task, state),
    },
  })
  if (!updated) throw new Error(`CRM compare-and-set lost authority for task ${task.id}`)
  return updated
}

function failureCode(kind: string): string {
  return `ownest-${kind}`.slice(0, 64)
}

async function appendTransitionEvent(
  ctx: TickContext,
  task: CcTask,
  state: HardenedOwnestStateV1,
  type: 'blocked' | 'failed',
  code: string,
): Promise<void> {
  await ctx.deps.crm.appendTaskEvent({
    taskId: task.id,
    type,
    payload: {
      schema: 'ownest.reconciliation.v1',
      attemptId: state.attemptId,
      rolloutId: state.rolloutId,
      hermesTaskId: state.hermesTaskId,
      gateState: state.gateState,
      failureCode: code,
    },
  })
}

async function persistTerminal(
  ctx: TickContext,
  task: CcTask,
  state: HardenedOwnestStateV1,
  options: {
    gateState: Extract<OwnestGateState, 'gated' | 'dead_letter'>
    code: string
    detail: string
    failureClass: OwnestFailureClass
    stopped?: boolean
  },
): Promise<ReconcileResult> {
  const deadLetter = options.gateState === 'dead_letter'
  const nextState: HardenedOwnestStateV1 = {
    ...state,
    gateState: options.gateState,
    lastError: options.detail,
    reconciledAt: ctx.nowIso,
    failureCount: Math.min(3, Math.max(1, state.failureCount + 1)),
    failureClass: options.failureClass,
    failureCode: options.code,
    nextRetryAt: null,
    completionPhase: 'terminal',
    stopPhase: options.stopped ? 'archived' : state.stopPhase,
  }
  const status: CcTaskStatus = deadLetter ? 'failed' : 'blocked'
  const updated = await compareAndSet(ctx, task, status, nextState)
  await appendTransitionEvent(ctx, updated, nextState, deadLetter ? 'failed' : 'blocked', options.code)
  return {
    changed: true,
    active: false,
    blocked: true,
    failed: false,
    taskId: task.id,
  }
}

function stopCause(
  ctx: TickContext,
  freshTask: CcTask,
  freshState: HardenedOwnestStateV1,
): OwnestStopCause | null {
  if (freshState.cancelRequestedAt !== null || freshState.cancelReason !== null) {
    return 'cancel-requested'
  }
  if (
    freshTask.founder_id !== ctx.config.founderId ||
    freshTask.status !== 'running' ||
    freshState.gateState !== 'eligible' ||
    freshState.leaseOwner !== ctx.config.workerId ||
    freshState.stopPhase !== null ||
    freshState.hermesProfile !== ctx.config.hermesProfile ||
    freshState.hermesBoard !== ctx.config.hermesBoard
  ) {
    return 'authority-revoked'
  }
  if (!(Date.parse(freshState.leaseExpiresAt) > ctx.nowMs)) {
    return 'lease-expired'
  }
  return null
}

async function requestProjectionStop(
  ctx: TickContext,
  freshTask: CcTask,
  freshState: HardenedOwnestStateV1,
  freshContract: OwnestMissionContractV1,
  cause: OwnestStopCause,
): Promise<ReconcileResult> {
  if (freshState.hermesTaskId === null) throw new Error('Hermes stop requires a mirror id')

  const requestedState: HardenedOwnestStateV1 = {
    ...freshState,
    stopPhase: 'requested',
    reconciledAt: ctx.nowIso,
  }
  const requestedTask = await compareAndSet(ctx, freshTask, undefined, requestedState)
  const verifiedTask = await ctx.deps.crm.getOwnedTask(requestedTask.id)
  if (!verifiedTask) throw new Error('CRM task disappeared before Hermes stop')
  const verifiedState = extractHardenedOwnestState(verifiedTask.metadata, verifiedTask.id)
  const verifiedContract = verifiedState ? rebuildContract(verifiedTask, verifiedState) : null
  const causeStillPresent =
    cause === 'cancel-requested'
      ? verifiedState?.cancelRequestedAt !== null || verifiedState?.cancelReason !== null
      : cause === 'lease-expired'
        ? verifiedState !== null && !(Date.parse(verifiedState.leaseExpiresAt) > ctx.nowMs)
        : verifiedState !== null &&
          (verifiedTask.status !== 'running' ||
            verifiedState.leaseOwner !== ctx.config.workerId ||
            verifiedState.stopPhase === 'requested')
  if (
    !verifiedState ||
    verifiedTask.founder_id !== ctx.config.founderId ||
    verifiedState.stopPhase !== 'requested' ||
    !projectionIdentityMatches(requestedState, verifiedState) ||
    verifiedState.hermesProfile !== ctx.config.hermesProfile ||
    verifiedState.hermesBoard !== ctx.config.hermesBoard ||
    verifiedContract === null ||
    !isDeepStrictEqual(verifiedContract, freshContract) ||
    !causeStillPresent
  ) {
    return persistTerminal(ctx, verifiedTask, verifiedState ?? requestedState, {
      gateState: 'dead_letter',
      code: failureCode('stop-authority'),
      detail: 'CRM authority changed before Hermes stop could be proven',
      failureClass: 'integrity',
    })
  }

  try {
    const result = await ctx.deps.hermes.stopMission(
      verifiedState.hermesTaskId as string,
      verifiedContract,
      cause,
    )
    const preserveDeadLetter = verifiedState.gateState === 'dead_letter'
    return persistTerminal(ctx, verifiedTask, verifiedState, {
      gateState: preserveDeadLetter || !result.safeToRedispatch ? 'dead_letter' : 'gated',
      code: preserveDeadLetter
        ? verifiedState.failureCode ?? failureCode('stopped-dead-letter')
        : failureCode(result.safeToRedispatch ? cause : 'unsafe-stop'),
      detail: preserveDeadLetter
        ? verifiedState.lastError ?? 'OWNEST projection stopped after an integrity failure'
        : result.safeToRedispatch
          ? `OWNEST projection stopped: ${cause}`
          : 'OWNEST projection stop could not prove safe redispatch',
      failureClass: preserveDeadLetter || !result.safeToRedispatch ? 'integrity' : 'permanent',
      stopped: true,
    })
  } catch (error) {
    return persistTerminal(ctx, verifiedTask, verifiedState, {
      gateState: 'dead_letter',
      code: failureCode('stop-unconfirmed'),
      detail: boundedError(error, ctx.config),
      failureClass: 'integrity',
      stopped: false,
    })
  }
}

function classifyHermesFailure(error: unknown): {
  failureClass: OwnestFailureClass
  code: string
} {
  const detail = errorText(error).toLowerCase()
  if (/(not found|missing task|no such task)/.test(detail)) {
    return { failureClass: 'permanent', code: failureCode('hermes-missing') }
  }
  if (/(invalid|unrecognised|malformed|receipt|digest|contract|integrity)/.test(detail)) {
    return { failureClass: 'integrity', code: failureCode('hermes-integrity') }
  }
  if (/(unauthori[sz]ed|authentication|forbidden|permission|policy)/.test(detail)) {
    return { failureClass: 'permanent', code: failureCode('hermes-permanent') }
  }
  return { failureClass: 'transient', code: failureCode('hermes-transient') }
}

async function persistHermesFailure(
  ctx: TickContext,
  task: CcTask,
  state: HardenedOwnestStateV1,
  error: unknown,
): Promise<ReconcileResult> {
  const classified = classifyHermesFailure(error)
  const detail = boundedError(error, ctx.config)
  if (classified.failureClass !== 'transient') {
    return persistTerminal(ctx, task, state, {
      gateState: 'dead_letter',
      code: classified.code,
      detail,
      failureClass: classified.failureClass,
    })
  }

  const failureCount = state.failureCount + 1
  if (failureCount >= 3) {
    return persistTerminal(ctx, task, state, {
      gateState: 'dead_letter',
      code: failureCode('hermes-transient-exhausted'),
      detail,
      failureClass: 'transient',
    })
  }
  const delayMs = failureCount === 1 ? 60_000 : 300_000
  const nextState: HardenedOwnestStateV1 = {
    ...state,
    lastError: detail,
    reconciledAt: ctx.nowIso,
    failureCount,
    failureClass: 'transient',
    failureCode: classified.code,
    nextRetryAt: new Date(ctx.nowMs + delayMs).toISOString(),
  }
  await compareAndSet(ctx, task, undefined, nextState)
  return {
    changed: true,
    active: true,
    blocked: false,
    failed: true,
    taskId: task.id,
    error: detail,
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function isPrivateIpv4(hostname: string): boolean {
  const parts = hostname.split('.').map(Number)
  if (
    parts.length !== 4 ||
    parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)
  ) {
    return false
  }
  const [first = 0, second = 0] = parts
  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    (first === 100 && second >= 64 && second <= 127) ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168) ||
    (first === 198 && (second === 18 || second === 19)) ||
    first >= 224
  )
}

function isDurableEvidenceUri(value: string): boolean {
  if (value.length === 0 || value.length > 2_048 || value.trim() !== value) return false
  if (/^(?:wiki|git|github):\/[A-Za-z0-9][A-Za-z0-9._~:/-]*$/.test(value)) {
    const path = value.slice(value.indexOf(':/') + 2)
    return !path.split('/').some((segment) => segment === '..')
  }
  try {
    const url = new URL(value)
    const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, '').replace(/\.$/, '')
    const reservedSuffixes = [
      '.internal',
      '.lan',
      '.home',
      '.corp',
      '.local',
      '.localhost',
      '.test',
      '.invalid',
      '.example',
    ]
    return (
      url.protocol === 'https:' &&
      url.username === '' &&
      url.password === '' &&
      url.search === '' &&
      url.hash === '' &&
      hostname.includes('.') &&
      !hostname.includes(':') &&
      !isPrivateIpv4(hostname) &&
      !reservedSuffixes.some(
        (suffix) => hostname === suffix.slice(1) || hostname.endsWith(suffix),
      )
    )
  } catch {
    return false
  }
}

function isValidCompletion(
  completion: HermesTask,
  task: CcTask,
  state: HardenedOwnestStateV1,
  contract: OwnestMissionContractV1,
): boolean {
  const receipt = completion.receipt
  if (
    completion.status !== 'done' ||
    completion.id !== state.hermesTaskId ||
    typeof completion.summary !== 'string' ||
    completion.summary.trim().length === 0 ||
    !Number.isSafeInteger(completion.runId) ||
    (completion.runId ?? 0) <= 0 ||
    !isCanonicalUtcTimestamp(completion.completedAt) ||
    typeof completion.evidenceUri !== 'string' ||
    !completion.evidenceUri.startsWith('hermes-kanban:/boards/') ||
    typeof completion.receiptSha256 !== 'string' ||
    !/^sha256:[0-9a-f]{64}$/.test(completion.receiptSha256) ||
    !receipt ||
    receipt.schema !== 'ownest.completion.v1' ||
    receipt.crmTaskId !== task.id ||
    receipt.hermesTaskId !== completion.id ||
    receipt.attemptId !== state.attemptId ||
    receipt.rolloutId !== state.rolloutId ||
    receipt.missionDigest !== state.missionDigest ||
    receipt.verdict !== 'passed' ||
    sha256Digest(JSON.stringify(receipt)) !== completion.receiptSha256 ||
    !completion.latestRun ||
    completion.latestRun.id !== completion.runId ||
    completion.latestRun.status !== 'done' ||
    completion.latestRun.outcome !== 'completed' ||
    completion.latestRun.error !== null ||
    completion.latestRun.endedAt === null ||
    !Array.isArray(receipt.evidence) ||
    receipt.evidence.length === 0 ||
    !Array.isArray(receipt.validationResults) ||
    receipt.validationResults.length !== contract.validationRequirements.length
  ) {
    return false
  }

  const evidenceIds = new Set<string>()
  for (const evidence of receipt.evidence) {
    if (
      !isRecord(evidence) ||
      typeof evidence.id !== 'string' ||
      evidence.id.length === 0 ||
      evidenceIds.has(evidence.id) ||
      typeof evidence.uri !== 'string' ||
      !isDurableEvidenceUri(evidence.uri) ||
      typeof evidence.digest !== 'string' ||
      !/^sha256:[0-9a-f]{64}$/.test(evidence.digest)
    ) {
      return false
    }
    evidenceIds.add(evidence.id)
  }

  return contract.validationRequirements.every((requirement, index) => {
    const result = receipt.validationResults[index]
    return (
      result?.requirementId === requirement.id &&
      result.requirementDigest === requirement.digest &&
      result.status === 'passed' &&
      Array.isArray(result.evidenceIds) &&
      result.evidenceIds.length > 0 &&
      result.evidenceIds.every((id) => evidenceIds.has(id))
    )
  })
}

async function renewLiveTask(
  ctx: TickContext,
  task: CcTask,
  state: HardenedOwnestStateV1,
): Promise<ReconcileResult> {
  const nextState: HardenedOwnestStateV1 = {
    ...state,
    leaseOwner: ctx.config.workerId,
    leaseExpiresAt: ctx.leaseExpiresAt,
    lastHeartbeatAt: ctx.nowIso,
    reconciledAt: ctx.nowIso,
    lastError: null,
    failureCount: 0,
    failureClass: null,
    failureCode: null,
    nextRetryAt: null,
  }
  await compareAndSet(ctx, task, undefined, nextState)
  return { changed: true, active: true, blocked: false, failed: false, taskId: task.id }
}

async function completeTask(
  ctx: TickContext,
  authority: FreshAuthority,
  completion: HermesTask,
): Promise<ReconcileResult> {
  if (!isValidCompletion(completion, authority.task, authority.state, authority.contract)) {
    return persistTerminal(ctx, authority.task, authority.state, {
      gateState: 'dead_letter',
      code: failureCode('invalid-completion'),
      detail: 'Hermes done projection did not contain a valid completion receipt',
      failureClass: 'integrity',
    })
  }
  const receiptState: HardenedOwnestStateV1 = {
    ...authority.state,
    leaseExpiresAt: ctx.leaseExpiresAt,
    lastHeartbeatAt: ctx.nowIso,
    reconciledAt: ctx.nowIso,
    evidenceUri: completion.evidenceUri,
    receiptSha256: completion.receiptSha256,
    completionPhase: 'receipt_validated',
    lastError: null,
    failureCount: 0,
    failureClass: null,
    failureCode: null,
    nextRetryAt: null,
  }
  const receiptTask = await compareAndSet(ctx, authority.task, undefined, receiptState)
  await ctx.deps.crm.ensureCompletionArtifacts({
    taskId: authority.task.id,
    expectedContract: authority.contract,
    completion,
    nowIso: ctx.nowIso,
  })
  const terminalState: HardenedOwnestStateV1 = {
    ...receiptState,
    completionPhase: 'terminal',
  }
  await compareAndSet(ctx, receiptTask, 'done', terminalState)
  return { changed: true, active: false, blocked: false, failed: false, taskId: authority.task.id }
}

async function showProjection(
  ctx: TickContext,
  authority: FreshAuthority,
): Promise<ReconcileResult> {
  const hermesTaskId = authority.state.hermesTaskId
  if (hermesTaskId === null) throw new Error('Cannot show a null Hermes projection')
  let shown: HermesTask
  try {
    shown = await ctx.deps.hermes.showMission(hermesTaskId, authority.contract)
  } catch (error) {
    return persistHermesFailure(ctx, authority.task, authority.state, error)
  }
  if (shown.id !== hermesTaskId) {
    return persistTerminal(ctx, authority.task, authority.state, {
      gateState: 'dead_letter',
      code: failureCode('hermes-identity'),
      detail: 'Hermes show returned the wrong projection identity',
      failureClass: 'integrity',
    })
  }
  if (LIVE_HERMES_STATUSES.has(shown.status)) {
    return renewLiveTask(ctx, authority.task, authority.state)
  }
  if (shown.status === 'done') return completeTask(ctx, authority, shown)
  if (shown.status === 'blocked' || shown.status === 'review') {
    return persistTerminal(ctx, authority.task, authority.state, {
      gateState: 'gated',
      code: failureCode(`hermes-${shown.status}`),
      detail: boundedError(shown.error ?? `Hermes projection entered ${shown.status}`, ctx.config),
      failureClass: 'permanent',
    })
  }
  return persistTerminal(ctx, authority.task, authority.state, {
    gateState: 'dead_letter',
    code: failureCode(`hermes-${shown.status}`),
    detail: `Hermes projection entered unsafe terminal state ${shown.status}`,
    failureClass: 'permanent',
  })
}

function validCreateAuthority(
  ctx: TickContext,
  task: CcTask,
  state: HardenedOwnestStateV1,
  contract: OwnestMissionContractV1 | null,
): contract is OwnestMissionContractV1 {
  return (
    task.founder_id === ctx.config.founderId &&
    task.status === 'running' &&
    state.gateState === 'eligible' &&
    state.hermesTaskId === null &&
    state.completionPhase === 'claimed' &&
    state.cancelRequestedAt === null &&
    state.cancelReason === null &&
    state.stopPhase === null &&
    state.leaseOwner === ctx.config.workerId &&
    Date.parse(state.leaseExpiresAt) > ctx.nowMs &&
    state.rolloutId === ctx.config.rolloutId &&
    state.hermesProfile === ctx.config.hermesProfile &&
    state.hermesBoard === ctx.config.hermesBoard &&
    contract !== null
  )
}

async function createProjection(
  ctx: TickContext,
  taskId: string,
): Promise<ReconcileResult> {
  const freshTask = await ctx.deps.crm.getOwnedTask(taskId)
  if (!freshTask) throw new Error('CRM claim disappeared before Hermes create')
  const state = extractHardenedOwnestState(freshTask.metadata, freshTask.id)
  if (!state) throw new Error('CRM claim became malformed before Hermes create')
  const contract = rebuildContract(freshTask, state)
  if (!validCreateAuthority(ctx, freshTask, state, contract)) {
    return persistTerminal(ctx, freshTask, state, {
      gateState: 'dead_letter',
      code: failureCode('create-authority'),
      detail: 'CRM claim authority changed before Hermes create',
      failureClass: 'integrity',
    })
  }
  if (!ctx.config.live) {
    return { changed: false, active: true, blocked: false, failed: false, taskId }
  }

  let created: HermesTask
  try {
    created = await ctx.deps.hermes.createMission(freshTask, contract)
  } catch (error) {
    return persistHermesFailure(ctx, freshTask, state, error)
  }
  if (!SAFE_TOKEN.test(created.id)) {
    return persistTerminal(ctx, freshTask, state, {
      gateState: 'dead_letter',
      code: failureCode('create-identity'),
      detail: 'Hermes create returned an invalid projection identity',
      failureClass: 'integrity',
    })
  }
  const mirroredState: HardenedOwnestStateV1 = {
    ...state,
    hermesTaskId: created.id,
    dispatchedAt: ctx.nowIso,
    reconciledAt: ctx.nowIso,
    lastHeartbeatAt: ctx.nowIso,
    leaseExpiresAt: ctx.leaseExpiresAt,
    completionPhase: 'dispatched',
    lastError: null,
    failureCount: 0,
    failureClass: null,
    failureCode: null,
    nextRetryAt: null,
  }
  const mirrored = await ctx.deps.crm.compareAndSetTask({
    taskId: freshTask.id,
    expectedStatus: 'running',
    expectedUpdatedAt: freshTask.updated_at,
    patch: { metadata: metadataWithState(freshTask, mirroredState) },
  })
  if (!mirrored) {
    const racedTask = await ctx.deps.crm.getOwnedTask(freshTask.id)
    if (!racedTask) throw new Error('CRM claim disappeared after Hermes create')
    const racedState = extractHardenedOwnestState(racedTask.metadata, racedTask.id)
    const racedContract = racedState ? rebuildContract(racedTask, racedState) : null
    if (
      !racedState ||
      !racedContract ||
      racedState.attemptId !== state.attemptId ||
      racedState.idempotencyKey !== state.idempotencyKey ||
      !isDeepStrictEqual(racedContract, contract)
    ) {
      throw new Error('CRM authority became unprovable after Hermes create')
    }
    const cause = stopCause(ctx, racedTask, racedState)
    if (!cause) throw new Error('CRM mirror compare-and-set lost after Hermes create')
    let stoppableTask = racedTask
    let stoppableState = racedState
    if (racedState.hermesTaskId === null) {
      const attachedState: HardenedOwnestStateV1 = {
        ...racedState,
        hermesTaskId: created.id,
        dispatchedAt: ctx.nowIso,
        reconciledAt: ctx.nowIso,
        lastHeartbeatAt: ctx.nowIso,
        completionPhase: 'dispatched',
      }
      stoppableTask = await compareAndSet(ctx, racedTask, undefined, attachedState)
      stoppableState = attachedState
    } else if (racedState.hermesTaskId !== created.id) {
      throw new Error('CRM mirror race returned a different Hermes projection')
    }
    return requestProjectionStop(
      ctx,
      stoppableTask,
      stoppableState,
      racedContract,
      cause,
    )
  }
  try {
    await ctx.deps.crm.appendTaskEvent({
      taskId: freshTask.id,
      type: 'started',
      payload: {
        schema: 'ownest.dispatch.v1',
        attemptId: state.attemptId,
        rolloutId: state.rolloutId,
        hermesTaskId: created.id,
        idempotencyKey: state.idempotencyKey,
      },
    })
  } catch (error) {
    const detail = boundedError(error, ctx.config)
    const current = await ctx.deps.crm.getOwnedTask(freshTask.id)
    if (!current) throw new Error('CRM mirror disappeared after started audit failure')
    const currentState = extractHardenedOwnestState(current.metadata, current.id)
    const currentContract = currentState ? rebuildContract(current, currentState) : null
    if (
      !currentState ||
      !currentContract ||
      currentState.hermesTaskId !== created.id ||
      currentState.completionPhase !== 'dispatched'
    ) {
      throw new Error('CRM mirror authority changed after started audit failure')
    }
    const markedState: HardenedOwnestStateV1 = {
      ...currentState,
      gateState: 'dead_letter',
      lastError: detail,
      reconciledAt: ctx.nowIso,
      failureCount: Math.min(3, Math.max(1, currentState.failureCount + 1)),
      failureClass: 'integrity',
      failureCode: failureCode('started-audit-unconfirmed'),
      nextRetryAt: null,
      stopPhase: 'requested',
    }
    const marked = await compareAndSet(ctx, current, undefined, markedState)
    const stopped = await requestProjectionStop(
      ctx,
      marked,
      markedState,
      currentContract,
      'operator-stop',
    )
    return { ...stopped, failed: true, error: detail }
  }
  return { changed: true, active: true, blocked: false, failed: false, taskId }
}

async function reconcileOne(ctx: TickContext, snapshotTask: CcTask): Promise<ReconcileResult> {
  const freshTask = await ctx.deps.crm.getOwnedTask(snapshotTask.id)
  if (!freshTask) throw new Error(`Managed CRM task ${snapshotTask.id} disappeared`)
  if (freshTask.status === 'queued' || freshTask.status === 'done') {
    return { changed: false, active: false, blocked: false, failed: false }
  }
  const freshState = extractHardenedOwnestState(freshTask.metadata, freshTask.id)
  if (!freshState) throw new Error(`Managed CRM task ${snapshotTask.id} became malformed`)
  if (isTerminalState(freshTask, freshState)) {
    return {
      changed: false,
      active: false,
      blocked: freshTask.status === 'blocked' || freshTask.status === 'failed',
      failed: false,
      taskId: freshTask.id,
    }
  }
  const freshContract = rebuildContract(freshTask, freshState)
  if (!freshContract) {
    return persistTerminal(ctx, freshTask, freshState, {
      gateState: 'dead_letter',
      code: failureCode('contract-mismatch'),
      detail: 'Persisted mission contract does not match authoritative CRM task',
      failureClass: 'integrity',
    })
  }
  const expectedPhase = freshState.hermesTaskId === null ? 'claimed' : 'dispatched'
  const validMirroredPhase =
    freshState.hermesTaskId !== null &&
    (freshState.completionPhase === 'dispatched' ||
      freshState.completionPhase === 'receipt_validated' ||
      freshState.completionPhase === 'artifacts_written')
  if (
    (freshState.hermesTaskId === null && freshState.completionPhase !== expectedPhase) ||
    (freshState.hermesTaskId !== null && !validMirroredPhase)
  ) {
    return persistTerminal(ctx, freshTask, freshState, {
      gateState: 'dead_letter',
      code: failureCode('completion-phase'),
      detail: 'Persisted completion phase does not match the projection state',
      failureClass: 'integrity',
    })
  }
  if (
    freshState.hermesTaskId === null &&
    freshState.completionPhase === 'claimed' &&
    freshTask.status === 'running' &&
    freshTask.founder_id === ctx.config.founderId &&
    freshState.cancelRequestedAt === null &&
    freshState.cancelReason === null &&
    freshState.stopPhase === null &&
    freshContract !== null &&
    !(Date.parse(freshState.leaseExpiresAt) > ctx.nowMs)
  ) {
    const reclaimedState: HardenedOwnestStateV1 = {
      ...freshState,
      leaseOwner: ctx.config.workerId,
      leaseExpiresAt: ctx.leaseExpiresAt,
      lastHeartbeatAt: ctx.nowIso,
      reconciledAt: ctx.nowIso,
      lastError: null,
      failureCount: 0,
      failureClass: null,
      failureCode: null,
      nextRetryAt: null,
    }
    const reclaimed = await compareAndSet(ctx, freshTask, undefined, reclaimedState)
    const recovered = await createProjection(ctx, reclaimed.id)
    return { ...recovered, changed: true }
  }
  const cause = stopCause(ctx, freshTask, freshState)
  if (cause) {
    if (freshState.hermesTaskId === null) {
      return persistTerminal(ctx, freshTask, freshState, {
        gateState: cause === 'authority-revoked' ? 'dead_letter' : 'gated',
        code: failureCode(cause),
        detail: `OWNEST projection stopped before creation: ${cause}`,
        failureClass: cause === 'authority-revoked' ? 'integrity' : 'permanent',
      })
    }
    return requestProjectionStop(
      ctx,
      freshTask,
      freshState,
      freshContract,
      cause,
    )
  }
  if (freshState.nextRetryAt !== null && Date.parse(freshState.nextRetryAt) > ctx.nowMs) {
    return { changed: false, active: true, blocked: false, failed: false, taskId: freshTask.id }
  }
  if (freshState.hermesTaskId === null) return createProjection(ctx, freshTask.id)
  return showProjection(ctx, {
    task: freshTask,
    state: freshState,
    contract: freshContract,
  })
}

function utcDayBounds(nowMs: number): readonly [string, string] {
  const now = new Date(nowMs)
  const fromMs = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  return [new Date(fromMs).toISOString(), new Date(fromMs + UTC_DAY_MS).toISOString()]
}

function outcomeWithoutAdmission(
  live: boolean,
  reconciled: number,
  blocked: boolean,
): OwnestTickSummary['outcome'] {
  if (blocked) return 'blocked'
  if (reconciled > 0) return 'reconciled'
  return live ? 'idle' : 'drained'
}

/** Runs one bounded, reconcile-first OWNEST sweep without owning process lifetime. */
export async function runOwnestTick(
  config: OwnestConfig,
  deps: OwnestTickDeps,
): Promise<OwnestTickSummary> {
  let reconciled = 0
  let dispatched = 0
  let lastTaskId: string | undefined
  try {
    const ctx = tickContext(config, deps)
    const managedRows = await deps.crm.listManagedTasks()
    const exactCanary = config.canaryTaskId
      ? await deps.crm.getOwnedTask(config.canaryTaskId)
      : null
    const managedById = new Map<string, CcTask>()
    for (const value of managedRows) {
      if (!managedById.has(value.id)) managedById.set(value.id, value)
    }
    if (exactCanary && !managedById.has(exactCanary.id)) {
      managedById.set(exactCanary.id, exactCanary)
    }
    const managed = [...managedById.values()].sort((left, right) =>
      left.id < right.id ? -1 : left.id > right.id ? 1 : 0,
    )

    let active = 0
    let blocked = false
    for (const value of managed) {
      const result = await reconcileOne(ctx, value)
      if (result.changed) reconciled += 1
      if (result.active) active += 1
      if (result.blocked) blocked = true
      if (result.taskId) lastTaskId = result.taskId
      if (result.failed) {
        return {
          outcome: 'failed',
          reconciled,
          dispatched,
          ...(lastTaskId ? { taskId: lastTaskId } : {}),
          ...(result.error ? { error: result.error } : {}),
        }
      }
    }

    if (!config.live) {
      return {
        outcome: outcomeWithoutAdmission(false, reconciled, blocked),
        reconciled,
        dispatched,
        ...(lastTaskId ? { taskId: lastTaskId } : {}),
      }
    }
    if (active >= config.maxInProgress) {
      return {
        outcome: outcomeWithoutAdmission(true, reconciled, blocked),
        reconciled,
        dispatched,
        ...(lastTaskId ? { taskId: lastTaskId } : {}),
      }
    }
    if (!config.canaryTaskId || !config.rolloutId) {
      return { outcome: outcomeWithoutAdmission(true, reconciled, blocked), reconciled, dispatched }
    }

    const candidate = await deps.crm.getOwnedTask(config.canaryTaskId)
    if (!candidate || !evaluateEligibility(candidate).eligible) {
      return {
        outcome: outcomeWithoutAdmission(true, reconciled, blocked),
        reconciled,
        dispatched,
        ...(lastTaskId ? { taskId: lastTaskId } : {}),
      }
    }
    const rolloutClaims = await deps.crm.countRolloutClaims(config.rolloutId)
    const [fromIso, toIso] = utcDayBounds(ctx.nowMs)
    const dailyClaims = await deps.crm.countDailyClaims(fromIso, toIso)
    if (rolloutClaims >= config.canaryLimit || dailyClaims >= config.dailyDispatchLimit) {
      return {
        outcome: outcomeWithoutAdmission(true, reconciled, blocked),
        reconciled,
        dispatched,
        ...(lastTaskId ? { taskId: lastTaskId } : {}),
      }
    }

    const attemptId = deps.randomUUID()
    if (!SAFE_TOKEN.test(attemptId)) throw new Error('OWNEST attempt id is invalid')
    const integrityNonce = generateIntegrityNonce()
    const contract = buildMissionContract(
      candidate,
      attemptId,
      config.rolloutId,
      integrityNonce,
      config.hermesProfile,
      config.hermesBoard,
    )
    const claimState: HardenedOwnestStateV1 = {
      version: 1,
      crmTaskId: candidate.id,
      idempotencyKey: contract.idempotencyKey,
      hermesTaskId: null,
      attemptId,
      leaseOwner: config.workerId,
      leaseExpiresAt: ctx.leaseExpiresAt,
      lastHeartbeatAt: ctx.nowIso,
      dispatchedAt: null,
      reconciledAt: null,
      evidenceUri: null,
      gateState: 'eligible',
      lastError: null,
      claimedAt: ctx.nowIso,
      rolloutId: config.rolloutId,
      hermesProfile: config.hermesProfile,
      hermesBoard: config.hermesBoard,
      integrityNonce,
      missionDigest: contract.missionDigest,
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
    const claimed = await deps.crm.compareAndSetTask({
      taskId: candidate.id,
      expectedStatus: 'queued',
      expectedUpdatedAt: candidate.updated_at,
      patch: { status: 'running', metadata: metadataWithState(candidate, claimState) },
    })
    if (!claimed) {
      await deps.crm.getOwnedTask(candidate.id)
      return {
        outcome: outcomeWithoutAdmission(true, reconciled, blocked),
        reconciled,
        dispatched,
      }
    }
    const created = await createProjection(ctx, claimed.id)
    if (created.failed) {
      return {
        outcome: 'failed',
        reconciled: reconciled + (created.changed ? 1 : 0),
        dispatched,
        taskId: claimed.id,
        ...(created.error ? { error: created.error } : {}),
      }
    }
    if (created.blocked) {
      return {
        outcome: 'blocked',
        reconciled: reconciled + (created.changed ? 1 : 0),
        dispatched,
        taskId: claimed.id,
      }
    }
    dispatched = 1
    return { outcome: 'dispatched', reconciled, dispatched, taskId: claimed.id }
  } catch (error) {
    return {
      outcome: 'failed',
      reconciled,
      dispatched,
      ...(lastTaskId ? { taskId: lastTaskId } : {}),
      error: boundedError(error, config),
    }
  }
}
