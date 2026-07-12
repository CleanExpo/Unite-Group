import { extractOwnestState } from './policy.js'
import type {
  AppendOwnestEventInput,
  AppendOwnestEvidenceInput,
  CcTask,
  CompareAndSetTaskInput,
  CrmDeps,
  LoadOwnestConfigResult,
  OwnestConfig,
  OwnestCrmClient,
} from './types.js'

const REQUEST_TIMEOUT_MS = 10_000
const ERROR_DETAIL_LIMIT = 800
const TASK_LIMIT = 100

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
  const rawSupabaseUrl =
    optionalTrimmedString(env.SUPABASE_URL) ?? optionalTrimmedString(env.NEXT_PUBLIC_SUPABASE_URL)
  const supabaseUrl = rawSupabaseUrl ? normaliseSupabaseUrl(rawSupabaseUrl) : null
  const serviceRoleKey = optionalTrimmedString(env.SUPABASE_SERVICE_ROLE_KEY)
  const founderId = optionalTrimmedString(env.FOUNDER_USER_ID)
  const workerId =
    optionalTrimmedString(env.CC_OWNEST_WORKER_ID) ?? optionalTrimmedString(env.HERMES_AGENT_ID)

  const problems: string[] = []
  if (!rawSupabaseUrl) {
    problems.push('SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL is required')
  } else if (!supabaseUrl) {
    problems.push('SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL must be a safe URL')
  }
  if (!serviceRoleKey) problems.push('SUPABASE_SERVICE_ROLE_KEY is required')
  if (!founderId) problems.push('FOUNDER_USER_ID is required')
  if (!workerId) problems.push('CC_OWNEST_WORKER_ID or HERMES_AGENT_ID is required')

  if (!supabaseUrl || !serviceRoleKey || !founderId || !workerId) {
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
      live: env.CC_OWNEST_LIVE === '1',
      canaryLimit: boundedInteger(env.CC_OWNEST_CANARY_LIMIT, 1, 1, 3),
      maxInProgress: boundedInteger(env.CC_OWNEST_MAX_IN_PROGRESS, 1, 1, 3),
      leaseMs: boundedInteger(env.CC_OWNEST_LEASE_MS, 300_000, 60_000, 1_800_000),
      dailyDispatchLimit: boundedInteger(env.CC_OWNEST_DAILY_DISPATCH_LIMIT, 3, 1, 25),
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

async function crmRequest(
  context: string,
  url: URL,
  init: RequestInit,
  config: OwnestConfig,
  deps: CrmDeps,
): Promise<Response> {
  try {
    const response = await deps.fetch(url, {
      ...init,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })

    if (!response.ok) {
      const body = await response.clone().text()
      throw new Error(`HTTP ${response.status} ${response.statusText}: ${body}`)
    }

    return response
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
  const response = await crmRequest(
    context,
    taskUrl(config, params),
    { method: 'GET', headers: serviceHeaders(config) },
    config,
    deps,
  )
  return parseTaskList(await response.clone().json(), config.founderId)
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
  params.set('select', TASK_SELECT)

  const response = await crmRequest(
    'Failed to compare and set CRM task',
    taskUrl(config, params),
    {
      method: 'PATCH',
      headers: {
        ...serviceHeaders(config),
        'content-type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify(input.patch),
    },
    config,
    deps,
  )
  const rows = parseTaskList(await response.clone().json(), config.founderId)
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
      body: JSON.stringify({
        founder_id: config.founderId,
        task_id: input.taskId,
        type: input.type,
        actor,
        payload,
      }),
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
      body: JSON.stringify({
        founder_id: config.founderId,
        task_id: input.taskId,
        wiki_path: input.wikiPath,
        kind,
        sources,
        confidence,
      }),
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
    compareAndSetTask: (input) => compareAndSetTask(input, config, deps),
    appendTaskEvent: (input) => appendTaskEvent(input, config, deps),
    appendEvidence: (input) => appendEvidence(input, config, deps),
  }
}
