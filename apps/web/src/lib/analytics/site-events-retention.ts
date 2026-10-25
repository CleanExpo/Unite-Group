// src/lib/analytics/site-events-retention.ts
// Retention for site_events (13 months). Vercel team crons are stopped, so nothing scheduled is
// proof of deletion. Instead the purge runs opportunistically from paths that DO run whenever the
// site is used: the intake route (after a stored event) and the founder analytics page load.
// It is throttled per server instance (including a bounded retry delay after a failure, so a
// database outage cannot turn every request into a purge call), cheap (one indexed delete on
// occurred_at) and never throws.
// Guarantee, and the only thing the privacy policy may claim: while the site is in use, records
// older than 13 months are deleted within about a day of being eligible. A completely idle site
// runs no purge.

export const PURGE_INTERVAL_MS = 6 * 60 * 60 * 1000
export const PURGE_RETRY_MS = 5 * 60 * 1000

type PurgeClient = {
  rpc(fn: 'site_events_purge'): PromiseLike<{ data: unknown; error: { message: string } | null }>
}

let nextAttemptAt = 0

/** Test hook. */
export function __resetPurgeThrottleForTests() {
  nextAttemptAt = 0
}

/** Returns true when a purge was attempted and succeeded. Never throws. */
export async function maybePurgeSiteEvents(client: PurgeClient, now = Date.now()): Promise<boolean> {
  if (now < nextAttemptAt) return false
  nextAttemptAt = now + PURGE_INTERVAL_MS
  try {
    const { error } = await client.rpc('site_events_purge')
    if (error) {
      nextAttemptAt = now + PURGE_RETRY_MS // bounded retry, UNI-3004
      console.error('[events] retention purge failed:', error.message)
      return false
    }
    return true
  } catch (err) {
    nextAttemptAt = now + PURGE_RETRY_MS // bounded retry, UNI-3004
    console.error('[events] retention purge failed:', err instanceof Error ? err.message : String(err))
    return false
  }
}
