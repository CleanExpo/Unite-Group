// src/lib/revenue/cleared-funds.ts
//
// Founder revenue panel — pure maths, no I/O (Wave 1, live revenue panel).
//
// "Cleared" is defined ONCE, here: a Stripe BalanceTransaction whose `type` is
// `charge` or `payment` AND whose `status` is `available`. Money is bucketed by
// `available_on` — the moment Stripe made the funds spendable — not `created`.
// Invoices, pending balance and payment intents are never counted.
//
// Amounts are Stripe minor units (cents). The headline is `net` (gross minus
// Stripe's fee) because that is what actually lands; gross and fee travel
// alongside so the panel can show both.

export const BREAK_EVEN_CENTS = 323_300
export const MARGIN_TARGET_CENTS = 647_000
export const SYDNEY_TZ = 'Australia/Sydney'
export const REPORTING_CURRENCY = 'aud'

export type BusinessKey = 'carsi' | 'restore' | 'dr' | 'synthex' | 'unattributed'

export const BUSINESS_LABELS: Record<BusinessKey, string> = {
  carsi: 'CARSI',
  restore: 'RestoreAssist',
  dr: 'Disaster Recovery',
  synthex: 'Synthex',
  unattributed: 'Unattributed',
}

// Checkout Session success_url host → business. Hosts not listed here are
// never guessed: they land in "Unattributed" so the money is still visible.
// disasterrecovery.com.au is the DR host used across apps/web/src.
const HOST_TO_BUSINESS: Record<string, BusinessKey> = {
  'carsi.com.au': 'carsi',
  'www.carsi.com.au': 'carsi',
  'restoreassist.app': 'restore',
  'www.restoreassist.app': 'restore',
  'disasterrecovery.com.au': 'dr',
  'www.disasterrecovery.com.au': 'dr',
}

export function hostToBusiness(successUrl: string | null | undefined): BusinessKey {
  if (!successUrl) return 'unattributed'
  try {
    const host = new URL(successUrl).hostname.toLowerCase()
    return HOST_TO_BUSINESS[host] ?? 'unattributed'
  } catch {
    return 'unattributed'
  }
}

// ── Australia/Sydney calendar maths (DST-aware, no library) ────────────────

interface LocalDate {
  y: number
  m: number // 1-12
  d: number
}

const partsFormatter = new Intl.DateTimeFormat('en-AU', {
  timeZone: SYDNEY_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
})

function sydneyWallClock(ms: number) {
  const parts: Record<string, number> = {}
  for (const p of partsFormatter.formatToParts(new Date(ms))) {
    if (p.type !== 'literal') parts[p.type] = Number(p.value)
  }
  return parts as { year: number; month: number; day: number; hour: number; minute: number; second: number }
}

/** Sydney offset from UTC at `ms`, in milliseconds (+10h or +11h). */
function sydneyOffsetMs(ms: number): number {
  const w = sydneyWallClock(ms)
  const asUtc = Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute, w.second)
  return asUtc - Math.floor(ms / 1000) * 1000
}

export function sydneyDateOf(ms: number): LocalDate {
  const w = sydneyWallClock(ms)
  return { y: w.year, m: w.month, d: w.day }
}

/** UTC instant of 00:00 Sydney time on the given local date. */
export function sydneyMidnightUtc({ y, m, d }: LocalDate): number {
  const naive = Date.UTC(y, m - 1, d)
  let t = naive - sydneyOffsetMs(naive)
  const corrected = naive - sydneyOffsetMs(t)
  if (corrected !== t) t = corrected
  return t
}

function addDays({ y, m, d }: LocalDate, days: number): LocalDate {
  const dt = new Date(Date.UTC(y, m - 1, d + days))
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() }
}

export function formatLocalDate({ y, m, d }: LocalDate): string {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

export interface WeekBounds {
  /** Monday 00:00 Sydney, as a UTC epoch ms (inclusive). */
  startMs: number
  /** Next Monday 00:00 Sydney, as a UTC epoch ms (exclusive). */
  endMs: number
  startDate: string // Monday, YYYY-MM-DD (Sydney)
  endDate: string // Sunday, YYYY-MM-DD (Sydney)
}

/** Monday–Sunday week containing `now`, in Australia/Sydney. */
export function sydneyWeekBounds(now: Date): WeekBounds {
  const today = sydneyDateOf(now.getTime())
  const dow = new Date(Date.UTC(today.y, today.m - 1, today.d)).getUTCDay() // 0 = Sunday
  const monday = addDays(today, -((dow + 6) % 7))
  const nextMonday = addDays(monday, 7)
  return {
    startMs: sydneyMidnightUtc(monday),
    endMs: sydneyMidnightUtc(nextMonday),
    startDate: formatLocalDate(monday),
    endDate: formatLocalDate(addDays(monday, 6)),
  }
}

export interface DayBucket {
  date: string
  startMs: number
  endMs: number
}

/** The last `days` Sydney calendar days, oldest first, ending with today. */
export function sydneyTrendDays(now: Date, days = 7): DayBucket[] {
  const today = sydneyDateOf(now.getTime())
  const out: DayBucket[] = []
  for (let i = days - 1; i >= 0; i--) {
    const day = addDays(today, -i)
    out.push({ date: formatLocalDate(day), startMs: sydneyMidnightUtc(day), endMs: sydneyMidnightUtc(addDays(day, 1)) })
  }
  return out
}

// ── Attribution: Checkout Session success_url → business ──────────────────

export interface SessionLike {
  payment_intent?: string | { id: string } | null
  subscription?: string | { id: string } | null
  customer?: string | { id: string } | null
  success_url?: string | null
}

export interface AttributionMaps {
  byPaymentIntent: Map<string, BusinessKey>
  bySubscription: Map<string, BusinessKey>
  /** A customer who checked out on two different businesses is 'ambiguous'. */
  byCustomer: Map<string, BusinessKey | 'ambiguous'>
}

function idOf(v: string | { id: string } | null | undefined): string | null {
  if (!v) return null
  return typeof v === 'string' ? v : v.id
}

export function buildAttributionMaps(sessions: SessionLike[]): AttributionMaps {
  const maps: AttributionMaps = { byPaymentIntent: new Map(), bySubscription: new Map(), byCustomer: new Map() }
  for (const s of sessions) {
    const business = hostToBusiness(s.success_url)
    const pi = idOf(s.payment_intent)
    const sub = idOf(s.subscription)
    const cus = idOf(s.customer)
    if (pi) maps.byPaymentIntent.set(pi, business)
    if (sub) maps.bySubscription.set(sub, business)
    if (cus && business !== 'unattributed') {
      const prior = maps.byCustomer.get(cus)
      maps.byCustomer.set(cus, prior && prior !== business ? 'ambiguous' : business)
    }
  }
  return maps
}

export interface ChargeLike {
  payment_intent?: string | { id: string } | null
  customer?: string | { id: string } | null
}

/**
 * payment_intent → the one-off Checkout Session that took it; otherwise the
 * customer → the session that created their subscription (renewal charges
 * have no session of their own). Anything unmatched is Unattributed.
 */
export function attributeCharge(charge: ChargeLike | null | undefined, maps: AttributionMaps): BusinessKey {
  if (!charge) return 'unattributed'
  const pi = idOf(charge.payment_intent)
  if (pi) {
    const hit = maps.byPaymentIntent.get(pi)
    if (hit) return hit
  }
  const cus = idOf(charge.customer)
  if (cus) {
    const hit = maps.byCustomer.get(cus)
    if (hit && hit !== 'ambiguous') return hit
  }
  return 'unattributed'
}

// ── Aggregation ────────────────────────────────────────────────────────────

export interface BalanceTxnLike {
  type: string
  status: string
  amount: number
  fee: number
  net: number
  currency: string
  available_on: number // unix seconds
  created: number // unix seconds
}

export function isCleared(txn: Pick<BalanceTxnLike, 'type' | 'status'>): boolean {
  return (txn.type === 'charge' || txn.type === 'payment') && txn.status === 'available'
}

export interface AttributedTxn extends BalanceTxnLike {
  business: BusinessKey
}

export interface BusinessWeek {
  business: BusinessKey
  label: string
  weekNetCents: number
  weekCount: number
}

export interface PaymentRow {
  availableAt: string
  createdAt: string
  grossCents: number
  netCents: number
  business: BusinessKey
  label: string
}

export interface ClearedSummary {
  currency: string
  weekNetCents: number
  weekGrossCents: number
  weekFeeCents: number
  weekCount: number
  byBusiness: BusinessWeek[]
  trend: { date: string; netCents: number }[]
  lastPayments: PaymentRow[]
  /** Cleared transactions not in AUD — excluded from every total, counted here. */
  nonAudExcludedCount: number
}

export function summariseCleared(txns: AttributedTxn[], now: Date): ClearedSummary {
  const week = sydneyWeekBounds(now)
  const days = sydneyTrendDays(now)
  const nowMs = now.getTime()
  const cleared = txns.filter((t) => isCleared(t) && t.available_on * 1000 <= nowMs)
  const aud = cleared.filter((t) => t.currency.toLowerCase() === REPORTING_CURRENCY)

  const byBusiness = new Map<BusinessKey, BusinessWeek>()
  let weekNet = 0
  let weekGross = 0
  let weekFee = 0
  let weekCount = 0
  for (const t of aud) {
    const at = t.available_on * 1000
    if (at < week.startMs || at >= week.endMs) continue
    weekNet += t.net
    weekGross += t.amount
    weekFee += t.fee
    weekCount += 1
    const row = byBusiness.get(t.business) ?? { business: t.business, label: BUSINESS_LABELS[t.business], weekNetCents: 0, weekCount: 0 }
    row.weekNetCents += t.net
    row.weekCount += 1
    byBusiness.set(t.business, row)
  }

  const trend = days.map((day) => ({
    date: day.date,
    netCents: aud
      .filter((t) => t.available_on * 1000 >= day.startMs && t.available_on * 1000 < day.endMs)
      .reduce((sum, t) => sum + t.net, 0),
  }))

  const lastPayments = [...aud]
    .sort((a, b) => b.available_on - a.available_on || b.created - a.created)
    .slice(0, 10)
    .map((t) => ({
      availableAt: new Date(t.available_on * 1000).toISOString(),
      createdAt: new Date(t.created * 1000).toISOString(),
      grossCents: t.amount,
      netCents: t.net,
      business: t.business,
      label: BUSINESS_LABELS[t.business],
    }))

  return {
    currency: REPORTING_CURRENCY,
    weekNetCents: weekNet,
    weekGrossCents: weekGross,
    weekFeeCents: weekFee,
    weekCount,
    byBusiness: [...byBusiness.values()].sort((a, b) => b.weekNetCents - a.weekNetCents),
    trend,
    lastPayments,
    nonAudExcludedCount: cleared.length - aud.length,
  }
}

// ── MRR ────────────────────────────────────────────────────────────────────

export interface SubscriptionItemLike {
  quantity?: number | null
  price: {
    unit_amount: number | null
    currency: string
    recurring: { interval: 'day' | 'week' | 'month' | 'year'; interval_count: number } | null
  }
}

/** Monthly-normalised amount of one subscription item, in cents. */
export function monthlyCents(item: SubscriptionItemLike): number {
  const { unit_amount, recurring } = item.price
  if (unit_amount == null || !recurring) return 0
  const qty = item.quantity ?? 1
  const perInterval = unit_amount * qty
  const count = recurring.interval_count || 1
  const perMonth: Record<string, number> = { day: 365 / 12, week: 52 / 12, month: 1, year: 1 / 12 }
  return Math.round((perInterval * perMonth[recurring.interval]) / count)
}

export interface MrrRow {
  business: BusinessKey
  label: string
  mrrCents: number
  subscriptions: number
}

export function summariseMrr(
  subs: { business: BusinessKey; items: SubscriptionItemLike[] }[],
): { rows: MrrRow[]; totalCents: number; nonAudExcludedCount: number } {
  const rows = new Map<BusinessKey, MrrRow>()
  let nonAud = 0
  for (const sub of subs) {
    let cents = 0
    for (const item of sub.items) {
      if (item.price.currency.toLowerCase() !== REPORTING_CURRENCY) {
        nonAud += 1
        continue
      }
      cents += monthlyCents(item)
    }
    const row = rows.get(sub.business) ?? { business: sub.business, label: BUSINESS_LABELS[sub.business], mrrCents: 0, subscriptions: 0 }
    row.mrrCents += cents
    row.subscriptions += 1
    rows.set(sub.business, row)
  }
  const list = [...rows.values()].sort((a, b) => b.mrrCents - a.mrrCents)
  return { rows: list, totalCents: list.reduce((s, r) => s + r.mrrCents, 0), nonAudExcludedCount: nonAud }
}

// ── Break-even verdict ─────────────────────────────────────────────────────

export type BreakEvenVerdict = 'below_break_even' | 'break_even_met' | 'margin_target_met' | 'partial'

export function breakEvenVerdict(weekNetCents: number, complete: boolean) {
  const verdict: BreakEvenVerdict = !complete
    ? 'partial'
    : weekNetCents >= MARGIN_TARGET_CENTS
      ? 'margin_target_met'
      : weekNetCents >= BREAK_EVEN_CENTS
        ? 'break_even_met'
        : 'below_break_even'
  return {
    verdict,
    breakEvenCents: BREAK_EVEN_CENTS,
    marginTargetCents: MARGIN_TARGET_CENTS,
    gapToBreakEvenCents: Math.max(0, BREAK_EVEN_CENTS - weekNetCents),
    gapToMarginCents: Math.max(0, MARGIN_TARGET_CENTS - weekNetCents),
  }
}
