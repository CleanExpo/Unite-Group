import { describe, it, expect, vi, beforeEach } from 'vitest'

// Step 5 / F4 — re-judge a case stranded at status='judged' by re-running ONLY
// the Judge phase. Thin route: auth → delegate to reJudgeCase → broadcast → 200.
const mockChannelSend = vi.fn().mockResolvedValue(undefined)
const mockRemoveChannel = vi.fn()
const mockChannel = {
  subscribe: vi.fn((cb) => { cb('SUBSCRIBED') }),
  send: mockChannelSend,
}
const mockServiceClient = {
  channel: vi.fn().mockReturnValue(mockChannel),
  removeChannel: mockRemoveChannel,
}

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('@/lib/supabase/service', () => ({ createServiceClient: vi.fn() }))

const mockReJudgeCase = vi.fn(() => (async function* () {})())
vi.mock('@/lib/advisory/debate-engine', () => ({
  reJudgeCase: (...a: unknown[]) => mockReJudgeCase(...a),
}))

import { getUser } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { POST } from '../route'

const params = Promise.resolve({ id: 'case-1' })

describe('POST /api/advisory/cases/[id]/re-judge', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(createServiceClient).mockReturnValue(mockServiceClient as never)
    mockReJudgeCase.mockImplementation(() => (async function* () {})())
  })

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await POST(new Request('https://app.test') as never, { params })
    expect(res.status).toBe(401)
    expect(mockReJudgeCase).not.toHaveBeenCalled()
  })

  it('returns 200 and re-runs only the judge phase, scoped to the founder', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as never)

    const res = await POST(new Request('https://app.test') as never, { params })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.caseId).toBe('case-1')
    expect(mockReJudgeCase).toHaveBeenCalledTimes(1)
    expect(mockReJudgeCase).toHaveBeenCalledWith('case-1', 'user-1')
  })
})
