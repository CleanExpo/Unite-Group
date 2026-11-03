// Per-IP burst limit for the /bots lead demo (UNI-3217). In-memory and per server instance: it resets on cold
// start and is not shared across regions, so it is burst control only. The durable daily ceiling is the
// claim_public_agent_quota RPC, checked by the route before any model call.

import { BOT_LIMITS } from './guard'

const buckets = new Map<string, number[]>()

export function isRateLimited(ip: string, now = Date.now()): boolean {
  const windowStart = now - BOT_LIMITS.rateWindowMs
  const recent = (buckets.get(ip) ?? []).filter((ts) => ts > windowStart)
  if (recent.length >= BOT_LIMITS.ratePerWindow) {
    buckets.set(ip, recent)
    return true
  }
  buckets.set(ip, [...recent, now])
  return false
}

/** Test hook: empties the in-memory buckets. */
export function resetRateLimit(): void {
  buckets.clear()
}

export function clientIp(request: Request): string {
  // x-vercel-forwarded-for is set by Vercel's edge and cannot be supplied by the client.
  for (const header of ['x-vercel-forwarded-for', 'x-forwarded-for']) {
    const first = request.headers.get(header)?.split(',')[0]?.trim()
    if (first) return first
  }
  return request.headers.get('x-real-ip') ?? 'unknown'
}
