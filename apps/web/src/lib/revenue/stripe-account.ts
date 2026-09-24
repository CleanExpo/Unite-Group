// src/lib/revenue/stripe-account.ts
//
// Founder revenue panel — read ONE Stripe account (read-only) and reduce it to
// cleared-funds aggregates. Every failure becomes `status: 'not_connected'`
// with a reason CLASS only. Stripe's own error messages are never forwarded:
// a 401 message quotes the masked key ("Invalid API Key provided: sk_live_****").
//
// Objects read (all list endpoints, GET only):
//   - balance_transactions (expand data.source → Charge)  — the money
//   - checkout.sessions (status complete)                  — success_url host
//   - subscriptions (status active)                        — MRR

import Stripe from 'stripe'
import {
  attributeCharge,
  buildAttributionMaps,
  sydneyTrendDays,
  sydneyWeekBounds,
  summariseCleared,
  summariseMrr,
  type AttributedTxn,
  type BusinessKey,
  type ChargeLike,
  type ClearedSummary,
  type MrrRow,
  type SessionLike,
  type SubscriptionItemLike,
} from './cleared-funds'

export type AccountId = 'agency' | 'synthex'

export type NotConnectedReason =
  | 'missing_key'
  | 'auth_failed'
  | 'permission_denied'
  | 'rate_limited'
  | 'network_error'
  | 'upstream_error'

export interface AccountOk {
  account: AccountId
  label: string
  status: 'ok'
  readAt: string
  cleared: ClearedSummary
  mrr: { rows: MrrRow[]; totalCents: number; nonAudExcludedCount: number }
  /** True when a pagination cap was hit — totals may be incomplete. */
  truncated: boolean
  sessionsScanned: number
}

export interface AccountNotConnected {
  account: AccountId
  label: string
  status: 'not_connected'
  reason: NotConnectedReason
  readAt: string
}

export type AccountRead = AccountOk | AccountNotConnected

export interface AccountConfig {
  account: AccountId
  label: string
  key: string | undefined
  /** Agency: split by success_url host. Synthex: every dollar is Synthex. */
  fixedBusiness?: BusinessKey
}

interface Pager<T> {
  autoPagingToArray(opts: { limit: number }): Promise<T[]>
}

/** The slice of the Stripe SDK this module touches — narrow so tests can fake it. */
export interface StripeReadClient {
  balanceTransactions: { list(params: Record<string, unknown>): Pager<unknown> }
  checkout: { sessions: { list(params: Record<string, unknown>): Pager<unknown> } }
  subscriptions: { list(params: Record<string, unknown>): Pager<unknown> }
}

export function createStripeReadClient(key: string): StripeReadClient {
  return new Stripe(key, { maxNetworkRetries: 1, timeout: 20_000 }) as unknown as StripeReadClient
}

const TXN_CAP = 5_000
const SESSION_CAP = 5_000
const SUB_CAP = 2_000
/** Charges clear days after they are created; look back far enough to catch them. */
const CLEARING_LOOKBACK_MS = 35 * 86_400_000
/** Subscription renewals attribute via the session that started them. */
const SESSION_LOOKBACK_MS = 400 * 86_400_000

export function classifyStripeError(err: unknown): NotConnectedReason {
  const e = (err ?? {}) as { type?: unknown; statusCode?: unknown }
  switch (e.type) {
    case 'StripeAuthenticationError':
      return 'auth_failed'
    case 'StripePermissionError':
      return 'permission_denied'
    case 'StripeRateLimitError':
      return 'rate_limited'
    case 'StripeConnectionError':
      return 'network_error'
  }
  if (e.statusCode === 401) return 'auth_failed'
  if (e.statusCode === 403) return 'permission_denied'
  if (e.statusCode === 429) return 'rate_limited'
  return 'upstream_error'
}

interface RawTxn {
  type: string
  status: string
  amount: number
  fee: number
  net: number
  currency: string
  available_on: number
  created: number
  source?: unknown
}

interface RawSub {
  customer?: string | { id: string } | null
  id: string
  items?: { data?: SubscriptionItemLike[] }
}

export async function readStripeAccount(
  config: AccountConfig,
  deps: { createClient?: (key: string) => StripeReadClient; now?: () => Date } = {},
): Promise<AccountRead> {
  const now = (deps.now ?? (() => new Date()))()
  const base = { account: config.account, label: config.label, readAt: now.toISOString() }
  const key = config.key?.trim()
  if (!key) return { ...base, status: 'not_connected', reason: 'missing_key' }

  try {
    const client = (deps.createClient ?? createStripeReadClient)(key)
    const week = sydneyWeekBounds(now)
    const windowStartMs = Math.min(week.startMs, sydneyTrendDays(now)[0].startMs) - CLEARING_LOOKBACK_MS

    const [txns, sessions, subs] = await Promise.all([
      client.balanceTransactions
        .list({ created: { gte: Math.floor(windowStartMs / 1000) }, limit: 100, expand: ['data.source'] })
        .autoPagingToArray({ limit: TXN_CAP }) as Promise<RawTxn[]>,
      config.fixedBusiness
        ? Promise.resolve([] as SessionLike[])
        : (client.checkout.sessions
            .list({ created: { gte: Math.floor((now.getTime() - SESSION_LOOKBACK_MS) / 1000) }, status: 'complete', limit: 100 })
            .autoPagingToArray({ limit: SESSION_CAP }) as Promise<SessionLike[]>),
      client.subscriptions.list({ status: 'active', limit: 100 }).autoPagingToArray({ limit: SUB_CAP }) as Promise<RawSub[]>,
    ])

    const maps = buildAttributionMaps(sessions)
    const businessForCharge = (charge: ChargeLike | null): BusinessKey =>
      config.fixedBusiness ?? attributeCharge(charge, maps)

    const attributed: AttributedTxn[] = txns.map((t) => {
      const source = t.source && typeof t.source === 'object' ? (t.source as ChargeLike) : null
      return {
        type: t.type,
        status: t.status,
        amount: t.amount,
        fee: t.fee,
        net: t.net,
        currency: t.currency,
        available_on: t.available_on,
        created: t.created,
        business: businessForCharge(source),
      }
    })

    const mrr = summariseMrr(
      subs.map((s) => ({
        business:
          config.fixedBusiness ??
          maps.bySubscription.get(s.id) ??
          attributeCharge({ customer: s.customer ?? null }, maps),
        items: s.items?.data ?? [],
      })),
    )

    return {
      ...base,
      status: 'ok',
      cleared: summariseCleared(attributed, now),
      mrr,
      truncated: txns.length >= TXN_CAP || sessions.length >= SESSION_CAP || subs.length >= SUB_CAP,
      sessionsScanned: sessions.length,
    }
  } catch (err) {
    return { ...base, status: 'not_connected', reason: classifyStripeError(err) }
  }
}
