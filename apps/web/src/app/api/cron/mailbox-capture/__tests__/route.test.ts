import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/lib/margot/capture-store', () => ({ createCaptureStore: vi.fn() }))
vi.mock('@/lib/margot/google-fetcher', () => ({ googleFetcher: {} }))
vi.mock('@/lib/margot/capture', () => ({
  planCapture: vi.fn(),
  uncapturedAccounts: vi.fn(() => []),
}))

import { createCaptureStore } from '@/lib/margot/capture-store'
import { GET } from '../route'

function req(auth?: string) {
  return new Request('https://app.test/api/cron/mailbox-capture', {
    headers: auth ? { authorization: auth } : {},
  })
}

describe('GET /api/cron/mailbox-capture — auth guard (UNI-2153 §1)', () => {
  const prevSecret = process.env.CRON_SECRET
  const prevEnabled = process.env.MAILBOX_CAPTURE_ENABLED

  beforeEach(() => vi.clearAllMocks())
  afterEach(() => {
    if (prevSecret === undefined) delete process.env.CRON_SECRET
    else process.env.CRON_SECRET = prevSecret
    if (prevEnabled === undefined) delete process.env.MAILBOX_CAPTURE_ENABLED
    else process.env.MAILBOX_CAPTURE_ENABLED = prevEnabled
  })

  it('rejects `Bearer undefined` when CRON_SECRET is unset — never 200 (no bypass)', async () => {
    delete process.env.CRON_SECRET
    const res = await GET(req('Bearer undefined'))
    // The unset-secret guard fires BEFORE the compare: 500, not a 200 bypass.
    expect(res.status).toBe(500)
    expect(res.status).not.toBe(200)
    expect((await res.json()).error).toMatch(/CRON_SECRET/)
    // Never reached the capture work.
    expect(createCaptureStore).not.toHaveBeenCalled()
  })

  it('rejects an empty bearer when CRON_SECRET is unset', async () => {
    delete process.env.CRON_SECRET
    const res = await GET(req('Bearer '))
    expect(res.status).toBe(500)
  })

  it('returns 401 for a wrong secret when CRON_SECRET IS configured', async () => {
    process.env.CRON_SECRET = 'real-secret'
    const res = await GET(req('Bearer wrong'))
    expect(res.status).toBe(401)
    expect(createCaptureStore).not.toHaveBeenCalled()
  })

  it('passes auth with the right secret, then reports dormant while disabled', async () => {
    process.env.CRON_SECRET = 'real-secret'
    delete process.env.MAILBOX_CAPTURE_ENABLED
    const res = await GET(req('Bearer real-secret'))
    expect(res.status).toBe(200)
    expect((await res.json()).dormant).toBe(true)
    expect(createCaptureStore).not.toHaveBeenCalled()
  })
})
