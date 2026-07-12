import { StringDecoder } from 'node:string_decoder'
import { isDeepStrictEqual } from 'node:util'
import {
  buildMissionContract,
  deterministicUuid,
  extractHardenedOwnestState,
  extractOwnestState,
  isCanonicalUtcTimestamp,
  redactMissionText,
  sha256Digest,
} from './policy.js'
import type {
  AppendOwnestEventInput,
  AppendOwnestEvidenceInput,
  CcTask,
  CompareAndSetTaskInput,
  CrmDeps,
  EnsureCompletionArtifactsInput,
  EnsureCompletionArtifactsResult,
  HermesTask,
  LoadOwnestConfigResult,
  OwnestCompletionReceiptV1,
  OwnestConfig,
  OwnestCrmClient,
} from './types.js'

const REQUEST_TIMEOUT_MS = 10_000
const ERROR_DETAIL_LIMIT = 800
const TASK_LIMIT = 100
const MANAGED_TASK_HARD_CAP = 500
const SUCCESS_RESPONSE_BODY_LIMIT = 1024 * 1024
const ERROR_RESPONSE_BODY_LIMIT = 64 * 1024
const OUTBOUND_JSON_BODY_LIMIT = 256 * 1024
const MAX_JSON_DEPTH = 64
const MAX_SAFE_COUNT = BigInt(Number.MAX_SAFE_INTEGER)
const MAX_EXACT_COUNT_CONTENT_RANGE_LENGTH = `0-0/${Number.MAX_SAFE_INTEGER}`.length
const UTC_DAY_MS = 24 * 60 * 60 * 1000
const COMPLETION_TEXT_MAX_BYTES = 32 * 1024
const COMPLETION_RECEIPT_MAX_BYTES = 32 * 1024
const EVIDENCE_URI_MAX_BYTES = 2048

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
] as const

const TASK_SELECT = TASK_COLUMNS.join(',')
const TASK_COLUMN_SET = new Set<string>(TASK_COLUMNS)
const MANAGED_IDENTITY_COLUMNS = ['id', 'updated_at'] as const
const MANAGED_IDENTITY_SELECT = MANAGED_IDENTITY_COLUMNS.join(',')
const MANAGED_IDENTITY_COLUMN_SET = new Set<string>(MANAGED_IDENTITY_COLUMNS)

const TASK_PRIORITIES = new Set(['P0', 'P1', 'P2', 'P3'])
const TASK_STATUSES = new Set([
  'proposed',
  'queued',
  'running',
  'blocked',
  'awaiting_approval',
  'done',
  'failed',
])
const TASK_RISK_LEVELS = new Set(['low', 'medium', 'high', 'critical'])
const TASK_EXECUTION_MODES = new Set(['advisory', 'local-code', 'branch-preview', 'overnight'])
const MANAGED_TASK_STATUSES = new Set(['running', 'blocked', 'awaiting_approval', 'failed'])
const TASK_EVENT_TYPES = new Set([
  'created',
  'status_changed',
  'approved',
  'blocked',
  'started',
  'completed',
  'failed',
  'evidence_added',
  'comment',
  'linear_synced',
])
const EVIDENCE_KINDS = new Set([
  'brief',
  'research',
  'decision',
  'validation',
  'handoff',
  'daily',
])
const EVIDENCE_CONFIDENCE_LEVELS = new Set(['high', 'medium', 'low'])

const ISO_TIMESTAMP =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,9}))?(Z|[+-](\d{2}):(\d{2}))$/
const HERMES_BOARD = /^[a-z0-9][a-z0-9_-]{0,63}$/
const HERMES_PROFILE = /^[a-z0-9]{1,64}$/
const ROLLOUT_OR_TASK_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/
const HERMES_TASK_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,255}$/
const SHA256_DIGEST = /^sha256:[0-9a-f]{64}$/
const COMPLETION_EVIDENCE_KINDS = new Set([
  'source',
  'research',
  'test',
  'artifact',
  'commit',
  'report',
])
const COMPLETION_INPUT_KEYS = new Set(['completion', 'expectedContract', 'taskId'])
const COMPLETION_TASK_KEYS = new Set([
  'assignee',
  'completedAt',
  'error',
  'evidenceUri',
  'id',
  'idempotencyKey',
  'latestRun',
  'receipt',
  'receiptSha256',
  'runId',
  'status',
  'summary',
  'title',
])
const COMPLETION_RUN_KEYS = new Set([
  'endedAt',
  'error',
  'id',
  'metadata',
  'outcome',
  'profile',
  'startedAt',
  'status',
  'summary',
  'workerPid',
])
const COMPLETION_RECEIPT_KEYS = new Set([
  'attemptId',
  'crmTaskId',
  'evidence',
  'hermesTaskId',
  'missionDigest',
  'rolloutId',
  'schema',
  'validationResults',
  'verdict',
])
const COMPLETION_EVIDENCE_KEYS = new Set(['digest', 'id', 'kind', 'uri'])
const COMPLETION_VALIDATION_KEYS = new Set([
  'evidenceIds',
  'requirementDigest',
  'requirementId',
  'status',
])

function optionalTrimmedString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function normaliseSupabaseUrl(value: string): string | null {
  try {
    const url = new URL(value)
    const localHttpHost =
      url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname === '[::1]'
    const safeProtocol = url.protocol === 'https:' || (url.protocol === 'http:' && localHttpHost)
    const rootPathOnly = /^\/*$/.test(url.pathname)

    if (
      !safeProtocol ||
      url.username.length > 0 ||
      url.password.length > 0 ||
      !rootPathOnly ||
      url.search.length > 0 ||
      url.hash.length > 0
    ) {
      return null
    }

    return url.origin
  } catch {
    return null
  }
}

function boundedInteger(
  value: unknown,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  if (typeof value !== 'string' || !/^-?\d+$/.test(value)) return fallback
  const parsed = Number(value)
  if (!Number.isSafeInteger(parsed)) return fallback
  return Math.min(maximum, Math.max(minimum, parsed))
}

/** Loads a dormant-by-default, bounded OWNEST worker configuration. */
export function loadOwnestConfig(env: NodeJS.ProcessEnv = process.env): LoadOwnestConfigResult {
  const rawSupabaseUrl = optionalTrimmedString(env.SUPABASE_URL)
  const rawPublicSupabaseUrl = optionalTrimmedString(env.NEXT_PUBLIC_SUPABASE_URL)
  const normalisedSupabaseUrl = rawSupabaseUrl ? normaliseSupabaseUrl(rawSupabaseUrl) : null
  const normalisedPublicSupabaseUrl = rawPublicSupabaseUrl
    ? normaliseSupabaseUrl(rawPublicSupabaseUrl)
    : null
  const supabaseUrl = normalisedSupabaseUrl ?? normalisedPublicSupabaseUrl
  const serviceRoleKey = optionalTrimmedString(env.SUPABASE_SERVICE_ROLE_KEY)
  const founderId = optionalTrimmedString(env.FOUNDER_USER_ID)
  const workerId =
    optionalTrimmedString(env.CC_OWNEST_WORKER_ID) ?? optionalTrimmedString(env.HERMES_AGENT_ID)
  const hermesProfile = optionalTrimmedString(env.CC_OWNEST_HERMES_PROFILE) ?? 'ownest'
  const hermesBoard =
    optionalTrimmedString(env.CC_OWNEST_HERMES_BOARD) ??
    optionalTrimmedString(env.HERMES_KANBAN_BOARD) ??
    'unite-group-ownest'
  const rolloutId = optionalTrimmedString(env.CC_OWNEST_ROLLOUT_ID)
  const canaryTaskId = optionalTrimmedString(env.CC_OWNEST_CANARY_TASK_ID)
  const live = env.CC_OWNEST_LIVE === '1'
  const canaryLimit = boundedInteger(env.CC_OWNEST_CANARY_LIMIT, 1, 1, 3)
  const maxInProgress = boundedInteger(env.CC_OWNEST_MAX_IN_PROGRESS, 1, 1, 3)
  const leaseMs = boundedInteger(env.CC_OWNEST_LEASE_MS, 300_000, 60_000, 1_800_000)
  const dailyDispatchLimit = boundedInteger(env.CC_OWNEST_DAILY_DISPATCH_LIMIT, 1, 1, 25)

  const problems: string[] = []
  if (!rawSupabaseUrl && !rawPublicSupabaseUrl) {
    problems.push('SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL is required')
  }
  if (live && !rawSupabaseUrl) problems.push('SUPABASE_URL is required when live')
  if (live && !rawPublicSupabaseUrl) {
    problems.push('NEXT_PUBLIC_SUPABASE_URL is required when live')
  }
  if (rawSupabaseUrl && !normalisedSupabaseUrl) {
    problems.push('SUPABASE_URL must be a safe URL')
  }
  if (rawPublicSupabaseUrl && !normalisedPublicSupabaseUrl) {
    problems.push('NEXT_PUBLIC_SUPABASE_URL must be a safe URL')
  }
  if (
    normalisedSupabaseUrl &&
    normalisedPublicSupabaseUrl &&
    normalisedSupabaseUrl !== normalisedPublicSupabaseUrl
  ) {
    problems.push('SUPABASE_URL and NEXT_PUBLIC_SUPABASE_URL must resolve to the same origin')
  }
  if (!serviceRoleKey) problems.push('SUPABASE_SERVICE_ROLE_KEY is required')
  if (!founderId) problems.push('FOUNDER_USER_ID is required')
  if (!workerId) problems.push('CC_OWNEST_WORKER_ID or HERMES_AGENT_ID is required')
  if (!HERMES_PROFILE.test(hermesProfile)) {
    problems.push('CC_OWNEST_HERMES_PROFILE is invalid')
  }
  if (!HERMES_BOARD.test(hermesBoard)) {
    problems.push('CC_OWNEST_HERMES_BOARD or HERMES_KANBAN_BOARD is invalid')
  }
  if (rolloutId && !ROLLOUT_OR_TASK_ID.test(rolloutId)) {
    problems.push('CC_OWNEST_ROLLOUT_ID is invalid')
  }
  if (canaryTaskId && !ROLLOUT_OR_TASK_ID.test(canaryTaskId)) {
    problems.push('CC_OWNEST_CANARY_TASK_ID is invalid')
  }
  if (live && !rolloutId) problems.push('CC_OWNEST_ROLLOUT_ID is required when live')
  if (live && !canaryTaskId) problems.push('CC_OWNEST_CANARY_TASK_ID is required when live')
  if (live && hermesProfile !== 'ownest') {
    problems.push('CC_OWNEST_HERMES_PROFILE must be ownest when live')
  }
  if (live && hermesBoard !== 'unite-group-ownest') {
    problems.push('CC_OWNEST_HERMES_BOARD must be unite-group-ownest when live')
  }
  if (live && canaryLimit !== 1) {
    problems.push('CC_OWNEST_CANARY_LIMIT must be 1 when live')
  }
  if (live && maxInProgress !== 1) {
    problems.push('CC_OWNEST_MAX_IN_PROGRESS must be 1 when live')
  }
  if (live && dailyDispatchLimit !== 1) {
    problems.push('CC_OWNEST_DAILY_DISPATCH_LIMIT must be 1 when live')
  }

  if (problems.length > 0 || !supabaseUrl || !serviceRoleKey || !founderId || !workerId) {
    return { ok: false, error: `Invalid OWNEST configuration: ${problems.join('; ')}` }
  }

  return {
    ok: true,
    config: {
      supabaseUrl,
      serviceRoleKey,
      founderId,
      workerId,
      hermesCwd: optionalTrimmedString(env.HERMES_CWD) ?? process.cwd(),
      hermesProfile,
      hermesBoard,
      rolloutId,
      canaryTaskId,
      live,
      canaryLimit,
      maxInProgress,
      leaseMs,
      dailyDispatchLimit,
    },
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (!isRecord(value)) return false
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function hasOnlyKeys(value: Record<string, unknown>, allowed: ReadonlySet<string>): boolean {
  const keys = Reflect.ownKeys(value)
  return (
    keys.length > 0 &&
    keys.every(
      (key) =>
        typeof key === 'string' &&
        allowed.has(key) &&
        Object.prototype.propertyIsEnumerable.call(value, key),
    )
  )
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string')
}

function isIsoTimestamp(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 40) return false

  const match = ISO_TIMESTAMP.exec(value)
  if (!match) return false

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const hour = Number(match[4])
  const minute = Number(match[5])
  const second = Number(match[6])
  const offsetHour = Number(match[9] ?? 0)
  const offsetMinute = Number(match[10] ?? 0)

  if (month < 1 || month > 12 || hour > 23 || minute > 59 || second > 59) return false
  if (offsetHour > 23 || offsetMinute > 59) return false

  const calendarRoundTrip = new Date(Date.UTC(year, month - 1, day))
  if (
    calendarRoundTrip.getUTCFullYear() !== year ||
    calendarRoundTrip.getUTCMonth() !== month - 1 ||
    calendarRoundTrip.getUTCDate() !== day
  ) {
    return false
  }

  return Number.isFinite(Date.parse(value))
}

function hasExactKeys(value: Record<string, unknown>, keys: ReadonlySet<string>): boolean {
  return Object.keys(value).length === keys.size && hasOnlyKeys(value, keys)
}

function isSafeCompletionToken(value: unknown): value is string {
  return typeof value === 'string' && ROLLOUT_OR_TASK_ID.test(value)
}

function isPrivateCompletionIpv4(hostname: string): boolean {
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

function isDurableCompletionEvidenceUri(value: unknown): value is string {
  if (
    typeof value !== 'string' ||
    Buffer.byteLength(value, 'utf8') > EVIDENCE_URI_MAX_BYTES ||
    value.trim() !== value ||
    /[\u0000-\u001f\u007f\s]/.test(value)
  ) {
    return false
  }
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
      !reservedSuffixes.some(
        (suffix) => hostname === suffix.slice(1) || hostname.endsWith(suffix),
      ) &&
      !isPrivateCompletionIpv4(hostname)
    )
  } catch {
    return false
  }
}

function validateCanonicalCompletionReceipt(
  value: unknown,
  expectedContract: EnsureCompletionArtifactsInput['expectedContract'],
  hermesTaskId: string,
): OwnestCompletionReceiptV1 {
  if (!isPlainRecord(value) || !hasExactKeys(value, COMPLETION_RECEIPT_KEYS)) {
    throw new Error('Completion receipt has an invalid shape')
  }
  try {
    measureJsonBytes(value, COMPLETION_RECEIPT_MAX_BYTES, new Set<object>(), 0)
  } catch {
    throw new Error('Completion receipt exceeds its bounded JSON shape')
  }
  if (
    value.schema !== 'ownest.completion.v1' ||
    value.crmTaskId !== expectedContract.crmTaskId ||
    value.hermesTaskId !== hermesTaskId ||
    value.attemptId !== expectedContract.attemptId ||
    value.rolloutId !== expectedContract.rolloutId ||
    value.missionDigest !== expectedContract.missionDigest ||
    value.verdict !== 'passed' ||
    !Array.isArray(value.evidence) ||
    value.evidence.length < 1 ||
    value.evidence.length > 32 ||
    !Array.isArray(value.validationResults) ||
    value.validationResults.length !== expectedContract.validationRequirements.length
  ) {
    throw new Error('Completion receipt does not match the expected mission contract')
  }

  const evidence: Array<OwnestCompletionReceiptV1['evidence'][number]> = []
  const evidenceIds = new Set<string>()
  for (let index = 0; index < value.evidence.length; index += 1) {
    const item = value.evidence[index]
    if (!isPlainRecord(item) || !hasExactKeys(item, COMPLETION_EVIDENCE_KEYS)) {
      throw new Error('Completion receipt evidence has an invalid shape')
    }
    const expectedId = `ev-${String(index + 1).padStart(3, '0')}`
    if (
      item.id !== expectedId ||
      evidenceIds.has(expectedId) ||
      typeof item.kind !== 'string' ||
      !COMPLETION_EVIDENCE_KINDS.has(item.kind) ||
      !isDurableCompletionEvidenceUri(item.uri) ||
      typeof item.digest !== 'string' ||
      !SHA256_DIGEST.test(item.digest)
    ) {
      throw new Error('Completion receipt evidence is invalid')
    }
    evidenceIds.add(expectedId)
    evidence.push({
      id: expectedId,
      kind: item.kind as OwnestCompletionReceiptV1['evidence'][number]['kind'],
      uri: item.uri,
      digest: item.digest as OwnestCompletionReceiptV1['evidence'][number]['digest'],
    })
  }

  const validationResults: Array<OwnestCompletionReceiptV1['validationResults'][number]> = []
  for (let index = 0; index < expectedContract.validationRequirements.length; index += 1) {
    const expected = expectedContract.validationRequirements[index]
    const result = value.validationResults[index]
    if (
      !expected ||
      !isPlainRecord(result) ||
      !hasExactKeys(result, COMPLETION_VALIDATION_KEYS) ||
      result.requirementId !== expected.id ||
      result.requirementDigest !== expected.digest ||
      result.status !== 'passed' ||
      !Array.isArray(result.evidenceIds) ||
      result.evidenceIds.length < 1 ||
      result.evidenceIds.length > 8 ||
      result.evidenceIds.some((id) => typeof id !== 'string' || !evidenceIds.has(id)) ||
      new Set(result.evidenceIds).size !== result.evidenceIds.length
    ) {
      throw new Error('Completion validation result is invalid')
    }
    validationResults.push({
      requirementId: expected.id,
      requirementDigest: expected.digest,
      status: 'passed',
      evidenceIds: [...result.evidenceIds] as string[],
    })
  }

  return {
    schema: 'ownest.completion.v1',
    crmTaskId: expectedContract.crmTaskId,
    hermesTaskId,
    attemptId: expectedContract.attemptId,
    rolloutId: expectedContract.rolloutId,
    missionDigest: expectedContract.missionDigest,
    verdict: 'passed',
    evidence,
    validationResults,
  }
}

interface ValidatedCompletion {
  completion: HermesTask
  receipt: OwnestCompletionReceiptV1
  completedAt: string
}

function validateCompletionTask(
  value: unknown,
  expectedContract: EnsureCompletionArtifactsInput['expectedContract'],
  config: OwnestConfig,
): ValidatedCompletion {
  if (!isPlainRecord(value) || !hasExactKeys(value, COMPLETION_TASK_KEYS)) {
    throw new Error('Completion projection has an invalid shape')
  }
  if (
    !HERMES_TASK_ID.test(String(value.id)) ||
    value.status !== 'done' ||
    value.assignee !== config.hermesProfile ||
    !isNonEmptyString(value.title) ||
    value.idempotencyKey !== null ||
    !isNonEmptyString(value.summary) ||
    Buffer.byteLength(value.summary, 'utf8') > COMPLETION_TEXT_MAX_BYTES ||
    !Number.isSafeInteger(value.runId) ||
    Number(value.runId) <= 0 ||
    !isIsoTimestamp(value.completedAt) ||
    typeof value.receiptSha256 !== 'string' ||
    !SHA256_DIGEST.test(value.receiptSha256) ||
    !isPlainRecord(value.latestRun) ||
    !hasExactKeys(value.latestRun, COMPLETION_RUN_KEYS) ||
    !isNonEmptyString(value.evidenceUri) ||
    value.error !== null
  ) {
    throw new Error('Completion projection is invalid')
  }
  const run = value.latestRun
  if (
    run.id !== value.runId ||
    run.profile !== config.hermesProfile ||
    run.status !== 'done' ||
    run.outcome !== 'completed' ||
    run.summary !== value.summary ||
    run.error !== null ||
    run.metadata !== null ||
    (run.workerPid !== null && !Number.isSafeInteger(run.workerPid)) ||
    !Number.isSafeInteger(run.startedAt) ||
    Number(run.startedAt) < 0 ||
    !Number.isSafeInteger(run.endedAt) ||
    Number(run.endedAt) < Number(run.startedAt)
  ) {
    throw new Error('Completion run is invalid')
  }
  const completedAt = new Date(Number(run.endedAt) * 1_000).toISOString()
  const expectedEvidenceUri = `hermes-kanban:/boards/${encodeURIComponent(config.hermesBoard)}/tasks/${encodeURIComponent(String(value.id))}/runs/${String(value.runId)}`
  if (value.completedAt !== completedAt || value.evidenceUri !== expectedEvidenceUri) {
    throw new Error('Completion timestamp or Hermes evidence projection is invalid')
  }
  const receipt = validateCanonicalCompletionReceipt(
    value.receipt,
    expectedContract,
    String(value.id),
  )
  if (sha256Digest(JSON.stringify(receipt)) !== value.receiptSha256) {
    throw new Error('Completion receipt digest is invalid')
  }
  return { completion: value as unknown as HermesTask, receipt, completedAt }
}

function parseTask(value: unknown, founderId: string): CcTask {
  if (!isRecord(value)) throw new Error('CRM task response row must be an object')

  const keys = Object.keys(value)
  if (keys.length !== TASK_COLUMNS.length || keys.some((key) => !TASK_COLUMN_SET.has(key))) {
    throw new Error('CRM task response row has an invalid column set')
  }

  if (typeof value.id !== 'string' || value.id.length === 0) {
    throw new Error('CRM task response row has an invalid id')
  }
  if (value.founder_id !== founderId) {
    throw new Error('CRM task response row is outside the configured founder scope')
  }
  if (typeof value.title !== 'string' || typeof value.objective !== 'string') {
    throw new Error('CRM task response row has invalid text fields')
  }
  if (typeof value.priority !== 'string' || !TASK_PRIORITIES.has(value.priority)) {
    throw new Error('CRM task response row has an invalid priority')
  }
  if (typeof value.status !== 'string' || !TASK_STATUSES.has(value.status)) {
    throw new Error('CRM task response row has an invalid status')
  }
  if (value.agent_owner !== null && typeof value.agent_owner !== 'string') {
    throw new Error('CRM task response row has an invalid agent owner')
  }
  if (typeof value.risk_level !== 'string' || !TASK_RISK_LEVELS.has(value.risk_level)) {
    throw new Error('CRM task response row has an invalid risk level')
  }
  if (
    typeof value.execution_mode !== 'string' ||
    !TASK_EXECUTION_MODES.has(value.execution_mode)
  ) {
    throw new Error('CRM task response row has an invalid execution mode')
  }
  if (!isStringArray(value.dependencies) || !isStringArray(value.validation_required)) {
    throw new Error('CRM task response row has invalid list fields')
  }
  if (typeof value.human_approval_required !== 'boolean') {
    throw new Error('CRM task response row has an invalid approval flag')
  }
  if (!isRecord(value.metadata)) {
    throw new Error('CRM task response row has invalid metadata')
  }
  if (!isIsoTimestamp(value.created_at) || !isIsoTimestamp(value.updated_at)) {
    throw new Error('CRM task response row has an invalid timestamp')
  }

  return value as unknown as CcTask
}

function parseTaskList(value: unknown, founderId: string): CcTask[] {
  if (!Array.isArray(value)) throw new Error('CRM task response must be an array')
  if (value.length > TASK_LIMIT) throw new Error('CRM task response exceeded the requested limit')
  return value.map((row) => parseTask(row, founderId))
}

interface ManagedTaskIdentity {
  id: string
  updated_at: string
}

function parseManagedTaskIdentityList(value: unknown): ManagedTaskIdentity[] {
  if (!Array.isArray(value)) throw new Error('Managed CRM identity snapshot must be an array')
  if (value.length > MANAGED_TASK_HARD_CAP) {
    throw new Error('Managed CRM identity snapshot exceeded the hard cap')
  }

  const identities: ManagedTaskIdentity[] = []
  let previousId: string | null = null
  for (const row of value) {
    if (!isRecord(row)) throw new Error('Managed CRM identity row must be an object')
    const keys = Object.keys(row)
    if (
      keys.length !== MANAGED_IDENTITY_COLUMNS.length ||
      keys.some((key) => !MANAGED_IDENTITY_COLUMN_SET.has(key))
    ) {
      throw new Error('Managed CRM identity row has an invalid column set')
    }
    if (!isNonEmptyString(row.id)) throw new Error('Managed CRM identity row has an invalid id')
    if (!isIsoTimestamp(row.updated_at)) {
      throw new Error('Managed CRM identity row has an invalid updated timestamp')
    }
    if (previousId !== null && row.id <= previousId) {
      throw new Error('Managed CRM identity snapshot contains duplicate or out-of-order ids')
    }

    identities.push({ id: row.id, updated_at: row.updated_at })
    previousId = row.id
  }
  return identities
}

function stringifyUnknown(value: unknown): string {
  if (value instanceof Error) return `${value.name}: ${value.message}`
  try {
    return String(value)
  } catch {
    return 'Unknown request error'
  }
}

function redactedError(context: string, error: unknown, serviceRoleKey: string): Error {
  let message = `${context}: ${stringifyUnknown(error)}`
  if (serviceRoleKey.length > 0) {
    message = message.split(serviceRoleKey).join('[REDACTED]')
  }
  return new Error(message.slice(0, ERROR_DETAIL_LIMIT))
}

function checkedByteTotal(current: number, addition: number, maximum: number): number {
  if (addition > maximum - current) {
    throw new Error(`JSON body exceeded ${maximum} bytes`)
  }
  return current + addition
}

function jsonStringByteLength(value: string, maximum: number): number {
  if (Buffer.byteLength(value) > maximum) {
    throw new Error(`JSON string exceeded ${maximum} bytes`)
  }
  const encoded = JSON.stringify(value)
  return Buffer.byteLength(encoded)
}

function measureJsonBytes(
  value: unknown,
  maximum: number,
  ancestors: Set<object>,
  depth: number,
): number {
  if (depth > MAX_JSON_DEPTH) throw new Error(`JSON body exceeded ${MAX_JSON_DEPTH} levels`)
  if (value === null) return 4

  switch (typeof value) {
    case 'string':
      return jsonStringByteLength(value, maximum)
    case 'boolean':
      return value ? 4 : 5
    case 'number':
      return Buffer.byteLength(JSON.stringify(value))
    case 'bigint':
      throw new Error('BigInt is not valid JSON')
    case 'undefined':
    case 'function':
    case 'symbol':
      throw new Error(`Unsupported ${typeof value} JSON value`)
    case 'object':
      break
  }

  if (ancestors.has(value)) throw new Error('Circular JSON values are not allowed')
  ancestors.add(value)

  try {
    if (Array.isArray(value)) {
      let total = 2
      for (let index = 0; index < value.length; index += 1) {
        if (index > 0) total = checkedByteTotal(total, 1, maximum)
        const descriptor = Object.getOwnPropertyDescriptor(value, String(index))
        if (!descriptor) {
          total = checkedByteTotal(total, 4, maximum)
          continue
        }
        if (!Object.prototype.hasOwnProperty.call(descriptor, 'value')) {
          throw new Error('JSON arrays must not contain accessors')
        }
        total = checkedByteTotal(
          total,
          measureJsonBytes(descriptor.value, maximum, ancestors, depth + 1),
          maximum,
        )
      }
      return total
    }

    if (!isPlainRecord(value)) throw new Error('JSON objects must be plain records')
    if (Object.getOwnPropertyDescriptor(value, 'toJSON')) {
      throw new Error('Custom JSON serialization is not allowed')
    }

    let total = 2
    const keys = Object.keys(value)
    for (let index = 0; index < keys.length; index += 1) {
      const key = keys[index]
      if (key === undefined) continue
      const descriptor = Object.getOwnPropertyDescriptor(value, key)
      if (!descriptor || !Object.prototype.hasOwnProperty.call(descriptor, 'value')) {
        throw new Error('JSON objects must not contain accessors')
      }
      if (index > 0) total = checkedByteTotal(total, 1, maximum)
      total = checkedByteTotal(total, jsonStringByteLength(key, maximum), maximum)
      total = checkedByteTotal(total, 1, maximum)
      total = checkedByteTotal(
        total,
        measureJsonBytes(descriptor.value, maximum, ancestors, depth + 1),
        maximum,
      )
    }
    return total
  } finally {
    ancestors.delete(value)
  }
}

function boundedJsonBody(
  context: string,
  value: unknown,
  config: OwnestConfig,
): string {
  try {
    measureJsonBytes(value, OUTBOUND_JSON_BODY_LIMIT, new Set<object>(), 0)
    const body = JSON.stringify(value)
    if (Buffer.byteLength(body) > OUTBOUND_JSON_BODY_LIMIT) {
      throw new Error(`JSON body exceeded ${OUTBOUND_JSON_BODY_LIMIT} bytes`)
    }
    return body
  } catch (error) {
    throw redactedError(context, error, config.serviceRoleKey)
  }
}

async function readBoundedResponseBody(response: Response, maximum: number): Promise<string> {
  if (!response.body) return ''

  const reader = response.body.getReader()
  const decoder = new StringDecoder('utf8')
  const chunks: string[] = []
  let byteLength = 0
  let completed = false

  try {
    while (true) {
      const result = await reader.read()
      if (result.done) break

      const chunk = result.value
      const remaining = maximum - byteLength
      if (chunk.byteLength > remaining) {
        if (remaining > 0) {
          // StringDecoder retains an incomplete trailing code point. Because
          // `end()` is deliberately not called on this path, the retained
          // prefix can never manufacture U+FFFD at the byte boundary.
          chunks.push(decoder.write(Buffer.from(chunk.subarray(0, remaining))))
        }
        await reader.cancel().catch(() => undefined)
        throw new Error(`response body exceeded ${maximum} bytes`)
      }

      byteLength += chunk.byteLength
      chunks.push(decoder.write(Buffer.from(chunk)))
    }

    completed = true
    return chunks.join('') + decoder.end()
  } finally {
    if (!completed) await reader.cancel().catch(() => undefined)
    reader.releaseLock()
  }
}

function taskUrl(config: OwnestConfig, params: URLSearchParams): URL {
  const url = new URL('/rest/v1/cc_tasks', config.supabaseUrl)
  url.search = params.toString()
  return url
}

function tableUrl(config: OwnestConfig, table: string): URL {
  return new URL(`/rest/v1/${table}`, config.supabaseUrl)
}

function serviceHeaders(config: OwnestConfig): Record<string, string> {
  return {
    accept: 'application/json',
    apikey: config.serviceRoleKey,
    Authorization: `Bearer ${config.serviceRoleKey}`,
  }
}

interface CrmResponse {
  response: Response
  body: string
}

async function crmResponse(
  context: string,
  url: URL,
  init: RequestInit,
  config: OwnestConfig,
  deps: CrmDeps,
): Promise<CrmResponse> {
  try {
    const response = await deps.fetch(url, {
      ...init,
      redirect: 'error',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })

    if (!response.ok) {
      let body: string
      try {
        body = await readBoundedResponseBody(response, ERROR_RESPONSE_BODY_LIMIT)
      } catch (error) {
        throw new Error(
          `HTTP ${response.status} ${response.statusText}: ${stringifyUnknown(error)}`,
        )
      }
      throw new Error(`HTTP ${response.status} ${response.statusText}: ${body}`)
    }

    return {
      response,
      body: await readBoundedResponseBody(response, SUCCESS_RESPONSE_BODY_LIMIT),
    }
  } catch (error) {
    throw redactedError(context, error, config.serviceRoleKey)
  }
}

async function crmRequest(
  context: string,
  url: URL,
  init: RequestInit,
  config: OwnestConfig,
  deps: CrmDeps,
): Promise<string> {
  return (await crmResponse(context, url, init, config, deps)).body
}

function parseTaskRows(
  context: string,
  body: string,
  config: OwnestConfig,
): CcTask[] {
  let parsed: unknown
  try {
    parsed = JSON.parse(body)
  } catch {
    throw redactedError(
      context,
      new Error('CRM response contained malformed JSON'),
      config.serviceRoleKey,
    )
  }

  try {
    return parseTaskList(parsed, config.founderId)
  } catch (error) {
    throw redactedError(context, error, config.serviceRoleKey)
  }
}

function parseManagedTaskIdentityRows(
  context: string,
  body: string,
  config: OwnestConfig,
): ManagedTaskIdentity[] {
  let parsed: unknown
  try {
    parsed = JSON.parse(body)
  } catch {
    throw redactedError(
      context,
      new Error('Managed CRM identity snapshot contained malformed JSON'),
      config.serviceRoleKey,
    )
  }

  try {
    return parseManagedTaskIdentityList(parsed)
  } catch (error) {
    throw redactedError(context, error, config.serviceRoleKey)
  }
}

async function getTaskRows(
  context: string,
  config: OwnestConfig,
  deps: CrmDeps,
  params: URLSearchParams,
): Promise<CcTask[]> {
  const body = await crmRequest(
    context,
    taskUrl(config, params),
    { method: 'GET', headers: serviceHeaders(config) },
    config,
    deps,
  )
  return parseTaskRows(context, body, config)
}

function managedTaskParams(config: OwnestConfig, select: string): URLSearchParams {
  const params = new URLSearchParams()
  params.set('select', select)
  params.set('founder_id', `eq.${config.founderId}`)
  params.set('status', 'in.(running,blocked,awaiting_approval,failed)')
  params.set('metadata->ownest->>version', 'eq.1')
  return params
}

async function getManagedTaskIdentitySnapshot(
  context: string,
  config: OwnestConfig,
  deps: CrmDeps,
): Promise<ManagedTaskIdentity[]> {
  const params = managedTaskParams(config, MANAGED_IDENTITY_SELECT)
  params.set('order', 'id.asc')
  params.set('limit', String(MANAGED_TASK_HARD_CAP + 1))

  const body = await crmRequest(
    context,
    taskUrl(config, params),
    { method: 'GET', headers: serviceHeaders(config) },
    config,
    deps,
  )
  return parseManagedTaskIdentityRows(context, body, config)
}

function parseExactCount(response: Response): number {
  const contentRange = response.headers.get('content-range')
  if (
    contentRange === null ||
    contentRange.length > MAX_EXACT_COUNT_CONTENT_RANGE_LENGTH
  ) {
    throw new Error('CRM exact count response has an invalid Content-Range')
  }
  if (contentRange === '*/0') return 0

  const match = /^0-0\/([1-9][0-9]*)$/.exec(contentRange)
  if (!match?.[1]) throw new Error('CRM exact count response has an invalid Content-Range')

  const count = BigInt(match[1])
  if (count > MAX_SAFE_COUNT) throw new Error('CRM exact count exceeds the safe integer limit')
  return Number(count)
}

async function countTaskRows(
  context: string,
  config: OwnestConfig,
  deps: CrmDeps,
  params: URLSearchParams,
): Promise<number> {
  const result = await crmResponse(
    context,
    taskUrl(config, params),
    {
      method: 'HEAD',
      headers: {
        ...serviceHeaders(config),
        Prefer: 'count=exact',
        Range: '0-0',
        'Range-Unit': 'items',
      },
    },
    config,
    deps,
  )

  try {
    return parseExactCount(result.response)
  } catch (error) {
    throw redactedError(context, error, config.serviceRoleKey)
  }
}

/** Returns the bounded, priority-ordered founder queue eligible for policy evaluation. */
export async function listCandidateTasks(config: OwnestConfig, deps: CrmDeps): Promise<CcTask[]> {
  const params = new URLSearchParams()
  params.set('select', TASK_SELECT)
  params.set('founder_id', `eq.${config.founderId}`)
  params.set('status', 'eq.queued')
  params.set('order', 'priority.asc,created_at.asc')
  params.set('limit', String(TASK_LIMIT))

  const rows = await getTaskRows('Failed to list candidate CRM tasks', config, deps, params)
  if (rows.some((row) => row.status !== 'queued')) {
    throw new Error('Candidate CRM response contained a task outside queued status')
  }
  return rows
}

/** Returns founder-scoped live mirrors whose persisted OWNEST state is fully valid. */
export async function listMirroredTasks(config: OwnestConfig, deps: CrmDeps): Promise<CcTask[]> {
  const params = new URLSearchParams()
  params.set('select', TASK_SELECT)
  params.set('founder_id', `eq.${config.founderId}`)
  params.set('status', 'in.(running,blocked)')
  params.set('metadata->ownest->>hermesTaskId', 'not.is.null')
  params.set('limit', String(TASK_LIMIT))

  const rows = await getTaskRows('Failed to list mirrored CRM tasks', config, deps, params)
  for (const row of rows) {
    if (row.status !== 'running' && row.status !== 'blocked') {
      throw new Error('Mirrored CRM response contained a task outside running or blocked status')
    }
    const state = extractOwnestState(row.metadata, row.id)
    if (!state || state.hermesTaskId === null) {
      throw new Error('Mirrored CRM response contained invalid OWNEST state')
    }
  }
  return rows
}

/** Reads the one nominated founder-owned CRM task without selecting a fallback. */
export async function getOwnedTask(
  taskId: string,
  config: OwnestConfig,
  deps: CrmDeps,
): Promise<CcTask | null> {
  if (!isNonEmptyString(taskId)) throw new Error('CRM owned task read requires a task id')

  const params = new URLSearchParams()
  params.set('select', TASK_SELECT)
  params.set('founder_id', `eq.${config.founderId}`)
  params.set('id', `eq.${taskId}`)
  params.set('limit', '1')

  const rows = await getTaskRows('Failed to read founder-owned CRM task', config, deps, params)
  if (rows.length === 0) return null
  if (rows.length !== 1) throw new Error('Founder-owned CRM task read returned an invalid row count')

  const [row] = rows
  if (!row || row.id !== taskId) {
    throw new Error('Founder-owned CRM task read returned the wrong task')
  }
  return row
}

type CompletionArtifactTable =
  | 'cc_validation_runs'
  | 'cc_evidence_records'
  | 'cc_task_events'

interface CompletionArtifactPlan {
  result: EnsureCompletionArtifactsResult
  validationRows: Record<string, unknown>[]
  evidenceRow: Record<string, unknown>
  evidenceEventRow: Record<string, unknown>
  completionEventRow: Record<string, unknown>
}

function validateCompletionInputAuthority(
  input: EnsureCompletionArtifactsInput,
  config: OwnestConfig,
): void {
  if (
    !isPlainRecord(input) ||
    !hasExactKeys(input, COMPLETION_INPUT_KEYS) ||
    !isSafeCompletionToken(input.taskId)
  ) {
    throw new Error('CRM completion artifact input is invalid')
  }
  if (config.canaryTaskId === null || config.canaryTaskId !== input.taskId) {
    throw new Error('CRM completion artifact task is outside the configured canary authority')
  }
  if (config.rolloutId === null) {
    throw new Error('CRM completion artifacts require a configured rollout authority')
  }
  if (config.hermesProfile !== 'ownest' || config.hermesBoard !== 'unite-group-ownest') {
    throw new Error('CRM completion artifacts require the OWNEST Hermes authority')
  }
  if (
    !isPlainRecord(input.expectedContract) ||
    input.expectedContract.crmTaskId !== input.taskId ||
    input.expectedContract.rolloutId !== config.rolloutId ||
    input.expectedContract.hermesProfile !== config.hermesProfile ||
    input.expectedContract.hermesBoard !== config.hermesBoard
  ) {
    throw new Error('CRM completion mission contract is outside configured authority')
  }
}

function validateCompletionPreflight(
  task: CcTask,
  input: EnsureCompletionArtifactsInput,
  config: OwnestConfig,
): ValidatedCompletion {
  if (task.id !== input.taskId || task.founder_id !== config.founderId) {
    throw new Error('CRM completion task is outside the configured founder authority')
  }
  if (task.status !== 'running') {
    throw new Error('CRM completion artifacts require a running authoritative task')
  }
  const state = extractHardenedOwnestState(task.metadata, task.id)
  if (!state) throw new Error('CRM completion task has invalid hardened OWNEST state')
  if (
    state.gateState !== 'eligible' ||
    state.crmTaskId !== task.id ||
    state.attemptId !== input.expectedContract.attemptId ||
    state.rolloutId !== config.rolloutId ||
    state.rolloutId !== input.expectedContract.rolloutId ||
    state.hermesProfile !== config.hermesProfile ||
    state.hermesProfile !== input.expectedContract.hermesProfile ||
    state.hermesBoard !== config.hermesBoard ||
    state.hermesBoard !== input.expectedContract.hermesBoard ||
    state.hermesTaskId === null ||
    state.completionPhase !== 'receipt_validated'
  ) {
    throw new Error('CRM completion task authority or phase is invalid')
  }
  const authoritativeContract = buildMissionContract(
    task,
    state.attemptId,
    state.rolloutId,
    state.integrityNonce,
    state.hermesProfile,
    state.hermesBoard,
  )
  if (
    !isDeepStrictEqual(input.expectedContract, authoritativeContract) ||
    state.idempotencyKey !== authoritativeContract.idempotencyKey ||
    state.missionDigest !== authoritativeContract.missionDigest
  ) {
    throw new Error('CRM completion mission or validation digests are invalid')
  }
  const validated = validateCompletionTask(input.completion, authoritativeContract, config)
  if (
    validated.completion.id !== state.hermesTaskId ||
    validated.completion.receiptSha256 === null ||
    state.receiptSha256 !== validated.completion.receiptSha256
  ) {
    throw new Error('CRM completion receipt does not match the persisted OWNEST state')
  }
  return validated
}

function completionArtifactId(
  config: OwnestConfig,
  taskId: string,
  attemptId: string,
  rolloutId: string,
  kind: string,
): string {
  return deterministicUuid(
    'ownest.completion.artifact.v1',
    config.founderId,
    taskId,
    attemptId,
    rolloutId,
    kind,
  )
}

function buildCompletionArtifactPlan(
  task: CcTask,
  contract: EnsureCompletionArtifactsInput['expectedContract'],
  validated: ValidatedCompletion,
  config: OwnestConfig,
): CompletionArtifactPlan {
  const validationRunIds = contract.validationRequirements.map((requirement) =>
    completionArtifactId(
      config,
      task.id,
      contract.attemptId,
      contract.rolloutId,
      `validation:${requirement.id}`,
    ),
  )
  const evidenceRecordId = completionArtifactId(
    config,
    task.id,
    contract.attemptId,
    contract.rolloutId,
    'evidence',
  )
  const evidenceAddedEventId = completionArtifactId(
    config,
    task.id,
    contract.attemptId,
    contract.rolloutId,
    'event:evidence_added',
  )
  const completionEventId = completionArtifactId(
    config,
    task.id,
    contract.attemptId,
    contract.rolloutId,
    'event:completed',
  )
  const evidenceById = new Map(validated.receipt.evidence.map((item) => [item.id, item]))
  const validationRows = validated.receipt.validationResults.map((result, index) => ({
    id: validationRunIds[index],
    founder_id: config.founderId,
    task_id: task.id,
    gate: `ownest:${result.requirementId}:${result.requirementDigest}`,
    command: null,
    result: 'pass',
    evidence_path: evidenceById.get(result.evidenceIds[0] ?? '')?.uri ?? null,
    ran_at: validated.completedAt,
  }))
  if (validationRows.some((row) => row.id === undefined || row.evidence_path === null)) {
    throw new Error('CRM completion validation artifact plan is incomplete')
  }
  const evidenceUri = validated.completion.evidenceUri
  if (evidenceUri === null) throw new Error('CRM completion evidence projection is missing')
  const evidenceRow = {
    id: evidenceRecordId,
    founder_id: config.founderId,
    task_id: task.id,
    kind: 'validation',
    wiki_path: evidenceUri,
    sources: validated.receipt.evidence,
    confidence: 'high',
    created_at: validated.completedAt,
  }
  const sharedPayload = {
    schema: 'ownest.completion-artifacts.v1',
    taskId: task.id,
    hermesTaskId: validated.completion.id,
    attemptId: contract.attemptId,
    rolloutId: contract.rolloutId,
    receiptSha256: validated.completion.receiptSha256,
    validationRunIds,
    evidenceRecordId,
    evidenceUri,
  }
  const evidenceEventRow = {
    id: evidenceAddedEventId,
    founder_id: config.founderId,
    task_id: task.id,
    type: 'evidence_added',
    actor: config.workerId,
    payload: { ...sharedPayload, evidenceCount: validated.receipt.evidence.length },
    at: validated.completedAt,
  }
  const completionEventRow = {
    id: completionEventId,
    founder_id: config.founderId,
    task_id: task.id,
    type: 'completed',
    actor: config.workerId,
    payload: {
      ...sharedPayload,
      runId: validated.completion.runId,
      completedAt: validated.completedAt,
    },
    at: validated.completedAt,
  }
  return {
    result: {
      validationRunIds,
      evidenceRecordId,
      evidenceAddedEventId,
      completionEventId,
    },
    validationRows,
    evidenceRow,
    evidenceEventRow,
    completionEventRow,
  }
}

const COMPLETION_ARTIFACT_COLUMNS: Readonly<Record<CompletionArtifactTable, readonly string[]>> = {
  cc_validation_runs: [
    'id',
    'founder_id',
    'task_id',
    'gate',
    'command',
    'result',
    'evidence_path',
    'ran_at',
  ],
  cc_evidence_records: [
    'id',
    'founder_id',
    'task_id',
    'kind',
    'wiki_path',
    'sources',
    'confidence',
    'created_at',
  ],
  cc_task_events: ['id', 'founder_id', 'task_id', 'type', 'actor', 'payload', 'at'],
}

const COMPLETION_ARTIFACT_TIMESTAMP_COLUMN: Readonly<Record<CompletionArtifactTable, string>> = {
  cc_validation_runs: 'ran_at',
  cc_evidence_records: 'created_at',
  cc_task_events: 'at',
}

function completionArtifactRowsEqual(
  table: CompletionArtifactTable,
  actual: Record<string, unknown>,
  expected: Record<string, unknown>,
): boolean {
  if (isDeepStrictEqual(actual, expected)) return true
  const timestampColumn = COMPLETION_ARTIFACT_TIMESTAMP_COLUMN[table]
  const actualTimestamp = actual[timestampColumn]
  const expectedTimestamp = expected[timestampColumn]
  if (
    !isIsoTimestamp(actualTimestamp) ||
    !isIsoTimestamp(expectedTimestamp) ||
    Date.parse(actualTimestamp) !== Date.parse(expectedTimestamp)
  ) {
    return false
  }
  return isDeepStrictEqual(
    { ...actual, [timestampColumn]: expectedTimestamp },
    expected,
  )
}

async function ensureCompletionArtifactRow(
  table: CompletionArtifactTable,
  expected: Record<string, unknown>,
  config: OwnestConfig,
  deps: CrmDeps,
): Promise<void> {
  const insertUrl = tableUrl(config, table)
  insertUrl.searchParams.set('on_conflict', 'id')
  await crmRequest(
    `Failed to insert CRM completion artifact in ${table}`,
    insertUrl,
    {
      method: 'POST',
      headers: {
        ...serviceHeaders(config),
        'content-type': 'application/json',
        Prefer: 'resolution=ignore-duplicates,return=minimal',
      },
      body: boundedJsonBody('Failed to serialise CRM completion artifact', expected, config),
    },
    config,
    deps,
  )

  const columns = COMPLETION_ARTIFACT_COLUMNS[table]
  const id = expected.id
  if (typeof id !== 'string') throw new Error('CRM completion artifact id is invalid')
  const readUrl = tableUrl(config, table)
  readUrl.searchParams.set('select', columns.join(','))
  readUrl.searchParams.set('founder_id', `eq.${config.founderId}`)
  readUrl.searchParams.set('id', `eq.${id}`)
  readUrl.searchParams.set('limit', '1')
  const body = await crmRequest(
    `Failed to read back CRM completion artifact from ${table}`,
    readUrl,
    { method: 'GET', headers: serviceHeaders(config) },
    config,
    deps,
  )
  let parsed: unknown
  try {
    parsed = JSON.parse(body)
  } catch {
    throw new Error('CRM completion artifact readback contained malformed JSON')
  }
  if (!Array.isArray(parsed) || parsed.length !== 1 || !isPlainRecord(parsed[0])) {
    throw new Error('CRM completion artifact readback returned an invalid row count or shape')
  }
  const row = parsed[0]
  if (
    !hasExactKeys(row, new Set(columns)) ||
    row.id !== id ||
    row.founder_id !== config.founderId ||
    row.task_id !== expected.task_id
  ) {
    throw new Error('CRM completion artifact readback escaped its founder or task authority')
  }
  if (!completionArtifactRowsEqual(table, row, expected)) {
    throw new Error('CRM completion artifact integrity conflict')
  }
}

/** Repairs deterministic completion audit/evidence rows without changing cc_tasks. */
export async function ensureCompletionArtifacts(
  input: EnsureCompletionArtifactsInput,
  config: OwnestConfig,
  deps: CrmDeps,
): Promise<EnsureCompletionArtifactsResult> {
  try {
    validateCompletionInputAuthority(input, config)
    const task = await getOwnedTask(input.taskId, config, deps)
    if (!task) throw new Error('CRM completion task was not found in founder scope')
    const validated = validateCompletionPreflight(task, input, config)
    const plan = buildCompletionArtifactPlan(task, input.expectedContract, validated, config)
    for (const row of plan.validationRows) {
      await ensureCompletionArtifactRow('cc_validation_runs', row, config, deps)
    }
    await ensureCompletionArtifactRow('cc_evidence_records', plan.evidenceRow, config, deps)
    await ensureCompletionArtifactRow('cc_task_events', plan.evidenceEventRow, config, deps)
    await ensureCompletionArtifactRow('cc_task_events', plan.completionEventRow, config, deps)
    return plan.result
  } catch (error) {
    throw redactedError(
      'Failed to ensure CRM completion artifacts',
      redactMissionText(stringifyUnknown(error)),
      config.serviceRoleKey,
    )
  }
}

/** Reads every founder-owned task governed by the hardened OWNEST state machine. */
export async function listManagedTasks(config: OwnestConfig, deps: CrmDeps): Promise<CcTask[]> {
  const countParams = managedTaskParams(config, 'id')

  const expectedCount = await countTaskRows(
    'Failed to attest managed CRM task count',
    config,
    deps,
    countParams,
  )
  if (expectedCount > MANAGED_TASK_HARD_CAP) {
    throw new Error('Managed CRM task read exceeded the hard cap')
  }

  const beforeIdentities = await getManagedTaskIdentitySnapshot(
    'Failed to read initial managed CRM identity attestation',
    config,
    deps,
  )
  if (beforeIdentities.length !== expectedCount) {
    throw new Error('Managed CRM exact count disagreed with the identity attestation')
  }

  const rows: CcTask[] = []
  let cursor: string | null = null

  while (rows.length < beforeIdentities.length) {
    const requestLimit = Math.min(TASK_LIMIT, beforeIdentities.length - rows.length)
    const params = managedTaskParams(config, TASK_SELECT)
    params.set('order', 'id.asc')
    params.set('limit', String(requestLimit))
    if (cursor !== null) params.set('id', `gt.${cursor}`)

    const page = await getTaskRows('Failed to list managed CRM tasks', config, deps, params)
    if (page.length !== requestLimit) {
      throw new Error('Managed CRM keyset pagination returned a short or oversized page')
    }

    for (const row of page) {
      if (!MANAGED_TASK_STATUSES.has(row.status)) {
        throw new Error('Managed CRM response contained a task outside the managed status set')
      }
      if (!extractHardenedOwnestState(row.metadata, row.id)) {
        throw new Error('Managed CRM response contained invalid hardened OWNEST state')
      }

      const expectedIdentity = beforeIdentities[rows.length]
      if (
        !expectedIdentity ||
        row.id !== expectedIdentity.id ||
        row.updated_at !== expectedIdentity.updated_at
      ) {
        throw new Error('Managed CRM keyset pagination row did not match its identity attestation')
      }

      rows.push(row)
      cursor = row.id
    }
  }

  const afterIdentities = await getManagedTaskIdentitySnapshot(
    'Failed to read final managed CRM identity attestation',
    config,
    deps,
  )
  if (!isDeepStrictEqual(afterIdentities, beforeIdentities)) {
    throw new Error('Managed CRM identity attestation changed during pagination')
  }

  return rows
}

/** Counts every persisted claim consumed by one rollout, regardless of terminal status. */
export async function countRolloutClaims(
  rolloutId: string,
  config: OwnestConfig,
  deps: CrmDeps,
): Promise<number> {
  if (typeof rolloutId !== 'string' || !ROLLOUT_OR_TASK_ID.test(rolloutId)) {
    throw new Error('CRM rollout claim count requires a valid rollout id')
  }

  const params = new URLSearchParams()
  params.set('select', 'id')
  params.set('founder_id', `eq.${config.founderId}`)
  params.set('metadata->ownest->>rolloutId', `eq.${rolloutId}`)

  return countTaskRows('Failed to count CRM rollout claims', config, deps, params)
}

/** Counts persisted claims admitted within one exact half-open time interval. */
export async function countDailyClaims(
  fromIso: string,
  toIso: string,
  config: OwnestConfig,
  deps: CrmDeps,
): Promise<number> {
  if (
    !isCanonicalUtcTimestamp(fromIso) ||
    !isCanonicalUtcTimestamp(toIso) ||
    !fromIso.endsWith('T00:00:00.000Z') ||
    !toIso.endsWith('T00:00:00.000Z')
  ) {
    throw new Error('CRM daily claim count requires canonical UTC midnight bounds')
  }
  if (Date.parse(toIso) - Date.parse(fromIso) !== UTC_DAY_MS) {
    throw new Error('CRM daily claim count requires exactly one UTC day')
  }

  const params = new URLSearchParams()
  params.set('select', 'id')
  params.set('founder_id', `eq.${config.founderId}`)
  params.append('metadata->ownest->>claimedAt', `gte.${fromIso}`)
  params.append('metadata->ownest->>claimedAt', `lt.${toIso}`)

  return countTaskRows('Failed to count CRM daily claims', config, deps, params)
}

/** Atomically patches one task only while its founder scope and expected status still match. */
export async function compareAndSetTask(
  input: CompareAndSetTaskInput,
  config: OwnestConfig,
  deps: CrmDeps,
): Promise<CcTask | null> {
  if (!isPlainRecord(input)) throw new Error('CRM task update input must be a plain object')
  if (!isNonEmptyString(input.taskId)) throw new Error('CRM task update requires a task id')
  if (typeof input.expectedStatus !== 'string' || !TASK_STATUSES.has(input.expectedStatus)) {
    throw new Error('CRM task update has an invalid expected status')
  }
  if (!isIsoTimestamp(input.expectedUpdatedAt)) {
    throw new Error('CRM task update has an invalid expected updated timestamp')
  }
  if (!isPlainRecord(input.patch)) throw new Error('CRM task update patch must be a plain object')

  const allowedPatchKeys = new Set(['status', 'metadata'])
  if (!hasOnlyKeys(input.patch, allowedPatchKeys)) {
    throw new Error('CRM task update patch must contain only status or metadata')
  }
  if (
    Object.prototype.hasOwnProperty.call(input.patch, 'status') &&
    (typeof input.patch.status !== 'string' || !TASK_STATUSES.has(input.patch.status))
  ) {
    throw new Error('CRM task update patch has an invalid status')
  }
  if (
    Object.prototype.hasOwnProperty.call(input.patch, 'metadata') &&
    !isPlainRecord(input.patch.metadata)
  ) {
    throw new Error('CRM task update patch has invalid metadata')
  }

  const params = new URLSearchParams()
  params.set('id', `eq.${input.taskId}`)
  params.set('founder_id', `eq.${config.founderId}`)
  params.set('status', `eq.${input.expectedStatus}`)
  params.set('updated_at', `eq.${input.expectedUpdatedAt}`)
  params.set('select', TASK_SELECT)

  const patchBody = boundedJsonBody('Failed to serialise CRM task update', input.patch, config)
  const normalisedPatch = JSON.parse(patchBody) as Record<string, unknown>

  const body = await crmRequest(
    'Failed to compare and set CRM task',
    taskUrl(config, params),
    {
      method: 'PATCH',
      headers: {
        ...serviceHeaders(config),
        'content-type': 'application/json',
        Prefer: 'return=representation',
      },
      body: patchBody,
    },
    config,
    deps,
  )
  const rows = parseTaskRows('Failed to compare and set CRM task', body, config)
  if (rows.length === 0) return null
  if (rows.length !== 1) throw new Error('CRM task update returned an invalid row count')

  const [row] = rows
  if (!row || row.id !== input.taskId) {
    throw new Error('CRM task update returned the wrong task')
  }
  const confirmedStatus = input.patch.status ?? input.expectedStatus
  if (row.status !== confirmedStatus) {
    throw new Error('CRM task update did not confirm the requested status')
  }
  if (
    Object.prototype.hasOwnProperty.call(normalisedPatch, 'metadata') &&
    !isDeepStrictEqual(row.metadata, normalisedPatch.metadata)
  ) {
    throw new Error('CRM task update did not confirm the requested metadata')
  }
  return row
}

/** Appends one founder-owned audit event. */
export async function appendTaskEvent(
  input: AppendOwnestEventInput,
  config: OwnestConfig,
  deps: CrmDeps,
): Promise<void> {
  if (!isPlainRecord(input)) throw new Error('CRM task event input must be a plain object')
  if (!isNonEmptyString(input.taskId)) throw new Error('CRM task event requires a task id')
  if (typeof input.type !== 'string' || !TASK_EVENT_TYPES.has(input.type)) {
    throw new Error('CRM task event has an invalid type')
  }

  const actor = input.actor === undefined ? config.workerId : input.actor
  if (!isNonEmptyString(actor)) throw new Error('CRM task event requires an actor')
  const payload = input.payload === undefined ? {} : input.payload
  if (!isPlainRecord(payload)) throw new Error('CRM task event payload must be a plain object')

  await crmRequest(
    'Failed to append CRM task event',
    tableUrl(config, 'cc_task_events'),
    {
      method: 'POST',
      headers: { ...serviceHeaders(config), 'content-type': 'application/json' },
      body: boundedJsonBody(
        'Failed to serialise CRM task event',
        {
          founder_id: config.founderId,
          task_id: input.taskId,
          type: input.type,
          actor,
          payload,
        },
        config,
      ),
    },
    config,
    deps,
  )
}

/** Appends one founder-owned evidence record. */
export async function appendEvidence(
  input: AppendOwnestEvidenceInput,
  config: OwnestConfig,
  deps: CrmDeps,
): Promise<void> {
  if (!isPlainRecord(input)) throw new Error('CRM evidence input must be a plain object')
  if (!isNonEmptyString(input.taskId)) throw new Error('CRM evidence requires a task id')
  if (!isNonEmptyString(input.wikiPath)) throw new Error('CRM evidence requires a wiki path')

  const kind = input.kind === undefined ? 'brief' : input.kind
  if (typeof kind !== 'string' || !EVIDENCE_KINDS.has(kind)) {
    throw new Error('CRM evidence has an invalid kind')
  }
  const sources = input.sources === undefined ? [] : input.sources
  if (!Array.isArray(sources)) throw new Error('CRM evidence sources must be an array')
  const confidence = input.confidence === undefined ? 'medium' : input.confidence
  if (typeof confidence !== 'string' || !EVIDENCE_CONFIDENCE_LEVELS.has(confidence)) {
    throw new Error('CRM evidence has an invalid confidence')
  }

  await crmRequest(
    'Failed to append CRM evidence',
    tableUrl(config, 'cc_evidence_records'),
    {
      method: 'POST',
      headers: { ...serviceHeaders(config), 'content-type': 'application/json' },
      body: boundedJsonBody(
        'Failed to serialise CRM evidence',
        {
          founder_id: config.founderId,
          task_id: input.taskId,
          wiki_path: input.wikiPath,
          kind,
          sources,
          confidence,
        },
        config,
      ),
    },
    config,
    deps,
  )
}

/** Binds one validated founder scope and injected fetch dependency to every CRM operation. */
export function createCrmClient(config: OwnestConfig, deps: CrmDeps): OwnestCrmClient {
  return {
    listCandidateTasks: () => listCandidateTasks(config, deps),
    listMirroredTasks: () => listMirroredTasks(config, deps),
    getOwnedTask: (taskId) => getOwnedTask(taskId, config, deps),
    listManagedTasks: () => listManagedTasks(config, deps),
    countRolloutClaims: (rolloutId) => countRolloutClaims(rolloutId, config, deps),
    countDailyClaims: (fromIso, toIso) => countDailyClaims(fromIso, toIso, config, deps),
    compareAndSetTask: (input) => compareAndSetTask(input, config, deps),
    appendTaskEvent: (input) => appendTaskEvent(input, config, deps),
    appendEvidence: (input) => appendEvidence(input, config, deps),
    ensureCompletionArtifacts: (input) => ensureCompletionArtifacts(input, config, deps),
  }
}
