import { describe, it, expect, vi, afterEach } from 'vitest'
import { youtubeBot } from '../youtube-bot'
import { searchConsoleBot } from '../search-console-bot'
import type { ChannelBotContext } from '../types'

const ok = (body: unknown) => ({ ok: true, status: 200, json: async () => body }) as Response
const ctx = (fetchImpl: unknown, getGoogleToken: () => Promise<string> = async () => 't'): ChannelBotContext => ({
  founderId: 'f',
  accountEmail: 'contact@unite-group.in',
  getGoogleToken,
  fetchImpl: fetchImpl as typeof fetch,
})

afterEach(() => vi.useRealTimers())

describe('channel bot request safety', () => {
  it('search console asks for exactly 28 inclusive dates', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-04T05:00:00Z'))
    const f = vi.fn(async (_url: string, _init?: RequestInit) => ok({ rows: [] }))
    await searchConsoleBot.run(ctx(f))
    const body = JSON.parse(String(f.mock.calls[0][1]?.body)) as { startDate: string; endDate: string }
    expect(body.endDate).toBe('2026-11-04')
    expect(body.startDate).toBe('2026-10-08')
    const days = (Date.parse(body.endDate) - Date.parse(body.startDate)) / 86400000 + 1
    expect(days).toBe(28)
  })

  it('both bots send an abort signal so a stalled Google call cannot hang the run', async () => {
    const yt = vi.fn(async (_url: string, _init?: RequestInit) => ok({ items: [] }))
    const sc = vi.fn(async (_url: string, _init?: RequestInit) => ok({ rows: [] }))
    await youtubeBot.run(ctx(yt))
    await searchConsoleBot.run(ctx(sc))
    expect(yt.mock.calls[0][1]?.signal).toBeInstanceOf(AbortSignal)
    expect(sc.mock.calls[0][1]?.signal).toBeInstanceOf(AbortSignal)
  })

  it('a timed-out or failed Google request is an error result, not a thrown run', async () => {
    const timeout = vi.fn(async () => { throw new DOMException('The operation was aborted due to timeout', 'TimeoutError') })
    for (const bot of [youtubeBot, searchConsoleBot]) {
      const r = await bot.run(ctx(timeout))
      expect(r.status).toBe('error')
      expect(r.metrics).toBeUndefined()
      expect(r.actions).toEqual([])
    }
  })

  it('only a missing credential or a revoked grant reads as not_connected; other token failures are errors', async () => {
    const cases: Array<[string, string]> = [
      ['No Google credentials found for contact@unite-group.in', 'not_connected'],
      ['No refresh token available', 'not_connected'],
      ['Token refresh failed: 400', 'not_connected'],
      ['Token refresh failed: 401', 'not_connected'],
      ['Token refresh failed: 503', 'error'],
      ['fetch failed', 'error'],
      ['Google credentials read failed: connection refused', 'error'],
    ]
    for (const bot of [youtubeBot, searchConsoleBot]) {
      for (const [message, status] of cases) {
        const f = vi.fn()
        const r = await bot.run(ctx(f, async () => { throw new Error(message) }))
        expect([bot.id, message, r.status]).toEqual([bot.id, message, status])
        expect(f).not.toHaveBeenCalled()
      }
    }
  })

  it('a token fetch that never settles is an error result once the request deadline passes', async () => {
    vi.useFakeTimers()
    for (const bot of [youtubeBot, searchConsoleBot]) {
      const f = vi.fn()
      const pending = bot.run(ctx(f, () => new Promise<string>(() => {})))
      await vi.advanceTimersByTimeAsync(15_000)
      const r = await pending
      expect([bot.id, r.status]).toEqual([bot.id, 'error'])
      expect(r.error).toMatch(/timed out/)
      expect(f).not.toHaveBeenCalled()
    }
  })
})
