import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

import { POST } from '../route'

function req() {
  return new NextRequest('https://app.test/api/telegram/approval-callback', { method: 'POST' })
}

describe('POST /api/telegram/approval-callback', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 503 when TELEGRAM_BOT_TOKEN not configured', async () => {
    vi.stubEnv('TELEGRAM_BOT_TOKEN', '')
    vi.stubEnv('TELEGRAM_DECISION_SIGNING_KEY', '')
    const res = await POST(req())
    expect(res.status).toBe(503)
    const body = await res.json()
    expect(body.ok).toBe(false)
  })

  it('returns 501 when tokens configured but subsystem not migrated', async () => {
    vi.stubEnv('TELEGRAM_BOT_TOKEN', 'bot-token')
    vi.stubEnv('TELEGRAM_DECISION_SIGNING_KEY', 'signing-key')
    const res = await POST(req())
    expect(res.status).toBe(501)
    const body = await res.json()
    expect(body.code).toBe('not_connected')
  })
})
