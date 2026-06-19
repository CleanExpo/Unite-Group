import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('@/lib/campaigns/orchestrator', () => ({
  generateCampaign: vi.fn().mockResolvedValue({ success: true, posts: [] }),
}))

import { getUser } from '@/lib/supabase/server'
import { generateCampaign } from '@/lib/campaigns/orchestrator'
import { POST } from '../route'

const params = { params: Promise.resolve({ id: 'camp-1' }) }

function req() {
  return new Request('https://app.test/api/campaigns/camp-1/generate', { method: 'POST' })
}

describe('POST /api/campaigns/[id]/generate', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when unauthorized', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await POST(req(), params)
    expect(res.status).toBe(401)
  })

  it('returns 500 when generation fails', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    vi.mocked(generateCampaign).mockRejectedValue(new Error('AI error'))
    const res = await POST(req(), params)
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBe('AI error')
  })

  it('returns 200 with generation result', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    vi.mocked(generateCampaign).mockResolvedValue({ success: true, posts: [{ id: 'p1' }] } as any)
    const res = await POST(req(), params)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })
})
