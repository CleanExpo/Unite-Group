// Pre-database guard for the public card enquiry action. Pure and clock/store-injected so it is unit-testable.
// Decides before any database client is built; every refusal is a plain error, never a receipt.
// The rate limit is in memory (per server instance), the same shape as the /api/events limiter (UNI-3002).
// A server action POSTs to /c/<slug>, which the /api/* proxy limiter does not cover, so this is the only per-caller cap
// ahead of the database function's own per-card hourly cap.

export const MIN_FILL_MS = 3_000
export const MAX_AGE_MS = 24 * 60 * 60 * 1000
export const WINDOW_MS = 10 * 60 * 1000
export const MAX_PER_WINDOW = 5
const MAX_TRACKED = 5_000

export interface GuardInput {
  consent?: unknown
  website?: unknown
  startedAt?: unknown
}
export type GuardRefusal = { ok: false; status: 400 | 429; error: string }

type Entry = { count: number; windowStart: number }
export interface RateStore {
  /** Count this hit; true when the caller is now over the limit. */
  hit(key: string, now: number): boolean
  size(): number
}

export function createRateStore(maxTracked = MAX_TRACKED): RateStore {
  const hits = new Map<string, Entry>()
  return {
    hit(key, now) {
      if (hits.size >= maxTracked && !hits.has(key)) {
        for (const [k, v] of hits) if (now - v.windowStart >= WINDOW_MS) hits.delete(k)
        // Still full: drop only the oldest entry (Map keeps insertion order), never every caller's count at once.
        if (hits.size >= maxTracked) hits.delete(hits.keys().next().value as string)
      }
      const entry = hits.get(key)
      if (!entry || now - entry.windowStart >= WINDOW_MS) {
        hits.set(key, { count: 1, windowStart: now })
        return false
      }
      entry.count += 1
      return entry.count > MAX_PER_WINDOW
    },
    size: () => hits.size,
  }
}

const defaultStore = createRateStore()

/**
 * The caller's address: the platform header first (the proxy limiter's choice), then the first x-forwarded-for hop, then
 * x-real-ip. null when none is present.
 */
export function clientIpFrom(h: Pick<Headers, 'get'>): string | null {
  const first = (v: string | null) => v?.split(',')[0]?.trim() || null
  return first(h.get('x-vercel-forwarded-for')) ?? first(h.get('x-forwarded-for')) ?? first(h.get('x-real-ip'))
}

const refuse = (status: 400 | 429, error: string): GuardRefusal => ({ ok: false, status, error })

/**
 * null = proceed. Order matters: cheap shape checks first, so refused requests do not use up the caller's allowance;
 * the rate limit counts only requests that otherwise look legitimate. A missing address is not a bypass: all such callers
 * share one "unknown" bucket (fail closed on the limit, at the cost of sharing it).
 */
export function guardEnquiry(
  input: GuardInput,
  ip: string | null,
  deps: { now?: () => number; store?: RateStore } = {},
): GuardRefusal | null {
  const now = (deps.now ?? Date.now)()
  if (input.consent !== true) return refuse(400, 'please tick the box to agree before sending')
  // The honeypot is a real field a person never sees; any value (or a non-string) means a script filled it in.
  if (input.website !== '') return refuse(400, 'could not send the enquiry, please try again')
  const t = input.startedAt
  if (typeof t !== 'number' || !Number.isFinite(t) || t > now || now - t > MAX_AGE_MS || now - t < MIN_FILL_MS) {
    return refuse(400, 'could not send the enquiry, please try again')
  }
  if ((deps.store ?? defaultStore).hit(ip || 'unknown', now)) {
    return refuse(429, 'too many enquiries from this connection, please try again later')
  }
  return null
}
