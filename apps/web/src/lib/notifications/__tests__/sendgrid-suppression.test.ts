import { describe, expect, it, vi } from 'vitest'
import { checkSuppression } from '../sendgrid-suppression'

const TO = 'destination@example.invalid'
const reply = (status: number, body: unknown) => ({ ok: status >= 200 && status < 300, status, json: async () => body }) as Response
/** Every list answers `empty` (200, no entry) except the ones named in `overrides`. */
function fetcher(overrides: Record<string, Response | Error> = {}, empty: unknown = []) {
  return vi.fn(async (url: string | URL) => {
    const path = String(url)
    for (const [needle, response] of Object.entries(overrides)) {
      if (path.includes(needle)) {
        if (response instanceof Error) throw response
        return response
      }
    }
    return path.includes('/asm/') ? reply(200, {}) : reply(200, empty)
  })
}
const run = (fetchImpl: ReturnType<typeof fetcher>) => checkSuppression(TO, { apiKey: 'test-placeholder', fetchImpl: fetchImpl as unknown as typeof fetch })

describe('SendGrid destination suppression check', () => {
  it('is clear when no list holds the address', async () => {
    const f = fetcher()
    expect(await run(f)).toBe('clear')
    expect(f).toHaveBeenCalledTimes(6)
    for (const [url, init] of f.mock.calls as unknown as Array<[string, RequestInit]>) {
      expect(url).toContain(encodeURIComponent(TO))
      expect((init.headers as Record<string, string>).Authorization).toBe('Bearer test-placeholder')
    }
  })

  it.each(['bounces', 'blocks', 'spam_reports', 'invalid_emails', 'unsubscribes'])('is suppressed when the %s list holds the address', async (list) => {
    expect(await run(fetcher({ [`/suppression/${list}/`]: reply(200, [{ email: TO }]) }))).toBe('suppressed')
  })

  it('is suppressed when the global unsubscribe group holds the address', async () => {
    expect(await run(fetcher({ '/asm/suppressions/global/': reply(200, { recipient_email: TO }) }))).toBe('suppressed')
  })

  it('suppressed wins over a list that could not be read', async () => {
    expect(await run(fetcher({ '/suppression/bounces/': reply(200, [{ email: TO }]), '/suppression/blocks/': reply(403, {}) }))).toBe('suppressed')
  })

  it.each([[401], [403], [500]])('is unknown, never clear, when a list answers %s (key lacks the scope or SendGrid is down)', async (status) => {
    expect(await run(fetcher({ '/suppression/blocks/': reply(status, {}) }))).toBe('unknown')
  })

  it('is unknown when a request throws or the body is not what SendGrid documents', async () => {
    expect(await run(fetcher({ '/suppression/blocks/': new Error('network') }))).toBe('unknown')
    expect(await run(fetcher({}, 'not-an-array'))).toBe('unknown')
  })

  it('is unknown without a key or an address, without calling SendGrid', async () => {
    const f = fetcher()
    expect(await checkSuppression(TO, { apiKey: '', fetchImpl: f as unknown as typeof fetch })).toBe('unknown')
    expect(await checkSuppression('', { apiKey: 'test-placeholder', fetchImpl: f as unknown as typeof fetch })).toBe('unknown')
    expect(f).not.toHaveBeenCalled()
  })
})
