import { describe, it, expect, vi, beforeEach } from 'vitest'

const persist = vi.fn(async () => 'insight-1')
vi.mock('@/lib/cron-auth', () => ({ assertCronAuth: () => null }))
vi.mock('@/lib/supabase/service', () => ({ createServiceClient: () => ({}) }))
vi.mock('@/lib/integrations/google-oauth', () => ({ getAccessTokenForEmail: async () => 'tok' }))
vi.mock('@/lib/channel-bots/persist', () => ({ persistChannelBotRun: (...a: unknown[]) => persist(...(a as [])) }))

const json = (body: unknown, ok = true) => ({ ok, status: ok ? 200 : 403, json: async () => body }) as Response

describe('GET /api/cron/channel-bots', () => {
  beforeEach(() => {
    process.env.FOUNDER_USER_ID = 'f'
    process.env.CHANNEL_BOTS_ARMED = 'true'
    persist.mockClear()
  })

  it('returns 502 and stores the error when one bot fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) =>
      String(url).includes('youtube')
        ? json({ items: [{ snippet: { title: 'UG' }, statistics: { subscriberCount: '1', videoCount: '1', viewCount: '1' } }] })
        : json({}, false)))
    const { GET } = await import('../route')
    const res = await GET(new Request('http://x/api/cron/channel-bots'))
    expect(res.status).toBe(502)
    const stored = (persist.mock.calls[0] as unknown[])[2] as { anyFailed: boolean; results: Array<{ bot: string; status: string }> }
    expect(stored.anyFailed).toBe(true)
    expect(stored.results.find((r) => r.bot === 'search-console')?.status).toBe('error')
  })

  it('stays dormant and writes nothing unless armed', async () => {
    delete process.env.CHANNEL_BOTS_ARMED
    const f = vi.fn()
    vi.stubGlobal('fetch', f)
    const { GET } = await import('../route')
    const res = await GET(new Request('http://x/api/cron/channel-bots'))
    expect(await res.json()).toEqual({ armed: false, skipped: true })
    expect(f).not.toHaveBeenCalled()
    expect(persist).not.toHaveBeenCalled()
  })

  it('returns 200 when every built bot succeeds', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) =>
      String(url).includes('youtube')
        ? json({ items: [{ snippet: { title: 'UG' }, statistics: {} }] })
        : json({ rows: [{ clicks: 1, impressions: 2, position: 3 }] })))
    const { GET } = await import('../route')
    const res = await GET(new Request('http://x/api/cron/channel-bots'))
    expect(res.status).toBe(200)
  })
})
