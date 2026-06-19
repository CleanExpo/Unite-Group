import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/coaches/runner', () => ({ runCoach: vi.fn() }))
vi.mock('@/lib/notifications', () => ({ notify: vi.fn().mockResolvedValue(undefined) }))
vi.mock('@/lib/coaches/marketing', () => ({ fetchMarketingData: vi.fn() }))
vi.mock('@/lib/coaches/prompts/marketing', () => ({
  MARKETING_COACH_SYSTEM_PROMPT: 'sys',
  buildMarketingUserMessage: vi.fn().mockReturnValue('msg'),
}))
import { runCoach } from '@/lib/coaches/runner'
import { GET } from '../route'
vi.stubEnv('CRON_SECRET', 'test-secret')
vi.stubEnv('FOUNDER_USER_ID', 'founder-1')
function req(auth = 'Bearer test-secret') { return new Request('https://app.test', { headers: { authorization: auth } }) }
describe('GET /api/cron/coaches/marketing', () => {
  beforeEach(() => vi.clearAllMocks())
  it('returns 401 when unauthorized', async () => { const res = await GET(req('bad')); expect(res.status).toBe(401) })
  it('returns success', async () => {
    vi.mocked(runCoach).mockResolvedValue({ status: 'completed', reportId: 'r-1', inputTokens: 10, outputTokens: 5, error: null } as any)
    const res = await GET(req()); expect(res.status).toBe(200)
    const body = await res.json(); expect(body.success).toBe(true)
  })
  it('returns 500 on error', async () => { vi.mocked(runCoach).mockRejectedValue(new Error('fail')); const res = await GET(req()); expect(res.status).toBe(500) })
})
