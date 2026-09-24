// src/lib/revenue/revenue-snapshot.ts
//
// Founder revenue panel — compose both Stripe accounts into one response and
// cache it for 5 minutes per warm server instance (module memory), so the
// panel cannot hammer Stripe. Kept out of route.ts because Next.js route
// files may only export route handlers and segment config.
//
//   agency  (STRIPE_AGENCY_READ_KEY)  CARSI + RestoreAssist + DR, split by
//                                     Checkout Session success_url host
//   synthex (STRIPE_SYNTHEX_READ_KEY) Synthex only
//
// The combined verdict is `partial` unless BOTH accounts read OK: a missing
// account is never folded in as $0.

import { readStripeAccount, type AccountConfig, type AccountRead, type StripeReadClient } from './stripe-account'
import { breakEvenVerdict, sydneyWeekBounds } from './cleared-funds'

export const REVENUE_CACHE_TTL_MS = 5 * 60_000

export interface RevenueResponse {
  week: { startDate: string; endDate: string; timeZone: 'Australia/Sydney' }
  accounts: AccountRead[]
  combined: { weekNetCents: number; complete: boolean } & ReturnType<typeof breakEvenVerdict>
  cachedAt: string
  definition: string
}

let cache: { at: number; body: RevenueResponse } | null = null

/** Test seam — the module cache would otherwise leak between cases. */
export function resetRevenueCache() {
  cache = null
}

function accountConfigs(env: NodeJS.ProcessEnv): AccountConfig[] {
  return [
    { account: 'agency', label: 'Unite-Group Agency (CARSI · RestoreAssist · DR)', key: env.STRIPE_AGENCY_READ_KEY },
    { account: 'synthex', label: 'Synthex', key: env.STRIPE_SYNTHEX_READ_KEY, fixedBusiness: 'synthex' },
  ]
}

export async function buildRevenueSnapshot(
  now: Date,
  deps: { env?: NodeJS.ProcessEnv; createClient?: (key: string) => StripeReadClient } = {},
): Promise<RevenueResponse> {
  const accounts = await Promise.all(
    accountConfigs(deps.env ?? process.env).map((c) =>
      readStripeAccount(c, { now: () => now, createClient: deps.createClient }),
    ),
  )
  const complete = accounts.every((a) => a.status === 'ok')
  const weekNetCents = accounts.reduce((sum, a) => sum + (a.status === 'ok' ? a.cleared.weekNetCents : 0), 0)
  const week = sydneyWeekBounds(now)
  return {
    week: { startDate: week.startDate, endDate: week.endDate, timeZone: 'Australia/Sydney' },
    accounts,
    combined: { weekNetCents, complete, ...breakEvenVerdict(weekNetCents, complete) },
    cachedAt: now.toISOString(),
    definition:
      'Cleared = Stripe balance transactions of type charge/payment with status "available", bucketed by available_on (Australia/Sydney). Net of Stripe fees. AUD only.',
  }
}

export async function getRevenueSnapshot(nowMs = Date.now()): Promise<RevenueResponse> {
  if (!cache || nowMs - cache.at > REVENUE_CACHE_TTL_MS) {
    cache = { at: nowMs, body: await buildRevenueSnapshot(new Date(nowMs)) }
  }
  return cache.body
}
