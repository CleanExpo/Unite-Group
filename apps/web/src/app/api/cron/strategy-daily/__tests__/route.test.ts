import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/strategy/daily-analysis', () => ({ runDailyAnalysis: vi.fn() }))
vi.mock('@/lib/supabase/service', () => ({ createServiceClient: vi.fn() }))
vi.mock('@/lib/ai/capabilities', () => ({ registerAllCapabilities: vi.fn() }))
vi.mock('@/lib/ai/router', () => ({ execute: vi.fn() }))

import { runDailyAnalysis } from '@/lib/strategy/daily-analysis'
import { GET } from '../route'

vi.stubEnv('CRON_SECRET', 'test-secret')
vi.stubEnv('FOUNDER_USER_ID', 'founder-1')

function req(qs = '', auth = 'Bearer test-secret') {
  return new Request(`https://app.test/api/cron/strategy-daily${qs}`, {
    headers: { authorization: auth },
  })
}

describe('GET /api/cron/strategy-daily', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when unauthorized', async () => {
    const res = await GET(req('', 'bad'))
    expect(res.status).toBe(401)
  })

  it('returns 400 when business key is invalid', async () => {
    const res = await GET(req('?business=unknown'))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/business/)
  })

  it('returns success with insightsSaved=0 when no insights returned', async () => {
    vi.mocked(runDailyAnalysis).mockResolvedValue([] as any)

    const res = await GET(req('?business=dr'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.insightsSaved).toBe(0)
  })
})
