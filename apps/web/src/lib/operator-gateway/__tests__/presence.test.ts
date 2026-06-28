import { describe, it, expect } from 'vitest'
import {
  classifyAgentState,
  getGatewayConnection,
  CONNECTED_WITHIN_MS,
  STALE_WITHIN_MS,
  type AgentPresenceReadClient,
  type AgentPresenceRow,
} from '../presence'

const NOW = Date.parse('2026-06-26T06:00:00.000Z')

function clientReturning(rows: AgentPresenceRow[] | null, error: { message?: string } | null = null): AgentPresenceReadClient {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => Promise.resolve({ data: rows, error }),
        }),
      }),
    }),
  }
}

function throwingClient(message: string): AgentPresenceReadClient {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => Promise.reject(new Error(message)),
        }),
      }),
    }),
  }
}

function row(overrides: Partial<AgentPresenceRow> & { last_seen_at: string }): AgentPresenceRow {
  return {
    agent_id: 'agent-1',
    hostname: 'mac-studio',
    agent_version: '1.0.0',
    capabilities: { lanes: ['hermes_local'] },
    started_at: '2026-06-26T05:00:00.000Z',
    ...overrides,
  }
}

describe('classifyAgentState', () => {
  it('connected just under the 30s threshold', () => {
    expect(classifyAgentState(NOW - (CONNECTED_WITHIN_MS - 1), NOW)).toBe('connected')
  })

  it('stale exactly at the 30s boundary', () => {
    expect(classifyAgentState(NOW - CONNECTED_WITHIN_MS, NOW)).toBe('stale')
  })

  it('stale just under the 5m threshold', () => {
    expect(classifyAgentState(NOW - (STALE_WITHIN_MS - 1), NOW)).toBe('stale')
  })

  it('offline at and beyond the 5m boundary', () => {
    expect(classifyAgentState(NOW - STALE_WITHIN_MS, NOW)).toBe('offline')
    expect(classifyAgentState(NOW - 10 * 60_000, NOW)).toBe('offline')
  })

  it('treats a future timestamp (clock skew) as connected', () => {
    expect(classifyAgentState(NOW + 5_000, NOW)).toBe('connected')
  })

  it('offline for an unparseable timestamp', () => {
    expect(classifyAgentState(NaN, NOW)).toBe('offline')
  })
})

describe('getGatewayConnection', () => {
  it('reports connected from a fresh heartbeat', async () => {
    const c = clientReturning([row({ last_seen_at: new Date(NOW - 5_000).toISOString() })])
    const conn = await getGatewayConnection(c, 'founder-1', NOW)
    expect(conn.state).toBe('connected')
    expect(conn.source).toBe('live_presence')
    expect(conn.agents).toHaveLength(1)
    expect(conn.agents[0].ageSeconds).toBe(5)
    expect(conn.freshestAgeSeconds).toBe(5)
  })

  it('reports stale from an aged heartbeat', async () => {
    const c = clientReturning([row({ last_seen_at: new Date(NOW - 90_000).toISOString() })])
    const conn = await getGatewayConnection(c, 'founder-1', NOW)
    expect(conn.state).toBe('stale')
  })

  it('overall state follows the freshest of several agents', async () => {
    const c = clientReturning([
      row({ agent_id: 'old', last_seen_at: new Date(NOW - 10 * 60_000).toISOString() }),
      row({ agent_id: 'fresh', last_seen_at: new Date(NOW - 3_000).toISOString() }),
    ])
    const conn = await getGatewayConnection(c, 'founder-1', NOW)
    expect(conn.state).toBe('connected')
    expect(conn.agents).toHaveLength(2)
    expect(conn.freshestAgeSeconds).toBe(3)
  })

  it('honest offline / no_agents when the table is empty', async () => {
    const conn = await getGatewayConnection(clientReturning([]), 'founder-1', NOW)
    expect(conn.state).toBe('offline')
    expect(conn.source).toBe('no_agents')
    expect(conn.agents).toEqual([])
  })

  it('honest offline / not_provisioned when the query errors (table missing)', async () => {
    const c = clientReturning(null, { message: 'relation "operator_agent_presence" does not exist' })
    const conn = await getGatewayConnection(c, 'founder-1', NOW)
    expect(conn.state).toBe('offline')
    expect(conn.source).toBe('not_provisioned')
    expect(conn.reason).toContain('does not exist')
  })

  it('never throws — a rejected query degrades to not_provisioned', async () => {
    const conn = await getGatewayConnection(throwingClient('network down'), 'founder-1', NOW)
    expect(conn.state).toBe('offline')
    expect(conn.source).toBe('not_provisioned')
    expect(conn.reason).toBe('network down')
  })
})
