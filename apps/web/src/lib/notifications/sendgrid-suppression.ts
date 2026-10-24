// Read-only check of whether SendGrid will silently drop mail to one address.
// A suppressed recipient still gets HTTP 202 from the send API, so the send path
// cannot see it. These lists can: bounces, blocks, spam reports, invalid emails,
// unsubscribes and the global unsubscribe group. Needs a key with Suppressions
// Read; without it every answer is 'unknown', which is never reported as clear.

export type SuppressionState = 'clear' | 'suppressed' | 'unknown'

const LISTS = ['bounces', 'blocks', 'spam_reports', 'invalid_emails', 'unsubscribes'] as const
const BASE = 'https://api.sendgrid.com/v3'

export async function checkSuppression(
  address: string,
  { apiKey, fetchImpl = fetch, timeoutMs = 4000 }: { apiKey: string | undefined; fetchImpl?: typeof fetch; timeoutMs?: number },
): Promise<SuppressionState> {
  const key = apiKey?.trim()
  const to = address.trim()
  if (!key || !to) return 'unknown'
  const encoded = encodeURIComponent(to)
  const urls = [...LISTS.map((list) => `${BASE}/suppression/${list}/${encoded}`), `${BASE}/asm/suppressions/global/${encoded}`]
  const states = await Promise.all(urls.map(async (url): Promise<SuppressionState> => {
    try {
      const response = await fetchImpl(url, {
        headers: { Authorization: `Bearer ${key}` },
        signal: AbortSignal.timeout(timeoutMs),
        redirect: 'error',
      })
      if (!response.ok) return 'unknown'
      const body: unknown = await response.json()
      if (url.includes('/asm/')) {
        if (body && typeof body === 'object' && !Array.isArray(body)) {
          return 'recipient_email' in body ? 'suppressed' : 'clear'
        }
        return 'unknown'
      }
      if (!Array.isArray(body)) return 'unknown'
      return body.length > 0 ? 'suppressed' : 'clear'
    } catch {
      return 'unknown'
    }
  }))
  if (states.includes('suppressed')) return 'suppressed'
  return states.every((state) => state === 'clear') ? 'clear' : 'unknown'
}
