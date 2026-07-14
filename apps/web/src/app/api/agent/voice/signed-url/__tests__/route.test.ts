import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: vi.fn(() => ({ from: vi.fn() })),
}))
vi.mock('@/lib/site-agent/site-keys', () => ({
  validateSiteKey: vi.fn(),
}))

import { validateSiteKey } from '@/lib/site-agent/site-keys'
import { POST, OPTIONS } from '../route'

let keyCounter = 0
function uniqueKey() {
  // Unique per request so the module-level rate-limit bucket never trips tests.
  keyCounter += 1
  return `sk_site_test_${keyCounter}`
}

function req(body: unknown, origin: string | null = 'https://client.example') {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (origin) headers.Origin = origin
  return new Request('https://app.test/api/agent/voice/signed-url', {
    method: 'POST',
    headers,
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

const REAL_FETCH = globalThis.fetch

describe('POST /api/agent/voice/signed-url', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(validateSiteKey).mockResolvedValue({
      ok: true,
      founderId: 'founder-1',
      businessKey: 'synthex',
    })
    process.env.ELEVENLABS_API_KEY = 'test-xi-key'
    process.env.ELEVENLABS_SITE_AGENT_ID = 'agent-abc'
  })

  afterEach(() => {
    globalThis.fetch = REAL_FETCH
    delete process.env.ELEVENLABS_API_KEY
    delete process.env.ELEVENLABS_SITE_AGENT_ID
  })

  it('returns 400 on invalid JSON body', async () => {
    const res = await POST(req('{not json', 'https://client.example'))
    expect(res.status).toBe(400)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://client.example')
  })

  it('returns 400 when siteKey is missing', async () => {
    const res = await POST(req({}))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/siteKey is required/)
  })

  it('returns 400 when siteKey exceeds the length cap', async () => {
    const res = await POST(req({ siteKey: 'x'.repeat(257) }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/too long/)
  })

  it('returns a generic 401 with CORS headers on a bad site key (no reason enumeration)', async () => {
    vi.mocked(validateSiteKey).mockResolvedValue({ ok: false, reason: 'unknown_key' })
    const res = await POST(req({ siteKey: uniqueKey() }))
    expect(res.status).toBe(401)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://client.example')
    const body = await res.json()
    expect(body).toEqual({ error: 'Invalid site key' })
    expect(body).not.toHaveProperty('reason')
  })

  it('returns 503 when ELEVENLABS_API_KEY is unset', async () => {
    delete process.env.ELEVENLABS_API_KEY
    const res = await POST(req({ siteKey: uniqueKey() }))
    expect(res.status).toBe(503)
    expect((await res.json()).error).toMatch(/not configured/)
  })

  it('returns 503 when ELEVENLABS_SITE_AGENT_ID is unset', async () => {
    delete process.env.ELEVENLABS_SITE_AGENT_ID
    const res = await POST(req({ siteKey: uniqueKey() }))
    expect(res.status).toBe(503)
  })

  it('mints a signed URL on the happy path and echoes CORS', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ signed_url: 'wss://elevenlabs.io/signed?token=abc' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    globalThis.fetch = fetchMock as unknown as typeof fetch

    const res = await POST(req({ siteKey: uniqueKey() }))
    expect(res.status).toBe(200)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://client.example')
    expect(res.headers.get('Cache-Control')).toBe('no-store')
    const body = await res.json()
    expect(body).toEqual({
      signed_url: 'wss://elevenlabs.io/signed?token=abc',
      expires_in_seconds: 900,
    })

    // Uses the site agent id + xi-api-key header, never the Margot agent.
    const calledUrl = String(fetchMock.mock.calls[0][0])
    expect(calledUrl).toContain('agent_id=agent-abc')
    const calledInit = fetchMock.mock.calls[0][1] as RequestInit
    expect((calledInit.headers as Record<string, string>)['xi-api-key']).toBe('test-xi-key')
  })

  it('returns 502 when ElevenLabs responds non-OK', async () => {
    globalThis.fetch = vi.fn(async () => new Response('nope', { status: 500 })) as unknown as typeof fetch
    const res = await POST(req({ siteKey: uniqueKey() }))
    expect(res.status).toBe(502)
    expect((await res.json()).error).toBe('elevenlabs_signed_url_failed')
  })

  it('returns 502 when ElevenLabs omits signed_url', async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ nope: true }), { status: 200 }),
    ) as unknown as typeof fetch
    const res = await POST(req({ siteKey: uniqueKey() }))
    expect(res.status).toBe(502)
    expect((await res.json()).error).toBe('elevenlabs_signed_url_failed')
  })

  it('returns 502 when the upstream fetch throws', async () => {
    globalThis.fetch = vi.fn(async () => {
      throw new Error('network down')
    }) as unknown as typeof fetch
    const res = await POST(req({ siteKey: uniqueKey() }))
    expect(res.status).toBe(502)
    expect((await res.json()).error).toBe('elevenlabs_unreachable')
  })

  it('rate-limits repeated mints from one site key + IP with 429', async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ signed_url: 'wss://x' }), { status: 200 }),
    ) as unknown as typeof fetch
    const siteKey = uniqueKey()
    let last: Response | null = null
    for (let i = 0; i < 11; i++) {
      last = await POST(req({ siteKey }))
    }
    expect(last?.status).toBe(429)
    expect(last?.headers.get('Retry-After')).toBe('60')
  })
})

describe('OPTIONS /api/agent/voice/signed-url', () => {
  it('answers preflight with CORS headers reflecting the origin', async () => {
    const res = await OPTIONS(
      new Request('https://app.test/api/agent/voice/signed-url', {
        method: 'OPTIONS',
        headers: { Origin: 'https://client.example' },
      }),
    )
    expect(res.status).toBe(204)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://client.example')
    expect(res.headers.get('Access-Control-Allow-Methods')).toContain('POST')
  })
})
