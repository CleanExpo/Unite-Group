import { fetchSessions, type GatewaySession } from './gateway-api'

export type HarnessProvider = 'hermes' | 'langgraph' | 'openai-agents' | 'claude-agent' | 'unknown'

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
  raw: GatewaySession
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

export function normaliseHarnessState(session: GatewaySession, now = Date.now()): HarnessSessionState {
  const status = `${text(session.status)} ${text(session.kind)}`.toLowerCase()
  if (/error|failed|crash/.test(status)) return 'error'
  if (/pause|suspend/.test(status)) return 'paused'
  if (/wait|input|required|approval/.test(status)) return 'waiting'
  if (/complete|completed|done|success/.test(status)) return 'complete'
  if (/run|active|thinking|processing|streaming|in-progress|in_progress/.test(status)) return 'active'

  const updatedAt = timestamp(session.updatedAt)
  if (updatedAt && now - updatedAt < 120_000) return 'active'
  if (updatedAt) return 'idle'
  return 'unknown'
}

export function normaliseHermesSession(session: GatewaySession, now = Date.now()): HarnessSession {
  const id = text(session.key) || text(session.friendlyId) || `hermes-${now}`
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
 * Mission Control reads this contract, not Hermes directly. Hermes is the
 * current provider adapter only. LangGraph/OpenAI/Claude adapters can be added
 * without changing Pixel Office or the rest of Mission Control.
 */
export async function fetchHarnessSnapshot(): Promise<HarnessSnapshot> {
  const checkedAt = Date.now()
  const response = await fetchSessions()
  const sessions = Array.isArray(response.sessions) ? response.sessions : []

  return {
    provider: 'hermes',
    connected: true,
    checkedAt,
    sessions: sessions.map((session) => normaliseHermesSession(session, checkedAt)),
  }
}
