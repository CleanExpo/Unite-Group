import { beforeEach, describe, expect, it, vi } from 'vitest'

const inserts: Array<{ table: string; rows: any[] }> = []
const rpcCalls: string[] = []
let insertError: { message: string } | null = null
let configured = true

vi.mock('@/lib/supabase/service', () => ({
  hasSupabaseServiceConfig: vi.fn(() => configured),
  createServiceClient: vi.fn(() => ({
    rpc: (fn: string) => {
      rpcCalls.push(fn)
      return Promise.resolve({ data: 0, error: null })
    },
    from: (table: string) => ({
      insert: (rows: any[]) => {
        inserts.push({ table, rows })
        return Promise.resolve({ error: insertError })
      },
    }),
  })),
}))

import { POST, __resetRateLimitForTests } from '../route'
import { __resetPurgeThrottleForTests } from '@/lib/analytics/site-events-retention'

const BROWSER_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
const DESKTOP_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36'

function req(body: unknown, headers: Record<string, string> = {}) {
  return new Request('https://unite-group.in/api/events', {
    method: 'POST',
    body: typeof body === 'string' ? body : JSON.stringify(body),
    headers: { 'user-agent': BROWSER_UA, 'x-forwarded-for': '203.0.113.7', ...headers },
  }) as any
}

const VIEW = { event_type: 'page_view', path: '/cards', session_id: 'abc123' }

beforeEach(() => {
  inserts.length = 0
  rpcCalls.length = 0
  __resetPurgeThrottleForTests()
  insertError = null
  configured = true
  __resetRateLimitForTests()
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
})

describe('POST /api/events validation', () => {
  it('stores a valid single event and answers 204', async () => {
    const res = await POST(req(VIEW))
    expect(res.status).toBe(204)
    expect(inserts).toHaveLength(1)
    expect(inserts[0].table).toBe('site_events')
    expect(inserts[0].rows[0]).toMatchObject({ event_type: 'page_view', path: '/cards', session_id: 'abc123', device: 'mobile' })
  })

  it('stores an array of events in one insert', async () => {
    const res = await POST(req([VIEW, { ...VIEW, event_type: 'cta_click', label: 'hero' }]))
    expect(res.status).toBe(204)
    expect(inserts[0].rows).toHaveLength(2)
  })

  it('rejects an unknown event_type', async () => {
    expect((await POST(req({ ...VIEW, event_type: 'keystroke' }))).status).toBe(400)
    expect(inserts).toHaveLength(0)
  })

  it('rejects wrong types', async () => {
    expect((await POST(req({ ...VIEW, path: 42 }))).status).toBe(400)
    expect((await POST(req({ ...VIEW, label: ['x'] }))).status).toBe(400)
    expect(inserts).toHaveLength(0)
  })

  it('rejects an oversize label, session id and utm value', async () => {
    expect((await POST(req({ ...VIEW, label: 'x'.repeat(121) }))).status).toBe(400)
    expect((await POST(req({ ...VIEW, session_id: 's'.repeat(65) }))).status).toBe(400)
    expect((await POST(req({ ...VIEW, utm_source: 'u'.repeat(101) }))).status).toBe(400)
    expect(inserts).toHaveLength(0)
  })

  it('rejects more than 20 events and an empty array', async () => {
    expect((await POST(req(Array.from({ length: 21 }, () => VIEW)))).status).toBe(400)
    expect((await POST(req([]))).status).toBe(400)
    expect((await POST(req(Array.from({ length: 20 }, () => VIEW)))).status).toBe(204)
    expect(inserts).toHaveLength(1)
    expect(inserts[0].rows).toHaveLength(20)
  })

  it('rejects invalid JSON and a path that is not same-site', async () => {
    expect((await POST(req('{nope'))).status).toBe(400)
    expect((await POST(req({ ...VIEW, path: 'https://evil.example/x' }))).status).toBe(400)
    expect((await POST(req({ ...VIEW, path: '//evil.example/x' }))).status).toBe(400)
    expect(inserts).toHaveLength(0)
  })

  it('rejects a body over the byte limit', async () => {
    const res = await POST(req(JSON.stringify({ ...VIEW, referrer: 'r'.repeat(40_000) })))
    expect(res.status).toBe(413)
  })
})

describe('POST /api/events privacy', () => {
  it('honours Do Not Track: 204 and nothing stored', async () => {
    expect((await POST(req(VIEW, { dnt: '1' }))).status).toBe(204)
    expect(inserts).toHaveLength(0)
  })

  it('honours Global Privacy Control: 204 and nothing stored', async () => {
    expect((await POST(req(VIEW, { 'sec-gpc': '1' }))).status).toBe(204)
    expect(inserts).toHaveLength(0)
  })

  it('does not require valid config or body to honour an opt-out', async () => {
    configured = false
    expect((await POST(req('garbage', { dnt: '1' }))).status).toBe(204)
  })

  it('ignores obvious bots and a missing user agent', async () => {
    for (const ua of ['Googlebot/2.1 (+http://www.google.com/bot.html)', 'curl/8.4.0', 'HeadlessChrome/120', '']) {
      expect((await POST(req(VIEW, { 'user-agent': ua }))).status).toBe(204)
    }
    expect(inserts).toHaveLength(0)
  })

  it('strips query strings except utm_* and never stores the full URL', async () => {
    await POST(req({ event_type: 'page_view', path: '/cards/order?email=a%40b.com&utm_source=nrpg&utm_medium=card&utm_campaign=oct&x=1#frag' }))
    const row = inserts[0].rows[0]
    expect(row.path).toBe('/cards/order')
    expect(row).toMatchObject({ utm_source: 'nrpg', utm_medium: 'card', utm_campaign: 'oct' })
    expect(JSON.stringify(row)).not.toContain('a%40b.com')
    expect(JSON.stringify(row)).not.toContain('email')
  })

  it('derives referrer_host only, drops self-referrals and never keeps path or query', async () => {
    await POST(req({ ...VIEW, referrer: 'https://www.google.com/search?q=secret+name&oq=x' }))
    await POST(req({ ...VIEW, referrer: 'https://unite-group.in/cards' }))
    await POST(req({ ...VIEW, referrer: 'javascript:alert(1)' }))
    expect(inserts[0].rows[0].referrer_host).toBe('google.com')
    expect(JSON.stringify(inserts[0].rows[0])).not.toContain('secret')
    expect(inserts[1].rows[0].referrer_host).toBeNull()
    expect(inserts[2].rows[0].referrer_host).toBeNull()
  })

  it('stores country from the CDN header only, and never the IP or user agent', async () => {
    await POST(req(VIEW, { 'x-vercel-ip-country': 'au', 'user-agent': DESKTOP_UA }))
    const row = inserts[0].rows[0]
    expect(row.country).toBe('AU')
    expect(row.device).toBe('desktop')
    const serialised = JSON.stringify(row)
    expect(serialised).not.toContain('203.0.113.7')
    expect(serialised).not.toContain('Mozilla')
    expect(Object.keys(row)).not.toContain('ip')
    expect(Object.keys(row)).not.toContain('user_agent')
  })
})

describe('POST /api/events path, campaign tags and body size', () => {
  it('drops events for paths that are not public pages (founder routes, made-up paths)', async () => {
    expect((await POST(req({ ...VIEW, path: '/founder/contacts/review-person@example.test' }))).status).toBe(400)
    expect((await POST(req({ ...VIEW, path: '/api/leads' }))).status).toBe(400)
    expect(inserts).toHaveLength(0)
    // a mixed batch keeps only the public page
    await POST(req([{ ...VIEW, path: '/founder/x' }, VIEW]))
    expect(inserts[0].rows).toHaveLength(1)
    expect(inserts[0].rows[0].path).toBe('/cards')
  })

  it('drops campaign tags that look personal (email, phone-like digits, free text) but keeps normal tags', async () => {
    await POST(req({ ...VIEW, path: '/cards?utm_campaign=review-person%40example.test&utm_source=nrpg-card&utm_medium=0412345678' }))
    await POST(req({ ...VIEW, utm_campaign: 'jane@example.com', utm_source: 'Oct Launch_2', utm_medium: 'call me on <b>x</b>' }))
    expect(inserts[0].rows[0]).toMatchObject({ utm_campaign: null, utm_source: 'nrpg-card', utm_medium: null })
    expect(inserts[1].rows[0]).toMatchObject({ utm_campaign: null, utm_source: 'Oct Launch_2', utm_medium: null })
  })

  it('measures BYTES not characters: multibyte padding under 32k characters but over 32 KiB is refused', async () => {
    const body = JSON.stringify({ ...VIEW, pad: '\u20ac'.repeat(12_000) }) // ~12k chars, ~36k bytes
    expect(body.length).toBeLessThan(32_768)
    expect(new TextEncoder().encode(body).length).toBeGreaterThan(32_768)
    expect((await POST(req(body))).status).toBe(413)
    expect(inserts).toHaveLength(0)
  })

  it('stops reading a chunked body once the cap is passed (does not buffer it all)', async () => {
    let pulled = 0
    let cancelled = false
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        pulled += 1
        controller.enqueue(new TextEncoder().encode('x'.repeat(8_192)))
        if (pulled > 200) controller.close()
      },
      cancel() {
        cancelled = true
      },
    })
    const request = new Request('https://unite-group.in/api/events', {
      method: 'POST',
      body: stream,
      headers: { 'user-agent': BROWSER_UA, 'x-forwarded-for': '203.0.113.7' },
      // @ts-expect-error duplex is required by undici for stream bodies
      duplex: 'half',
    }) as any
    expect((await POST(request)).status).toBe(413)
    expect(cancelled).toBe(true)
    expect(pulled).toBeLessThan(20)
  })
})

describe('POST /api/events retention', () => {
  it('purges expired rows after a stored event, throttled to once per interval', async () => {
    await POST(req(VIEW))
    await POST(req(VIEW))
    expect(rpcCalls).toEqual(['site_events_purge'])
  })

  it('does not purge when the insert failed, and a purge failure never changes the 204', async () => {
    insertError = { message: 'boom' }
    await POST(req(VIEW))
    expect(rpcCalls).toEqual([])
  })
})

describe('POST /api/events limits and failure', () => {
  it('silently drops (204, nothing stored, no Retry-After) an over-limit caller and leaves others alone', async () => {
    const statuses: number[] = []
    let last: Response | undefined
    for (let i = 0; i < 61; i++) {
      last = await POST(req(VIEW))
      statuses.push(last.status)
    }
    expect(statuses.every((s) => s === 204)).toBe(true)
    expect(last!.headers.get('retry-after')).toBeNull()
    expect(inserts).toHaveLength(60) // the 61st was dropped, not stored
    expect((await POST(req(VIEW, { 'x-forwarded-for': '198.51.100.9' }))).status).toBe(204)
    expect(inserts).toHaveLength(61)
  })

  it('fails closed with 503 and a log line when the service client is not configured', async () => {
    configured = false
    const res = await POST(req(VIEW))
    expect(res.status).toBe(503)
    expect(inserts).toHaveLength(0)
    expect(console.error).toHaveBeenCalled()
    expect(await res.text()).not.toMatch(/at \S+ \(/)
  })

  it('answers 503, not 500, when the insert fails', async () => {
    insertError = { message: 'boom' }
    const res = await POST(req(VIEW))
    expect(res.status).toBe(503)
    expect(console.error).toHaveBeenCalled()
  })
})
