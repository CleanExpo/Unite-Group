import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/lib/supabase/service', () => ({ createServiceClient: vi.fn() }))
vi.mock('@/lib/command-centre/agent-events', async (orig) => {
  const actual = await orig<typeof import('@/lib/command-centre/agent-events')>()
  return { ...actual, insertAgentEvents: vi.fn() }
})

import { createServiceClient } from '@/lib/supabase/service'
import { insertAgentEvents } from '@/lib/command-centre/agent-events'
import { POST } from '../route'

const SECRET = 'test-secret'

function req(body: unknown, auth?: string) {
  return new Request('https://app.test/api/agents/events', {
    method: 'POST',
    headers: auth ? { authorization: auth, 'content-type': 'application/json' } : { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const oneEvent = { events: [{ agentName: 'fable', eventType: 'heartbeat' }] }

const savedSecret = process.env.AGENT_EVENTS_SECRET
const savedFounder = process.env.FOUNDER_USER_ID

describe('POST /api/agents/events', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.AGENT_EVENTS_SECRET = SECRET
    process.env.FOUNDER_USER_ID = 'founder-1'
    vi.mocked(createServiceClient).mockReturnValue({} as any)
  })
  afterEach(() => {
    if (savedSecret === undefined) delete process.env.AGENT_EVENTS_SECRET
    else process.env.AGENT_EVENTS_SECRET = savedSecret
    if (savedFounder === undefined) delete process.env.FOUNDER_USER_ID
    else process.env.FOUNDER_USER_ID = savedFounder
  })

  it('401s when the secret is unset (dormant by default)', async () => {
    delete process.env.AGENT_EVENTS_SECRET
    const res = await POST(req(oneEvent, `Bearer ${SECRET}`))
    expect(res.status).toBe(401)
    expect(insertAgentEvents).not.toHaveBeenCalled()
  })

  it('401s on a missing or wrong bearer token', async () => {
    expect((await POST(req(oneEvent))).status).toBe(401)
    expect((await POST(req(oneEvent, 'Bearer wrong'))).status).toBe(401)
  })

  it('503s when FOUNDER_USER_ID is not configured', async () => {
    delete process.env.FOUNDER_USER_ID
    const res = await POST(req(oneEvent, `Bearer ${SECRET}`))
    expect(res.status).toBe(503)
  })

  it('400s on an empty or oversized batch', async () => {
    expect((await POST(req({ events: [] }, `Bearer ${SECRET}`))).status).toBe(400)
    const tooMany = { events: Array.from({ length: 51 }, () => ({ agentName: 'a', eventType: 'heartbeat' })) }
    expect((await POST(req(tooMany, `Bearer ${SECRET}`))).status).toBe(400)
  })

  it('400s on a bad event_type', async () => {
    const res = await POST(req({ events: [{ agentName: 'a', eventType: 'nope' }] }, `Bearer ${SECRET}`))
    expect(res.status).toBe(400)
  })

  it('ingests a valid batch bound to the founder id (201)', async () => {
    vi.mocked(insertAgentEvents).mockResolvedValue([{ id: 'e1' }] as any)
    const res = await POST(req(oneEvent, `Bearer ${SECRET}`))
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.ingested).toBe(1)
    expect(insertAgentEvents).toHaveBeenCalledWith(expect.anything(), 'founder-1', expect.any(Array))
  })

  it('strips an appended args/payload before insert (redaction)', async () => {
    vi.mocked(insertAgentEvents).mockResolvedValue([{ id: 'e1' }] as any)
    const dirty = {
      events: [{ agentName: 'fable', eventType: 'tool_call', toolName: 'Bash', target: 'ls', args: 'secret', payload: { t: 'sk-leak' } }],
    }
    await POST(req(dirty, `Bearer ${SECRET}`))
    const events = vi.mocked(insertAgentEvents).mock.calls[0][2] as Record<string, unknown>[]
    expect(events[0]).not.toHaveProperty('args')
    expect(events[0]).not.toHaveProperty('payload')
    expect(events[0].toolName).toBe('Bash')
  })

  it('500s when not all events persist (write-then-confirm)', async () => {
    vi.mocked(insertAgentEvents).mockResolvedValue([] as any) // asked for 1, got 0
    const res = await POST(req(oneEvent, `Bearer ${SECRET}`))
    expect(res.status).toBe(500)
  })

  it('500s (sanitised) when the insert throws', async () => {
    vi.mocked(insertAgentEvents).mockRejectedValue(new Error('db exploded'))
    const res = await POST(req(oneEvent, `Bearer ${SECRET}`))
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).not.toContain('db exploded')
  })
})
