import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('@/lib/command-centre/tools/catalogue', () => ({
  getToolCatalogue: vi.fn(),
}))

import { getUser } from '@/lib/supabase/server'
import { getToolCatalogue } from '@/lib/command-centre/tools/catalogue'
import { GET } from '../route'

describe('GET /api/command-centre/tools', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('returns tool catalogue', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    vi.mocked(getToolCatalogue).mockResolvedValue([
      { id: 'tool-1', name: 'Search', description: 'Web search' },
    ] as any)

    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.tools).toHaveLength(1)
    expect(body.count).toBe(1)
  })

  it('returns 500 when catalogue fails', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    vi.mocked(getToolCatalogue).mockRejectedValue(new Error('load failed'))

    const res = await GET()
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBe('Failed to load tool catalogue') // sanitised — raw error not leaked
    expect(body.error).not.toContain('load failed')
  })
})
