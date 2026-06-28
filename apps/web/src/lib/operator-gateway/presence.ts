/**
 * Model Operator Gateway — live agent presence (the connection).
 *
 * A local Hermes agent dials OUT to Supabase and upserts a heartbeat row into
 * `operator_agent_presence` every ~15s. The command-centre reads `last_seen_at`
 * and derives a HONEST, VERIFIABLE connection state — no static claim:
 *
 *   now - last_seen_at < 30s  -> connected
 *                      < 5m   -> stale
 *                      else   -> offline
 *
 * Founder-scoped (RLS). Read-only here; the agent owns the writes.
 * Degrades to an honest 'offline' when the table is not yet provisioned or no
 * agent has ever checked in — consistent with the No-Invaders honest-not_connected rule.
 */

export type AgentConnectionState = 'connected' | 'stale' | 'offline'

/**
 * Live gateway health, reported by the heartbeat writer in
 * `capabilities.gateway.state` (it probes :8642/health each beat):
 *  - running     : the gateway answered its health check
 *  - unreachable : the agent is alive but the gateway did not answer
 *  - unknown     : the writer didn't report gateway state (older agent)
 */
export type GatewayHealthState = 'running' | 'unreachable' | 'unknown'

/** Read gateway health from an agent's capabilities.gateway.state, safely. */
export function parseGatewayHealth(capabilities: Record<string, unknown>): GatewayHealthState {
  const g = capabilities?.gateway
  if (g && typeof g === 'object') {
    const s = (g as Record<string, unknown>).state
    if (s === 'running' || s === 'unreachable') return s
  }
  return 'unknown'
}

/**
 * Why the gateway is in its current state:
 *  - live_presence   : at least one heartbeat row exists (state from freshness)
 *  - no_agents       : table exists but no agent has ever checked in
 *  - not_provisioned : table missing / query failed (bridge not set up yet)
 */
export type AgentConnectionSource = 'live_presence' | 'no_agents' | 'not_provisioned'

export const CONNECTED_WITHIN_MS = 30_000
export const STALE_WITHIN_MS = 5 * 60_000

export interface AgentPresenceRow {
  agent_id: string
  hostname: string | null
  agent_version: string | null
  capabilities: Record<string, unknown> | null
  started_at: string
  last_seen_at: string
}

export interface AgentPresenceSummary {
  agentId: string
  hostname: string | null
  agentVersion: string | null
  state: AgentConnectionState
  ageSeconds: number
  lastSeenAt: string
  startedAt: string
  capabilities: Record<string, unknown>
}

export interface GatewayConnection {
  state: AgentConnectionState
  source: AgentConnectionSource
  agents: AgentPresenceSummary[]
  freshestAgeSeconds: number | null
  checkedAt: string
  reason?: string
  /** Live gateway health from the freshest agent's capabilities.gateway. */
  gateway: GatewayHealthState
}

/** Pure freshness classifier. Future timestamps (clock skew) count as just-seen. */
export function classifyAgentState(lastSeenAtMs: number, nowMs: number): AgentConnectionState {
  if (!Number.isFinite(lastSeenAtMs)) return 'offline'
  const age = nowMs - lastSeenAtMs
  if (age < CONNECTED_WITHIN_MS) return 'connected'
  if (age < STALE_WITHIN_MS) return 'stale'
  return 'offline'
}

const PRESENCE_COLUMNS = 'agent_id, hostname, agent_version, capabilities, started_at, last_seen_at'

type PresenceQueryResult = Promise<{
  data: AgentPresenceRow[] | null
  error: { message?: string } | null
}>

/** Narrow structural client — the Supabase server client satisfies this. */
export interface AgentPresenceReadClient {
  from(table: 'operator_agent_presence'): {
    select(columns: string): {
      eq(
        column: 'founder_id',
        value: string,
      ): {
        order(column: 'last_seen_at', options: { ascending: false }): PresenceQueryResult
      }
    }
  }
}

/**
 * Read the founder's agent heartbeats and derive the overall gateway connection.
 * Overall state = the freshest agent's state. Never throws — a missing table or
 * failed query degrades to an honest offline / not_provisioned.
 */
export async function getGatewayConnection(
  client: AgentPresenceReadClient,
  founderId: string,
  now: number = Date.now(),
): Promise<GatewayConnection> {
  const checkedAt = new Date(now).toISOString()

  let rows: AgentPresenceRow[] = []
  try {
    const { data, error } = await client
      .from('operator_agent_presence')
      .select(PRESENCE_COLUMNS)
      .eq('founder_id', founderId)
      .order('last_seen_at', { ascending: false })
    if (error) {
      return {
        state: 'offline',
        source: 'not_provisioned',
        agents: [],
        freshestAgeSeconds: null,
        checkedAt,
        gateway: 'unknown',
        reason: error.message ?? 'presence query failed',
      }
    }
    rows = data ?? []
  } catch (e) {
    return {
      state: 'offline',
      source: 'not_provisioned',
      agents: [],
      freshestAgeSeconds: null,
      checkedAt,
      gateway: 'unknown',
      reason: e instanceof Error ? e.message : 'presence unavailable',
    }
  }

  if (rows.length === 0) {
    return { state: 'offline', source: 'no_agents', agents: [], freshestAgeSeconds: null, checkedAt, gateway: 'unknown' }
  }

  const agents: AgentPresenceSummary[] = rows.map((r) => {
    const lastSeenMs = Date.parse(r.last_seen_at)
    const ageSeconds = Number.isFinite(lastSeenMs)
      ? Math.max(0, Math.round((now - lastSeenMs) / 1000))
      : Number.MAX_SAFE_INTEGER
    return {
      agentId: r.agent_id,
      hostname: r.hostname,
      agentVersion: r.agent_version,
      state: classifyAgentState(lastSeenMs, now),
      ageSeconds,
      lastSeenAt: r.last_seen_at,
      startedAt: r.started_at,
      capabilities: r.capabilities ?? {},
    }
  })

  const freshest = agents.reduce((a, b) => (b.ageSeconds < a.ageSeconds ? b : a))
  const gateway = parseGatewayHealth(freshest.capabilities)
  // The operator can be present (fresh heartbeat) while the gateway itself is
  // down. Surface that honestly: a fresh agent with an unreachable gateway is
  // 'stale' (operator there, not fully operational), so the rail reflects it.
  const state: AgentConnectionState =
    freshest.state === 'connected' && gateway === 'unreachable' ? 'stale' : freshest.state
  return {
    state,
    source: 'live_presence',
    agents,
    freshestAgeSeconds: freshest.ageSeconds,
    checkedAt,
    gateway,
    ...(state !== freshest.state ? { reason: 'gateway_unreachable' } : {}),
  }
}
