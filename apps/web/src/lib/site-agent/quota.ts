// src/lib/site-agent/quota.ts
// Durable daily ceiling + kill switch for the public site agent (UNI-2917).
//
// One round trip to `claim_public_agent_quota` (migration
// 20261006000000_public_agent_quota.sql), which checks the founder's kill
// switch and both daily ceilings (per site key, per founder) and increments
// the counters atomically under row locks. The ceiling therefore holds across
// every serverless instance and region — the in-memory limiter in the routes
// resets on cold start and is per-isolate, so it is burst control only.
//
// FAILS CLOSED. Any RPC error (migration not yet applied, network fault,
// unexpected return) refuses the request. A spend control that opens when it
// cannot read its own state is not a control.

import type { SupabaseClient } from '@supabase/supabase-js'

export type PublicAgentKind = 'chat' | 'voice'

export type QuotaRefusal = 'paused' | 'key_ceiling' | 'founder_ceiling' | 'unavailable'

export type QuotaResult = { ok: true } | { ok: false; reason: QuotaRefusal }

const REFUSALS: ReadonlySet<string> = new Set(['paused', 'key_ceiling', 'founder_ceiling'])

export async function claimPublicAgentQuota(
  supabase: SupabaseClient,
  founderId: string,
  publishableKey: string,
  kind: PublicAgentKind,
): Promise<QuotaResult> {
  try {
    const { data, error } = await supabase.rpc('claim_public_agent_quota', {
      p_founder_id: founderId,
      p_scope: `key:${publishableKey}`,
      p_kind: kind,
    })
    if (error) {
      console.warn(`[site-agent/quota] claim failed: ${error.message}`)
      return { ok: false, reason: 'unavailable' }
    }
    if (data === 'ok') return { ok: true }
    if (typeof data === 'string' && REFUSALS.has(data)) {
      return { ok: false, reason: data as QuotaRefusal }
    }
    console.warn(`[site-agent/quota] unexpected claim result: ${JSON.stringify(data)}`)
    return { ok: false, reason: 'unavailable' }
  } catch (err) {
    console.warn(
      `[site-agent/quota] claim threw: ${err instanceof Error ? err.message : String(err)}`,
    )
    return { ok: false, reason: 'unavailable' }
  }
}

/**
 * HTTP mapping shared by both public routes. A paused or unavailable agent is
 * 503 (try later, not the caller's fault); a spent ceiling is 429. The body
 * never says which ceiling tripped, so an anonymous caller cannot probe the
 * founder-wide budget.
 */
export function quotaRefusalResponse(reason: QuotaRefusal): {
  status: number
  error: string
  retryAfterSeconds: number
} {
  if (reason === 'key_ceiling' || reason === 'founder_ceiling') {
    return { status: 429, error: 'Daily limit reached', retryAfterSeconds: secondsUntilBrisbaneMidnight() }
  }
  return { status: 503, error: 'Agent is unavailable', retryAfterSeconds: 300 }
}

/** Brisbane is UTC+10 with no daylight saving; counters roll at its midnight. */
export function secondsUntilBrisbaneMidnight(now: Date = new Date()): number {
  const brisbaneMs = now.getTime() + 10 * 60 * 60 * 1000
  const msIntoDay = ((brisbaneMs % 86_400_000) + 86_400_000) % 86_400_000
  return Math.max(1, Math.ceil((86_400_000 - msIntoDay) / 1000))
}
