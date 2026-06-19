import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/coaches/runner', () => ({ runCoach: vi.fn() }))
vi.mock('@/lib/coaches/revenue', () => ({ fetchRevenueData: vi.fn() }))
vi.mock('@/lib/coaches/prompts/revenue', () => ({
  REVENUE_COACH_SYSTEM_PROMPT: 'system',
  buildRevenueUserMessage: vi.fn().mockReturnValue('msg'),
}))
vi.mock('@/lib/notifications', () => ({ notify: vi.fn().mockResolvedValue(undefined) }))

import { runCoach } from '@/lib/coaches/runner'
import { GET } from '../route'

vi.stubEnv('CRON_SECRET', 'test-secret')
vi.stubEnv('FOUNDER_USER_ID', 'founder-1')

function req(auth = 'Bearer test-secret') {
  return new Request('https://app.test', { headers: { authorization: auth } })
}

describe('GET /api/cron/coaches/revenue', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when CRON_SECRET does not match', async () => {
    const res = await GET(req('Bearer wrong'))
    expect(res.status).toBe(401)
  })

  it('returns success response', async () => {
    vi.mocked(runCoach).mockResolvedValue({
      status: 'completed', reportId: 'r-1', inputTokens: 100, outputTokens: 50, error: null,
    } as any)

    const res = await GET(req())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.reportId).toBe('r-1')
  })

  it('returns 500 when runCoach throws', async () => {
    vi.mocked(runCoach).mockRejectedValue(new Error('AI failure'))

    const res = await GET(req())
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.success).toBe(false)
  })
})
