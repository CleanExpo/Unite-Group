import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase/service', () => ({ createServiceClient: vi.fn() }))
vi.mock('@/lib/command-centre/agent-events', async (orig) => {
  const actual = await orig<typeof import('@/lib/command-centre/agent-events')>()
  return { ...actual, insertAgentEvents: vi.fn(), listAgentEvents: vi.fn() }
})

import { insertAgentEvents, listAgentEvents } from '@/lib/command-centre/agent-events'
import { createServiceClient } from '@/lib/supabase/service'
import { POST } from '../route'

const TOKENS = JSON.stringify({
  'unite-mac-mini': 'a'.repeat(48),
  'phill-macbook-pro': 'b'.repeat(48),
  'phill-desktop': 'c'.repeat(48),
})

const validSnapshot = {
  schemaVersion: 1,
  bootId: '11111111-1111-4111-8111-111111111111',
  sequence: 7,
  observedAt: '2026-07-18T10:00:00.000Z',
  screens: [
    {
      screenId: 'primary',
      state: 'active',
      activity: 'coding',
      tool: 'hermes',
      agent: 'default',
      projectKey: 'unite-group',
      taskRef: 'UNI-2403',
    },
    {
      screenId: 'secondary',
      state: 'idle',
      activity: 'idle',
      tool: null,
      agent: 'empire',
      projectKey: 'pi-ceo',
    },
  ],
}

function request(body: unknown, token = 'a'.repeat(48)) {
  return new Request('https://app.test/api/agents/machine-activity', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  })
}

const priorTokens = process.env.MACHINE_ACTIVITY_DEVICE_TOKENS
const priorFounder = process.env.FOUNDER_USER_ID

describe('POST /api/agents/machine-activity', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-18T10:00:05.000Z'))
    process.env.MACHINE_ACTIVITY_DEVICE_TOKENS = TOKENS
    process.env.FOUNDER_USER_ID = 'founder-1'
    vi.mocked(createServiceClient).mockReturnValue({} as never)
    vi.mocked(listAgentEvents).mockResolvedValue([])
    vi.mocked(insertAgentEvents).mockResolvedValue([{ id: 'one' }, { id: 'two' }] as never)
  })

  afterEach(() => {
    vi.useRealTimers()
    if (priorTokens === undefined) delete process.env.MACHINE_ACTIVITY_DEVICE_TOKENS
    else process.env.MACHINE_ACTIVITY_DEVICE_TOKENS = priorTokens
    if (priorFounder === undefined) delete process.env.FOUNDER_USER_ID
    else process.env.FOUNDER_USER_ID = priorFounder
  })

  it('is dormant when device tokens are absent and rejects wrong credentials', async () => {
    delete process.env.MACHINE_ACTIVITY_DEVICE_TOKENS
    expect((await POST(request(validSnapshot))).status).toBe(401)
    process.env.MACHINE_ACTIVITY_DEVICE_TOKENS = TOKENS
    expect((await POST(request(validSnapshot, 'z'.repeat(48)))).status).toBe(401)
    expect(createServiceClient).not.toHaveBeenCalled()
  })

  it('rejects forbidden fields instead of silently stripping them', async () => {
    const dirty = { ...validSnapshot, windowTitle: 'private client portal' }
    const response = await POST(request(dirty))
    expect(response.status).toBe(400)
    expect(insertAgentEvents).not.toHaveBeenCalled()
  })

  it('binds the canonical machine to the credential and writes exactly two safe events', async () => {
    const response = await POST(request(validSnapshot))
    expect(response.status).toBe(201)
    expect(await response.json()).toMatchObject({ deviceId: 'unite-mac-mini', ingested: 2 })

    const events = vi.mocked(insertAgentEvents).mock.calls[0][2]
    expect(events).toHaveLength(2)
    expect(events.every((event) => event.machine === 'unite-mac-mini')).toBe(true)
    expect(JSON.stringify(events)).not.toContain('windowTitle')
  })

  it('rejects future clock skew and a replayed or out-of-order sequence', async () => {
    expect((await POST(request({ ...validSnapshot, observedAt: '2026-07-18T10:00:16.000Z' }))).status).toBe(400)

    vi.mocked(listAgentEvents).mockResolvedValue([
      {
        id: 'existing',
        founder_id: 'founder-1',
        session_id: 'mission-control:v1:11111111-1111-4111-8111-111111111111:7:primary',
        agent_name: 'default',
        surface: 'local',
        machine: 'unite-mac-mini',
        repo: null,
        project_key: null,
        plan_key: null,
        event_type: 'status',
        tool_name: 'mc:active:coding:hermes',
        target: null,
        created_at: '2026-07-18T10:00:04.000Z',
      },
    ])
    expect((await POST(request(validSnapshot))).status).toBe(409)
  })

  it('fails closed when founder binding or persistence confirmation is missing', async () => {
    delete process.env.FOUNDER_USER_ID
    expect((await POST(request(validSnapshot))).status).toBe(503)

    process.env.FOUNDER_USER_ID = 'founder-1'
    vi.mocked(insertAgentEvents).mockResolvedValue([{ id: 'one' }] as never)
    expect((await POST(request(validSnapshot))).status).toBe(500)
  })
})
