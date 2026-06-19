import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('@/lib/supabase/service', () => ({ createServiceClient: vi.fn() }))
vi.mock('@/lib/businesses', () => ({
  BUSINESSES: [{ key: 'dr', name: 'Disaster Recovery', color: '#ff0000' }],
}))

import { getUser } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { GET, PUT } from '../route'

let mockMaybeSingleResult: any = { data: null, error: null }
let mockSingleResult: any = { data: null, error: null }

function makeChain() {
  const b: Record<string, any> = {
    select: vi.fn(),
    update: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn(),
    single: vi.fn(),
  }
  b.select.mockReturnValue(b)
  b.update.mockReturnValue(b)
  b.eq.mockReturnValue(b)
  // Use mockImplementation so the variable is read at call time, not at setup time
  b.maybeSingle.mockImplementation(() => Promise.resolve(mockMaybeSingleResult))
  b.single.mockImplementation(() => Promise.resolve(mockSingleResult))
  return b
}

const ctx = (businessKey: string) => ({ params: Promise.resolve({ businessKey }) })

function putReq(businessKey: string, body: object) {
  return new NextRequest(`https://app.test/api/social/personas/${businessKey}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('GET /api/social/personas/[businessKey]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockMaybeSingleResult = { data: null, error: null }
    vi.mocked(createServiceClient).mockReturnValue({ from: vi.fn().mockReturnValue(makeChain()) } as any)
  })

  it('returns 401 when unauthorized', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await GET(new Request('https://app.test/'), ctx('dr'))
    expect(res.status).toBe(401)
  })

  it('returns 500 on DB error', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    mockMaybeSingleResult = { data: null, error: { message: 'db error' } }
    const res = await GET(new Request('https://app.test/'), ctx('dr'))
    expect(res.status).toBe(500)
  })

  it('returns 404 when persona not found', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    mockMaybeSingleResult = { data: null, error: null }
    const res = await GET(new Request('https://app.test/'), ctx('dr'))
    expect(res.status).toBe(404)
  })

  it('returns 200 with persona on success', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    mockMaybeSingleResult = {
      data: {
        id: 'bi-1', founder_id: 'user-1', business_key: 'dr',
        tone_of_voice: 'professional', target_audience: 'SMEs',
        industry_keywords: [], unique_selling_points: [],
        character_male: {}, character_female: {},
        colour_primary: null, colour_secondary: null,
        do_list: [], dont_list: [], sample_content: {},
        created_at: '2026-01-01', updated_at: '2026-01-01',
      },
      error: null,
    }
    const res = await GET(new Request('https://app.test/'), ctx('dr'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.persona.businessKey).toBe('dr')
    expect(body.persona.businessName).toBe('Disaster Recovery')
  })
})

describe('PUT /api/social/personas/[businessKey]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSingleResult = { data: null, error: null }
    vi.mocked(createServiceClient).mockReturnValue({ from: vi.fn().mockReturnValue(makeChain()) } as any)
  })

  it('returns 401 when unauthorized', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await PUT(putReq('dr', { toneOfVoice: 'friendly' }), ctx('dr'))
    expect(res.status).toBe(401)
  })

  it('returns 400 when businessKey invalid', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const res = await PUT(putReq('unknown', { toneOfVoice: 'friendly' }), ctx('unknown'))
    expect(res.status).toBe(400)
  })

  it('returns 200 with updated persona', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    mockSingleResult = {
      data: {
        id: 'bi-1', founder_id: 'user-1', business_key: 'dr',
        tone_of_voice: 'friendly', target_audience: 'SMEs',
        industry_keywords: [], unique_selling_points: [],
        character_male: {}, character_female: {},
        colour_primary: null, colour_secondary: null,
        do_list: [], dont_list: [], sample_content: {},
        created_at: '2026-01-01', updated_at: '2026-06-01',
      },
      error: null,
    }
    const res = await PUT(putReq('dr', { toneOfVoice: 'friendly' }), ctx('dr'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.persona.toneOfVoice).toBe('friendly')
  })
})
