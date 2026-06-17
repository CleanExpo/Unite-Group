import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('@/lib/supabase/service', () => ({ createServiceClient: vi.fn() }))

import { GET, POST } from '../route'
import { getUser } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

// Chainable Supabase builder: every method returns the builder, and the builder
// is awaitable, resolving to a per-test-settable { data, error }.
function makeBuilder() {
  const result: { data: unknown; error: unknown } = { data: [], error: null }
  const builder = {
    __result: result,
    from: vi.fn(() => builder),
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    order: vi.fn(() => builder),
    upsert: vi.fn(() => builder),
    single: vi.fn(() => Promise.resolve(result)),
    then: (resolve: (v: typeof result) => unknown) => Promise.resolve(result).then(resolve),
  }
  return builder
}

let builder: ReturnType<typeof makeBuilder>

function jsonRequest(body: unknown) {
  return new Request('https://app.test/api/social/personas', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  builder = makeBuilder()
  vi.mocked(createServiceClient).mockReturnValue(builder as never)
})

describe('GET /api/social/personas', () => {
  it('returns 401 when unauthenticated and never queries the service client', async () => {
    vi.mocked(getUser).mockResolvedValue(null as never)

    const res = await GET()
    expect(res.status).toBe(401)
    expect(createServiceClient).not.toHaveBeenCalled()
  })

  it('founder-scoped happy path: filters brand_identities by the session founder_id', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'founder-1' } as never)
    builder.__result.data = []
    builder.__result.error = null

    const res = await GET()
    expect(res.status).toBe(200)

    const json = (await res.json()) as { personas: unknown[] }
    expect(json.personas).toEqual([])

    expect(builder.from).toHaveBeenCalledWith('brand_identities')
    expect(builder.eq).toHaveBeenCalledWith('founder_id', 'founder-1')
  })
})

describe('POST /api/social/personas', () => {
  it('returns 401 when unauthenticated and never queries the service client', async () => {
    vi.mocked(getUser).mockResolvedValue(null as never)

    const res = await POST(jsonRequest({ businessKey: 'dr' }))
    expect(res.status).toBe(401)
    expect(createServiceClient).not.toHaveBeenCalled()
  })

  it('returns 400 when businessKey is missing', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'founder-1' } as never)

    const res = await POST(jsonRequest({}))
    expect(res.status).toBe(400)
    const json = (await res.json()) as { error: string }
    expect(json.error).toBe('businessKey is required')
    expect(createServiceClient).not.toHaveBeenCalled()
  })

  it('returns 400 when businessKey is not a known business', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'founder-1' } as never)

    const res = await POST(jsonRequest({ businessKey: 'not-a-real-business' }))
    expect(res.status).toBe(400)
    const json = (await res.json()) as { error: string }
    expect(json.error).toBe('Invalid businessKey')
    expect(createServiceClient).not.toHaveBeenCalled()
  })

  it('upserts a valid persona scoped to the founder -> 201', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'founder-1' } as never)
    builder.__result.data = {
      id: 'p1',
      founder_id: 'founder-1',
      business_key: 'dr',
      tone_of_voice: '',
      target_audience: '',
      industry_keywords: [],
      unique_selling_points: [],
      character_male: {},
      character_female: {},
      colour_primary: null,
      colour_secondary: null,
      do_list: [],
      dont_list: [],
      sample_content: {},
      created_at: '2026-06-18T00:00:00.000Z',
      updated_at: '2026-06-18T00:00:00.000Z',
    }
    builder.__result.error = null

    const res = await POST(jsonRequest({ businessKey: 'dr' }))
    expect(res.status).toBe(201)

    expect(builder.from).toHaveBeenCalledWith('brand_identities')
    expect(builder.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ founder_id: 'founder-1', business_key: 'dr' }),
      expect.objectContaining({ onConflict: 'business_key' }),
    )

    const json = (await res.json()) as { persona: { businessKey: string } }
    expect(json.persona.businessKey).toBe('dr')
  })
})
