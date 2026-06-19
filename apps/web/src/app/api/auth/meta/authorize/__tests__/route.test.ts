import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextResponse } from 'next/server'

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('@/lib/oauth-state', () => ({ signOAuthState: vi.fn().mockReturnValue('signed-state') }))
vi.mock('@/lib/oauth-env-guard', () => ({ requireOAuthEnv: vi.fn() }))

import { getUser } from '@/lib/supabase/server'
import { requireOAuthEnv } from '@/lib/oauth-env-guard'
import { GET } from '../route'

function req(business?: string) {
  const url = business
    ? `https://app.test/api/auth/meta/authorize?business=${business}`
    : 'https://app.test/api/auth/meta/authorize'
  return new Request(url)
}

describe('GET /api/auth/meta/authorize', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireOAuthEnv).mockReturnValue({ ok: true, missing: [], response: null })
    vi.stubEnv('FACEBOOK_APP_ID', 'fb-app-id')
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://app.test')
  })

  it('returns 401 when unauthorized', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await GET(req('biz'))
    expect(res.status).toBe(401)
  })

  it('returns 400 when business param missing', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const res = await GET(req())
    expect(res.status).toBe(400)
  })

  it('returns 503 when Meta env not configured', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    vi.mocked(requireOAuthEnv).mockReturnValue({
      ok: false,
      missing: ['FACEBOOK_APP_ID'],
      response: NextResponse.json({ error: 'not_configured' }, { status: 503 }),
    })
    const res = await GET(req('biz'))
    expect(res.status).toBe(503)
  })

  it('returns 307 redirect to Facebook when configured', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const res = await GET(req('biz'))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('facebook.com')
  })
})
