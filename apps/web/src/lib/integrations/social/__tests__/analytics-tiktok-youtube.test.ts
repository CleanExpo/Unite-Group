import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../channels', () => ({
  decodeToken: (token: string) => token,
}))

import {
  fetchAnalyticsForChannel,
  fetchTikTokAnalytics,
  fetchYouTubeAnalytics,
} from '../analytics'
import type { SocialChannel } from '../types'

const baseChannel = (platform: SocialChannel['platform']): SocialChannel => ({
  id: 'ch-1',
  founderId: 'f-1',
  platform,
  businessKey: 'dr',
  channelId: 'channel-abc',
  channelName: 'Test',
  handle: '@test',
  name: 'Test',
  followerCount: 10,
  profileImageUrl: null,
  isConnected: true,
  tokenExpiresAt: null,
  lastSyncedAt: null,
})

describe('fetchTikTokAnalytics (UNI-2373 P8)', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('maps video.list stats into PostMetrics within the date window', async () => {
    const sinceTs = Math.floor(new Date('2026-08-01T00:00:00Z').getTime() / 1000)
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      text: async () => '',
      json: async () => ({
        data: {
          videos: [
            {
              id: 'tt-in',
              create_time: sinceTs + 3600,
              view_count: 1000,
              like_count: 40,
              comment_count: 5,
              share_count: 3,
            },
            {
              id: 'tt-old',
              create_time: sinceTs - 86400,
              view_count: 9999,
              like_count: 1,
              comment_count: 0,
              share_count: 0,
            },
          ],
          has_more: false,
        },
        error: { code: 'ok' },
      }),
    } as Response)

    const rows = await fetchTikTokAnalytics(
      baseChannel('tiktok'),
      'token',
      '2026-08-01',
      '2026-08-07',
    )

    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      postExternalId: 'tt-in',
      impressions: 1000,
      videoViews: 1000,
      likes: 40,
      comments: 5,
      shares: 3,
      engagements: 48,
    })
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('open.tiktokapis.com/v2/video/list/'),
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('returns [] when TikTok API errors', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      text: async () => 'boom',
    } as Response)

    await expect(
      fetchTikTokAnalytics(baseChannel('tiktok'), 'token', '2026-08-01', '2026-08-07'),
    ).resolves.toEqual([])
  })
})

describe('fetchYouTubeAnalytics (UNI-2373 P8)', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('pulls uploads playlist then video statistics', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        text: async () => '',
        json: async () => ({
          items: [
            {
              contentDetails: { relatedPlaylists: { uploads: 'UU-uploads' } },
            },
          ],
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        text: async () => '',
        json: async () => ({
          items: [
            {
              contentDetails: {
                videoId: 'yt-1',
                videoPublishedAt: '2026-08-02T12:00:00Z',
              },
            },
            {
              contentDetails: {
                videoId: 'yt-old',
                videoPublishedAt: '2026-07-01T12:00:00Z',
              },
            },
          ],
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        text: async () => '',
        json: async () => ({
          items: [
            {
              id: 'yt-1',
              statistics: {
                viewCount: '500',
                likeCount: '20',
                commentCount: '4',
                favoriteCount: '1',
              },
            },
          ],
        }),
      } as Response)

    const rows = await fetchYouTubeAnalytics(
      baseChannel('youtube'),
      'token',
      '2026-08-01',
      '2026-08-07',
    )

    expect(rows).toEqual([
      expect.objectContaining({
        postExternalId: 'yt-1',
        impressions: 500,
        videoViews: 500,
        likes: 20,
        comments: 4,
        saves: 1,
        engagements: 25,
      }),
    ])
  })
})

describe('fetchAnalyticsForChannel dispatcher', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('routes tiktok and youtube instead of stubbing empty', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        text: async () => 'no',
      }),
    )

    await expect(
      fetchAnalyticsForChannel(baseChannel('tiktok'), 't', '2026-08-01', '2026-08-07'),
    ).resolves.toEqual([])
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('tiktokapis.com'),
      expect.anything(),
    )

    vi.mocked(fetch).mockClear()
    await expect(
      fetchAnalyticsForChannel(baseChannel('youtube'), 't', '2026-08-01', '2026-08-07'),
    ).resolves.toEqual([])
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('youtube/v3/channels'),
      expect.anything(),
    )
  })
})
