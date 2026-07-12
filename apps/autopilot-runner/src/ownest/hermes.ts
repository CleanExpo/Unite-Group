import { spawn } from 'node:child_process'
import {
  MAX_MISSION_TEXT_LENGTH,
  idempotencyKey,
  redactMissionText,
} from './policy.js'
import type {
  CcTask,
  HermesDeps,
  HermesTask,
  HermesTaskStatus,
  OwnestConfig,
  OwnestHermesClient,
  ProcessResult,
  ProcessRunner,
} from './types.js'

const ERROR_DETAIL_LIMIT = 800
const MAX_OBJECTIVE_LENGTH = 10 * 1024
const MAX_VALIDATION_LENGTH = 4 * 1024

const FORCED_SKILLS = ['nexus', 'forward-planner', 'verify-test'] as const

const PRIORITY_BY_CRM: Readonly<Record<CcTask['priority'], string>> = {
  P0: '100',
  P1: '80',
  P2: '60',
  P3: '40',
}

const HERMES_STATUSES = new Set<HermesTaskStatus>([
  'archived',
  'blocked',
  'done',
  'ready',
  'review',
  'running',
  'scheduled',
  'todo',
  'triage',
])

const NORMALISED_TASK_KEYS = [
  'assignee',
  'error',
  'evidenceUri',
  'id',
  'idempotencyKey',
  'status',
  'title',
] as const

// Installed Hermes 0.18.2 `hermes_cli.kanban._task_to_dict` output.
const LIVE_TASK_KEYS = [
  'assignee',
  'body',
  'branch_name',
  'completed_at',
  'created_at',
  'created_by',
  'current_step_key',
  'id',
  'max_retries',
  'priority',
  'project_id',
  'result',
  'session_id',
  'skills',
  'started_at',
  'status',
  'tenant',
  'title',
  'workflow_template_id',
  'workspace_kind',
  'workspace_path',
] as const

const LIVE_SHOW_KEYS = [
  'children',
  'comments',
  'events',
  'latest_summary',
  'parents',
  'runs',
  'task',
] as const

function stringifyUnknown(value: unknown): string {
  if (value instanceof Error) return `${value.name}: ${value.message}`
  try {
    return String(value)
  } catch {
    return 'Unknown process error'
  }
}

/**
 * Built-in process dependency. Arguments are always passed as an argv array;
 * neither a shell nor command-string interpolation is available.
 */
export const defaultProcessRunner: ProcessRunner = (command, args, cwd) =>
  new Promise<ProcessResult>((resolve) => {
    let stdout = ''
    let stderr = ''
    let settled = false

    const settle = (exitCode: number) => {
      if (settled) return
      settled = true
      resolve({ exitCode, stdout, stderr })
    }

    try {
      const child = spawn(command, [...args], { cwd, shell: false })

      child.stdout?.setEncoding('utf8')
      child.stderr?.setEncoding('utf8')
      child.stdout?.on('data', (chunk: string | Buffer) => {
        stdout += String(chunk)
      })
      child.stderr?.on('data', (chunk: string | Buffer) => {
        stderr += String(chunk)
      })
      child.once('error', (error) => {
        stderr += `${stderr ? '\n' : ''}${stringifyUnknown(error)}`
        settle(-1)
      })
      child.once('close', (code) => {
        settle(typeof code === 'number' ? code : -1)
      })
    } catch (error) {
      stderr = stringifyUnknown(error)
      settle(-1)
    }
  })

export function mapHermesPriority(priority: CcTask['priority']): string {
  return PRIORITY_BY_CRM[priority]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function hasExactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const actual = Object.keys(value).sort()
  const sortedExpected = [...expected].sort()
  return actual.length === sortedExpected.length && actual.every((key, index) => key === sortedExpected[index])
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string'
}

function isNullableNonEmptyString(value: unknown): value is string | null {
  return value === null || isNonEmptyString(value)
}

function isInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value)
}

function isNullableInteger(value: unknown): value is number | null {
  return value === null || isInteger(value)
}

function isHermesStatus(value: unknown): value is HermesTaskStatus {
  return typeof value === 'string' && HERMES_STATUSES.has(value as HermesTaskStatus)
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isNonEmptyString)
}

function normaliseTypedTask(value: unknown): HermesTask | null {
  if (!isRecord(value) || !hasExactKeys(value, NORMALISED_TASK_KEYS)) return null
  if (!isNonEmptyString(value.id)) return null
  if (!isHermesStatus(value.status)) return null
  if (!isNonEmptyString(value.title)) return null
  if (!isNullableNonEmptyString(value.assignee)) return null
  if (!isNullableNonEmptyString(value.idempotencyKey)) return null
  if (!isNullableNonEmptyString(value.evidenceUri)) return null
  if (!isNullableNonEmptyString(value.error)) return null

  return {
    id: value.id,
    status: value.status,
    title: value.title,
    assignee: value.assignee,
    idempotencyKey: value.idempotencyKey,
    evidenceUri: value.evidenceUri,
    error: value.error,
  }
}

function normaliseLiveTask(value: unknown): HermesTask | null {
  if (!isRecord(value) || !hasExactKeys(value, LIVE_TASK_KEYS)) return null
  if (!isNonEmptyString(value.id)) return null
  if (!isNonEmptyString(value.title)) return null
  if (!isNullableString(value.body)) return null
  if (!isNullableNonEmptyString(value.assignee)) return null
  if (!isHermesStatus(value.status)) return null
  if (!isInteger(value.priority)) return null
  if (!isNullableNonEmptyString(value.tenant)) return null
  if (value.workspace_kind !== 'scratch' && value.workspace_kind !== 'worktree' && value.workspace_kind !== 'dir') {
    return null
  }
  if (!isNullableNonEmptyString(value.workspace_path)) return null
  if (!isNullableNonEmptyString(value.branch_name)) return null
  if (!isNullableNonEmptyString(value.project_id)) return null
  if (!isNullableNonEmptyString(value.created_by)) return null
  if (!isInteger(value.created_at) || value.created_at < 0) return null
  if (!isNullableInteger(value.started_at)) return null
  if (!isNullableInteger(value.completed_at)) return null
  if (!isNullableString(value.result)) return null
  if (!isStringArray(value.skills)) return null
  if (value.max_retries !== null && (!isInteger(value.max_retries) || value.max_retries < 1)) return null
  if (!isNullableNonEmptyString(value.session_id)) return null
  if (!isNullableNonEmptyString(value.workflow_template_id)) return null
  if (!isNullableNonEmptyString(value.current_step_key)) return null

  return {
    id: value.id,
    status: value.status,
    title: value.title,
    assignee: value.assignee,
    idempotencyKey: null,
    evidenceUri: null,
    error: null,
  }
}

function isLiveComment(value: unknown): boolean {
  return (
    isRecord(value) &&
    hasExactKeys(value, ['author', 'body', 'created_at']) &&
    isNonEmptyString(value.author) &&
    typeof value.body === 'string' &&
    isInteger(value.created_at)
  )
}

function isLiveEvent(value: unknown): boolean {
  return (
    isRecord(value) &&
    hasExactKeys(value, ['created_at', 'kind', 'payload', 'run_id']) &&
    isNonEmptyString(value.kind) &&
    (value.payload === null || isRecord(value.payload)) &&
    isInteger(value.created_at) &&
    isNullableInteger(value.run_id)
  )
}

function isLiveRun(value: unknown): boolean {
  return (
    isRecord(value) &&
    hasExactKeys(value, [
      'ended_at',
      'error',
      'id',
      'metadata',
      'outcome',
      'profile',
      'started_at',
      'status',
      'step_key',
      'summary',
      'worker_pid',
    ]) &&
    isInteger(value.id) &&
    isNullableNonEmptyString(value.profile) &&
    isNullableNonEmptyString(value.step_key) &&
    isNonEmptyString(value.status) &&
    isNullableNonEmptyString(value.outcome) &&
    isNullableString(value.summary) &&
    isNullableString(value.error) &&
    (value.metadata === null || isRecord(value.metadata)) &&
    isNullableInteger(value.worker_pid) &&
    isInteger(value.started_at) &&
    isNullableInteger(value.ended_at)
  )
}

function normaliseLiveShow(value: unknown): HermesTask | null {
  if (!isRecord(value) || !hasExactKeys(value, LIVE_SHOW_KEYS)) return null
  if (!isNullableString(value.latest_summary)) return null
  if (!isStringArray(value.parents) || !isStringArray(value.children)) return null
  if (!Array.isArray(value.comments) || !value.comments.every(isLiveComment)) return null
  if (!Array.isArray(value.events) || !value.events.every(isLiveEvent)) return null
  if (!Array.isArray(value.runs) || !value.runs.every(isLiveRun)) return null
  return normaliseLiveTask(value.task)
}

function safeDetail(value: string): string {
  return redactMissionText(value).slice(0, ERROR_DETAIL_LIMIT)
}

function resultDetail(result: ProcessResult): string {
  return safeDetail(
    [
      `exitCode=${result.exitCode}`,
      result.stdout ? `stdout=${result.stdout}` : '',
      result.stderr ? `stderr=${result.stderr}` : '',
    ]
      .filter(Boolean)
      .join('\n'),
  )
}

function hermesError(operation: 'create' | 'show', reason: string, detail = ''): Error {
  return new Error(`Hermes ${operation} ${reason}${detail ? `: ${detail}` : ''}`)
}

function isProcessResult(value: unknown): value is ProcessResult {
  return (
    isRecord(value) &&
    hasExactKeys(value, ['exitCode', 'stderr', 'stdout']) &&
    isInteger(value.exitCode) &&
    typeof value.stdout === 'string' &&
    typeof value.stderr === 'string'
  )
}

async function invokeHermes(
  operation: 'create' | 'show',
  args: readonly string[],
  cwd: string,
  run: ProcessRunner,
): Promise<ProcessResult> {
  let result: unknown
  try {
    result = await run('hermes', args, cwd)
  } catch (error) {
    throw hermesError(operation, 'process rejected', safeDetail(stringifyUnknown(error)))
  }

  if (!isProcessResult(result)) throw hermesError(operation, 'returned an invalid process result')
  if (result.exitCode !== 0) throw hermesError(operation, 'exited non-zero', resultDetail(result))
  return result
}

function parseJson(operation: 'create' | 'show', result: ProcessResult): unknown {
  if (!result.stdout.trim()) {
    throw hermesError(operation, 'returned empty JSON', resultDetail(result))
  }
  try {
    return JSON.parse(result.stdout) as unknown
  } catch {
    throw hermesError(operation, 'returned invalid JSON', resultDetail(result))
  }
}

function parseCreateResponse(value: unknown, expectedKey: string): HermesTask | null {
  const liveTask = normaliseLiveTask(value)
  if (liveTask) return liveTask

  if (!isRecord(value) || !hasExactKeys(value, ['created', 'task']) || typeof value.created !== 'boolean') {
    return null
  }
  const task = normaliseTypedTask(value.task)
  if (!task) return null
  if (task.idempotencyKey !== null && task.idempotencyKey !== expectedKey) return null
  return task
}

function parseShowResponse(value: unknown): HermesTask | null {
  const liveTask = normaliseLiveShow(value)
  if (liveTask) return liveTask

  if (!isRecord(value) || !hasExactKeys(value, ['task'])) return null
  return normaliseTypedTask(value.task)
}

function assertTaskId(value: string, label: string): string {
  const trimmed = value.trim()
  if (!trimmed) throw new Error(`${label} must be non-empty`)
  if (trimmed !== value) throw new Error(`${label} must not contain surrounding whitespace`)
  return value
}

function safeValidationRequirements(task: CcTask): string {
  const requirements = task.validation_required.length
    ? task.validation_required.map((requirement) => `- ${requirement}`).join('\n')
    : '- No additional task-specific requirements were provided.'
  return redactMissionText(requirements).slice(0, MAX_VALIDATION_LENGTH)
}

export function buildMissionBody(task: CcTask): string {
  const crmTaskId = redactMissionText(task.id).slice(0, 512)
  const objective = redactMissionText(task.objective).slice(0, MAX_OBJECTIVE_LENGTH)
  const validationRequirements = safeValidationRequirements(task)

  const body = [
    'CRM cc_tasks is the authoritative mission ledger. Hermes Kanban is a disposable execution mirror.',
    `CRM task ID: ${crmTaskId}`,
    '',
    'Safety boundaries (these are prohibitions):',
    '- No production deployment or production database mutation is authorised.',
    '- No payment, purchase, invoice, or spend is authorised.',
    '- No secret access, credential disclosure, or privilege change is authorised.',
    '- No outbound email, message, publication, or other external action is authorised.',
    '- No destructive deletion or access-control change is authorised.',
    '- No merge or branch-protection change is authorised.',
    '- Leave all gated actions blocked; do not bypass CRM, Hermes, or ordinary security and approval policy.',
    '',
    'Execution and evidence:',
    '- Return verifiable evidence and a validation receipt against every requirement.',
    '- Nexus should use configured browser, Playwright, or computer-use tools when materially useful.',
    '',
    'Objective:',
    objective,
    '',
    'Validation requirements:',
    validationRequirements,
  ].join('\n')

  return redactMissionText(body).slice(0, MAX_MISSION_TEXT_LENGTH)
}

function buildCreateArgs(task: CcTask): readonly string[] {
  const taskId = assertTaskId(task.id, 'CRM task ID')
  const title = redactMissionText(task.title)
  if (!title.trim()) throw new Error('Hermes mission title must be non-empty')

  return [
    '--profile',
    'empire',
    'kanban',
    'create',
    title,
    '--body',
    buildMissionBody(task),
    '--assignee',
    'empire',
    '--workspace',
    'scratch',
    '--tenant',
    'unite-group',
    '--priority',
    mapHermesPriority(task.priority),
    '--idempotency-key',
    idempotencyKey(taskId),
    '--max-runtime',
    '30m',
    '--created-by',
    'crm-ownest',
    ...FORCED_SKILLS.flatMap((skill) => ['--skill', skill]),
    '--max-retries',
    '2',
    '--goal',
    '--goal-max-turns',
    '12',
    '--json',
  ]
}

export function createHermesClient(
  config: OwnestConfig,
  deps: HermesDeps = { run: defaultProcessRunner },
): OwnestHermesClient {
  return {
    async createMission(task) {
      const args = buildCreateArgs(task)
      const expectedKey = idempotencyKey(task.id)
      const result = await invokeHermes('create', args, config.hermesCwd, deps.run)
      const parsed = parseCreateResponse(parseJson('create', result), expectedKey)
      if (!parsed) {
        throw hermesError('create', 'returned an unrecognised JSON shape', resultDetail(result))
      }
      return parsed
    },

    async showMission(taskId) {
      const safeTaskId = assertTaskId(taskId, 'Hermes task ID')
      const args = ['--profile', 'empire', 'kanban', 'show', safeTaskId, '--json']
      const result = await invokeHermes('show', args, config.hermesCwd, deps.run)
      const parsed = parseShowResponse(parseJson('show', result))
      if (!parsed || parsed.id !== safeTaskId) {
        throw hermesError('show', 'returned an unrecognised JSON shape', resultDetail(result))
      }
      return parsed
    },
  }
}
