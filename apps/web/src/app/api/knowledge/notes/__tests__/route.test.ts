import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Supabase mock ─────────────────────────────────────────────────────────────
// GET without search: from → select → eq(founder_id) → eq(is_deleted) → order → [optional eq] → range
// GET with search: from → select → eq... → order → range  [then short-circuit via rpc()]

const mockRange = vi.fn()
const mockOrder = vi.fn(() => ({ range: mockRange, eq: vi.fn(() => ({ range: mockRange })) }))
const mockContains = vi.fn(() => ({ range: mockRange }))

// Build a chainable builder; all modifier methods return themselves
function makeBuilder() {
  const b: Record<string, unknown> = {}
  b.select = vi.fn(() => b)
  b.eq = vi.fn(() => b)
  b.order = vi.fn(() => b)
  b.contains = vi.fn(() => b)
  b.range = mockRange
  return b
}

let builder: ReturnType<typeof makeBuilder>
const mockRpc = vi.fn()
const mockFrom = vi.fn(() => builder)

vi.mock('@/lib/supabase/server', () => ({
  getUser: vi.fn(),
  createClient: vi.fn(),
}))

import { getUser, createClient } from '@/lib/supabase/server'
import { GET } from '../route'

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('GET /api/knowledge/notes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    builder = makeBuilder()
    vi.mocked(createClient).mockResolvedValue({ from: mockFrom, rpc: mockRpc } as any)
  })

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await GET(new Request('https://app.test/api/knowledge/notes'))
    expect(res.status).toBe(401)
    expect(await res.json()).toMatchObject({ error: 'Unauthorised' })
  })

  it('returns notes list for authenticated founder', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const notes = [{ id: 'n-1', title: 'Note A' }]
    mockRange.mockResolvedValue({ data: notes, error: null, count: 1 })

    const res = await GET(new Request('https://app.test/api/knowledge/notes'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.notes).toEqual(notes)
    expect(body.count).toBe(1)
    expect(mockFrom).toHaveBeenCalledWith('knowledge_notes')
  })

  it('scopes query to founder_id', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-99' } as any)
    mockRange.mockResolvedValue({ data: [], error: null, count: 0 })

    await GET(new Request('https://app.test/api/knowledge/notes'))
    expect(builder.eq).toHaveBeenCalledWith('founder_id', 'user-99')
  })

  it('uses rpc search when ?q is provided', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const searchNotes = [{ id: 'n-2', title: 'Search Result' }]
    mockRpc.mockResolvedValue({ data: searchNotes, error: null })

    const res = await GET(new Request('https://app.test/api/knowledge/notes?q=revenue'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.notes).toEqual(searchNotes)
    expect(mockRpc).toHaveBeenCalledWith('search_knowledge_notes', expect.objectContaining({
      p_founder_id: 'user-1',
      p_query: 'revenue',
    }))
  })

  it('returns 500 when the base query errors', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    mockRange.mockResolvedValue({ data: null, error: { message: 'DB error' }, count: null })

    const res = await GET(new Request('https://app.test/api/knowledge/notes'))
    expect(res.status).toBe(500)
  })
})
