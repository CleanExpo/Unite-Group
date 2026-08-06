import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { SocialChannel } from '../types'

vi.mock('../channels', () => ({
  decodeToken: vi.fn(() => 'test-access-token'),
}))

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    text: async () => JSON.stringify(body),
    json: async () => body,
  } as Response
}

const tiktokChannel = {
  platform: 'tiktok',
  channelId: 'tt-user-1',
} as SocialChannel

const youtubeChannel = {
  platform: 'youtube',
  channelId: 'UC_test_channel',
} as SocialChannel

describe('social analytics — TikTok / YouTube (UNI-2373 P8)', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  it('fetchTikTokAnalytics maps video.list stats into PostMetrics', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      jsonResponse({
        error: { code: 'ok' },
        data: {
          videos: [
            {
              id: 'v1',
              create_time: Math.floor(new Date('2026-08-01T12:00:00Z').getTime() / 1000),
              view_count: 1000,
              like_count: 10,
              comment_count: 2,
              share_count: 3,
            },
            {
              id: 'v-old',
              create_time: Math.floor(new Date('2026-07-01T12:00:00Z').getTime() / 1000),
              view_count: 99,
              like_count: 1,
              comment_count: 0,
              share_count: 0,
            },
          ],
          has_more: false,
        },
      }),
    ) as typeof fetch

    const { fetchTikTokAnalytics } = await import('../analytics')
    const metrics = await fetchTikTokAnalytics(
      tiktokChannel,
      'enc-token',
      '2026-08-01',
      '2026-08-07',
    )

    expect(metrics).toHaveLength(1)
    expect(metrics[0]).toMatchObject({
      postExternalId: 'v1',
      impressions: 1000,
      videoViews: 1000,
      likes: 10,
      comments: 2,
      shares: 3,
      engagements: 15,
    })
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('open.tiktokapis.com/v2/video/list'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-access-token',
        }),
      }),
    )
  })

  it('fetchTikTokAnalytics returns [] when API fails', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      jsonResponse({ error: 'boom' }, false, 500),
    ) as typeof fetch

    const { fetchTikTokAnalytics } = await import('../analytics')
    const metrics = await fetchTikTokAnalytics(
      tiktokChannel,
      'enc-token',
      '2026-08-01',
      '2026-08-07',
    )
    expect(metrics).toEqual([])
  })

  it('fetchYouTubeAnalytics pulls uploads playlist + video statistics', async () => {
    global.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('/channels?')) {
        return jsonResponse({
          items: [
            {
              contentDetails: {
                relatedPlaylists: { uploads: 'UU_uploads' },
              },
            },
          ],
        })
      }
      if (url.includes('/playlistItems?')) {
        return jsonResponse({
          items: [
            {
              contentDetails: {
                videoId: 'yt1',
                videoPublishedAt: '2026-08-02T10:00:00Z',
              },
            },
            {
              contentDetails: {
                videoId: 'yt-old',
                videoPublishedAt: '2026-07-01T10:00:00Z',
              },
            },
          ],
        })
      }
      if (url.includes('/videos?')) {
        return jsonResponse({
          items: [
            {
              id: 'yt1',
              statistics: {
                viewCount: '500',
                likeCount: '20',
                commentCount: '4',
                favoriteCount: '1',
              },
            },
          ],
        })
      }
      return jsonResponse({}, false, 404)
    }) as typeof fetch

    const { fetchYouTubeAnalytics } = await import('../analytics')
    const metrics = await fetchYouTubeAnalytics(
      youtubeChannel,
      'enc-token',
      '2026-08-01',
      '2026-08-07',
    )

    expect(metrics).toHaveLength(1)
    expect(metrics[0]).toMatchObject({
      postExternalId: 'yt1',
      impressions: 500,
      videoViews: 500,
      likes: 20,
      comments: 4,
      saves: 1,
      engagements: 25,
    })
  })

  it('fetchAnalyticsForChannel dispatches tiktok and youtube (no longer stub[])', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      jsonResponse({
        error: { code: 'ok' },
        data: { videos: [], has_more: false },
      }),
    ) as typeof fetch

    const { fetchAnalyticsForChannel } = await import('../analytics')
    const tt = await fetchAnalyticsForChannel(
      tiktokChannel,
      'enc-token',
      '2026-08-01',
      '2026-08-07',
    )
    expect(tt).toEqual([])
    expect(global.fetch).toHaveBeenCalled()

    global.fetch = vi.fn().mockResolvedValue(
      jsonResponse({ items: [] }),
    ) as typeof fetch
    const yt = await fetchAnalyticsForChannel(
      youtubeChannel,
      'enc-token',
      '2026-08-01',
      '2026-08-07',
    )
    expect(yt).toEqual([])
    expect(global.fetch).toHaveBeenCalled()
  })
})
