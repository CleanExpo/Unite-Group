import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getUser, getChannels, isPlatformConfigured } = vi.hoisted(() => ({
  getUser: vi.fn(),
  getChannels: vi.fn(),
  isPlatformConfigured: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({ getUser }))
vi.mock('@/lib/integrations/social/channels', () => ({ getChannels }))
vi.mock('@/lib/integrations/social', () => ({
  isPlatformConfigured,
  SOCIAL_PLATFORMS: [
    {
      key: 'youtube',
      name: 'YouTube',
      description: 'Video uploads',
      connectPath: '/api/auth/youtube/authorize?business=synthex',
      setupUrl: 'https://example.com/setup',
      icon: 'YT',
    },
  ],
}))
vi.mock('@/components/ui/PageHeader', () => ({
  PageHeader: ({ title, subtitle }: { title: string; subtitle: string }) => (
    <header><h1>{title}</h1><p>{subtitle}</p></header>
  ),
}))

import SocialPage from '../page'

describe('SocialPage connection status', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getUser.mockResolvedValue({ id: 'founder-1' })
    isPlatformConfigured.mockReturnValue(true)
  })

  it('scopes channel status to the business used by Connect links', async () => {
    getChannels.mockResolvedValue([
      { platform: 'youtube', isConnected: true, lastSyncedAt: '2026-09-09T00:00:00.000Z' },
    ])

    const markup = renderToStaticMarkup(await SocialPage({ searchParams: Promise.resolve({}) }))

    expect(getChannels).toHaveBeenCalledWith('founder-1', 'synthex')
    expect(markup).toContain('Live')
    expect(markup).toContain('Connected:')
    expect(markup).toContain('1/1')
  })

  it('keeps the page available and marks connection status unknown when the read fails', async () => {
    getChannels.mockRejectedValue(new Error('social_channels unavailable'))

    const markup = renderToStaticMarkup(await SocialPage({ searchParams: Promise.resolve({}) }))

    expect(markup).toContain('Unable to verify')
    expect(markup).toContain('Unable to verify connection')
    expect(markup).not.toContain('Connected: 0/1')
    expect(markup).not.toContain('Needs connection')
  })
})
