import { createHmac } from 'node:crypto'

/**
 * Keyed hash used to recognise a repeat enquiry (same founder, email and package).
 * It is an HMAC under ALERT_DEDUP_SECRET so a stored value cannot be recomputed from an
 * email address alone. Returns null when the secret is unset: the alert then goes out
 * without duplicate suppression (a possible second email, never silence).
 */
export function dedupKey(founder: string, email: string, label: string): string | null {
  const secret = process.env.ALERT_DEDUP_SECRET?.trim()
  if (!secret) return null
  return createHmac('sha256', secret).update(`${founder}|${email.toLowerCase()}|${label}`).digest('hex')
}
