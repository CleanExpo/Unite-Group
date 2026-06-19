import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/integrations/linear-monitor', () => ({ checkSynthexProgress: vi.fn() }))

import { checkSynthexProgress } from '@/lib/integrations/linear-monitor'
import { GET } from '../route'

vi.stubEnv('CRON_SECRET', 'test-secret')

function req(auth = 'Bearer test-secret') {
  return new Request('https://app.test', { headers: { authorization: auth } })
}

describe('GET /api/cron/synthex-monitor', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when unauthorized', async () => {
    const res = await GET(req('bad'))
    expect(res.status).toBe(401)
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
