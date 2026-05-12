// src/lib/rate-limit.ts — RA-3013.
//
// In-process token-bucket rate limiter. Ported from the CARSI helper
// (RA-3022). Defense-in-depth alongside Cloudflare WAF.
//
// Limitation: stateless serverless functions reset memory per cold
// start, so the window is best-effort per worker. For globally
// consistent quotas, migrate to Vercel KV / Upstash Redis
// (`@upstash/ratelimit`) — left as a follow-up since adding a dep +
// provisioning Redis is a separate workstream.

interface Window {
  count: number;
  resetAt: number;
}

const STORE = new Map<string, Window>();

// Cap the map at 10k entries so a flood of unique IPs can't OOM the
// worker. LRU-style eviction is not needed — we just clear the map
// when it crosses the threshold.
const MAX_KEYS = 10_000;

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  resetAt: number;
}

export function applyRateLimit(
  ip: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();

  if (STORE.size > MAX_KEYS) {
    STORE.clear();
  }

  const existing = STORE.get(ip);
  if (!existing || existing.resetAt <= now) {
    const fresh: Window = { count: 1, resetAt: now + windowMs };
    STORE.set(ip, fresh);
    return { ok: true, remaining: limit - 1, resetAt: fresh.resetAt };
  }

  existing.count += 1;
  if (existing.count > limit) {
    return { ok: false, remaining: 0, resetAt: existing.resetAt };
  }
  return {
    ok: true,
    remaining: limit - existing.count,
    resetAt: existing.resetAt,
  };
}

// Sentinel used by routes when client IP cannot be determined — keys
// every "no-IP" caller into the same bucket so they can't bypass the
// limit by spoofing missing headers.
export const UNKNOWN_IP = "__unknown__";
