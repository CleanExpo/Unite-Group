import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('@/lib/integrations/xero', () => ({ isXeroConfigured: vi.fn().mockReturnValue(false) }))
vi.mock('@/lib/integrations/google-oauth', () => ({ isGoogleConfigured: vi.fn().mockReturnValue(false) }))

import { getUser } from '@/lib/supabase/server'
import { GET } from '../route'

// hasPrivateAccess is deliberately NOT mocked. It is the thing under test, and a
// control aimed at a mock of it would prove nothing — the defect this suite
// exists to catch was precisely that nothing enforced founder identity here. It
// reads the allow-list from process.env, so these tests configure that instead.
const FOUNDER = 'founder-1'
const INTRUDER = 'intruder-9'

describe('GET /api/health/connectors', () => {
  const saved = {
    ids: process.env.FOUNDER_ALLOWED_USER_IDS,
    emails: process.env.FOUNDER_ALLOWED_EMAILS,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // With NO allow-list configured, hasPrivateAccess fails OPEN outside
    // production for local-dev ergonomics — so an unconfigured environment would
    // make every assertion below vacuous. Configure it explicitly.
    process.env.FOUNDER_ALLOWED_USER_IDS = FOUNDER
    delete process.env.FOUNDER_ALLOWED_EMAILS
    // The GitHub row now performs a real read. Never let an ambient token turn
    // these identity tests into a live call to api.github.com.
    vi.stubEnv('GITHUB_TOKEN', '')
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockRejectedValue(new Error('network disabled in tests')))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    if (saved.ids === undefined) delete process.env.FOUNDER_ALLOWED_USER_IDS
    else process.env.FOUNDER_ALLOWED_USER_IDS = saved.ids
    if (saved.emails === undefined) delete process.env.FOUNDER_ALLOWED_EMAILS
    else process.env.FOUNDER_ALLOWED_EMAILS = saved.emails
  })

  it('returns 401 when unauthorized', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await GET()
    expect(res.status).toBe(401)
  })

  // The defect (UNI-2475). This route is exempt from the middleware's founder
  // gate — '/api/health' is in PUBLIC_PATHS and this is a segment-child of it —
  // so its only check was getUser(), which proves someone is logged in, not that
  // they are the founder. Its own header says "Auth: Founder-only (returns
  // sensitive status data)", and the body maps every integration and env var the
  // estate has configured.
  //
  // The previous version of this suite asserted 200 for `{ id: 'user-1' }` — an
  // arbitrary non-founder — pinning the defect as correct behaviour.
  it('returns 403 to an authenticated NON-founder, and leaks no connector data', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: INTRUDER, email: 'someone@example.com' } as never)

    const res = await GET()

    expect(res.status).toBe(403)
    const body = await res.json()
    // Not merely the status: the payload must not carry the estate's integration
    // map alongside a rejection.
    expect(body.connectors).toBeUndefined()
    expect(body.summary).toBeUndefined()
    expect(body.env).toBeUndefined()
  })

  // Negative control. Without this, a route that simply 403'd everyone would
  // satisfy the assertion above while breaking the founder's own dashboard.
  it('returns the connector list and summary to the allow-listed founder', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: FOUNDER, email: 'founder@example.com' } as never)

    const res = await GET()

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body.connectors)).toBe(true)
    expect(body.connectors.length).toBeGreaterThan(0)
    expect(typeof body.summary.total).toBe('number')
    expect(typeof body.summary.configured).toBe('number')
  })

  // Second negative control, on the identity axis rather than the allow/deny
  // axis: the allow-list must actually be consulted. A blanket 200 or a blanket
  // 403 could be made to satisfy one of the two tests above; neither can satisfy
  // this one, because it requires the two identities to differ.
  it('discriminates between the two identities rather than answering uniformly', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: FOUNDER, email: 'founder@example.com' } as never)
    const allowed = (await GET()).status

    vi.mocked(getUser).mockResolvedValue({ id: INTRUDER, email: 'someone@example.com' } as never)
    const denied = (await GET()).status

    expect(allowed).not.toBe(denied)
    expect(allowed).toBe(200)
    expect(denied).toBe(403)
  })
})

// T2 (2026-09-25). The GitHub token was rejected for ~20 days while the health
// surfaces still treated GitHub as fine, because the row came from env presence
// alone. The GitHub row must now come from ONE real repository read
// (per_page=1). fetch is stubbed rather than the helper mocked, so the real
// status mapping in delivery-repositories.ts runs under these tests.
describe('GET /api/health/connectors — GitHub row is a real read', () => {
  const fetchMock = vi.fn<typeof fetch>()
  const savedIds = process.env.FOUNDER_ALLOWED_USER_IDS

  beforeEach(() => {
    vi.clearAllMocks()
    process.env.FOUNDER_ALLOWED_USER_IDS = FOUNDER
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
    vi.mocked(getUser).mockResolvedValue({ id: FOUNDER, email: 'founder@example.com' } as never)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    if (savedIds === undefined) delete process.env.FOUNDER_ALLOWED_USER_IDS
    else process.env.FOUNDER_ALLOWED_USER_IDS = savedIds
  })

  async function githubRow() {
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    return body.connectors.find((c: { service: string }) => c.service === 'github')
  }

  it('reports connected only after GitHub answers 200, using one per_page=1 read', async () => {
    vi.stubEnv('GITHUB_TOKEN', 'test-only-token')
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify([{ full_name: 'Owner/Repo', private: true, archived: false }]), { status: 200 }),
    )

    const row = await githubRow()

    expect(row.status).toBe('connected')
    expect(row.oauthConnected).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const url = new URL(String(fetchMock.mock.calls[0][0]))
    expect(url.pathname).toBe('/user/repos')
    expect(url.searchParams.get('per_page')).toBe('1')
  })

  it('reports auth_error, not connected, when GitHub rejects the token with 401', async () => {
    vi.stubEnv('GITHUB_TOKEN', 'test-only-token')
    fetchMock.mockResolvedValue(new Response('{"message":"Bad credentials"}', { status: 401 }))

    const row = await githubRow()

    expect(row.status).toBe('auth_error')
    expect(row.oauthConnected).toBe(false)
    expect(row.configured).toBe(true) // the token IS present; it just does not work
    expect(row.lastError).toMatch(/cannot read repositories/)
  })

  it('reports not_configured and makes no GitHub call when no token is set', async () => {
    vi.stubEnv('GITHUB_TOKEN', '')

    const row = await githubRow()

    expect(row.status).toBe('not_configured')
    expect(row.oauthConnected).toBe(false)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('reports unverified, never connected, when the read cannot complete', async () => {
    vi.stubEnv('GITHUB_TOKEN', 'test-only-token')
    fetchMock.mockRejectedValue(new TypeError('fetch failed'))

    const row = await githubRow()

    expect(row.status).toBe('unverified')
    expect(row.oauthConnected).toBe(false)
    expect(row.lastError).toBeTruthy()
  })
})
