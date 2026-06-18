import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createHmac } from 'crypto'

// Stable test secret — set before any module resolves
const TEST_SECRET = 'test-whatsapp-secret'
const TEST_VERIFY_TOKEN = 'test-verify-token'
process.env.WHATSAPP_APP_SECRET = TEST_SECRET
process.env.WHATSAPP_VERIFY_TOKEN = TEST_VERIFY_TOKEN

vi.mock('@/lib/webhooks/dedup', () => ({
  isDuplicate: vi.fn(),
  insertEvent: vi.fn(),
  markEvent: vi.fn(),
}))
vi.mock('@/lib/agent-pipeline/idea-processor', () => ({
  processIdea: vi.fn(),
}))
vi.mock('@/lib/integrations/linear', () => ({
  createIssue: vi.fn(),
}))
vi.mock('@/lib/notifications', () => ({
  notify: vi.fn().mockResolvedValue(undefined),
}))

import { GET, POST } from '../route'
import { isDuplicate, insertEvent, markEvent } from '@/lib/webhooks/dedup'
import { processIdea } from '@/lib/agent-pipeline/idea-processor'
import { createIssue } from '@/lib/integrations/linear'

function sign(body: string): string {
  return 'sha256=' + createHmac('sha256', TEST_SECRET).update(body).digest('hex')
}

function makePostReq(body: string, sig: string | null = sign(body)): Request {
  const headers: HeadersInit = sig !== null ? { 'x-hub-signature-256': sig } : {}
  return new Request('https://app.test/api/webhooks/whatsapp', {
    method: 'POST',
    headers,
    body,
  })
}

const TEXT_PAYLOAD = JSON.stringify({
  entry: [{
    changes: [{
      value: {
        messages: [{ id: 'msg-1', type: 'text', text: { body: 'Build a kanban for the iOS app' } }],
      },
    }],
  }],
})

const REACTION_PAYLOAD = JSON.stringify({
  entry: [{
    changes: [{
      value: {
        messages: [{ id: 'msg-2', type: 'reaction', reaction: { message_id: 'msg-1', emoji: '👍' } }],
      },
    }],
  }],
})

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(isDuplicate).mockResolvedValue(false)
  vi.mocked(insertEvent).mockResolvedValue('event-row-1')
  vi.mocked(markEvent).mockResolvedValue(undefined)
  vi.mocked(processIdea).mockResolvedValue({ title: 'Build kanban', description: '...', teamId: 't1', priority: 2 })
  vi.mocked(createIssue).mockResolvedValue({ id: 'LIN-1', url: 'https://linear.app/i/LIN-1' })
})

describe('GET /api/webhooks/whatsapp (Meta verification handshake)', () => {
  it('echoes challenge when mode=subscribe and token matches', async () => {
    const url = `https://app.test/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=${TEST_VERIFY_TOKEN}&hub.challenge=abc123`
    const res = await GET(new Request(url) as never)
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('abc123')
  })

  it('returns 403 when token does not match', async () => {
    const url = `https://app.test/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=abc123`
    const res = await GET(new Request(url) as never)
    expect(res.status).toBe(403)
  })

  it('returns 403 when mode is not subscribe', async () => {
    const url = `https://app.test/api/webhooks/whatsapp?hub.mode=unsubscribe&hub.verify_token=${TEST_VERIFY_TOKEN}&hub.challenge=abc123`
    const res = await GET(new Request(url) as never)
    expect(res.status).toBe(403)
  })
})

describe('POST /api/webhooks/whatsapp (inbound messages)', () => {
  it('rejects missing signature with 401', async () => {
    const res = await POST(makePostReq(TEXT_PAYLOAD, null) as never)
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBe('Invalid signature')
  })

  it('rejects tampered signature with 401', async () => {
    const res = await POST(makePostReq(TEXT_PAYLOAD, 'sha256=deadbeef') as never)
    expect(res.status).toBe(401)
  })

  it('processes a text message → Linear issue, returns processed', async () => {
    const res = await POST(makePostReq(TEXT_PAYLOAD) as never)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.status).toBe('processed')
    expect(json.linearIssueId).toBe('LIN-1')
    expect(insertEvent).toHaveBeenCalledWith('whatsapp', 'msg-1', 'text_message', expect.any(Object))
    expect(processIdea).toHaveBeenCalledWith('Build a kanban for the iOS app')
    expect(markEvent).toHaveBeenCalledWith('event-row-1', 'processed')
  })

  it('ignores non-text messages (reaction) with status:ignored', async () => {
    const res = await POST(makePostReq(REACTION_PAYLOAD) as never)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.status).toBe('ignored')
    expect(processIdea).not.toHaveBeenCalled()
  })

  it('short-circuits on duplicate message id', async () => {
    vi.mocked(isDuplicate).mockResolvedValue(true)
    const res = await POST(makePostReq(TEXT_PAYLOAD) as never)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.status).toBe('duplicate')
    expect(processIdea).not.toHaveBeenCalled()
  })

  it('returns 200 (not 5xx) when processIdea throws, to stop Meta retries', async () => {
    vi.mocked(processIdea).mockRejectedValue(new Error('AI timeout'))
    const res = await POST(makePostReq(TEXT_PAYLOAD) as never)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.status).toBe('error')
    expect(markEvent).toHaveBeenCalledWith('event-row-1', 'failed', 'AI timeout')
  })
})
