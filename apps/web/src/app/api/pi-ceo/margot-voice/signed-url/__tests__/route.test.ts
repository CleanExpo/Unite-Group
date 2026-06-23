// Regression coverage — GET /api/pi-ceo/margot-voice/signed-url
// Returns a short-lived ElevenLabs conversation signed URL. Session-auth gated;
// honest 503 when the provider is not configured. Upstream fetch is mocked.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))

import { getUser } from '@/lib/supabase/server'
import { GET } from '../route'

const ORIGINAL_ENV = { ...process.env }

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status })
}

describe('GET /api/pi-ceo/margot-voice/signed-url', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.ELEVENLABS_API_KEY
    delete process.env.ELEVENLABS_MARGOT_AGENT_ID
  })

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV }
    vi.unstubAllGlobals()
  })

  it('401 when unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await GET()
    expect(res.status).toBe(401)
    const body = (await res.json()) as { error: string }
    expect(body.error).toMatch(/unauthorised/i)
  })

  it('503 when ElevenLabs is not configured (no key/agent)', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as never)
    const res = await GET()
    expect(res.status).toBe(503)
    const body = (await res.json()) as { error: string }
    expect(body.error).toMatch(/not configured/i)
  })

  it('200 returns the signed url on a successful upstream call', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as never)
    process.env.ELEVENLABS_API_KEY = 'xi-key'
    process.env.ELEVENLABS_MARGOT_AGENT_ID = 'agent-1'
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ signed_url: 'wss://elevenlabs.test/convai/signed?token=xyz' }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const res = await GET()
    expect(res.status).toBe(200)
    const body = (await res.json()) as { signed_url: string; expires_in_seconds: number }
    expect(body.signed_url).toBe('wss://elevenlabs.test/convai/signed?token=xyz')
    expect(body.expires_in_seconds).toBe(900)

    // upstream called with the api key header and the agent id in the query.
    const [calledUrl, init] = fetchMock.mock.calls[0]
    expect(String(calledUrl)).toContain('agent_id=agent-1')
    expect((init as { headers: Record<string, string> }).headers['xi-api-key']).toBe('xi-key')
  })

  it('502 when upstream responds not ok', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as never)
    process.env.ELEVENLABS_API_KEY = 'xi-key'
    process.env.ELEVENLABS_MARGOT_AGENT_ID = 'agent-1'
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({}, 500)))

    const res = await GET()
    expect(res.status).toBe(502)
    const body = (await res.json()) as { error: string }
    expect(body.error).toBe('elevenlabs_signed_url_failed')
  })

  it('502 when upstream payload has no signed_url', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as never)
    process.env.ELEVENLABS_API_KEY = 'xi-key'
    process.env.ELEVENLABS_MARGOT_AGENT_ID = 'agent-1'
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ signed_url: '' })))

    const res = await GET()
    expect(res.status).toBe(502)
    const body = (await res.json()) as { error: string }
    expect(body.error).toBe('elevenlabs_signed_url_failed')
  })

  it('502 elevenlabs_unreachable when fetch throws', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as never)
    process.env.ELEVENLABS_API_KEY = 'xi-key'
    process.env.ELEVENLABS_MARGOT_AGENT_ID = 'agent-1'
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('timeout')))

    const res = await GET()
    expect(res.status).toBe(502)
    const body = (await res.json()) as { error: string }
    expect(body.error).toBe('elevenlabs_unreachable')
  })
})
