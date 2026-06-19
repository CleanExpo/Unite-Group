import { describe, it, expect, vi, beforeEach } from 'vitest'

let chainResolve: any = { data: [], error: null }

function makeChain() {
  const b: Record<string, any> = {
    select: vi.fn(), eq: vi.fn(), order: vi.fn(), limit: vi.fn(),
    then(onFulfilled: any, onRejected: any) {
      return Promise.resolve(chainResolve).then(onFulfilled, onRejected)
    },
  }
  b.select.mockReturnValue(b); b.eq.mockReturnValue(b)
  b.order.mockReturnValue(b); b.limit.mockReturnValue(b)
  return b
}

const mockFrom = vi.fn()
vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('@/lib/supabase/service', () => ({ createServiceClient: vi.fn() }))
vi.mock('@/lib/experiments/generator', () => ({
  generateExperiment: vi.fn().mockResolvedValue({
    title: 'Test Experiment',
    hypothesis: 'If we do X then Y',
    experimentType: 'content',
    metricPrimary: 'engagement',
    metricSecondary: null,
    sampleSizeTarget: 500,
    confidenceLevel: 0.95,
    aiRationale: 'This test variant should improve results.',
    variants: [],
  }),
}))

import { getUser } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { POST } from '../route'

function req(body: object) {
  return new Request('https://app.test/api/experiments/generate', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  })
}

describe('POST /api/experiments/generate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    chainResolve = { data: [], error: null }
    mockFrom.mockReturnValue(makeChain())
    vi.mocked(createServiceClient).mockReturnValue({ from: mockFrom } as any)
  })

  it('returns 401 when unauthorized', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await POST(req({ businessKey: 'dr' }))
    expect(res.status).toBe(401)
  })

  it('returns 400 when businessKey missing', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const res = await POST(req({}))
    expect(res.status).toBe(400)
  })

  it('returns 400 for unknown businessKey', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const res = await POST(req({ businessKey: 'unknown' }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/Unknown businessKey/)
  })

  it('returns generated experiment on success', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const res = await POST(req({ businessKey: 'dr' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.experiment.title).toBe('Test Experiment')
  })
})
