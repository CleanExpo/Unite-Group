import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  getUser: vi.fn(),
  createClient: vi.fn(),
}))

import { getUser, createClient } from '@/lib/supabase/server'
import { GET } from '../route'

type Row = Record<string, unknown>

// Per-table mock: `.from(table).select(...).eq('founder_id', id)` resolves to {data,error}.
// `.eq` is the terminal awaited call, so it returns the promise. Records eq calls.
function makeSupabase(
  vault: Row[],
  social: Row[],
  opts: { vaultError?: boolean; socialError?: boolean } = {}
) {
  const eqCalls: Array<[string, unknown]> = []
  const from = vi.fn((table: string) => {
    const result =
      table === 'credentials_vault'
        ? opts.vaultError
          ? { data: null, error: new Error('vault boom') }
          : { data: vault, error: null }
        : opts.socialError
          ? { data: null, error: new Error('social boom') }
          : { data: social, error: null }

    const chain: Record<string, unknown> = {}
    chain.select = vi.fn(() => chain)
    chain.eq = vi.fn((col: string, val: unknown) => {
      eqCalls.push([col, val])
      return Promise.resolve(result)
    })
    return chain
  })
  return { client: { from } as never, eqCalls }
}

describe('GET /api/integrations/status', () => {
  const savedEnv = { ...process.env }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getUser).mockResolvedValue({ id: 'user-123' } as never)
    // The GitHub row now performs a real read. Never let an ambient token turn
    // these tests into a live call to api.github.com.
    vi.stubEnv('GITHUB_TOKEN', '')
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockRejectedValue(new Error('network disabled in tests')))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    process.env = { ...savedEnv }
  })

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null as never)
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('founder-scopes both reads and derives connection state per source', async () => {
    process.env.LINEAR_API_KEY = 'lin_test_key'
    delete process.env.SENDGRID_API_KEY

    const { client, eqCalls } = makeSupabase(
      [{ service: 'xero', created_at: '2026-05-01T00:00:00Z', updated_at: '2026-05-02T00:00:00Z', last_accessed_at: null }],
      [{ platform: 'linkedin', is_connected: true, updated_at: '2026-05-03T00:00:00Z' }]
    )
    vi.mocked(createClient).mockResolvedValue(client)

    const res = await GET()
    expect(res.status).toBe(200)

    expect(eqCalls).toEqual([
      ['founder_id', 'user-123'],
      ['founder_id', 'user-123'],
    ])

    const body = await res.json()
    const by = (id: string) => body.providers.find((p: { id: string }) => p.id === id)

    // vault: xero has a row → connected, tokenCount 1, lastSync = newest of updated/created
    expect(by('xero').connected).toBe(true)
    expect(by('xero').tokenCount).toBe(1)
    expect(by('xero').lastSync).toBe('2026-05-02T00:00:00Z')

    // vault: gmail (service 'google') has no row → disconnected
    expect(by('gmail').connected).toBe(false)

    // social: linkedin connected (lastSync from updated_at — canonical schema has no last_post_at); facebook not
    expect(by('linkedin').connected).toBe(true)
    expect(by('linkedin').lastSync).toBe('2026-05-03T00:00:00Z')
    expect(by('facebook').connected).toBe(false)

    // env: linear key present → connected/configured; sendgrid absent → not
    expect(by('linear').connected).toBe(true)
    expect(by('linear').configured).toBe(true)
    expect(by('sendgrid').connected).toBe(false)

    expect(body.summary.total).toBe(body.providers.length)
    expect(body.summary.connected).toBeGreaterThanOrEqual(3) // xero + linkedin + linear
  })

  it('HeyGen (env source): connected/configured when HEYGEN_API_KEY present, not otherwise', async () => {
    process.env.HEYGEN_API_KEY = 'heygen_test_key'

    const { client } = makeSupabase([], [])
    vi.mocked(createClient).mockResolvedValue(client)

    const res = await GET()
    const body = await res.json()
    const heygen = body.providers.find((p: { id: string }) => p.id === 'heygen')

    expect(heygen.connected).toBe(true)
    expect(heygen.configured).toBe(true)
  })

  it('HeyGen (env source): not connected when HEYGEN_API_KEY absent', async () => {
    delete process.env.HEYGEN_API_KEY

    const { client } = makeSupabase([], [])
    vi.mocked(createClient).mockResolvedValue(client)

    const res = await GET()
    const body = await res.json()
    const heygen = body.providers.find((p: { id: string }) => p.id === 'heygen')

    expect(heygen.connected).toBe(false)
    expect(heygen.configured).toBe(false)
  })

  it('reports manual media providers honestly until their worker connection exists', async () => {
    const { client } = makeSupabase([], [])
    vi.mocked(createClient).mockResolvedValue(client)

    const res = await GET()
    const body = await res.json()
    const by = (id: string) => body.providers.find((p: { id: string }) => p.id === id)

    expect(by('higgsfield')).toMatchObject({ configured: false, connected: false })
    expect(by('notebooklm')).toMatchObject({ configured: false, connected: false })
    expect(by('higgsfield').note).toContain('MCP')
  })

  it('Telegram (env source): connected/configured when bot token + chat id present', async () => {
    process.env.TELEGRAM_BOT_TOKEN = 'bot-token'
    process.env.TELEGRAM_CHAT_ID = 'chat-id'

    const { client } = makeSupabase([], [])
    vi.mocked(createClient).mockResolvedValue(client)

    const res = await GET()
    const body = await res.json()
    const telegram = body.providers.find((p: { id: string }) => p.id === 'telegram')

    expect(telegram.connected).toBe(true)
    expect(telegram.configured).toBe(true)
  })

  it('Telegram (env source): not connected when either key is missing', async () => {
    process.env.TELEGRAM_BOT_TOKEN = 'bot-token'
    delete process.env.TELEGRAM_CHAT_ID

    const { client } = makeSupabase([], [])
    vi.mocked(createClient).mockResolvedValue(client)

    const res = await GET()
    const body = await res.json()
    const telegram = body.providers.find((p: { id: string }) => p.id === 'telegram')

    expect(telegram.connected).toBe(false)
    expect(telegram.configured).toBe(false)
  })

  it('Outlook (vault source): reports not_connected honestly when Microsoft OAuth is unconfigured and no vault row exists', async () => {
    delete process.env.MICROSOFT_CLIENT_ID
    delete process.env.MICROSOFT_CLIENT_SECRET

    const { client } = makeSupabase([], [])
    vi.mocked(createClient).mockResolvedValue(client)

    const res = await GET()
    const body = await res.json()
    const outlook = body.providers.find((p: { id: string }) => p.id === 'outlook')

    expect(outlook.configured).toBe(false)
    expect(outlook.connected).toBe(false)
    expect(outlook.tokenCount).toBe(0)
  })

  it('Outlook (vault source): connected when a credentials_vault row exists for service "microsoft", independent of env presence', async () => {
    delete process.env.MICROSOFT_CLIENT_ID
    delete process.env.MICROSOFT_CLIENT_SECRET

    const { client } = makeSupabase(
      [{ service: 'microsoft', created_at: '2026-05-01T00:00:00Z', updated_at: '2026-05-02T00:00:00Z', last_accessed_at: null }],
      []
    )
    vi.mocked(createClient).mockResolvedValue(client)

    const res = await GET()
    const body = await res.json()
    const outlook = body.providers.find((p: { id: string }) => p.id === 'outlook')

    expect(outlook.connected).toBe(true)
    expect(outlook.tokenCount).toBe(1)
    expect(outlook.configured).toBe(false)
  })

  it('returns 500 when a read errors', async () => {
    const { client } = makeSupabase([], [], { vaultError: true })
    vi.mocked(createClient).mockResolvedValue(client)

    const res = await GET()
    expect(res.status).toBe(500)
  })

  // T2 (2026-09-25). The GitHub token was rejected for ~20 days while this row
  // said connected, because `connected` was env presence. It must now come from
  // ONE real repository read (per_page=1). fetch is stubbed rather than the
  // helper mocked, so the real status mapping in delivery-repositories.ts runs.
  describe('GitHub row is a real read, never env presence', () => {
    async function githubRow() {
      const { client } = makeSupabase([], [])
      vi.mocked(createClient).mockResolvedValue(client)
      const res = await GET()
      expect(res.status).toBe(200)
      const body = await res.json()
      return body.providers.find((p: { id: string }) => p.id === 'github')
    }

    it('connected after GitHub answers 200, using one per_page=1 read', async () => {
      vi.stubEnv('GITHUB_TOKEN', 'test-only-token')
      const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
        new Response(JSON.stringify([{ full_name: 'Owner/Repo', private: true, archived: false }]), { status: 200 }),
      )
      vi.stubGlobal('fetch', fetchMock)

      const row = await githubRow()

      expect(row.status).toBe('connected')
      expect(row.connected).toBe(true)
      expect(fetchMock).toHaveBeenCalledTimes(1)
      const url = new URL(String(fetchMock.mock.calls[0][0]))
      expect(url.pathname).toBe('/user/repos')
      expect(url.searchParams.get('per_page')).toBe('1')
    })

    it('auth_error, not connected, when GitHub rejects the token with 401', async () => {
      vi.stubEnv('GITHUB_TOKEN', 'test-only-token')
      vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(new Response('{"message":"Bad credentials"}', { status: 401 })))

      const row = await githubRow()

      expect(row.status).toBe('auth_error')
      expect(row.connected).toBe(false)
      expect(row.configured).toBe(true) // the token IS present; it just does not work
      expect(row.statusMessage).toMatch(/cannot read repositories/)
    })

    it('not_configured and no GitHub call when no token is set', async () => {
      const fetchMock = vi.fn<typeof fetch>()
      vi.stubGlobal('fetch', fetchMock)

      const row = await githubRow()

      expect(row.status).toBe('not_configured')
      expect(row.connected).toBe(false)
      expect(fetchMock).not.toHaveBeenCalled()
    })

    it('unverified, never connected, when the read cannot complete', async () => {
      vi.stubEnv('GITHUB_TOKEN', 'test-only-token')
      vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockRejectedValue(new TypeError('fetch failed')))

      const row = await githubRow()

      expect(row.status).toBe('unverified')
      expect(row.connected).toBe(false)
      expect(row.statusMessage).toBeTruthy()
    })
  })
})
