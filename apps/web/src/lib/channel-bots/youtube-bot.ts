import { type ChannelBot, YOUTUBE_CHANNEL_ID } from './types'

/** UNI-3224 — read-only YouTube bot for @UniteGroupNexus. */
export const youtubeBot: ChannelBot = {
  id: 'youtube',
  async run(ctx) {
    const f = ctx.fetchImpl ?? fetch
    let token: string
    try {
      token = await ctx.getGoogleToken()
    } catch {
      return { bot: 'youtube', status: 'not_connected', actions: [], error: `Google not connected for ${ctx.accountEmail}` }
    }
    const res = await f(
      `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${YOUTUBE_CHANNEL_ID}`,
      { headers: { Authorization: `Bearer ${token}` } },
    )
    if (!res.ok) return { bot: 'youtube', status: 'error', actions: [], error: `YouTube API ${res.status}` }
    const data = (await res.json()) as {
      items?: Array<{ snippet?: { title?: string }; statistics?: { subscriberCount?: string; videoCount?: string; viewCount?: string } }>
    }
    const ch = data.items?.[0]
    if (!ch) return { bot: 'youtube', status: 'error', actions: [], error: 'Channel not found' }
    const metrics = {
      title: ch.snippet?.title ?? '',
      subscribers: Number(ch.statistics?.subscriberCount ?? 0),
      videos: Number(ch.statistics?.videoCount ?? 0),
      views: Number(ch.statistics?.viewCount ?? 0),
    }
    return {
      bot: 'youtube',
      status: 'ok',
      metrics,
      actions: [{ bot: 'youtube', kind: 'report', summary: `YouTube: ${metrics.subscribers} subs, ${metrics.videos} videos, ${metrics.views} views` }],
    }
  },
}
