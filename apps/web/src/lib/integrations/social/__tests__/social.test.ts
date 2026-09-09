import { afterEach, describe, expect, it, vi } from 'vitest'
import { SOCIAL_PLATFORMS, getPlatformCredentials, isPlatformConfigured } from '../../social'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('social readiness contract', () => {
  it('uses the dedicated Google OAuth pair for YouTube', () => {
    vi.stubEnv('YOUTUBE_API_KEY', 'api-key-only')
    vi.stubEnv('GOOGLE_CLIENT_ID', '')
    vi.stubEnv('GOOGLE_CLIENT_SECRET', '')
    expect(isPlatformConfigured('youtube')).toBe(false)

    vi.stubEnv('GOOGLE_CLIENT_ID', 'google-client-id')
    vi.stubEnv('GOOGLE_CLIENT_SECRET', 'google-client-secret')
    expect(isPlatformConfigured('youtube')).toBe(true)
  })

  it('does not mark Meta connectable from the legacy alias alone', () => {
    vi.stubEnv('META_APP_ID', 'meta-app-id')
    vi.stubEnv('META_APP_SECRET', 'meta-app-secret')
    vi.stubEnv('FACEBOOK_APP_ID', '')
    vi.stubEnv('FACEBOOK_APP_SECRET', '')
    expect(isPlatformConfigured('meta')).toBe(false)

    vi.stubEnv('FACEBOOK_APP_ID', 'facebook-app-id')
    vi.stubEnv('FACEBOOK_APP_SECRET', 'facebook-app-secret')
    expect(isPlatformConfigured('meta')).toBe(true)
    expect(getPlatformCredentials('meta')).toEqual({
      clientId: 'facebook-app-id',
      clientSecret: 'facebook-app-secret',
    })
  })

  it('exposes dedicated connect paths and identifies Reddit as credential-only', () => {
    expect(SOCIAL_PLATFORMS.find(platform => platform.key === 'meta')?.connectPath)
      .toBe('/api/auth/meta/authorize?business=synthex')
    expect(SOCIAL_PLATFORMS.find(platform => platform.key === 'youtube')?.connectPath)
      .toBe('/api/auth/youtube/authorize?business=synthex')
    expect(SOCIAL_PLATFORMS.find(platform => platform.key === 'reddit')?.connectionMode)
      .toBe('password')
    expect(SOCIAL_PLATFORMS.find(platform => platform.key === 'reddit')?.connectPath)
      .toBeUndefined()
  })
})
