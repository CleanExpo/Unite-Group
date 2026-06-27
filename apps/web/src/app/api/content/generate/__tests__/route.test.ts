import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockBrandSingle = vi.fn()
const mockInsertSingle = vi.fn()

function makeBrandChain() {
  const b: Record<string, any> = {
    select: vi.fn(),
    eq: vi.fn(),
  }
  b.select.mockReturnValue(b)
  b.eq.mockReturnValue(b)
  ;(b as any).single = mockBrandSingle
  return b
}

function makeInsertChain() {
  const b: Record<string, any> = {
    insert: vi.fn(),
    select: vi.fn(),
  }
  b.insert.mockReturnValue(b)
  b.select.mockReturnValue(b)
  ;(b as any).single = mockInsertSingle
  return b
}

const mockFromImpl = vi.fn()
const mockServiceClient = { from: mockFromImpl }

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: vi.fn(),
}))
vi.mock('@/lib/content/generator', () => ({
  generateContent: vi.fn(),
}))

import { getUser } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { generateContent } from '@/lib/content/generator'
import { POST } from '../route'

const brand = {
  id: 'bi-1',
  founder_id: 'user-1',
  business_key: 'dr',
  tone_of_voice: 'professional',
  target_audience: 'SMBs',
  industry_keywords: ['restoration'],
  unique_selling_points: ['fast response'],
  character_male: { name: 'Bob', persona: 'Expert', avatarUrl: null, voiceStyle: 'formal' },
  character_female: { name: 'Alice', persona: 'Advisor', avatarUrl: null, voiceStyle: 'warm' },
  colour_primary: '#ef4444',
  colour_secondary: '#ffffff',
  do_list: ['be helpful'],
  dont_list: ['be aggressive'],
  sample_content: {},
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
}

const contentResult = {
  platform: 'instagram',
  title: 'Summer post',
  body: 'Check out our summer deals!',
  mediaPrompt: 'Sunny image',
  hashtags: ['#summer'],
  cta: 'Learn more',
  characterUsed: 'Bob',
}

function postReq(body: object) {
  return new Request('https://app.test/api/content/generate', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

describe('POST /api/content/generate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(createServiceClient).mockReturnValue(mockServiceClient as any)
    let callCount = 0
    mockFromImpl.mockImplementation(() => {
      callCount++
      if (callCount === 1) return makeBrandChain()
      return makeInsertChain()
    })
  })

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await POST(postReq({ businessKey: 'dr', contentType: 'social' }))
    expect(res.status).toBe(401)
  })

  it('returns 422 when businessKey or contentType missing', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const res = await POST(postReq({ businessKey: 'dr' }))
    expect(res.status).toBe(422)
    const body = await res.json()
    expect(body.error).toMatch(/businessKey/)
  })

  it('returns 404 when brand identity not found', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    mockBrandSingle.mockResolvedValue({ data: null, error: { message: 'not found' } })

    const res = await POST(postReq({ businessKey: 'dr', contentType: 'social' }))
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toMatch(/brand identity/)
  })

  it('generates content and inserts rows', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    mockBrandSingle.mockResolvedValue({ data: brand, error: null })
    vi.mocked(generateContent).mockResolvedValue([contentResult] as any)
    mockInsertSingle.mockResolvedValue({ data: { id: 'gc-1' }, error: null })

    const res = await POST(postReq({ businessKey: 'dr', contentType: 'social' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.results).toHaveLength(1)
    expect(body.generatedContentIds).toContain('gc-1')
    expect(body.count).toBe(1)
  })

  it('returns 500 when generateContent throws', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    mockBrandSingle.mockResolvedValue({ data: brand, error: null })
    vi.mocked(generateContent).mockRejectedValue(new Error('AI down'))

    const res = await POST(postReq({ businessKey: 'dr', contentType: 'social' }))
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBe('Content generation failed') // sanitised — raw error not leaked
    expect(body.error).not.toContain('AI down')
  })
})
