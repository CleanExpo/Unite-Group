import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Supabase mock chain ───────────────────────────────────────────────────────
// GET: from → select → eq(founder_id) → order → limit → [optional .eq(status)]

const mockData = vi.fn()

function makeBuilder() {
  const b: Record<string, vi.Mock | (() => Record<string, unknown>)> = {}
  b.select = vi.fn(() => b)
  b.eq = vi.fn(() => b)
  b.order = vi.fn(() => b)
  b.limit = mockData
  return b
}

let builder: ReturnType<typeof makeBuilder>
const mockFrom = vi.fn(() => builder)

vi.mock('@/lib/supabase/server', () => ({
  getUser: vi.fn(),
  createClient: vi.fn(),
}))

import { getUser, createClient } from '@/lib/supabase/server'
import { GET } from '../route'

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('GET /api/knowledge/projects', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    builder = makeBuilder()
    vi.mocked(createClient).mockResolvedValue({ from: mockFrom } as any)
  })

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await GET(new Request('https://app.test/api/knowledge/projects'))
    expect(res.status).toBe(401)
    expect(await res.json()).toMatchObject({ error: 'Unauthorised' })
  })

  it('returns projects list for authenticated founder', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const projects = [{ id: 'p-1', name: 'Alpha', note_count: 5 }]
    mockData.mockResolvedValue({ data: projects, error: null })

    const res = await GET(new Request('https://app.test/api/knowledge/projects'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.projects).toEqual(projects)
    expect(mockFrom).toHaveBeenCalledWith('knowledge_projects')
  })

  it('scopes to founder_id', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-42' } as any)
    mockData.mockResolvedValue({ data: [], error: null })

    await GET(new Request('https://app.test/api/knowledge/projects'))
    expect(builder.eq).toHaveBeenCalledWith('founder_id', 'user-42')
  })

  it('returns 500 on database error', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    mockData.mockResolvedValue({ data: null, error: { message: 'DB error' } })

    const res = await GET(new Request('https://app.test/api/knowledge/projects'))
    expect(res.status).toBe(500)
  })
})
