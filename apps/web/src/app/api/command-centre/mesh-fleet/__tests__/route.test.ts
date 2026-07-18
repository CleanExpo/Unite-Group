// Regression coverage — GET /api/command-centre/mesh-fleet
// Auth gate, honest not-configured/no-key states, timeout/upstream-error
// paths, the live passthrough, and that the secret never reaches the
// response body (upstream fetch mocked throughout).
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))

import { getUser } from '@/lib/supabase/server'
import { GET } from '../route'

const ORIGINAL_ENV = { ...process.env }

function jsonResponse(body: unknown, init: { status?: number } = {}) {
  return new Response(JSON.stringify(body), { status: init.status ?? 200 })
}

describe('GET /api/command-centre/mesh-fleet', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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
    const body = (await res.json()) as { configured: boolean; machines: unknown[]; source: string }
    expect(body.configured).toBe(false)
    expect(body.machines).toEqual([])
    expect(body.source).toBe('not_configured')
  })

  it('reports configured:false (no_key) when URL set but key missing', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as never)
    process.env.PI_CEO_API_URL = 'https://pi-ceo.test'
    const res = await GET()
    expect(res.status).toBe(200)
    const body = (await res.json()) as { configured: boolean; source: string; machines: unknown[] }
    expect(body.configured).toBe(false)
    expect(body.source).toBe('no_key')
    expect(body.machines).toEqual([])
  })

  it('honest upstream_error source when the upstream response is not ok', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as never)
    process.env.PI_CEO_API_URL = 'https://pi-ceo.test'
    process.env.PI_CEO_API_KEY = 'secret'
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({}, { status: 503 }))
    vi.stubGlobal('fetch', fetchMock)

    const res = await GET()
    expect(res.status).toBe(200)
    const body = (await res.json()) as { configured: boolean; source: string; machines: unknown[] }
    expect(body.configured).toBe(true)
    expect(body.source).toBe('upstream_error')
    expect(body.machines).toEqual([])
  })

  it('honest timeout source when the upstream fetch aborts on timeout', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as never)
    process.env.PI_CEO_API_URL = 'https://pi-ceo.test'
    process.env.PI_CEO_API_KEY = 'secret'
    const timeoutError = new DOMException('The operation was aborted due to timeout', 'TimeoutError')
    const fetchMock = vi.fn().mockRejectedValue(timeoutError)
    vi.stubGlobal('fetch', fetchMock)

    const res = await GET()
    expect(res.status).toBe(200)
    const body = (await res.json()) as { configured: boolean; source: string; machines: unknown[] }
    expect(body.configured).toBe(true)
    expect(body.source).toBe('timeout')
    expect(body.machines).toEqual([])
  })

  it('honest error source when the upstream fetch throws a non-timeout error', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as never)
    process.env.PI_CEO_API_URL = 'https://pi-ceo.test'
    process.env.PI_CEO_API_KEY = 'secret'
    const fetchMock = vi.fn().mockRejectedValue(new Error('network down'))
    vi.stubGlobal('fetch', fetchMock)

    const res = await GET()
    expect(res.status).toBe(200)
    const body = (await res.json()) as { configured: boolean; source: string; machines: unknown[] }
    expect(body.configured).toBe(true)
    expect(body.source).toBe('error')
    expect(body.machines).toEqual([])
  })

  it('maps only safe machine fields + ship count and never echoes secrets or free text', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as never)
    process.env.PI_CEO_API_URL = 'https://pi-ceo.test'
    process.env.PI_CEO_API_KEY = 'super-secret-value'

    const upstreamRes = jsonResponse({
      machines: [
        {
          host: 'mac-mini',
          last_seen: '2026-07-05T02:00:00Z',
          is_stale: false,
          state: 'working',
          current_task: 'private client recovery details',
          prompt: 'must never reach the browser',
        },
        { host: 'windows-box', last_seen: '2026-07-04T20:00:00Z', is_stale: true },
      ],
      ships: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
    }, { status: 200 })
    const fetchMock = vi.fn().mockResolvedValue(upstreamRes)
    vi.stubGlobal('fetch', fetchMock)

    const res = await GET()
    expect(res.status).toBe(200)
    const bodyText = await res.text()
    const body = JSON.parse(bodyText) as {
      configured: boolean; source: string; shipCount: number
      machines: Array<{ host: string; is_stale: boolean; state?: string }>
    }
    expect(body.configured).toBe(true)
    expect(body.source).toBe('pi_ceo_live')
    expect(body.shipCount).toBe(3)
    expect(body.machines).toHaveLength(2)
    expect(body.machines[0]).toMatchObject({ host: 'mac-mini', is_stale: false, state: 'working' })
    expect(body.machines[1]).toMatchObject({ host: 'windows-box', is_stale: true })
    expect(bodyText).not.toContain('private client recovery details')
    expect(bodyText).not.toContain('must never reach the browser')

    // The secret was only sent as an outbound header — never present in the response body.
    expect(bodyText).not.toContain('super-secret-value')
    const outboundCall = fetchMock.mock.calls[0]
    expect(outboundCall[0]).toBe('https://pi-ceo.test/api/mesh/fleet')
    expect((outboundCall[1] as { headers: Record<string, string> }).headers['X-Pi-CEO-Secret']).toBe('super-secret-value')
  })
})
