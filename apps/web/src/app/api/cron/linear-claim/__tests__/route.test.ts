import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/integrations/linear', () => ({
  fetchClaimCandidates: vi.fn(),
  resolveStateId: vi.fn(),
  updateIssueState: vi.fn(),
  addComment: vi.fn(),
}))
vi.mock('@/lib/command-centre/linear-claim', () => ({
  claimNextEligibleIssue: vi.fn(),
  AUTONOMOUS_LABELS: ['mesh:auto'],
}))

import { fetchClaimCandidates } from '@/lib/integrations/linear'
import { claimNextEligibleIssue } from '@/lib/command-centre/linear-claim'
import { GET } from '../route'

vi.stubEnv('CRON_SECRET', 'test-secret')

function req(auth = 'Bearer test-secret') {
  return new Request('https://app.test', { headers: { authorization: auth } })
}

describe('GET /api/cron/linear-claim', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when unauthorized', async () => {
    const res = await GET(req('bad'))
    expect(res.status).toBe(401)
  })

  it('returns ok when no candidates', async () => {
    vi.mocked(fetchClaimCandidates).mockResolvedValue({ issues: [] } as any)
    vi.mocked(claimNextEligibleIssue).mockReturnValue(null)

    const res = await GET(req())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
  })

  it('returns 500 when claim throws', async () => {
    vi.mocked(claimNextEligibleIssue).mockRejectedValue(new Error('Linear API error'))

    const res = await GET(req())
    expect(res.status).toBe(500)
  })
})
