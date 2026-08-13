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
  })

  afterEach(() => {
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
