import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('@/lib/command-centre/overnight-summary', () => ({
  gatherOvernightDigest: vi.fn(),
}))

import { getUser } from '@/lib/supabase/server'
import { gatherOvernightDigest } from '@/lib/command-centre/overnight-summary'
import { GET } from '../route'

describe('GET /api/command-centre/overnight-summary', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('returns digest on success', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const digest = { summary: 'Quiet night.', tasks: [], sessions: [] }
    vi.mocked(gatherOvernightDigest).mockResolvedValue(digest as any)

    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.digest.summary).toBe('Quiet night.')
  })

  it('marks the founder digest response as no-store', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    vi.mocked(gatherOvernightDigest).mockResolvedValue({ summary: 'Quiet night.' } as any)

    const res = await GET()

    expect(res.status).toBe(200)
    expect(res.headers.get('Cache-Control')).toBe('no-store')
  })

  it('returns 500 when digest fails', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    vi.mocked(gatherOvernightDigest).mockRejectedValue(new Error('DB down'))

    const res = await GET()
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBe('Failed to build digest') // sanitised — raw error not leaked
    expect(body.error).not.toContain('DB down')
  })
})
