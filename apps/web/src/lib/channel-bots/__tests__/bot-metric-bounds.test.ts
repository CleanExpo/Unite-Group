import { describe, it, expect } from 'vitest'
import { youtubeBot } from '../youtube-bot'
import { searchConsoleBot } from '../search-console-bot'

// Raw JSON text, so a literal such as 1e400 parses to Infinity exactly as a live response would.
const rawJson = (text: string) => ({ ok: true, status: 200, json: async () => JSON.parse(text) }) as Response
const ctx = (text: string) => ({
  founderId: 'f',
  accountEmail: 'a',
  getGoogleToken: async () => 't',
  fetchImpl: (async () => rawJson(text)) as unknown as typeof fetch,
})

describe('channel bot metric bounds', () => {
  it('youtube bot rejects counts that overflow to Infinity or exceed safe integers', async () => {
    const huge = '9'.repeat(400)
    expect(Number(huge)).toBe(Infinity)
    for (const stats of [
      { subscriberCount: huge, videoCount: '1', viewCount: '1' },
      { subscriberCount: '1', videoCount: huge, viewCount: '1' },
      { subscriberCount: '1', videoCount: '1', viewCount: '9007199254740993' },
    ]) {
      const r = await youtubeBot.run(ctx(JSON.stringify({ items: [{ snippet: { title: 'UG' }, statistics: stats }] })))
      expect(r.status).toBe('error')
      expect(r.metrics).toBeUndefined()
      expect(r.actions).toEqual([])
    }
  })

  it('youtube bot still accepts ordinary counts', async () => {
    const r = await youtubeBot.run(ctx(JSON.stringify({ items: [{ snippet: { title: 'UG' }, statistics: { subscriberCount: '0', videoCount: '12', viewCount: '9007199254740991' } }] })))
    expect(r.status).toBe('ok')
    expect(r.metrics).toEqual({ title: 'UG', subscribers: 0, videos: 12, views: 9007199254740991 })
  })

  it('search console bot rejects non-finite or negative metrics', async () => {
    for (const row of ['{"clicks":1e400,"impressions":2,"position":3}', '{"clicks":1,"impressions":-1e400,"position":3}', '{"clicks":1,"impressions":2,"position":1e400}', '{"clicks":-1,"impressions":2,"position":3}']) {
      const parsed = JSON.parse(`{"rows":[${row}]}`)
      const values = Object.values(parsed.rows[0] as Record<string, number>)
      expect(values.some((v) => !Number.isFinite(v) || v < 0)).toBe(true)
      const r = await searchConsoleBot.run(ctx(`{"rows":[${row}]}`))
      expect(r.status).toBe('error')
      expect(r.metrics).toBeUndefined()
      expect(r.actions).toEqual([])
    }
  })

  it('search console bot still accepts ordinary metrics', async () => {
    const r = await searchConsoleBot.run(ctx('{"rows":[{"clicks":0,"impressions":90,"position":12.34}]}'))
    expect(r.status).toBe('ok')
    expect(r.metrics).toEqual({ clicks28d: 0, impressions28d: 90, avgPosition: 12.3 })
  })
})
