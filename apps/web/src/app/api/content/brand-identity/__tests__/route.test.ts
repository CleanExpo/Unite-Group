import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockSingle = vi.fn()

function makeChain() {
  const b: Record<string, any> = {
    select: vi.fn(),
    upsert: vi.fn(),
    eq: vi.fn(),
  }
  b.select.mockReturnValue(b)
  b.upsert.mockReturnValue(b)
  b.eq.mockReturnValue(b)
  ;(b as any).single = mockSingle
  return b
}

const mockFrom = vi.fn()
const mockServiceClient = { from: mockFrom }

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: vi.fn(),
}))

import { getUser } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { GET, PUT } from '../route'

describe('GET /api/content/brand-identity', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFrom.mockReturnValue(makeChain())
    vi.mocked(createServiceClient).mockReturnValue(mockServiceClient as any)
  })

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await GET(new Request('https://app.test/api/content/brand-identity?business=dr'))
    expect(res.status).toBe(401)
  })

  it('returns 422 when business param is missing', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const res = await GET(new Request('https://app.test/api/content/brand-identity'))
    expect(res.status).toBe(422)
    const body = await res.json()
    expect(body.error).toMatch(/business/)
  })

  it('returns 404 when brand identity not found', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    mockSingle.mockResolvedValue({ data: null, error: { message: 'not found' } })

    const res = await GET(new Request('https://app.test/api/content/brand-identity?business=dr'))
    expect(res.status).toBe(404)
  })

  it('returns brand identity', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    mockSingle.mockResolvedValue({ data: { id: 'bi-1', business_key: 'dr' }, error: null })

    const res = await GET(new Request('https://app.test/api/content/brand-identity?business=dr'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.brandIdentity.business_key).toBe('dr')
  })
})

describe('PUT /api/content/brand-identity', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFrom.mockReturnValue(makeChain())
    vi.mocked(createServiceClient).mockReturnValue(mockServiceClient as any)
  })

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await PUT(new Request('https://app.test', {
      method: 'PUT',
      body: JSON.stringify({ business_key: 'dr' }),
    }))
    expect(res.status).toBe(401)
  })

  it('returns 422 when business_key is missing', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const res = await PUT(new Request('https://app.test', {
      method: 'PUT',
      body: JSON.stringify({ tone_of_voice: 'professional' }),
    }))
    expect(res.status).toBe(422)
  })

  it('upserts brand identity and returns it', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    mockSingle.mockResolvedValue({ data: { id: 'bi-1', business_key: 'dr' }, error: null })

    const res = await PUT(new Request('https://app.test', {
      method: 'PUT',
      body: JSON.stringify({ business_key: 'dr', tone_of_voice: 'professional' }),
    }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.brandIdentity.business_key).toBe('dr')
  })
})
