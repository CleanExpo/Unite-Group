import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: vi.fn(() => ({ from: vi.fn() })),
}))
vi.mock('@/lib/ai/client', () => ({
  getAIClient: vi.fn(),
}))
vi.mock('@/lib/site-agent/site-keys', () => ({
  validateSiteKey: vi.fn(),
}))
vi.mock('@/lib/site-agent/grounding', () => ({
  ground: vi.fn(async () => ({ snippets: [], source: 'none', businessName: 'Synthex' })),
  formatGroundingContext: vi.fn(() => ''),
}))

import { getAIClient } from '@/lib/ai/client'
import { validateSiteKey } from '@/lib/site-agent/site-keys'
import { ground } from '@/lib/site-agent/grounding'
import { POST, OPTIONS } from '../route'

let keyCounter = 0
function uniqueKey() {
  // Unique per request so the module-level rate-limit bucket never trips tests.
  keyCounter += 1
  return `sk_site_test_${keyCounter}`
}

function req(body: object, origin: string | null = 'https://client.example') {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (origin) headers.Origin = origin
  return new Request('https://app.test/api/agent', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
}

function anthropicEvents(...texts: string[]) {
  return (async function* () {
    yield { type: 'message_start' }
    for (const text of texts) {
      yield { type: 'content_block_delta', delta: { type: 'text_delta', text } }
    }
    yield { type: 'message_stop' }
  })()
}

describe('POST /api/agent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(validateSiteKey).mockResolvedValue({
      ok: true,
      founderId: 'founder-1',
      businessKey: 'synthex',
    })
  })

  it('returns 401 with CORS headers on a bad site key', async () => {
    vi.mocked(validateSiteKey).mockResolvedValue({ ok: false, reason: 'unknown_key' })
    const res = await POST(req({ siteKey: uniqueKey(), messages: [{ role: 'user', content: 'hi' }] }))
    expect(res.status).toBe(401)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://client.example')
    expect(await res.json()).toMatchObject({ error: 'Invalid site key', reason: 'unknown_key' })
  })

  it('returns 400 when siteKey is missing', async () => {
    const res = await POST(req({ messages: [{ role: 'user', content: 'hi' }] }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when messages exceed the 20-entry cap', async () => {
    const messages = Array.from({ length: 21 }, () => ({ role: 'user', content: 'hi' }))
    const res = await POST(req({ siteKey: uniqueKey(), messages }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/at most 20/)
  })

  it('returns 400 when a message exceeds 4000 characters', async () => {
    const res = await POST(
      req({ siteKey: uniqueKey(), messages: [{ role: 'user', content: 'x'.repeat(4001) }] }),
    )
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/4000/)
  })

  it('returns 400 on an invalid role', async () => {
    const res = await POST(
      req({ siteKey: uniqueKey(), messages: [{ role: 'system', content: 'hack' }] }),
    )
    expect(res.status).toBe(400)
  })

  it('streams SSE deltas and a [DONE] terminator on the happy path', async () => {
    const create = vi.fn(async () => anthropicEvents('Hello', ' there'))
    vi.mocked(getAIClient).mockReturnValue({ messages: { create } } as any)

    const res = await POST(
      req({ siteKey: uniqueKey(), messages: [{ role: 'user', content: 'hi' }] }),
    )
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toContain('text/event-stream')
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://client.example')

    const body = await res.text()
    expect(body).toContain('data: {"delta":"Hello"}')
    expect(body).toContain('data: {"delta":" there"}')
    expect(body.trimEnd().endsWith('data: [DONE]')).toBe(true)

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        stream: true,
        messages: [{ role: 'user', content: 'hi' }],
        system: expect.stringContaining('Synthex'),
      }),
    )
    expect(ground).toHaveBeenCalledWith(expect.anything(), 'founder-1', 'synthex', 'hi')
  })

  it('emits a stream_failed event (then [DONE]) when the model call throws', async () => {
    const create = vi.fn(async () => {
      throw new Error('provider down')
    })
    vi.mocked(getAIClient).mockReturnValue({ messages: { create } } as any)

    const res = await POST(
      req({ siteKey: uniqueKey(), messages: [{ role: 'user', content: 'hi' }] }),
    )
    expect(res.status).toBe(200)
    const body = await res.text()
    expect(body).toContain('data: {"error":"stream_failed"}')
    expect(body).toContain('data: [DONE]')
  })

  it('returns 503 when the Anthropic client is not configured', async () => {
    vi.mocked(getAIClient).mockImplementation(() => {
      throw new Error('ANTHROPIC_API_KEY is required')
    })
    const res = await POST(
      req({ siteKey: uniqueKey(), messages: [{ role: 'user', content: 'hi' }] }),
    )
    expect(res.status).toBe(503)
  })

  it('rate-limits repeated requests from one site key + IP with 429', async () => {
    vi.mocked(getAIClient).mockReturnValue({
      messages: { create: vi.fn(async () => anthropicEvents('ok')) },
    } as any)
    const siteKey = uniqueKey()
    let last: Response | null = null
    for (let i = 0; i < 21; i++) {
      last = await POST(req({ siteKey, messages: [{ role: 'user', content: 'hi' }] }))
    }
    expect(last?.status).toBe(429)
  })
})

describe('OPTIONS /api/agent', () => {
  it('answers preflight with CORS headers reflecting the origin', async () => {
    const res = await OPTIONS(
      new Request('https://app.test/api/agent', {
        method: 'OPTIONS',
        headers: { Origin: 'https://client.example' },
      }),
    )
    expect(res.status).toBe(204)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://client.example')
    expect(res.headers.get('Access-Control-Allow-Methods')).toContain('POST')
  })
})
