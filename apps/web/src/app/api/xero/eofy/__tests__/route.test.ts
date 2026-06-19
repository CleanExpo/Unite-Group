import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('@/lib/integrations/xero/eofy', () => ({ computeEofyWindow: vi.fn() }))

import { getUser } from '@/lib/supabase/server'
import { computeEofyWindow } from '@/lib/integrations/xero/eofy'
import { GET } from '../route'

describe('GET /api/xero/eofy', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(computeEofyWindow).mockReturnValue({
      phase: 'approaching',
      daysToEofy: 45,
      eofyDate: '2026-06-30',
    } as any)
  })

  it('returns 401 when unauthorized', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('returns 500 when computation fails', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    vi.mocked(computeEofyWindow).mockImplementation(() => { throw new Error('computation failed') })
    const res = await GET()
    expect(res.status).toBe(500)
  })

  it('returns 200 with EOFY window on success', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.phase).toBe('approaching')
    expect(body.daysToEofy).toBe(45)
  })
})
