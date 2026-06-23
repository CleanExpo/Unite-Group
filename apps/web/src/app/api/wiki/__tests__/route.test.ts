// src/app/api/wiki/__tests__/route.test.ts
// Regression coverage for GET /api/wiki — list / search wiki pages.
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  getUser: vi.fn(),
  createClient: vi.fn(),
}))

import { getUser, createClient } from '@/lib/supabase/server'
import { GET } from '../route'
import { NextRequest } from 'next/server'

const req = (url = 'https://app.test/api/wiki') => new NextRequest(url)

// The route chains `.from().select().order()`, optionally `.ilike()`, then
// awaits the builder. So the builder must be both chainable AND awaitable:
// `.select`/`.order`/`.ilike` return the builder, and `.then` resolves it.
function makeQuery(result: { data?: unknown; error?: unknown }) {
  const builder: Record<string, unknown> = {}
  builder.select = vi.fn(() => builder)
  builder.order = vi.fn(() => builder)
  builder.ilike = vi.fn(() => builder)
  builder.then = (resolve: (v: unknown) => unknown) => resolve(result)
  return builder
}

function mockSupabase(result: { data?: unknown; error?: unknown }) {
  const query = makeQuery(result)
  vi.mocked(createClient).mockResolvedValue({
    from: vi.fn(() => query),
  } as never)
  return query
}

describe('GET /api/wiki', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when not authenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null as never)
    const res = await GET(req())
    expect(res.status).toBe(401)
    const body = (await res.json()) as { error: string }
    expect(body.error).toMatch(/unauthorised/i)
  })

  it('returns 200 with the list of pages on success', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as never)
    const pages = [{ id: 'p1', title: 'Alpha', word_count: 10, tags: [], updated_at: 't' }]
    mockSupabase({ data: pages, error: null })
    const res = await GET(req())
    expect(res.status).toBe(200)
    const body = (await res.json()) as typeof pages
    expect(body).toEqual(pages)
  })

  it('applies an ilike title filter when ?search= is supplied', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as never)
    const query = mockSupabase({ data: [], error: null })
    const res = await GET(req('https://app.test/api/wiki?search=foo'))
    expect(res.status).toBe(200)
    expect(query.ilike).toHaveBeenCalledWith('title', '%foo%')
  })

  it('returns [] when the query yields no data (null coalesced)', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as never)
    mockSupabase({ data: null, error: null })
    const res = await GET(req())
    expect(res.status).toBe(200)
    const body = (await res.json()) as unknown[]
    expect(body).toEqual([])
  })

  it('returns 500 when the query errors', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as never)
    mockSupabase({ data: null, error: { message: 'db down' } })
    const res = await GET(req())
    expect(res.status).toBe(500)
    const body = (await res.json()) as { error: string }
    expect(body.error).toBe('db down')
  })
})
