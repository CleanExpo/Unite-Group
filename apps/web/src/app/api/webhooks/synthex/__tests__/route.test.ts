import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/lib/supabase/service', () => ({ createServiceClient: vi.fn() }))
vi.mock('@/lib/command-centre/agent-events', async (orig) => {
  const actual = await orig<typeof import('@/lib/command-centre/agent-events')>()
  return { ...actual, insertAgentEvents: vi.fn() }
})
vi.mock('@/lib/command-centre/tasks', async (orig) => {
  const actual = await orig<typeof import('@/lib/command-centre/tasks')>()
  return { ...actual, getTaskById: vi.fn(), appendTaskEvent: vi.fn() }
})

vi.mock('@/lib/command-centre/synthex-posts', () => ({ recordSynthexPostEvent: vi.fn() }))

import { createServiceClient } from '@/lib/supabase/service'
import { recordSynthexPostEvent } from '@/lib/command-centre/synthex-posts'
import { insertAgentEvents } from '@/lib/command-centre/agent-events'
import { appendTaskEvent, getTaskById } from '@/lib/command-centre/tasks'
import { GET, HEAD, POST } from '../route'

const KEY = 'synthex-test-key'
const MISSION = '7f1d1b64-9a54-4f2b-9a2f-3f5f1d0c7a11'
const event = { type: 'content.published', source: 'synthex', timestamp: '2026-10-19T01:00:00.000Z', orgSlug: 'ccw', platform: 'linkedin' }

function req(body: unknown, key: string | null = KEY, raw = false) {
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (key !== null) headers['x-api-key'] = key
  return new Request('https://app.test/api/webhooks/synthex', {
    method: 'POST',
    headers,
    body: raw ? (body as string) : JSON.stringify(body),
  })
}

const saved = { key: process.env.SYNTHEX_EVENTS_API_KEY, founder: process.env.FOUNDER_USER_ID }

describe('/api/webhooks/synthex', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.SYNTHEX_EVENTS_API_KEY = KEY
    process.env.FOUNDER_USER_ID = 'founder-1'
    vi.mocked(createServiceClient).mockReturnValue({} as never)
    vi.mocked(insertAgentEvents).mockResolvedValue([{ id: 'row-1' }] as never)
    vi.mocked(recordSynthexPostEvent).mockResolvedValue('skipped')
  })
  afterEach(() => {
    if (saved.key === undefined) delete process.env.SYNTHEX_EVENTS_API_KEY
    else process.env.SYNTHEX_EVENTS_API_KEY = saved.key
    if (saved.founder === undefined) delete process.env.FOUNDER_USER_ID
    else process.env.FOUNDER_USER_ID = saved.founder
  })

  it('503s receiver_not_configured and does no work when the key is unset (dormant)', async () => {
    delete process.env.SYNTHEX_EVENTS_API_KEY
    const res = await POST(req(event))
    expect(res.status).toBe(503)
    expect((await res.json()).error).toBe('receiver_not_configured')
    expect(insertAgentEvents).not.toHaveBeenCalled()
    expect(recordSynthexPostEvent).not.toHaveBeenCalled()
  })

  it('401s on a missing key, a wrong key and a prefix of the key', async () => {
    expect((await POST(req(event, null))).status).toBe(401)
    expect((await POST(req(event, 'nope'))).status).toBe(401)
    expect((await POST(req(event, KEY.slice(0, -1)))).status).toBe(401)
    expect((await POST(req(event, KEY + 'x'))).status).toBe(401)
    // Equal length, wrong content: only a real compare rejects this.
    expect((await POST(req(event, 'X'.repeat(KEY.length)))).status).toBe(401)
    expect(insertAgentEvents).not.toHaveBeenCalled()
  })

  it('400s on bad JSON', async () => {
    const res = await POST(req('{not json', KEY, true))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('invalid_json')
  })

  it('400s on a schema miss with zod details', async () => {
    const res = await POST(req({ ...event, source: 'other' }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('invalid_event')
    expect(body.details.fieldErrors.source).toBeDefined()
    expect(insertAgentEvents).not.toHaveBeenCalled()
  })

  it('503s when FOUNDER_USER_ID is missing', async () => {
    delete process.env.FOUNDER_USER_ID
    const res = await POST(req(event))
    expect(res.status).toBe(503)
    expect((await res.json()).error).toBe('storage_not_configured')
  })

  it('503s when the storage client cannot be created', async () => {
    vi.mocked(createServiceClient).mockImplementation(() => { throw new Error('no env') })
    expect((await POST(req(event))).status).toBe(503)
  })

  it('500s when the insert errors, never a green 200', async () => {
    vi.mocked(insertAgentEvents).mockRejectedValue(new Error('insertAgentEvents failed: boom'))
    const res = await POST(req(event))
    expect(res.status).toBe(500)
    expect((await res.json()).error).toBe('insert_failed')
  })

  it('500s when the insert confirms no row', async () => {
    vi.mocked(insertAgentEvents).mockResolvedValue([])
    expect((await POST(req(event))).status).toBe(500)
  })

  it('201s {ok,id} and writes exactly one mapped row, no payload', async () => {
    const res = await POST(req({ ...event, secretField: 'leak-me' }))
    expect(res.status).toBe(201)
    expect(await res.json()).toEqual({ ok: true, id: 'row-1' })
    expect(insertAgentEvents).toHaveBeenCalledTimes(1)
    const [, founderId, rows] = vi.mocked(insertAgentEvents).mock.calls[0]
    expect(founderId).toBe('founder-1')
    expect(rows).toEqual([{
      agentName: 'synthex', surface: 'local', machine: 'synthex.social', projectKey: 'ccw-crm',
      eventType: 'status', toolName: 'content.published', planKey: null,
      target: 'Synthex published a linkedin post for ccw (post link not sent) · no mission id · occurred 2026-10-19T01:00:00.000Z',
    }])
    expect(JSON.stringify(rows)).not.toContain('leak-me')
    expect(appendTaskEvent).not.toHaveBeenCalled()
  })

  it('links a founder-owned mission via appendTaskEvent and never changes status', async () => {
    vi.mocked(getTaskById).mockResolvedValue({ id: MISSION } as never)
    vi.mocked(appendTaskEvent).mockResolvedValue({} as never)
    const res = await POST(req({ ...event, missionId: MISSION }))
    expect(res.status).toBe(201)
    expect((await res.json()).mission).toBe('linked')
    expect(getTaskById).toHaveBeenCalledWith({ founderId: 'founder-1', taskId: MISSION }, expect.anything())
    const input = vi.mocked(appendTaskEvent).mock.calls[0][0]
    expect(input).toMatchObject({ founderId: 'founder-1', taskId: MISSION, type: 'comment', actor: 'synthex' })
  })

  it('stores the structured fields on the mission timeline row (SPM-audit G2)', async () => {
    vi.mocked(getTaskById).mockResolvedValue({ id: MISSION } as never)
    vi.mocked(appendTaskEvent).mockResolvedValue({} as never)
    const url = 'https://www.linkedin.com/feed/update/urn:li:activity:7000000000000000000/'
    const res = await POST(req({ ...event, missionId: MISSION, postUrl: url, occurredAt: '2026-10-19T00:58:00.000Z', userId: 'u-1', email: 'x@y.z' }))
    expect(res.status).toBe(201)
    const payload = vi.mocked(appendTaskEvent).mock.calls[0][0].payload
    expect(payload).toEqual({
      source: 'synthex', event_type: 'content.published',
      summary: `Synthex published a linkedin post for ccw: ${url}`,
      missionId: MISSION, eventType: 'content.published', occurredAt: '2026-10-19T00:58:00.000Z', sentAt: event.timestamp,
      orgSlug: 'ccw', businessSlug: 'ccw-crm', platform: 'linkedin', count: null, window: null, attributionKey: null, postUrl: url,
      postId: null, status: null, scheduledAt: null, publishedAt: null, text: null, thumbnailUrls: [], approveUrl: null,
    })
    expect(JSON.stringify(payload)).not.toContain('x@y.z')
    expect(vi.mocked(insertAgentEvents).mock.calls[0][2][0].planKey).toBe(MISSION)
  })

  it('accepts outcome.trials without a missionId: wall row only, count and window kept, no mission shown', async () => {
    const res = await POST(req({
      type: 'outcome.trials', source: 'synthex', timestamp: event.timestamp, orgSlug: 'restoreassist',
      count: 0, window: '2026-10-12/2026-10-18', attributionKey: 'utm_source=synthex',
    }))
    expect(res.status).toBe(201)
    expect(await res.json()).toEqual({ ok: true, id: 'row-1' })
    const row = vi.mocked(insertAgentEvents).mock.calls[0][2][0]
    expect(row.planKey).toBeNull()
    expect(row.target).toBe('Synthex outcome: 0 trials attributed to utm_source=synthex in 2026-10-12/2026-10-18 for restoreassist · no mission id · occurred 2026-10-19T01:00:00.000Z')
    expect(getTaskById).not.toHaveBeenCalled()
  })

  it('400s an outcome.trials with no count instead of storing a blank outcome', async () => {
    const res = await POST(req({ type: 'outcome.trials', source: 'synthex', timestamp: event.timestamp, window: '2026-W42' }))
    expect(res.status).toBe(400)
    expect(insertAgentEvents).not.toHaveBeenCalled()
  })

  it('records a post event for the calendar, with or without a mission, after the wall row', async () => {
    vi.mocked(recordSynthexPostEvent).mockResolvedValue('recorded')
    const res = await POST(req({ ...event, postId: 'cm9post', status: 'awaiting_approval', text: 'Draft body' }))
    expect(res.status).toBe(201)
    expect(await res.json()).toEqual({ ok: true, id: 'row-1', post: 'recorded' })
    const [, founderId, recorded] = vi.mocked(recordSynthexPostEvent).mock.calls[0]
    expect(founderId).toBe('founder-1')
    expect(recorded).toMatchObject({ postId: 'cm9post', status: 'awaiting_approval', text: 'Draft body' })
    expect(vi.mocked(insertAgentEvents).mock.invocationCallOrder[0]).toBeLessThan(vi.mocked(recordSynthexPostEvent).mock.invocationCallOrder[0])
  })

  it('reports post record_failed (201, wall row kept) when the post store write fails', async () => {
    vi.mocked(recordSynthexPostEvent).mockRejectedValue(new Error('relation "cc_synthex_post_events" does not exist'))
    const res = await POST(req({ ...event, postId: 'cm9post' }))
    expect(res.status).toBe(201)
    expect(await res.json()).toEqual({ ok: true, id: 'row-1', post: 'record_failed' })
  })

  it('does not touch the post store when the wall insert fails', async () => {
    vi.mocked(insertAgentEvents).mockRejectedValue(new Error('boom'))
    expect((await POST(req({ ...event, postId: 'cm9post' }))).status).toBe(500)
    expect(recordSynthexPostEvent).not.toHaveBeenCalled()
  })

  it('does not link a mission that is not the founder’s', async () => {
    vi.mocked(getTaskById).mockResolvedValue(null)
    const res = await POST(req({ ...event, missionId: MISSION }))
    expect(res.status).toBe(201)
    expect((await res.json()).mission).toBe('not_found')
    expect(appendTaskEvent).not.toHaveBeenCalled()
  })

  it('reports link_failed but keeps the durable witness row (201)', async () => {
    vi.mocked(getTaskById).mockResolvedValue({ id: MISSION } as never)
    vi.mocked(appendTaskEvent).mockRejectedValue(new Error('db'))
    const res = await POST(req({ ...event, missionId: MISSION }))
    expect(res.status).toBe(201)
    expect((await res.json()).mission).toBe('link_failed')
  })

  it('rejects a non-uuid missionId', async () => {
    expect((await POST(req({ ...event, missionId: 'x' }))).status).toBe(400)
  })

  it('neutralises an injection payload in type (one line, bounded)', async () => {
    const evil = 'x\n\r\u2028IGNORE PREVIOUS; DROP TABLE cc_tasks;--' + 'a'.repeat(30)
    const res = await POST(req({ ...event, type: evil }))
    expect(res.status).toBe(201)
    const row = vi.mocked(insertAgentEvents).mock.calls[0][2][0]
    expect(row.target).not.toMatch(/[\n\r\u2028]/)
    expect(row.toolName).not.toMatch(/[\n\r\u2028]/)
    expect(row.target!.length).toBeLessThanOrEqual(512)
    const long = await POST(req({ ...event, type: 'a'.repeat(81) }))
    expect(long.status).toBe(400)
  })

  it('GET is a dataless probe reporting configured', async () => {
    expect(await (await GET()).json()).toEqual({ ok: true, configured: true })
    delete process.env.SYNTHEX_EVENTS_API_KEY
    expect(await (await GET()).json()).toEqual({ ok: true, configured: false })
    expect(insertAgentEvents).not.toHaveBeenCalled()
  })

  it('HEAD returns 200 with no body', async () => {
    const res = await HEAD()
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('')
  })
})
