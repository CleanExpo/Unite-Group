// Regression coverage — GET /api/pi-ceo/activity
// Captures current behaviour: auth gate, honest not-configured/no-key states,
// and the live pi-ceo passthrough (upstream fetch mocked).
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))

import { getUser } from '@/lib/supabase/server'
import { GET } from '../route'

const ORIGINAL_ENV = { ...process.env }

function jsonResponse(body: unknown, init: { status?: number; headers?: Record<string, string> } = {}) {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: init.headers ?? {},
  })
}

describe('GET /api/pi-ceo/activity', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Clean slate for the env vars the route reads.
    delete process.env.PI_CEO_API_URL
    delete process.env.PI_CEO_API_KEY
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

  it('reports configured:false when PI_CEO_API_URL is absent', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as never)
    const res = await GET()
    expect(res.status).toBe(200)
    const body = (await res.json()) as { configured: boolean; events: unknown[]; connected: boolean; source: string }
    expect(body.configured).toBe(false)
    expect(body.connected).toBe(false)
    expect(body.events).toEqual([])
    expect(body.source).toBe('not_configured')
  })

  it('honest no_key source when URL set but key missing', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as never)
    process.env.PI_CEO_API_URL = 'https://pi-ceo.test'
    const res = await GET()
    expect(res.status).toBe(200)
    const body = (await res.json()) as { source: string; connected: boolean; events: unknown[] }
    expect(body.source).toBe('no_key')
    expect(body.connected).toBe(false)
    expect(body.events).toEqual([])
  })

  it('not connected (login_failed) when upstream login is not ok', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as never)
    process.env.PI_CEO_API_URL = 'https://pi-ceo.test'
    process.env.PI_CEO_API_KEY = 'secret'
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({}, { status: 401 }))
    vi.stubGlobal('fetch', fetchMock)

    const res = await GET()
    expect(res.status).toBe(200)
    const body = (await res.json()) as { source: string; connected: boolean }
    expect(body.source).toBe('login_failed')
    expect(body.connected).toBe(false)
  })

  it('not connected (no_session) when login is ok but no tao_session cookie is returned', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as never)
    process.env.PI_CEO_API_URL = 'https://pi-ceo.test'
    process.env.PI_CEO_API_KEY = 'secret'
    // Login 200 but with no set-cookie header → cookie parse yields empty.
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({}, { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    const res = await GET()
    expect(res.status).toBe(200)
    const body = (await res.json()) as { source: string; connected: boolean }
    expect(body.source).toBe('no_session')
    expect(body.connected).toBe(false)
  })

  it('not connected (autonomy_failed) when autonomy/status is not ok', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as never)
    process.env.PI_CEO_API_URL = 'https://pi-ceo.test'
    process.env.PI_CEO_API_KEY = 'secret'

    const loginRes = jsonResponse({}, {
      status: 200,
      headers: { 'set-cookie': 'tao_session=abc123; Path=/; HttpOnly' },
    })
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(loginRes)
      .mockResolvedValueOnce(jsonResponse({}, { status: 503 }))
    vi.stubGlobal('fetch', fetchMock)

    const res = await GET()
    expect(res.status).toBe(200)
    const body = (await res.json()) as { source: string; connected: boolean }
    expect(body.source).toBe('autonomy_failed')
    expect(body.connected).toBe(false)
  })

  it('maps recent_events on the live path (login + autonomy/status mocked)', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as never)
    process.env.PI_CEO_API_URL = 'https://pi-ceo.test'
    process.env.PI_CEO_API_KEY = 'secret'

    const loginRes = jsonResponse({}, {
      status: 200,
      headers: { 'set-cookie': 'tao_session=abc123; Path=/; HttpOnly' },
    })
    const nowIso = new Date().toISOString()
    const autonomyRes = jsonResponse({
      recent_events: [
        { action: 'poll', poll: 7, found: 0, ts: nowIso },
        { action: 'remediate', ts: nowIso },
      ],
      poll_count: 7,
      last_poll_ago_s: 12,
      effective_autonomy: { effective_autonomy_pct: 95, poll_success_rate_pct: 98 },
    }, { status: 200 })

    const fetchMock = vi.fn()
      .mockResolvedValueOnce(loginRes)
      .mockResolvedValueOnce(autonomyRes)
    vi.stubGlobal('fetch', fetchMock)

    const res = await GET()
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      connected: boolean
      source: string
      poll_count: number
      autonomy_pct: number
      poll_success_rate: number
      events: Array<{ agent: string; action: string; found: number }>
    }
    expect(body.connected).toBe(true)
    expect(body.source).toBe('pi_ceo_live')
    expect(body.poll_count).toBe(7)
    expect(body.autonomy_pct).toBe(95)
    expect(body.poll_success_rate).toBe(98)
    // newest-first (reversed); poll event becomes the 'orchestrator' agent.
    expect(body.events).toHaveLength(2)
    const pollEvent = body.events.find((e) => e.agent === 'orchestrator')
    expect(pollEvent?.action).toMatch(/Health sweep #7 — no issues found/)
    // login was called with the key, autonomy with the parsed cookie.
    expect(fetchMock).toHaveBeenCalledTimes(2)
    const autonomyCall = fetchMock.mock.calls[1]
    expect(autonomyCall[0]).toContain('/api/autonomy/status')
    expect((autonomyCall[1] as { headers: Record<string, string> }).headers.Cookie)
      .toBe('tao_session=abc123')
  })

  it('honest error source when fetch throws', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as never)
    process.env.PI_CEO_API_URL = 'https://pi-ceo.test'
    process.env.PI_CEO_API_KEY = 'secret'
    const fetchMock = vi.fn().mockRejectedValue(new Error('network down'))
    vi.stubGlobal('fetch', fetchMock)

    const res = await GET()
    expect(res.status).toBe(200)
    const body = (await res.json()) as { source: string; connected: boolean }
    expect(body.source).toBe('error')
    expect(body.connected).toBe(false)
  })
})
