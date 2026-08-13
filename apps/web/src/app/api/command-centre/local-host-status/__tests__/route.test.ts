import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('@/lib/command-centre/local-host-status', () => ({ readLocalHostStatus: vi.fn() }))

import { getUser } from '@/lib/supabase/server'
import { readLocalHostStatus } from '@/lib/command-centre/local-host-status'
import { GET } from '../route'

describe('GET /api/command-centre/local-host-status', () => {
  it('requires an authenticated founder', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const response = await GET()
    expect(response.status).toBe(401)
  })

  it('returns the adapter result without caching it', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'founder' } as never)
    vi.mocked(readLocalHostStatus).mockResolvedValue({
      configured: true,
      observedAt: '2026-08-12T00:00:00.000Z',
      host: 'mini',
      signals: [],
    })
    const response = await GET()
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(await response.json()).toMatchObject({ configured: true, host: 'mini' })
  })
})
