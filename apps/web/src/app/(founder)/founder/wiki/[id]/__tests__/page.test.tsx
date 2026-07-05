// Regression coverage for UNI-2281 — the wiki detail page must query
// wiki_pages directly (server-scoped Supabase client) instead of a cookieless
// self-fetch to /api/wiki/[id], and must surface a query error rather than
// silently rendering notFound().
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

// next/navigation's redirect()/notFound() throw to halt render — replicate
// that here so the page's early-return control flow is exercised for real.
const redirect = vi.fn(() => {
  throw new Error('NEXT_REDIRECT')
})
const notFound = vi.fn(() => {
  throw new Error('NEXT_NOT_FOUND')
})
vi.mock('next/navigation', () => ({
  redirect: (...a: unknown[]) => redirect(...a),
  notFound: (...a: unknown[]) => notFound(...a),
}))

vi.mock('@/lib/supabase/server', () => ({
  getUser: vi.fn(),
  createClient: vi.fn(),
}))

import { getUser, createClient } from '@/lib/supabase/server'
import WikiPageDetail from '../page'

// The page chains `.from().select().eq().single()`, then awaits the builder.
function makeQuery(result: { data?: unknown; error?: unknown }) {
  const builder: Record<string, unknown> = {}
  builder.select = vi.fn(() => builder)
  builder.eq = vi.fn(() => builder)
  builder.single = vi.fn(() => builder)
  builder.then = (resolve: (v: unknown) => unknown) => resolve(result)
  return builder
}

function mockSupabase(result: { data?: unknown; error?: unknown }) {
  const query = makeQuery(result)
  vi.mocked(createClient).mockResolvedValue({ from: vi.fn(() => query) } as never)
  return query
}

const params = Promise.resolve({ id: 'p1' })

describe('WikiPageDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('redirects unauthenticated users to login', async () => {
    vi.mocked(getUser).mockResolvedValue(null as never)
    mockSupabase({ data: null, error: null })
    await expect(WikiPageDetail({ params })).rejects.toThrow('NEXT_REDIRECT')
    expect(redirect).toHaveBeenCalledWith('/auth/login')
  })

  it('calls notFound() when the row genuinely does not exist (PGRST116)', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as never)
    mockSupabase({ data: null, error: { code: 'PGRST116', message: 'no rows' } })
    await expect(WikiPageDetail({ params })).rejects.toThrow('NEXT_NOT_FOUND')
    expect(notFound).toHaveBeenCalled()
  })

  it('throws on a genuine query error instead of rendering notFound()', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as never)
    mockSupabase({ data: null, error: { code: '500', message: 'db down' } })
    await expect(WikiPageDetail({ params })).rejects.toThrow('Failed to load wiki page')
    expect(notFound).not.toHaveBeenCalled()
  })

  it('renders the real wiki page returned by the direct Supabase query', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as never)
    const query = mockSupabase({
      data: {
        id: 'p1',
        title: 'Alpha Page',
        content: 'Hello world',
        word_count: 2,
        tags: [],
        updated_at: '2026-07-01T00:00:00.000Z',
      },
      error: null,
    })
    render(await WikiPageDetail({ params }))
    expect(screen.getByText('Alpha Page')).toBeInTheDocument()
    expect(screen.getByText('Hello world')).toBeInTheDocument()
    expect(query.eq).toHaveBeenCalledWith('id', 'p1')
  })
})
