// Shared Google-call guards for the channel bots (UNI-3223).

/** Deadline for one Google API call, well inside the cron route's 60 s maxDuration. */
export const GOOGLE_REQUEST_TIMEOUT_MS = 15_000

/**
 * Classify a getGoogleToken() failure. Only a missing credential or a grant Google
 * refused on refresh (400/401: revoked or expired) means "not connected". A Google
 * 5xx, a network failure or a vault error is an error, so the founder is never told
 * to reconnect an account that is in fact connected.
 */
export function tokenFailureStatus(e: unknown): 'not_connected' | 'error' {
  const msg = e instanceof Error ? e.message : String(e)
  if (/^No Google credentials found\b/.test(msg) || msg === 'No refresh token available') return 'not_connected'
  if (/^Token refresh failed: (400|401)$/.test(msg)) return 'not_connected'
  return 'error'
}

export function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}
