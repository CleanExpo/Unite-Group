import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getUser, verifyOAuthState, upsertChannel } = vi.hoisted(() => ({
  getUser: vi.fn(),
  verifyOAuthState: vi.fn(),
  upsertChannel: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({ getUser }))
vi.mock('@/lib/oauth-state', () => ({ verifyOAuthState }))
vi.mock('@/lib/integrations/social/channels', () => ({
  upsertChannel,
  decodeToken: (token: string) => token,
}))
vi.mock('../channels', () => ({
  upsertChannel,
  decodeToken: (token: string) => token,
}))

import { GET as linkedinCallback } from '@/app/api/auth/linkedin/callback/route'
import { fetchLinkedInAnalytics } from '../analytics'
import { publishToPlatform } from '../publisher'
import { LINKEDIN_SCOPES, SOCIAL_PLATFORMS } from '../../social'

const validState = {
  businessKey: 'synthex',
  founderId: 'founder-1',
  nonce: 'nonce',
  expiresAt: String(Date.now() + 60_000),
}

function callbackRequest(): Request {
  return new Request('https://app.test/api/auth/linkedin/callback?code=code&state=state')
}

function channel(metadata?: Record<string, unknown>) {
  return {
    channel_id: '12345',
    metadata,
  }
}

describe('LinkedIn channel identity contract', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://app.test')
    vi.stubEnv('LINKEDIN_CLIENT_ID', 'client-id')
    vi.stubEnv('LINKEDIN_CLIENT_SECRET', 'client-secret')
    getUser.mockResolvedValue({ id: 'founder-1' })
    verifyOAuthState.mockReturnValue(validState)
    upsertChannel.mockResolvedValue(undefined)
  })

  it('keeps the dedicated and registry OAuth scope contracts identical', () => {
    expect(SOCIAL_PLATFORMS.find(platform => platform.key === 'linkedin')?.scope)
      .toBe(LINKEDIN_SCOPES)
    expect(LINKEDIN_SCOPES.split(' ')).toEqual(expect.arrayContaining([
      'openid', 'profile', 'email', 'w_member_social',
      'r_organization_social', 'w_organization_social', 'rw_organization_admin',
    ]))
  })

  it('records organisation identity for channels returned by organisationAcls', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'token', expires_in: 3600 }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ sub: 'member-1', name: 'Founder' }) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ elements: [{ 'organization~': { id: 987, localizedName: 'Unite-Group' } }] }),
      }))

    await linkedinCallback(callbackRequest())

    expect(upsertChannel).toHaveBeenCalledWith(expect.objectContaining({
      channelId: '987',
      metadata: { linkedinEntityType: 'organization' },
    }))
  })

  it('records person identity for the documented no-organisation fallback', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'token', expires_in: 3600 }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ sub: 'member-1', name: 'Founder' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ elements: [] }) }))

    await linkedinCallback(callbackRequest())

    expect(upsertChannel).toHaveBeenCalledWith(expect.objectContaining({
      channelId: 'member-1',
      metadata: { linkedinEntityType: 'person' },
    }))
  })

  it('fails closed instead of storing an unknown member identity', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'token', expires_in: 3600 }) })
      .mockResolvedValueOnce({ ok: false, json: async () => ({}) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ elements: [] }) }))

    const response = await linkedinCallback(callbackRequest())

    expect(response.headers.get('location')).toContain('member_identity_unavailable')
    expect(upsertChannel).not.toHaveBeenCalled()
  })

  it('publishes organisation channels with organisation URNs', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: 'post-1' }) }))

    await publishToPlatform('linkedin', 'token', channel({ linkedinEntityType: 'organization' }), {
      content: 'Hello',
      media_urls: [],
    })

    const [, init] = vi.mocked(fetch).mock.calls[0]
    expect(JSON.parse(String((init as RequestInit).body)).author).toBe('urn:li:organization:12345')
  })

  it('retains member publishing with person URNs', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: 'post-1' }) }))

    await publishToPlatform('linkedin', 'token', channel({ linkedinEntityType: 'person' }), {
      content: 'Hello',
      media_urls: [],
    })

    const [, init] = vi.mocked(fetch).mock.calls[0]
    expect(JSON.parse(String((init as RequestInit).body)).author).toBe('urn:li:person:12345')
  })

  it('fails closed for missing publisher identity', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    await expect(publishToPlatform('linkedin', 'token', channel(), {
      content: 'Hello',
      media_urls: [],
    })).rejects.toThrow('LinkedIn channel identity unavailable')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it.each([
    [{ linkedinEntityType: 'person' }],
    [undefined],
    [{ linkedinEntityType: 'unexpected' }],
  ])('does not send %s to organisation analytics', async (metadata) => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    await expect(fetchLinkedInAnalytics(
      { ...channel(metadata), channelId: '12345' } as never,
      'token',
      '2026-09-01',
      '2026-09-09',
    )).resolves.toEqual([])
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
