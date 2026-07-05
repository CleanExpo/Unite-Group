// Regression coverage for UNI-2281 — the wiki index page must query
// wiki_pages directly (server-scoped Supabase client) instead of a cookieless
// self-fetch to /api/wiki, and must surface a query error rather than
// silently rendering the empty state.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

// next/navigation's redirect() throws to halt render — replicate that here
// so the page's early-return control flow is exercised for real.
const redirect = vi.fn(() => {
  throw new Error('NEXT_REDIRECT')
})
vi.mock('next/navigation', () => ({ redirect: (...a: unknown[]) => redirect(...a) }))

vi.mock('@/lib/supabase/server', () => ({
  getUser: vi.fn(),
  createClient: vi.fn(),
}))

import { getUser, createClient } from '@/lib/supabase/server'
import WikiIndexPage from '../page'

// The page chains `.from().select().order()`, then awaits the builder, so
// it must be both chainable AND awaitable.
function makeQuery(result: { data?: unknown; error?: unknown }) {
  const builder: Record<string, unknown> = {}
  builder.select = vi.fn(() => builder)
  builder.order = vi.fn(() => builder)
  builder.then = (resolve: (v: unknown) => unknown) => resolve(result)
  return builder
}

function mockSupabase(result: { data?: unknown; error?: unknown }) {
  const query = makeQuery(result)
  vi.mocked(createClient).mockResolvedValue({ from: vi.fn(() => query) } as never)
  return query
}

describe('WikiIndexPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('redirects unauthenticated users to login', async () => {
    vi.mocked(getUser).mockResolvedValue(null as never)
    mockSupabase({ data: [], error: null })
    await expect(WikiIndexPage()).rejects.toThrow('NEXT_REDIRECT')
    expect(redirect).toHaveBeenCalledWith('/auth/login')
  })

  it('throws on a query error instead of silently rendering the empty state', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as never)
    mockSupabase({ data: null, error: { message: 'db down' } })
    await expect(WikiIndexPage()).rejects.toThrow('Failed to load wiki pages')
  })

  it('renders the empty state only when the query genuinely returns no rows', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as never)
    mockSupabase({ data: [], error: null })
    render(await WikiIndexPage())
    expect(screen.getByText('No wiki pages found.')).toBeInTheDocument()
  })

  it('renders real wiki pages returned by the direct Supabase query', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as never)
    const query = mockSupabase({
      data: [{ id: 'p1', title: 'Alpha Page', word_count: 42, tags: [], updated_at: '2026-07-01T00:00:00.000Z' }],
      error: null,
    })
    render(await WikiIndexPage())
    expect(screen.getByText('Alpha Page')).toBeInTheDocument()
    expect(screen.queryByText('No wiki pages found.')).not.toBeInTheDocument()
    expect(query.select).toHaveBeenCalledWith('id, title, word_count, tags, updated_at')
    expect(query.order).toHaveBeenCalledWith('title')
  })
})
