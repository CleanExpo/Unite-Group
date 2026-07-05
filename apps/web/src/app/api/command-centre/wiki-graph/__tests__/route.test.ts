// src/app/api/command-centre/wiki-graph/__tests__/route.test.ts
// GET /api/command-centre/wiki-graph — auth gate + founder-scoped graph build.
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn(), createClient: vi.fn() }))

import { getUser, createClient } from '@/lib/supabase/server'
import { GET } from '../route'

/** Build a supabase mock whose wiki_pages select().limit() resolves to { data, error }. */
function mockSupabase(result: { data: unknown; error: unknown }) {
  const limit = vi.fn().mockResolvedValue(result)
  const select = vi.fn().mockReturnValue({ limit })
  const from = vi.fn().mockReturnValue({ select })
  vi.mocked(createClient).mockResolvedValue({ from } as never)
  return { from, select, limit }
}

/** Build `count` page rows, each a distinct node with no links. */
function makeRows(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `p${i}`,
    title: `Page ${i}`,
    tags: null,
    content: '',
    updated_at: '2026-07-01T00:00:00.000Z',
  }))
}

describe('GET /api/command-centre/wiki-graph', () => {
  beforeEach(() => vi.clearAllMocks())

  it('401 when unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await GET()
    expect(res.status).toBe(401)
    expect(createClient).not.toHaveBeenCalled()
  })

  it('returns a founder-scoped graph with resolved edges', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as never)
    const { from, limit } = mockSupabase({
      data: [
        { id: 'a', title: 'A', tags: ['t'], content: 'links [[b]] and [[ghost]]', updated_at: '2026-06-01T00:00:00.000Z' },
        { id: 'b', title: 'B', tags: null, content: 'orphan', updated_at: '2026-07-01T00:00:00.000Z' },
      ],
      error: null,
    })

    const res = await GET()
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      source: string
      nodes: Array<{ id: string; degree: number }>
      edges: Array<{ source: string; target: string }>
      pageCount: number
      edgeCount: number
      lastSync: string
      truncated: boolean
    }

    expect(from).toHaveBeenCalledWith('wiki_pages')
    expect(limit).toHaveBeenCalledWith(1000)
    expect(body.source).toBe('wiki_pages')
    expect(body.pageCount).toBe(2)
    expect(body.nodes.map((n) => n.id).sort()).toEqual(['a', 'b'])
    expect(body.edges).toEqual([{ source: 'a', target: 'b' }]) // ghost dropped
    expect(body.edgeCount).toBe(1)
    expect(body.lastSync).toBe('2026-07-01T00:00:00.000Z')
    expect(body.truncated).toBe(false)
  })

  it('is not truncated at 999 rows (below the PostgREST cap)', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as never)
    mockSupabase({ data: makeRows(999), error: null })
    const res = await GET()
    const body = (await res.json()) as { pageCount: number; truncated: boolean }
    expect(body.pageCount).toBe(999)
    expect(body.truncated).toBe(false)
  })

  it('reports truncated when exactly the 1000-row limit comes back', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as never)
    mockSupabase({ data: makeRows(1000), error: null })
    const res = await GET()
    const body = (await res.json()) as { pageCount: number; truncated: boolean }
    expect(body.pageCount).toBe(1000)
    expect(body.truncated).toBe(true)
  })

  it('returns an honest empty graph when the wiki is unsynced', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as never)
    mockSupabase({ data: [], error: null })
    const res = await GET()
    expect(res.status).toBe(200)
    const body = (await res.json()) as { pageCount: number; nodes: unknown[]; edges: unknown[]; lastSync: null }
    expect(body.pageCount).toBe(0)
    expect(body.nodes).toEqual([])
    expect(body.edges).toEqual([])
    expect(body.lastSync).toBeNull()
  })

  it('500 when the query errors', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as never)
    mockSupabase({ data: null, error: { message: 'boom' } })
    const res = await GET()
    expect(res.status).toBe(500)
  })
})
