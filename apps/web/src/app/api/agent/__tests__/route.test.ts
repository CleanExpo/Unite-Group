import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

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

  it('returns a generic 401 with CORS headers on a bad site key (no reason enumeration)', async () => {
    vi.mocked(validateSiteKey).mockResolvedValue({ ok: false, reason: 'unknown_key' })
    const res = await POST(req({ siteKey: uniqueKey(), messages: [{ role: 'user', content: 'hi' }] }))
    expect(res.status).toBe(401)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://client.example')
    const body = await res.json()
    expect(body).toEqual({ error: 'Invalid site key' })
    // The discriminated reason must NOT leak to an anonymous caller.
    expect(body).not.toHaveProperty('reason')
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

// hCaptcha guard (UNI-2929). The real captcha module runs; fetch is mocked only
// at the siteverify boundary.
describe('POST /api/agent — hCaptcha guard', () => {
  const REAL_FETCH = globalThis.fetch
  const SITEVERIFY = 'https://api.hcaptcha.com/siteverify'

  function siteverifyCalls(fetchMock: ReturnType<typeof vi.fn>) {
    return fetchMock.mock.calls.filter((call) => String(call[0]) === SITEVERIFY)
  }

  function mockSiteverify(reply: () => Promise<Response>) {
    const fetchMock = vi.fn(async (input: unknown) => {
      if (String(input) === SITEVERIFY) return reply()
      throw new Error(`unexpected fetch ${String(input)}`)
    })
    globalThis.fetch = fetchMock as unknown as typeof fetch
    return fetchMock
  }

  let create: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(validateSiteKey).mockResolvedValue({
      ok: true,
      founderId: 'founder-1',
      businessKey: 'synthex',
    })
    create = vi.fn(async () => anthropicEvents('ok'))
    vi.mocked(getAIClient).mockReturnValue({ messages: { create } } as any)
    process.env.HCAPTCHA_SECRET = 'test-hcaptcha-secret'
  })

  afterEach(() => {
    globalThis.fetch = REAL_FETCH
    delete process.env.SITE_AGENT_CAPTCHA_ENABLED
    delete process.env.HCAPTCHA_SECRET
  })

  const chat = (extra: object = {}) =>
    req({ siteKey: uniqueKey(), messages: [{ role: 'user', content: 'hi' }], ...extra })

  it('flag off: makes no siteverify call and proceeds to the model', async () => {
    const fetchMock = mockSiteverify(async () => new Response(JSON.stringify({ success: false })))
    const res = await POST(chat())
    expect(res.status).toBe(200)
    expect(siteverifyCalls(fetchMock)).toHaveLength(0)
    expect(create).toHaveBeenCalledTimes(1)
  })

  it('flag on + missing token: 403 captcha_required with CORS, no model call', async () => {
    process.env.SITE_AGENT_CAPTCHA_ENABLED = 'true'
    const fetchMock = mockSiteverify(async () => new Response(JSON.stringify({ success: true })))
    const res = await POST(chat())
    expect(res.status).toBe(403)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://client.example')
    expect(await res.json()).toEqual({ error: 'captcha_required' })
    expect(siteverifyCalls(fetchMock)).toHaveLength(0)
    expect(create).not.toHaveBeenCalled()
    expect(ground).not.toHaveBeenCalled()
  })

  it('flag on + success:false: 403 captcha_failed, no grounding or model call', async () => {
    process.env.SITE_AGENT_CAPTCHA_ENABLED = 'true'
    mockSiteverify(
      async () =>
        new Response(JSON.stringify({ success: false, 'error-codes': ['invalid-input-response'] })),
    )
    const res = await POST(chat({ captchaToken: 'tok' }))
    expect(res.status).toBe(403)
    expect(await res.json()).toEqual({ error: 'captcha_failed' })
    expect(create).not.toHaveBeenCalled()
    expect(ground).not.toHaveBeenCalled()
  })

  it('flag on + siteverify fetch rejects: 403 captcha_failed (fail closed)', async () => {
    process.env.SITE_AGENT_CAPTCHA_ENABLED = 'true'
    mockSiteverify(async () => {
      throw new Error('network down')
    })
    const res = await POST(chat({ captchaToken: 'tok' }))
    expect(res.status).toBe(403)
    expect(await res.json()).toEqual({ error: 'captcha_failed' })
    expect(create).not.toHaveBeenCalled()
  })

  it('flag on + HCAPTCHA_SECRET unset: 403 captcha_failed without calling siteverify', async () => {
    process.env.SITE_AGENT_CAPTCHA_ENABLED = 'true'
    delete process.env.HCAPTCHA_SECRET
    const fetchMock = mockSiteverify(async () => new Response(JSON.stringify({ success: true })))
    const res = await POST(chat({ captchaToken: 'tok' }))
    expect(res.status).toBe(403)
    expect(await res.json()).toEqual({ error: 'captcha_failed' })
    expect(siteverifyCalls(fetchMock)).toHaveLength(0)
    expect(create).not.toHaveBeenCalled()
  })

  it('flag on + success:true: verifies the token form-encoded and streams the answer', async () => {
    process.env.SITE_AGENT_CAPTCHA_ENABLED = 'true'
    const fetchMock = mockSiteverify(async () => new Response(JSON.stringify({ success: true })))
    const res = await POST(chat({ captchaToken: 'tok-good' }))
    expect(res.status).toBe(200)
    expect(await res.text()).toContain('data: {"delta":"ok"}')
    expect(create).toHaveBeenCalledTimes(1)

    const calls = siteverifyCalls(fetchMock)
    expect(calls).toHaveLength(1)
    const init = calls[0][1] as RequestInit
    expect((init.headers as Record<string, string>)['Content-Type']).toBe(
      'application/x-www-form-urlencoded',
    )
    expect(new URLSearchParams(String(init.body)).get('response')).toBe('tok-good')
  })

  it('an invalid site key is still a 401 and never reaches siteverify', async () => {
    process.env.SITE_AGENT_CAPTCHA_ENABLED = 'true'
    vi.mocked(validateSiteKey).mockResolvedValue({ ok: false, reason: 'unknown_key' })
    const fetchMock = mockSiteverify(async () => new Response(JSON.stringify({ success: true })))
    const res = await POST(chat({ captchaToken: 'tok' }))
    expect(res.status).toBe(401)
    expect(siteverifyCalls(fetchMock)).toHaveLength(0)
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
