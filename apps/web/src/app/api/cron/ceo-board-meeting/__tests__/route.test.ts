import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/service', () => ({ createServiceClient: vi.fn() }))
vi.mock('@/lib/ceo-board/daily-briefing', () => ({ runDailyBriefing: vi.fn() }))
vi.mock('@/lib/integrations/github-board', () => ({
  fetchOrgRepos: vi.fn().mockResolvedValue([]),
  fetchRecentCommits: vi.fn().mockResolvedValue([]),
  fetchOpenPRs: vi.fn().mockResolvedValue([]),
  isGitHubBoardConfigured: vi.fn().mockReturnValue(false),
}))
vi.mock('@/lib/integrations/linear-board', () => ({
  fetchRecentlyCompletedIssues: vi.fn().mockResolvedValue([]),
  fetchInFlightIssues: vi.fn().mockResolvedValue([]),
  fetchIssuesWithDueDates: vi.fn().mockResolvedValue([]),
}))
vi.mock('@/lib/integrations/xero', () => ({ fetchRevenueMTD: vi.fn().mockResolvedValue([]) }))
vi.mock('@/lib/notifications', () => ({ notify: vi.fn().mockResolvedValue(undefined) }))

import { createServiceClient } from '@/lib/supabase/service'
import { runDailyBriefing } from '@/lib/ceo-board/daily-briefing'
import { GET } from '../route'

vi.stubEnv('CRON_SECRET', 'test-secret')
vi.stubEnv('FOUNDER_USER_ID', 'founder-1')

function req(auth = 'Bearer test-secret') {
  return new Request('https://app.test', { headers: { authorization: auth } })
}

const mockSingle = vi.fn()
function makeChain() {
  const b: Record<string, any> = {
    select: vi.fn(), eq: vi.fn(), gte: vi.fn(), order: vi.fn(), limit: vi.fn(),
    in: vi.fn(), neq: vi.fn(), upsert: vi.fn(),
    then(onFulfilled: any, onRejected: any) {
      return Promise.resolve({ data: [], error: null }).then(onFulfilled, onRejected)
    },
  }
  b.select.mockReturnValue(b); b.eq.mockReturnValue(b); b.gte.mockReturnValue(b)
  b.order.mockReturnValue(b); b.limit.mockReturnValue(b)
  b.in.mockReturnValue(b); b.neq.mockReturnValue(b); b.upsert.mockReturnValue(b)
  ;(b as any).single = mockSingle
  return b
}

describe('GET /api/cron/ceo-board-meeting', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(createServiceClient).mockReturnValue({ from: vi.fn().mockReturnValue(makeChain()) } as any)
  })

  it('returns 401 when unauthorized', async () => {
    const res = await GET(req('bad'))
    expect(res.status).toBe(401)
  })

  it('runs daily briefing and returns success', async () => {
    vi.mocked(runDailyBriefing).mockResolvedValue({ briefingId: 'br-1', agenda: [], brief_md: '', decisionsRequired: [] } as any)
    mockSingle.mockResolvedValue({ data: null, error: null })

    const res = await GET(req())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })

  it('returns 500 when runDailyBriefing throws', async () => {
    vi.mocked(runDailyBriefing).mockRejectedValue(new Error('briefing failed'))
    mockSingle.mockResolvedValue({ data: null, error: null })

    const res = await GET(req())
    expect(res.status).toBe(500)
  })
})
