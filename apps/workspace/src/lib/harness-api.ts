import { fetchSessions, type GatewaySession } from './gateway-api'

export type HarnessProvider =
  | 'hermes'
  | 'langgraph'
  | 'openai-agents'
  | 'claude-agent'
  | 'unknown'

export type HarnessSessionState =
  | 'active'
  | 'idle'
  | 'paused'
  | 'error'
  | 'waiting'
  | 'complete'
  | 'unknown'

export type HarnessSession = {
  id: string
  provider: HarnessProvider
  label: string
  model: string
  state: HarnessSessionState
  task: string
  updatedAt: number
  startedAt: number
  tokenCount: number
  cost: number
  raw: unknown
}

export type HarnessSnapshot = {
  provider: HarnessProvider
  connected: boolean
  checkedAt: number
  sessions: Array<HarnessSession>
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function timestamp(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value < 1_000_000_000_000 ? value * 1000 : value
  }
  if (typeof value === 'string') {
    const parsed = Date.parse(value)
    return Number.isNaN(parsed) ? 0 : parsed
  }
  return 0
}

function numeric(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function statusTokens(session: GatewaySession): Set<string> {
  const value = `${text(session.status)} ${text(session.kind)}`
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/[^a-z0-9\s]+/g, ' ')
    .trim()
  return new Set(value.split(/\s+/).filter(Boolean))
}

function hasAny(tokens: Set<string>, values: Array<string>): boolean {
  return values.some((value) => tokens.has(value))
}

function stableSessionId(session: GatewaySession): string {
  return text(session.key) || text(session.friendlyId)
}

export function normaliseHarnessState(
  session: GatewaySession,
  now = Date.now(),
): HarnessSessionState {
  const tokens = statusTokens(session)

  if (hasAny(tokens, ['error', 'failed', 'failure', 'crash', 'crashed']))
    return 'error'
  if (hasAny(tokens, ['pause', 'paused', 'suspend', 'suspended']))
    return 'paused'
  if (
    hasAny(tokens, [
      'wait',
      'waiting',
      'input',
      'approval',
      'required',
      'needsinput',
    ])
  )
    return 'waiting'
  if (hasAny(tokens, ['complete', 'completed', 'done', 'success', 'succeeded']))
    return 'complete'
  if (
    hasAny(tokens, [
      'run',
      'running',
      'active',
      'thinking',
      'processing',
      'streaming',
      'inprogress',
    ])
  )
    return 'active'
  if (hasAny(tokens, ['idle', 'inactive', 'stopped', 'offline'])) return 'idle'

  const updatedAt = timestamp(session.updatedAt)
  if (updatedAt && now - updatedAt < 120_000) return 'active'
  if (updatedAt) return 'idle'
  return 'unknown'
}

export function normaliseHermesSession(
  session: GatewaySession,
  now = Date.now(),
): HarnessSession {
  const id = stableSessionId(session)
  if (!id) throw new Error('Hermes session has no stable key or friendlyId')
  const label =
    text(session.label) ||
    text(session.title) ||
    text(session.derivedTitle) ||
    text(session.friendlyId) ||
    id

  return {
    id,
    provider: 'hermes',
    label,
    model: text(session.model) || 'unknown',
    state: normaliseHarnessState(session, now),
    task: text(session.task) || text(session.initialMessage) || label,
    updatedAt: timestamp(session.updatedAt),
    startedAt: timestamp(session.startedAt) || timestamp(session.createdAt),
    tokenCount:
      numeric(session.totalTokens) ||
      numeric(session.tokenCount) ||
      numeric(session.usage?.totalTokens) ||
      numeric(session.usage?.tokens),
    cost: numeric(session.cost) || numeric(session.usage?.cost),
    raw: session,
  }
}

/**
 * Unite-Group reads this contract, not Hermes directly. Hermes is the
 * current provider adapter only. LangGraph/OpenAI/Claude adapters can be added
 * without changing Unite-Group or the rest of the platform.
 */
export async function fetchHarnessSnapshot(): Promise<HarnessSnapshot> {
  const checkedAt = Date.now()
  const response = await fetchSessions()
  const sessions = Array.isArray(response.sessions) ? response.sessions : []
  const addressable = sessions.filter((session) => Boolean(stableSessionId(session)))

  return {
    provider: 'hermes',
    connected: true,
    checkedAt,
    sessions: addressable.map((session) =>
      normaliseHermesSession(session, checkedAt),
    ),
  }
}
