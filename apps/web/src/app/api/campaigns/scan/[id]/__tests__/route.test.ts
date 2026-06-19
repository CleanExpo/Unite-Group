import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockSingle = vi.fn()
function makeChain() {
  const b: Record<string, any> = { select: vi.fn(), eq: vi.fn() }
  b.select.mockReturnValue(b); b.eq.mockReturnValue(b)
  b.single = mockSingle
  return b
}

const mockFrom = vi.fn()
vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('@/lib/supabase/service', () => ({ createServiceClient: vi.fn() }))

import { getUser } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { GET } from '../route'

const params = { params: Promise.resolve({ id: 'bp-1' }) }

function req() {
  return new Request('https://app.test/api/campaigns/scan/bp-1')
}

describe('GET /api/campaigns/scan/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSingle.mockResolvedValue({ data: null, error: { message: 'Not found' } })
    mockFrom.mockReturnValue(makeChain())
    vi.mocked(createServiceClient).mockReturnValue({ from: mockFrom } as any)
  })

  it('returns 401 when unauthorized', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await GET(req(), params)
    expect(res.status).toBe(401)
  })

  it('returns 404 when brand profile not found', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const res = await GET(req(), params)
    expect(res.status).toBe(404)
  })

  it('returns brand profile on success', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    mockSingle.mockResolvedValue({
      data: {
        id: 'bp-1', founder_id: 'user-1', business_key: 'dr', client_name: 'Test',
        website_url: 'https://test.com', logo_url: null, colours: null, fonts: null,
        tone_of_voice: 'professional', brand_values: [], tagline: null,
        target_audience: null, industry: null, imagery_style: null,
        reference_images: [], raw_scrape: {}, status: 'ready', scan_error: null,
        created_at: '2026-01-01', updated_at: '2026-01-01',
      }, error: null,
    })
    const res = await GET(req(), params)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.id).toBe('bp-1')
    expect(body.status).toBe('ready')
  })
})
