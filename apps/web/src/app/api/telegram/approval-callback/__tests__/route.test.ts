import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

import { POST } from '../route'

function req() {
  return new NextRequest('https://app.test/api/telegram/approval-callback', { method: 'POST' })
}

/** A POST carrying a callback_query from a given chat id — the shape the chat-id guard inspects. */
function reqFromChat(chatId: string | number) {
  return new NextRequest('https://app.test/api/telegram/approval-callback', {
    method: 'POST',
    body: JSON.stringify({
      callback_query: { id: 'cbq-1', data: 'approve:draft-1', message: { chat: { id: chatId } } },
    }),
  })
}

/** Everything the route needs before it reaches the chat-id guard. */
function stubConfigured() {
  vi.stubEnv('TELEGRAM_BOT_TOKEN', 'bot-token')
  vi.stubEnv('TELEGRAM_DECISION_SIGNING_KEY', 'signing-key')
  vi.stubEnv('MARGOT_DRAFTS_ENABLED', 'true')
  vi.stubEnv('FOUNDER_USER_ID', 'founder-uid')
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

  it('is dormant when tokens configured but MARGOT_DRAFTS_ENABLED not set', async () => {
    vi.stubEnv('TELEGRAM_BOT_TOKEN', 'bot-token')
    vi.stubEnv('TELEGRAM_DECISION_SIGNING_KEY', 'signing-key')
    vi.stubEnv('MARGOT_DRAFTS_ENABLED', '')
    const res = await POST(req())
    const body = await res.json()
    expect(body.ok).toBe(false)
    expect(body.dormant).toBe(true)
  })

  // The chat-id guard is what stops a stranger's Telegram chat approving a
  // draft — and approving here SENDS MAIL AS THE FOUNDER. It was previously
  // written `if (process.env.TELEGRAM_CHAT_ID && chatId !== ...)`, so an unset
  // variable skipped the check rather than disabling the feature. It was also
  // untested, which is how that survived.
  describe('chat-id guard', () => {
    it('fails CLOSED with 500 when TELEGRAM_CHAT_ID is unset', async () => {
      stubConfigured()
      vi.stubEnv('TELEGRAM_CHAT_ID', '')
      const res = await POST(reqFromChat('999999'))
      expect(res.status).toBe(500)
      const body = await res.json()
      expect(body.ok).toBe(false)
      expect(body.reason).toContain('TELEGRAM_CHAT_ID')
    })

    it('rejects a chat that is not the founder chat', async () => {
      stubConfigured()
      vi.stubEnv('TELEGRAM_CHAT_ID', '123456')
      const res = await POST(reqFromChat('999999'))
      expect(res.status).toBe(403)
      const body = await res.json()
      expect(body.reason).toBe('chat not permitted')
    })

    // Negative control: without this, "reject everything" would satisfy both
    // assertions above while breaking the founder's own approvals.
    //
    // Passing the guard is proven by how far execution gets: the matching chat
    // reaches createMargotDraftStore() on the next line, which throws here
    // because Supabase env is not configured under test. That throw is the
    // evidence — a chat blocked by the guard returns a 403/500 RESPONSE and
    // never reaches the store at all.
    it('lets the founder chat through the guard', async () => {
      stubConfigured()
      vi.stubEnv('TELEGRAM_CHAT_ID', '123456')
      await expect(POST(reqFromChat('123456'))).rejects.toThrow(/Supabase/i)
    })

    it('a rejected chat never reaches the draft store', async () => {
      // The other half of the same discrimination: a non-matching chat must
      // return a response rather than throw, i.e. it stopped at the guard.
      stubConfigured()
      vi.stubEnv('TELEGRAM_CHAT_ID', '123456')
      const res = await POST(reqFromChat('999999'))
      expect(res.status).toBe(403)
    })
  })
})
