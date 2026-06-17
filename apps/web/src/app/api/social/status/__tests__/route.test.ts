import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('@/lib/integrations/social', () => ({
  // Inlined inside the factory — vi.mock is hoisted above module-level consts.
  SOCIAL_PLATFORMS: [
    { key: 'linkedin', name: 'LinkedIn', description: 'd', icon: 'i', setupUrl: 's', docsUrl: 'd' },
    { key: 'facebook', name: 'Facebook', description: 'd', icon: 'i', setupUrl: 's', docsUrl: 'd' },
  ],
  isPlatformConfigured: vi.fn(() => true),
  loadPlatformTokens: vi.fn(async () => null),
}))

import { GET } from '../route'
import { getUser } from '@/lib/supabase/server'
import { SOCIAL_PLATFORMS, loadPlatformTokens } from '@/lib/integrations/social'

interface StatusBody {
  timestamp: string
  platforms: Array<{ key: string; connected: boolean; connectedAt: string | null }>
  connectedCount: number
  configuredCount: number
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/social/status', () => {
  it('unauthenticated -> 200 with every platform connected:false and never loads tokens', async () => {
    vi.mocked(getUser).mockResolvedValue(null as never)

    const res = await GET()
    expect(res.status).toBe(200)

    const json = (await res.json()) as StatusBody
    expect(json.platforms).toHaveLength(SOCIAL_PLATFORMS.length)
    expect(json.platforms.every(p => p.connected === false)).toBe(true)
    expect(json.connectedCount).toBe(0)

    // The deliberate design: no token lookups for an unauthenticated caller.
    expect(loadPlatformTokens).not.toHaveBeenCalled()
  })

  it('authenticated with a token for one platform -> that platform connected:true, count reflects it', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'founder-1' } as never)
    vi.mocked(loadPlatformTokens).mockImplementation(async (_id: string, key: string) =>
      key === 'linkedin'
        ? ({ accessToken: 'tok', connectedAt: '2026-06-18T00:00:00.000Z' } as never)
        : null,
    )

    const res = await GET()
    expect(res.status).toBe(200)

    const json = (await res.json()) as StatusBody
    const linkedin = json.platforms.find(p => p.key === 'linkedin')!
    const facebook = json.platforms.find(p => p.key === 'facebook')!

    expect(linkedin.connected).toBe(true)
    expect(linkedin.connectedAt).toBe('2026-06-18T00:00:00.000Z')
    expect(facebook.connected).toBe(false)
    expect(json.connectedCount).toBe(1)

    // Token lookup happens once per platform, bound to the session id.
    expect(loadPlatformTokens).toHaveBeenCalledTimes(SOCIAL_PLATFORMS.length)
    expect(loadPlatformTokens).toHaveBeenCalledWith('founder-1', 'linkedin')
  })
})
