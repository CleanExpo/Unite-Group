import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('@/lib/command-centre/registry', () => ({
  getProjects: vi.fn(),
}))

import { getUser } from '@/lib/supabase/server'
import { getProjects } from '@/lib/command-centre/registry'
import { GET } from '../route'

describe('GET /api/command-centre/projects', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('returns project registry', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    vi.mocked(getProjects).mockResolvedValue([
      { name: 'CRM', linear_prefix: 'CRM' },
    ] as any)

    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.projects).toHaveLength(1)
    expect(body.count).toBe(1)
  })

  it('returns 500 on registry error', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    vi.mocked(getProjects).mockRejectedValue(new Error('registry not found'))

    const res = await GET()
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBe('registry not found')
  })
})
