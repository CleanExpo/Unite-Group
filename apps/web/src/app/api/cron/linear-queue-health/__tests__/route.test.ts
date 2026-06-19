import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/integrations/linear', () => ({
  fetchClaimCandidates: vi.fn(),
  fetchMostRecentClaimAt: vi.fn(),
}))
vi.mock('@/lib/command-centre/linear-claim', () => ({
  AUTONOMOUS_LABELS: ['mesh:auto', 'pi-dev:autonomous'],
}))
vi.mock('@/lib/command-centre/linear-queue-health', () => ({
  computeQueueHealth: vi.fn(),
  buildConfigReadiness: vi.fn(),
}))

import { fetchClaimCandidates, fetchMostRecentClaimAt } from '@/lib/integrations/linear'
import { computeQueueHealth, buildConfigReadiness } from '@/lib/command-centre/linear-queue-health'
import { GET } from '../route'

vi.stubEnv('CRON_SECRET', 'test-secret')

function req(auth = 'Bearer test-secret') {
  return new Request('https://app.test', { headers: { authorization: auth } })
}

describe('GET /api/cron/linear-queue-health', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when unauthorized', async () => {
    const res = await GET(req('bad'))
    expect(res.status).toBe(401)
  })

  it('returns health report', async () => {
    vi.mocked(buildConfigReadiness).mockReturnValue({ ready: false, cronSecret: true, founderId: true } as any)
    vi.mocked(computeQueueHealth).mockReturnValue({ status: 'idle', candidateCount: 0 } as any)

    const res = await GET(req())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.status).toBe('idle')
  })

  it('returns 500 when fetchClaimCandidates throws', async () => {
    vi.mocked(buildConfigReadiness).mockReturnValue({ ready: true } as any)
    vi.mocked(fetchClaimCandidates).mockRejectedValue(new Error('Linear API down'))

    const res = await GET(req())
    expect(res.status).toBe(500)
  })
})
