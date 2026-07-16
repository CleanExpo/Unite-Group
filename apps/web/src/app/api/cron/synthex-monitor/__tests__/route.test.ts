import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/lib/integrations/linear-monitor', () => ({ checkSynthexProgress: vi.fn() }))

import { checkSynthexProgress } from '@/lib/integrations/linear-monitor'
import { GET } from '../route'

function req(auth = 'Bearer test-secret') {
  return new Request('https://app.test', { headers: { authorization: auth } })
}

describe('GET /api/cron/synthex-monitor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.unstubAllEnvs()
    vi.stubEnv('CRON_SECRET', 'test-secret')
  })

  afterEach(() => vi.unstubAllEnvs())

  it('returns 401 when unauthorized', async () => {
    const res = await GET(req('bad'))
    expect(res.status).toBe(401)
  })

  it('fails closed when CRON_SECRET is unset and authorization is Bearer undefined', async () => {
    delete process.env.CRON_SECRET

    const res = await GET(req('Bearer undefined'))
    const body = await res.json()

    expect(res.status).toBe(500)
    expect(body.error).toBe('CRON_SECRET not configured')
    expect(checkSynthexProgress).not.toHaveBeenCalled()
  })

  it('returns ok with inReviewCount', async () => {
    vi.mocked(checkSynthexProgress).mockResolvedValue({ inReviewCount: 3 } as any)
    const res = await GET(req())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.status).toBe('ok')
    expect(body.inReviewCount).toBe(3)
  })

  it('returns 500 when checkSynthexProgress throws', async () => {
    vi.mocked(checkSynthexProgress).mockRejectedValue(new Error('Linear down'))
    const res = await GET(req())
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.status).toBe('error')
  })
})
