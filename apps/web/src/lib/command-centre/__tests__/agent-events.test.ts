import { describe, it, expect, vi } from 'vitest'
import {
  toAgentEventRow,
  insertAgentEvents,
  listAgentEvents,
  CC_AGENT_EVENTS_TABLE,
  type AgentEventsClientLike,
} from '../agent-events'

describe('toAgentEventRow — redaction boundary', () => {
  it('binds founder_id from the caller, never the input', () => {
    const row = toAgentEventRow('founder-1', { agentName: 'fable', eventType: 'heartbeat' })
    expect(row.founder_id).toBe('founder-1')
  })

  it('writes only the fixed column set — an appended args/payload cannot pass through', () => {
    const input = {
      agentName: 'fable',
      eventType: 'tool_call' as const,
      toolName: 'Bash',
      target: 'ls',
      // A misbehaving emitter appends secret payload keys:
      args: 'rm -rf /secret',
      payload: { token: 'sk-leak' },
    }
    // @ts-expect-error — extra keys are not part of AgentEventInput
    const row = toAgentEventRow('founder-1', input)
    expect(row).not.toHaveProperty('args')
    expect(row).not.toHaveProperty('payload')
    // Exactly the redacted column set — created_at is DB-defaulted, not written here.
    expect(Object.keys(row).sort()).toEqual([
      'agent_name', 'event_type', 'founder_id', 'machine', 'plan_key',
      'project_key', 'repo', 'session_id', 'surface', 'target', 'tool_name',
    ])
  })

  it('defaults surface to claude-code and nulls absent optionals', () => {
    const row = toAgentEventRow('f1', { agentName: 'a', eventType: 'status' })
    expect(row.surface).toBe('claude-code')
    expect(row.session_id).toBeNull()
    expect(row.tool_name).toBeNull()
  })
})

function insertClient(result: { data: unknown; error: unknown }) {
  const select = vi.fn().mockResolvedValue(result)
  const insert = vi.fn().mockReturnValue({ select })
  return { client: { from: vi.fn().mockReturnValue({ insert }) } as unknown as AgentEventsClientLike, insert }
}

describe('insertAgentEvents', () => {
  it('inserts redacted rows and returns them', async () => {
    const rows = [{ id: 'e1' }, { id: 'e2' }]
    const { client, insert } = insertClient({ data: rows, error: null })
    const out = await insertAgentEvents(client, 'f1', [
      { agentName: 'a', eventType: 'heartbeat' },
      { agentName: 'b', eventType: 'tool_call', toolName: 'Read', target: 'x.ts' },
    ])
    expect(out).toEqual(rows)
    // The rows handed to insert carry founder_id and no stray keys.
    const written = insert.mock.calls[0][0] as Record<string, unknown>[]
    expect(written).toHaveLength(2)
    expect(written[0].founder_id).toBe('f1')
  })

  it('throws a named error on a failed insert (no false success)', async () => {
    const { client } = insertClient({ data: null, error: { message: 'boom' } })
    await expect(insertAgentEvents(client, 'f1', [{ agentName: 'a', eventType: 'status' }]))
      .rejects.toThrow(/insertAgentEvents failed: boom/)
  })
})

describe('listAgentEvents', () => {
  it('queries founder-scoped, newest first, capped', async () => {
    const limit = vi.fn().mockResolvedValue({ data: [{ id: 'e1' }], error: null })
    const order = vi.fn().mockReturnValue({ limit })
    const eq = vi.fn().mockReturnValue({ order })
    const select = vi.fn().mockReturnValue({ eq })
    const client = { from: vi.fn().mockReturnValue({ select }) } as unknown as AgentEventsClientLike

    const out = await listAgentEvents(client, 'f1', 10)
    expect(out).toEqual([{ id: 'e1' }])
    expect(eq).toHaveBeenCalledWith('founder_id', 'f1')
    expect(order).toHaveBeenCalledWith('created_at', { ascending: false })
    expect(limit).toHaveBeenCalledWith(10)
  })

  it('caps an over-large limit at 200', async () => {
    const limit = vi.fn().mockResolvedValue({ data: [], error: null })
    const order = vi.fn().mockReturnValue({ limit })
    const eq = vi.fn().mockReturnValue({ order })
    const select = vi.fn().mockReturnValue({ eq })
    const client = { from: vi.fn().mockReturnValue({ select }) } as unknown as AgentEventsClientLike
    await listAgentEvents(client, 'f1', 9999)
    expect(limit).toHaveBeenCalledWith(200)
  })
})

describe('CC_AGENT_EVENTS_TABLE', () => {
  it('is the canonical table name', () => {
    expect(CC_AGENT_EVENTS_TABLE).toBe('cc_agent_events')
  })
})
