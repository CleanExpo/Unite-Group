import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getUser } from '@/lib/supabase/server'
import { hasPrivateAccess } from '@/lib/auth/private-access'
import { getStripe } from '@/lib/integrations/stripe/client'

export const dynamic = 'force-dynamic'
const headers = { 'Cache-Control': 'no-store' }
const pageSize = 100
const maximumPages = 2
const maximumDurationMs = 15_000

// Discovery only: a catalogue entry is not an agreed offer, buyer or payment.
// Account aliases select existing server credentials only; provider account IDs
// and credentials supplied by callers are never accepted.
export async function GET(request?: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401, headers })
  if (!hasPrivateAccess(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers })
  const params = request ? new URL(request.url).searchParams : new URLSearchParams()
  const account = params.get('account') ?? 'primary'
  if (!['primary', 'agency', 'synthex'].includes(account) || params.getAll('account').length > 1
    || [...params.keys()].some(key => key !== 'account')) {
    return NextResponse.json({ error: 'Select account=primary, agency or synthex only.' }, { status: 400, headers })
  }
  let stripe: Stripe | null
  try {
    const key = account === 'agency' ? process.env.STRIPE_AGENCY_READ_KEY?.trim()
      : account === 'synthex' ? process.env.STRIPE_SYNTHEX_READ_KEY?.trim() : undefined
    // The existing revenue factory exposes a narrower balance-only interface.
    // Reuse its SDK construction pattern with this endpoint's stricter budget.
    stripe = account === 'primary' ? getStripe() : key ? new Stripe(key, { maxNetworkRetries: 0, timeout: 4000 }) : null
  } catch {
    return NextResponse.json({ source: 'error', reason: 'account_unavailable', account, accountId: null, offers: [], complete: false }, { status: 503, headers })
  }
  if (!stripe) return NextResponse.json({ source: 'not_connected', account, accountId: null, offers: [], complete: false }, { headers })

  const deadline = Date.now() + maximumDurationMs
  const limitations = new Set<string>()
  const read = async <T>(operation: (options: Stripe.RequestOptions) => Promise<T>): Promise<T> => {
    const timeout = Math.min(4000, deadline - Date.now())
    if (timeout <= 0) throw new Error('Catalogue deadline')
    let timer: ReturnType<typeof setTimeout> | undefined
    try {
      return await Promise.race([
        operation({ timeout, maxNetworkRetries: 0 }),
        new Promise<never>((_resolve, reject) => { timer = setTimeout(() => reject(new Error('Catalogue deadline')), timeout) }),
      ])
    } finally { if (timer) clearTimeout(timer) }
  }
  let accountId: string
  try {
    const providerAccount = await read(options => stripe.accounts.retrieve(null, {}, options))
    if (!/^acct_[a-zA-Z0-9]{1,200}$/.test(providerAccount.id)) throw new Error('Invalid account')
    accountId = providerAccount.id
  } catch {
    return NextResponse.json({ source: 'error', reason: 'account_unavailable', account, accountId: null, offers: [], complete: false }, { status: 503, headers })
  }

  async function pages<T extends { id: string }>(
    list: (cursor: string | undefined, options: Stripe.RequestOptions) => Promise<{ data: T[]; has_more: boolean }>,
    kind: 'products' | 'prices',
  ): Promise<T[]> {
    const rows: T[] = []
    let cursor: string | undefined
    try {
      for (let page = 0; page < maximumPages; page++) {
        const result = await read(options => list(cursor, options))
        if (!Array.isArray(result.data) || result.data.length > pageSize || typeof result.has_more !== 'boolean') throw new Error('Invalid page')
        rows.push(...result.data)
        if (!result.has_more) return rows
        const next = result.data.at(-1)?.id
        if (!next || next === cursor) throw new Error('Invalid cursor')
        cursor = next
      }
      limitations.add(`${kind}_truncated`)
    } catch { limitations.add(`${kind}_unavailable`) }
    return rows
  }

  const products = await pages((cursor, options) => stripe.products.list({ active: true, limit: pageSize, ...(cursor ? { starting_after: cursor } : {}) }, options), 'products')
  const prices = await pages((cursor, options) => stripe.prices.list({ active: true, limit: pageSize, ...(cursor ? { starting_after: cursor } : {}) }, options), 'prices')
  const offers = new Map<string, {
    productId: string; name: string; livemode: boolean;
    prices: Array<{ priceId: string; currency: string; unitAmount: number | null; type: 'one_time' | 'recurring'; billingScheme: string; recurring: { interval: string; intervalCount: number; usageType: string } | null }>
  }>()
  for (const product of products) {
    if (!product || !/^prod_[a-zA-Z0-9]{1,200}$/.test(product.id) || product.active !== true || typeof product.name !== 'string' || typeof product.livemode !== 'boolean' || offers.has(product.id)) {
      limitations.add('catalogue_inconsistent'); continue
    }
    offers.set(product.id, {
      productId: product.id,
      name: product.name.replace(/<[^>]*>/g, '').replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 200),
      livemode: product.livemode, prices: [],
    })
  }
  const seenPrices = new Set<string>()
  for (const price of prices) {
    if (!price || !price.product || (typeof price.product !== 'string' && typeof price.product !== 'object')) {
      limitations.add('catalogue_inconsistent'); continue
    }
    const productId = typeof price.product === 'string' ? price.product : price.product.id
    const offer = offers.get(productId)
    if (!offer || price.livemode !== offer.livemode || price.active !== true || !/^price_[a-zA-Z0-9]{1,200}$/.test(price.id) || seenPrices.has(price.id)
      || !/^[a-z]{3}$/.test(price.currency) || !['one_time', 'recurring'].includes(price.type)
      || !['per_unit', 'tiered'].includes(price.billing_scheme)
      || (price.unit_amount !== null && (!Number.isSafeInteger(price.unit_amount) || price.unit_amount < 0))
      || (price.type === 'recurring' && (!price.recurring || !['day', 'week', 'month', 'year'].includes(price.recurring.interval)
        || !Number.isSafeInteger(price.recurring.interval_count) || price.recurring.interval_count < 1
        || !['licensed', 'metered'].includes(price.recurring.usage_type)))) {
      limitations.add('catalogue_inconsistent'); continue
    }
    seenPrices.add(price.id)
    offer.prices.push({
      priceId: price.id, currency: price.currency, unitAmount: price.unit_amount, type: price.type === 'recurring' ? 'recurring' : 'one_time',
      billingScheme: price.billing_scheme,
      recurring: price.type === 'recurring' && price.recurring ? {
        interval: price.recurring.interval, intervalCount: price.recurring.interval_count, usageType: price.recurring.usage_type,
      } : null,
    })
  }
  return NextResponse.json({
    source: limitations.size ? 'partial' : 'stripe', account, accountId, offers: [...offers.values()],
    complete: limitations.size === 0, limitations: [...limitations],
    bounds: { maximumProducts: pageSize * maximumPages, maximumPrices: pageSize * maximumPages, maximumDurationMs },
  }, { headers })
}
