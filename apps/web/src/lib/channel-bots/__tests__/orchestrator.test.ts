import { describe, it, expect, vi } from 'vitest'
import { gateActions, runChannelBots } from '../orchestrator'
import { youtubeBot } from '../youtube-bot'
import { searchConsoleBot } from '../search-console-bot'

const json = (body: unknown, ok = true) => ({ ok, status: ok ? 200 : 403, json: async () => body }) as Response

describe('channel bots', () => {
  it('holds public posts for approval, lets reports through', () => {
    const { ready, held } = gateActions([
      { bot: 'youtube', kind: 'report', summary: 'r' },
      { bot: 'x', kind: 'public_post', summary: 'p' },
    ])
    expect(ready.map((a) => a.summary)).toEqual(['r'])
    expect(held.map((a) => a.summary)).toEqual(['p'])
    expect(gateActions([{ bot: 'x', kind: 'public_post', summary: 'p' }], new Set(['p'])).ready).toHaveLength(1)
  })

  it('youtube bot reports channel stats', async () => {
    const fetchImpl = vi.fn(async () => json({ items: [{ snippet: { title: 'UG' }, statistics: { subscriberCount: '5', videoCount: '3', viewCount: '100' } }] }))
    const r = await youtubeBot.run({ founderId: 'f', accountEmail: 'a', getGoogleToken: async () => 't', fetchImpl: fetchImpl as unknown as typeof fetch })
    expect(r.status).toBe('ok')
    expect(r.metrics?.subscribers).toBe(5)
  })

  it('search console bot reports totals', async () => {
    const fetchImpl = vi.fn(async () => json({ rows: [{ clicks: 4, impressions: 90, position: 12.34 }] }))
    const r = await searchConsoleBot.run({ founderId: 'f', accountEmail: 'a', getGoogleToken: async () => 't', fetchImpl: fetchImpl as unknown as typeof fetch })
    expect(r.metrics).toEqual({ clicks28d: 4, impressions28d: 90, avgPosition: 12.3 })
  })

  it('reports not_connected when Google is not linked', async () => {
    const out = await runChannelBots({ founderId: 'f', accountEmail: 'a', getGoogleToken: async () => { throw new Error('x') } })
    expect(out.results.find((r) => r.bot === 'youtube')?.status).toBe('not_connected')
    expect(out.results.filter((r) => r.status === 'not_built')).toHaveLength(5)
  })
})
