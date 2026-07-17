/**
 * Lane Orchestrator — shared types.
 * A "lane" is one model-backed IDE generated from Mission Control. Two kinds:
 *  - gateway: routed through the Hermes gateway to an API provider (MiniMax/OpenRouter/...).
 *  - cli: a supervised CLI coding agent (Claude Code / Codex) for subscription plans.
 * Slice 1 covers the model + lifecycle + worktree isolation only (no execution).
 */

export type LaneKind = 'gateway' | 'cli'

export type LaneStatus =
  | 'creating'
  | 'idle'
  | 'running'
  | 'stopping'
  | 'blocked'
  | 'error'
  | 'stopped'

export type LaneRunStatus =
  | 'running'
  | 'succeeded'
  | 'failed'
  | 'stopping'
  | 'stopped'

export type LaneRunEventType =
  | 'lifecycle'
  | 'stdout'
  | 'stderr'
  | 'control'
  | 'error'

/** Canonical run identity shared by later stream, replay and fleet slices. */
export interface LaneRun {
  id: string
  laneId: string
  machineId: string
  status: LaneRunStatus
  attempt: number
  startedAt: number
  finishedAt?: number
}

/** Append-only, monotonic event contract. Persistence lands in Slice B. */
export interface LaneRunEvent {
  runId: string
  laneId: string
  sequence: number
  occurredAt: number
  type: LaneRunEventType
  message: string
}

export type GatewayBackend = {
  kind: 'gateway'
  provider: string // e.g. 'minimax' | 'openrouter' | 'anthropic' | 'openai'
  model: string
}

export type CliBackend = {
  kind: 'cli'
  tool: 'claude-code' | 'codex'
  account: string // e.g. 'max-1' | 'max-2' | 'max-3' | 'openai-pro'
}

const CLI_ACCOUNT_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/

/** Account directory names must remain a single safe path segment. */
export function isValidCliAccount(value: unknown): value is string {
  return typeof value === 'string' && CLI_ACCOUNT_PATTERN.test(value)
}

export type LaneBackend = GatewayBackend | CliBackend

export const MAX_LANE_ID_LENGTH = 200
export const MAX_LANE_MISSION_LENGTH = 16_000

export interface LaneMissionInput {
  id: string
  mission: string
}

/** Validate and normalise untrusted input before it reaches durable lane state. */
export function parseLaneMissionInput(value: unknown): LaneMissionInput | null {
  if (!isRecord(value)) return null
  if (typeof value.id !== 'string' || typeof value.mission !== 'string') {
    return null
  }
  const id = value.id.trim()
  const mission = value.mission.trim()
  if (
    !id ||
    id.length > MAX_LANE_ID_LENGTH ||
    !mission ||
    mission.length > MAX_LANE_MISSION_LENGTH
  ) {
    return null
  }
  return { id, mission }
}

export interface Lane {
  id: string
  kind: LaneKind
  backend: LaneBackend
  role: string // builder | reviewer | research | ...
  repo: string // absolute repo path
  worktree: string // own worktree path
  branch: string // own branch
  status: LaneStatus
  mission?: string
  activeRunId?: string
  /** Durable proof that process termination completed before worktree cleanup. */
  stopAcknowledgedAt?: number
  lastRunId?: string
  attempt?: number
  lastOutput?: string
  startedAt?: number
  lastFinishedAt?: number
  usage?: { tokens?: number; note?: string }
  blockedReason?: string
}

/** Input to create a lane (the "New IDE" wizard payload). */
export interface CreateLaneInput {
  kind: LaneKind
  backend: LaneBackend
  role: string
  repo: string
}

const LANE_KINDS: ReadonlyArray<LaneKind> = ['gateway', 'cli']
const LANE_STATUSES: ReadonlyArray<LaneStatus> = [
  'creating',
  'idle',
  'running',
  'stopping',
  'blocked',
  'error',
  'stopped',
]
const RUN_STATUSES: ReadonlyArray<LaneRunStatus> = [
  'running',
  'succeeded',
  'failed',
  'stopping',
  'stopped',
]
const EVENT_TYPES: ReadonlyArray<LaneRunEventType> = [
  'lifecycle',
  'stdout',
  'stderr',
  'control',
  'error',
]

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isOptionalString(value: unknown): value is string | undefined {
  return value === undefined || typeof value === 'string'
}

function isOptionalNumber(value: unknown): value is number | undefined {
  return value === undefined || isFiniteNumber(value)
}

export function isLaneBackend(value: unknown): value is LaneBackend {
  if (!isRecord(value)) return false
  if (value.kind === 'cli') {
    return (
      (value.tool === 'claude-code' || value.tool === 'codex') &&
      isValidCliAccount(value.account)
    )
  }
  return (
    value.kind === 'gateway' &&
    isNonEmptyString(value.provider) &&
    typeof value.model === 'string'
  )
}

export function isLane(value: unknown): value is Lane {
  if (!isRecord(value) || !isLaneBackend(value.backend)) return false
  if (
    !isNonEmptyString(value.id) ||
    !LANE_KINDS.includes(value.kind as LaneKind) ||
    value.kind !== value.backend.kind ||
    !isNonEmptyString(value.role) ||
    !isNonEmptyString(value.repo) ||
    !isNonEmptyString(value.worktree) ||
    !isNonEmptyString(value.branch) ||
    !LANE_STATUSES.includes(value.status as LaneStatus) ||
    !isOptionalString(value.mission) ||
    !isOptionalString(value.activeRunId) ||
    !isOptionalNumber(value.stopAcknowledgedAt) ||
    !isOptionalString(value.lastRunId) ||
    !isOptionalString(value.lastOutput) ||
    !isOptionalNumber(value.startedAt) ||
    !isOptionalNumber(value.lastFinishedAt) ||
    !isOptionalString(value.blockedReason)
  ) {
    return false
  }
  const attempt = value.attempt
  if (
    attempt !== undefined &&
    (typeof attempt !== 'number' || !Number.isInteger(attempt) || attempt < 0)
  ) {
    return false
  }
  if (value.usage !== undefined) {
    if (!isRecord(value.usage)) return false
    if (
      value.usage.tokens !== undefined &&
      (!isFiniteNumber(value.usage.tokens) || value.usage.tokens < 0)
    ) {
      return false
    }
    if (value.usage.note !== undefined && typeof value.usage.note !== 'string') {
      return false
    }
  }
  return true
}

export function isLaneRun(value: unknown): value is LaneRun {
  return (
    isRecord(value) &&
    isNonEmptyString(value.id) &&
    isNonEmptyString(value.laneId) &&
    isNonEmptyString(value.machineId) &&
    RUN_STATUSES.includes(value.status as LaneRunStatus) &&
    Number.isInteger(value.attempt) &&
    (value.attempt as number) > 0 &&
    isFiniteNumber(value.startedAt) &&
    isOptionalNumber(value.finishedAt)
  )
}

export function isLaneRunEvent(value: unknown): value is LaneRunEvent {
  return (
    isRecord(value) &&
    isNonEmptyString(value.runId) &&
    isNonEmptyString(value.laneId) &&
    Number.isInteger(value.sequence) &&
    (value.sequence as number) > 0 &&
    isFiniteNumber(value.occurredAt) &&
    EVENT_TYPES.includes(value.type as LaneRunEventType) &&
    typeof value.message === 'string'
  )
}
