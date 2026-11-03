import { describe, it, expect, vi } from 'vitest'
import { actionId, gateActions, runChannelBots } from '../orchestrator'
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
    const approved = { bot: 'x' as const, kind: 'public_post' as const, summary: 'same', payload: { text: 'approved' } }
    const tampered = { ...approved, payload: { text: 'different' } }
    const other = { ...approved, bot: 'linkedin' as const }
    const out = gateActions([approved, tampered, other], new Set([actionId(approved)]))
    expect(out.ready).toEqual([approved])
    expect(out.held).toHaveLength(2)
    expect(gateActions([approved], new Set(['same'])).held).toHaveLength(1)
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

  it('search console bot never reports missing data as zeros', async () => {
    const run = (body: unknown) => searchConsoleBot.run({ founderId: 'f', accountEmail: 'a', getGoogleToken: async () => 't', fetchImpl: (async () => json(body)) as unknown as typeof fetch })
    const empty = await run({})
    expect(empty.metrics).toEqual({ dataAvailable: 'no' })
    expect(empty.actions[0].summary).not.toMatch(/0 clicks/)
    const bad = await run({ rows: [{ clicks: 'x' }] })
    expect(bad.status).toBe('error')
  })

  it('reports not_connected when Google is not linked', async () => {
    const out = await runChannelBots({ founderId: 'f', accountEmail: 'a', getGoogleToken: async () => { throw new Error('x') } })
    expect(out.results.find((r) => r.bot === 'youtube')?.status).toBe('not_connected')
    expect(out.results.filter((r) => r.status === 'not_built')).toHaveLength(5)
    expect(out.allFailed).toBe(true)
  })
})
