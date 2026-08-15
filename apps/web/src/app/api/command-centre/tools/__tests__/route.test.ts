import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('@/lib/command-centre/tools/catalogue', () => ({
  getFounderToolCatalogue: vi.fn(),
}))

import { getUser } from '@/lib/supabase/server'
import { getFounderToolCatalogue } from '@/lib/command-centre/tools/catalogue'
import { GET } from '../route'

describe('GET /api/command-centre/tools', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('returns the catalogue and reports a registry origin', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    vi.mocked(getFounderToolCatalogue).mockResolvedValue({
      tools: [{ tool_key: 'skill:seo' }],
      origin: 'registry',
      registry_count: 1,
    } as any)

    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.tools).toHaveLength(1)
    expect(body.count).toBe(1)
    expect(body.origin).toBe('registry')
    expect(body.registry_count).toBe(1)
  })

  it('scopes the catalogue read to the authenticated founder', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-9' } as any)
    vi.mocked(getFounderToolCatalogue).mockResolvedValue({
      tools: [],
      origin: 'static',
      registry_count: 0,
    } as any)

    await GET()

    expect(getFounderToolCatalogue).toHaveBeenCalledWith('user-9')
  })

  it('does not present a static fallback as a populated registry', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    vi.mocked(getFounderToolCatalogue).mockResolvedValue({
      tools: [{ tool_key: 'linear' }, { tool_key: 'supabase' }],
      origin: 'static',
      registry_count: 0,
    } as any)

    const res = await GET()
    const body = await res.json()

    // A non-empty list with an EMPTY registry is the exact condition that must
    // stay visible: reuse-before-build searches are finding nothing.
    expect(body.count).toBe(2)
    expect(body.origin).toBe('static')
    expect(body.registry_count).toBe(0)
  })

  it('returns 500 when catalogue fails', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    vi.mocked(getFounderToolCatalogue).mockRejectedValue(new Error('load failed'))

    const res = await GET()
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBe('Failed to load tool catalogue') // sanitised — raw error not leaked
    expect(body.error).not.toContain('load failed')
  })
})
