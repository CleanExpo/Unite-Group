import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('@/lib/integrations/linear', () => ({ fetchIssueCountByBusiness: vi.fn() }))

import { getUser } from '@/lib/supabase/server'
import { fetchIssueCountByBusiness } from '@/lib/integrations/linear'
import { GET } from '../route'

function req(qs = '') {
  return new Request(`https://app.test/api/linear/kpi${qs}`)
}

describe('GET /api/linear/kpi', () => {
  // resetAllMocks, not clearAllMocks: clearing wipes call history but LEAVES an
  // implementation set by mockRejectedValue in place, so the failure state
  // configured by the unavailable test below would leak into its neighbours.
  beforeEach(() => vi.resetAllMocks())
  // A stubbed LINEAR_API_KEY surviving a test would silently turn the
  // missing-key case into the configured one, and it would still pass.
  afterEach(() => vi.unstubAllEnvs())

  it('returns 401 when unauthorized', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await GET(req())
    expect(res.status).toBe(401)
  })

  // CONTROL. This replaces an assertion of `activeCount === 0` for the
  // unconfigured case, which pinned the defect as correct: an integration that
  // was never read reported as a successfully-read zero, which KPICard rendered
  // as "0 active issues" beside live revenue. [UNI-2485]
  it('omits the count when LINEAR_API_KEY is missing — absent, not zero', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    // The key MUST be stubbed empty. This environment has a real
    // LINEAR_API_KEY, so the original version of this test never reached the
    // missing-key branch at all — it fell through to the catch, which returned
    // the identical `{ activeCount: 0, configured: false }`. It passed for the
    // wrong reason, and only the defect made the two branches interchangeable.
    vi.stubEnv('LINEAR_API_KEY', '')
    const res = await GET(req('?business=dr'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.configured).toBe(false)
    // Absent is UNKNOWN. Zero is a claim about the queue nobody read.
    expect(body.activeCount).toBeUndefined()
    // Not configured is an expected degrade, not a failed read.
    expect(body.unavailable).toBeUndefined()
  })

  it('reports a thrown Linear read as unavailable — never a successful zero', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    vi.stubEnv('LINEAR_API_KEY', 'lin_key')
    vi.mocked(fetchIssueCountByBusiness).mockRejectedValue(
      new Error('LINEAR_API_KEY is not configured — issue counts are unavailable, not zero'),
    )

    const res = await GET(req('?business=dr'))

    // The status line carries the verdict — `res.ok` is what KPICard branches
    // on, the same rule /api/dashboard/kpi follows.
    expect(res.status).toBe(500)
    expect(res.ok).toBe(false)

    const body = await res.json()
    expect(body.unavailable).toBe(true)
    expect(body.activeCount).toBeUndefined()
    expect(body.error).toBe('Failed to load Linear issue counts')
    // Sanitised: the raw upstream message never reaches the client.
    expect(body.error).not.toMatch(/LINEAR_API_KEY/)
    expect(errorSpy).toHaveBeenCalled()
    errorSpy.mockRestore()
  })

  it('returns count for business when configured', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    vi.stubEnv('LINEAR_API_KEY', 'lin_key')
    vi.mocked(fetchIssueCountByBusiness).mockResolvedValue({ dr: 5 } as any)
    const res = await GET(req('?business=dr'))
    const body = await res.json()
    expect(body.configured).toBe(true)
    expect(body.activeCount).toBe(5)
    // NEGATIVE CONTROL: a healthy read carries no failure signal. Without it, a
    // route that marked everything unavailable would satisfy the two failure
    // tests above while breaking every working dashboard.
    expect(body.unavailable).toBeUndefined()
    expect(body.error).toBeUndefined()
  })
})
