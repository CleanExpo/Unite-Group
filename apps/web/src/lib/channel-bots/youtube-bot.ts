import { type ChannelBot, YOUTUBE_CHANNEL_ID } from './types'
import { GOOGLE_REQUEST_TIMEOUT_MS, errorMessage, tokenFailureStatus, withDeadline } from './google-request'

/** UNI-3224 — read-only YouTube bot for @UniteGroupNexus. */
export const youtubeBot: ChannelBot = {
  id: 'youtube',
  async run(ctx) {
    const f = ctx.fetchImpl ?? fetch
    let token: string
    try {
      token = await withDeadline(ctx.getGoogleToken(), 'Google token request')
    } catch (e) {
      const status = tokenFailureStatus(e)
      return status === 'not_connected'
        ? { bot: 'youtube', status, actions: [], error: `Google not connected for ${ctx.accountEmail}` }
        : { bot: 'youtube', status, actions: [], error: `Google token unavailable: ${errorMessage(e)}` }
    }
    let res: Response
    try {
      res = await f(
        `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${YOUTUBE_CHANNEL_ID}`,
        { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(GOOGLE_REQUEST_TIMEOUT_MS) },
      )
    } catch (e) {
      return { bot: 'youtube', status: 'error', actions: [], error: `YouTube request failed: ${errorMessage(e)}` }
    }
    if (!res.ok) return { bot: 'youtube', status: 'error', actions: [], error: `YouTube API ${res.status}` }
    const data = (await res.json()) as {
      items?: Array<{ snippet?: { title?: string }; statistics?: { subscriberCount?: string; videoCount?: string; viewCount?: string } }>
    }
    const ch = data.items?.[0]
    if (!ch) return { bot: 'youtube', status: 'error', actions: [], error: 'Channel not found' }
    // Never report missing, malformed or overflowing statistics as measured values.
    const stat = (v: unknown) => {
      if (typeof v !== 'string' || !/^\d+$/.test(v)) return null
      const n = Number(v)
      return Number.isSafeInteger(n) ? n : null
    }
    const subscribers = stat(ch.statistics?.subscriberCount)
    const videos = stat(ch.statistics?.videoCount)
    const views = stat(ch.statistics?.viewCount)
    if (subscribers === null || videos === null || views === null) {
      return { bot: 'youtube', status: 'error', actions: [], error: 'YouTube returned missing or malformed statistics' }
    }
    const metrics = { title: ch.snippet?.title ?? '', subscribers, videos, views }
    return {
      bot: 'youtube',
      status: 'ok',
      metrics,
      actions: [{ bot: 'youtube', kind: 'report', summary: `YouTube: ${metrics.subscribers} subs, ${metrics.videos} videos, ${metrics.views} views` }],
    }
  },
}
