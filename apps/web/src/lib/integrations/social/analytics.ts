// src/lib/integrations/social/analytics.ts
// Per-platform analytics fetchers — pulls post engagement metrics from social APIs

import { decodeToken } from './channels'
import type { SocialChannel } from './types'

export interface PostMetrics {
  postExternalId: string
  impressions: number
  reach: number
  engagements: number
  likes: number
  comments: number
  shares: number
  saves: number
  clicks: number
  videoViews: number
  videoWatchTimeSeconds: number
}

// ─── Facebook ─────────────────────────────────────────────────────────────────

export async function fetchFacebookAnalytics(
  channel: SocialChannel,
  accessTokenEncrypted: string,
  since: string,
  _until: string
): Promise<PostMetrics[]> {
  const accessToken = decodeToken(accessTokenEncrypted)
  const metrics: PostMetrics[] = []

  const postsRes = await fetch(
    `https://graph.facebook.com/v22.0/${channel.channelId}/posts?` +
    `fields=id,created_time&since=${since}&limit=100&access_token=${accessToken}`
  )
  if (!postsRes.ok) {
    console.error('[Analytics:FB] Posts fetch failed:', await postsRes.text())
    return []
  }

  const postsData = await postsRes.json() as { data?: Array<{ id: string }> }
  const posts = postsData.data ?? []

  for (const post of posts) {
    try {
      const insightsRes = await fetch(
        `https://graph.facebook.com/v22.0/${post.id}/insights?` +
        `metric=post_impressions,post_engaged_users,post_clicks,post_reactions_by_type_total` +
        `&access_token=${accessToken}`
      )

      let impressions = 0, engaged = 0, clicks = 0, likes = 0
      if (insightsRes.ok) {
        const insightsData = await insightsRes.json() as {
          data?: Array<{ name: string; values?: Array<{ value: unknown }> }>
        }
        for (const insight of insightsData.data ?? []) {
          const val = insight.values?.[0]?.value ?? 0
          if (insight.name === 'post_impressions') impressions = typeof val === 'number' ? val : 0
          if (insight.name === 'post_engaged_users') engaged = typeof val === 'number' ? val : 0
          if (insight.name === 'post_clicks') clicks = typeof val === 'number' ? val : 0
          if (insight.name === 'post_reactions_by_type_total' && typeof val === 'object' && val !== null) {
            likes = (val as Record<string, number>).like ?? 0
          }
        }
      }

      const detailRes = await fetch(
        `https://graph.facebook.com/v22.0/${post.id}?` +
        `fields=comments.summary(true),shares&access_token=${accessToken}`
      )
      let commentCount = 0, shareCount = 0
      if (detailRes.ok) {
        const detail = await detailRes.json() as {
          comments?: { summary?: { total_count?: number } }
          shares?: { count?: number }
        }
        commentCount = detail.comments?.summary?.total_count ?? 0
        shareCount = detail.shares?.count ?? 0
      }

      metrics.push({
        postExternalId: post.id,
        impressions,
        reach: 0,
        engagements: engaged,
        likes,
        comments: commentCount,
        shares: shareCount,
        saves: 0,
        clicks,
        videoViews: 0,
        videoWatchTimeSeconds: 0,
      })
    } catch (err) {
      console.error(`[Analytics:FB] Error for post ${post.id}:`, err)
    }
  }

  return metrics
}

// ─── Instagram ────────────────────────────────────────────────────────────────

export async function fetchInstagramAnalytics(
  channel: SocialChannel,
  accessTokenEncrypted: string,
  since: string,
  until: string
): Promise<PostMetrics[]> {
  const accessToken = decodeToken(accessTokenEncrypted)
  const metrics: PostMetrics[] = []

  const mediaRes = await fetch(
    `https://graph.facebook.com/v22.0/${channel.channelId}/media?` +
    `fields=id,timestamp,media_type&limit=50&access_token=${accessToken}`
  )
  if (!mediaRes.ok) {
    console.error('[Analytics:IG] Media fetch failed:', await mediaRes.text())
    return []
  }

  const mediaData = await mediaRes.json() as { data?: Array<{ id: string; timestamp?: string }> }
  const media = (mediaData.data ?? []).filter((m) => {
    const ts = m.timestamp?.split('T')[0]
    return ts !== undefined && ts >= since && ts <= until
  })

  for (const item of media) {
    try {
      const insightsRes = await fetch(
        `https://graph.facebook.com/v22.0/${item.id}/insights?` +
        `metric=impressions,reach,likes,comments,shares,saved,plays&access_token=${accessToken}`
      )

      const m: PostMetrics = {
        postExternalId: item.id,
        impressions: 0, reach: 0, engagements: 0,
        likes: 0, comments: 0, shares: 0, saves: 0,
        clicks: 0, videoViews: 0, videoWatchTimeSeconds: 0,
      }

      if (insightsRes.ok) {
        const insightsData = await insightsRes.json() as {
          data?: Array<{ name: string; values?: Array<{ value: unknown }> }>
        }
        for (const insight of insightsData.data ?? []) {
          const val = typeof insight.values?.[0]?.value === 'number'
            ? (insight.values[0].value as number)
            : 0
          if (insight.name === 'impressions') m.impressions = val
          if (insight.name === 'reach') m.reach = val
          if (insight.name === 'likes') m.likes = val
          if (insight.name === 'comments') m.comments = val
          if (insight.name === 'shares') m.shares = val
          if (insight.name === 'saved') m.saves = val
          if (insight.name === 'plays') m.videoViews = val
        }
        m.engagements = m.likes + m.comments + m.shares + m.saves
      }

      metrics.push(m)
    } catch (err) {
      console.error(`[Analytics:IG] Error for media ${item.id}:`, err)
    }
  }

  return metrics
}

// ─── LinkedIn ─────────────────────────────────────────────────────────────────

export async function fetchLinkedInAnalytics(
  channel: SocialChannel,
  accessTokenEncrypted: string,
  since: string,
  _until: string
): Promise<PostMetrics[]> {
  const accessToken = decodeToken(accessTokenEncrypted)
  const sinceTs = new Date(since).getTime()

  const postsRes = await fetch(
    `https://api.linkedin.com/v2/posts?author=urn:li:organization:${channel.channelId}&q=author&count=50&sortBy=LAST_MODIFIED`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'X-Restli-Protocol-Version': '2.0.0',
        'LinkedIn-Version': '202401',
      },
    }
  )

  if (!postsRes.ok) {
    console.error('[Analytics:LI] Posts fetch failed:', postsRes.status)
    return []
  }

  const postsData = await postsRes.json() as {
    elements?: Array<{ id?: string; activity?: string; createdAt?: number }>
  }
  const posts = (postsData.elements ?? []).filter(
    (p) => (p.createdAt ?? 0) >= sinceTs
  )

  const metrics: PostMetrics[] = []

  for (const post of posts) {
    const urn = post.id ?? post.activity
    if (!urn) continue

    try {
      const statsRes = await fetch(
        `https://api.linkedin.com/v2/socialMetadata/${encodeURIComponent(urn)}`,
        { headers: { Authorization: `Bearer ${accessToken}`, 'X-Restli-Protocol-Version': '2.0.0' } }
      )

      let likeCount = 0, commentCount = 0, shareCount = 0
      if (statsRes.ok) {
        const stats = await statsRes.json() as {
          totalLikes?: number
          totalComments?: number
          totalShares?: number
        }
        likeCount = stats.totalLikes ?? 0
        commentCount = stats.totalComments ?? 0
        shareCount = stats.totalShares ?? 0
      }

      metrics.push({
        postExternalId: urn,
        impressions: 0, reach: 0,
        engagements: likeCount + commentCount + shareCount,
        likes: likeCount,
        comments: commentCount,
        shares: shareCount,
        saves: 0, clicks: 0, videoViews: 0, videoWatchTimeSeconds: 0,
      })
    } catch (err) {
      console.error(`[Analytics:LI] Error for post ${urn}:`, err)
    }
  }

  return metrics
}

// ─── TikTok ───────────────────────────────────────────────────────────────────
// Uses Display API video.list (already requested at OAuth: video.list).
// Public video stats: view/like/comment/share counts — no separate insights scope.

export async function fetchTikTokAnalytics(
  channel: SocialChannel,
  accessTokenEncrypted: string,
  since: string,
  until: string
): Promise<PostMetrics[]> {
  const accessToken = decodeToken(accessTokenEncrypted)
  const sinceTs = Math.floor(new Date(`${since}T00:00:00Z`).getTime() / 1000)
  const untilTs = Math.floor(new Date(`${until}T23:59:59Z`).getTime() / 1000)
  const metrics: PostMetrics[] = []

  let cursor: number | undefined
  let hasMore = true
  let pages = 0

  while (hasMore && pages < 5 && metrics.length < 100) {
    pages += 1
    const body: Record<string, unknown> = { max_count: 20 }
    if (cursor !== undefined) body.cursor = cursor

    const res = await fetch(
      'https://open.tiktokapis.com/v2/video/list/?fields=id,create_time,view_count,like_count,comment_count,share_count',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      },
    )

    if (!res.ok) {
      console.error(
        `[Analytics:TT] video.list failed for ${channel.channelId}:`,
        await res.text(),
      )
      return metrics
    }

    const payload = (await res.json()) as {
      data?: {
        videos?: Array<{
          id?: string
          create_time?: number
          view_count?: number
          like_count?: number
          comment_count?: number
          share_count?: number
        }>
        cursor?: number
        has_more?: boolean
      }
      error?: { code?: string; message?: string }
    }

    if (payload.error?.code && payload.error.code !== 'ok') {
      console.error(`[Analytics:TT] API error:`, payload.error.message ?? payload.error.code)
      return metrics
    }

    for (const video of payload.data?.videos ?? []) {
      if (!video.id) continue
      const created = video.create_time ?? 0
      if (created < sinceTs || created > untilTs) continue

      const likes = video.like_count ?? 0
      const comments = video.comment_count ?? 0
      const shares = video.share_count ?? 0
      const views = video.view_count ?? 0

      metrics.push({
        postExternalId: video.id,
        impressions: views,
        reach: 0,
        engagements: likes + comments + shares,
        likes,
        comments,
        shares,
        saves: 0,
        clicks: 0,
        videoViews: views,
        videoWatchTimeSeconds: 0,
      })
    }

    hasMore = Boolean(payload.data?.has_more)
    cursor = payload.data?.cursor
  }

  return metrics
}

// ─── YouTube ──────────────────────────────────────────────────────────────────
// youtube.readonly already requested — channel uploads playlist + video statistics.

export async function fetchYouTubeAnalytics(
  channel: SocialChannel,
  accessTokenEncrypted: string,
  since: string,
  until: string
): Promise<PostMetrics[]> {
  const accessToken = decodeToken(accessTokenEncrypted)
  const sinceIso = `${since}T00:00:00Z`
  const untilIso = `${until}T23:59:59Z`

  const channelParams = new URLSearchParams({
    part: 'contentDetails',
    mine: 'true',
  })
  // Prefer the stored channel id when present (avoids mine=true ambiguity on multi-channel tokens)
  if (channel.channelId) {
    channelParams.delete('mine')
    channelParams.set('id', channel.channelId)
  }

  const channelRes = await fetch(
    `https://www.googleapis.com/youtube/v3/channels?${channelParams}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  )
  if (!channelRes.ok) {
    console.error('[Analytics:YT] channels.list failed:', await channelRes.text())
    return []
  }

  const channelData = (await channelRes.json()) as {
    items?: Array<{ contentDetails?: { relatedPlaylists?: { uploads?: string } } }>
  }
  const uploadsId = channelData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads
  if (!uploadsId) {
    console.warn('[Analytics:YT] No uploads playlist for channel', channel.channelId)
    return []
  }

  const videoIds: string[] = []
  let pageToken: string | undefined
  let pages = 0

  while (pages < 5 && videoIds.length < 50) {
    pages += 1
    const playlistParams = new URLSearchParams({
      part: 'contentDetails,snippet',
      playlistId: uploadsId,
      maxResults: '50',
    })
    if (pageToken) playlistParams.set('pageToken', pageToken)

    const playlistRes = await fetch(
      `https://www.googleapis.com/youtube/v3/playlistItems?${playlistParams}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    )
    if (!playlistRes.ok) {
      console.error('[Analytics:YT] playlistItems.list failed:', await playlistRes.text())
      break
    }

    const playlistData = (await playlistRes.json()) as {
      items?: Array<{
        contentDetails?: { videoId?: string; videoPublishedAt?: string }
        snippet?: { publishedAt?: string }
      }>
      nextPageToken?: string
    }

    let sawOlderThanWindow = false
    for (const item of playlistData.items ?? []) {
      const published =
        item.contentDetails?.videoPublishedAt ?? item.snippet?.publishedAt ?? ''
      if (!published) continue
      if (published < sinceIso) {
        sawOlderThanWindow = true
        continue
      }
      if (published > untilIso) continue
      const id = item.contentDetails?.videoId
      if (id) videoIds.push(id)
    }

    pageToken = playlistData.nextPageToken
    if (!pageToken || sawOlderThanWindow) break
  }

  if (videoIds.length === 0) return []

  const metrics: PostMetrics[] = []
  for (let i = 0; i < videoIds.length; i += 50) {
    const batch = videoIds.slice(i, i + 50)
    const statsRes = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${batch.join(',')}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    )
    if (!statsRes.ok) {
      console.error('[Analytics:YT] videos.list failed:', await statsRes.text())
      break
    }

    const statsData = (await statsRes.json()) as {
      items?: Array<{
        id?: string
        statistics?: {
          viewCount?: string
          likeCount?: string
          commentCount?: string
          favoriteCount?: string
        }
      }>
    }

    for (const item of statsData.items ?? []) {
      if (!item.id) continue
      const views = Number(item.statistics?.viewCount ?? 0) || 0
      const likes = Number(item.statistics?.likeCount ?? 0) || 0
      const comments = Number(item.statistics?.commentCount ?? 0) || 0
      const saves = Number(item.statistics?.favoriteCount ?? 0) || 0

      metrics.push({
        postExternalId: item.id,
        impressions: views,
        reach: 0,
        engagements: likes + comments + saves,
        likes,
        comments,
        shares: 0,
        saves,
        clicks: 0,
        videoViews: views,
        videoWatchTimeSeconds: 0,
      })
    }
  }

  return metrics
}

// ─── Dispatcher ───────────────────────────────────────────────────────────────

export async function fetchAnalyticsForChannel(
  channel: SocialChannel,
  accessTokenEncrypted: string,
  since: string,
  until: string
): Promise<PostMetrics[]> {
  switch (channel.platform) {
    case 'facebook':
      return fetchFacebookAnalytics(channel, accessTokenEncrypted, since, until)
    case 'instagram':
      return fetchInstagramAnalytics(channel, accessTokenEncrypted, since, until)
    case 'linkedin':
      return fetchLinkedInAnalytics(channel, accessTokenEncrypted, since, until)
    case 'tiktok':
      return fetchTikTokAnalytics(channel, accessTokenEncrypted, since, until)
    case 'youtube':
      return fetchYouTubeAnalytics(channel, accessTokenEncrypted, since, until)
    default:
      return []
  }
}
