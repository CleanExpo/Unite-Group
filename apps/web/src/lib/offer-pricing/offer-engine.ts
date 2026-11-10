/**
 * Offer pricing engine: cost, target and minimum price, psychological price,
 * margin checks, verified discounts, bonus budget, alternatives and timed
 * promotions.
 *
 * Internal quoting only. The point where an
 * offer is enforced is `validateOfferForCommit`, which an admin action calls
 * before an offer is attached to a client proposal. Nothing here activates an
 * offer: the best status it can return is `ready_for_approval`.
 *
 * Arithmetic is exact. Money is integer cents (bigint); rates are exact
 * fractions parsed from decimal strings, so 0.449 is 449/1000, never a float.
 */

// ---------------------------------------------------------------------------
// Exact fractions

export interface Ratio {
  n: bigint;
  d: bigint; // always > 0
}

function gcd(a: bigint, b: bigint): bigint {
  a = a < 0n ? -a : a;
  b = b < 0n ? -b : b;
  while (b) [a, b] = [b, a % b];
  return a || 1n;
}

function ratio(n: bigint, d: bigint = 1n): Ratio {
  if (d === 0n) throw new RangeError('division by zero');
  if (d < 0n) [n, d] = [-n, -d];
  const g = gcd(n, d);
  return { n: n / g, d: d / g };
}

const add = (a: Ratio, b: Ratio) => ratio(a.n * b.d + b.n * a.d, a.d * b.d);
const sub = (a: Ratio, b: Ratio) => ratio(a.n * b.d - b.n * a.d, a.d * b.d);
const mul = (a: Ratio, b: Ratio) => ratio(a.n * b.n, a.d * b.d);
const div = (a: Ratio, b: Ratio) => ratio(a.n * b.d, a.d * b.n);
const cmp = (a: Ratio, b: Ratio) => {
  const l = a.n * b.d;
  const r = b.n * a.d;
  return l < r ? -1 : l > r ? 1 : 0;
};
const ONE = ratio(1n);

/** Parse a non-negative decimal string ("0.449", "10", "0.3333") exactly. */
export function parseRate(value: string): Ratio {
  if (!/^\d+(\.\d+)?$/.test(value)) {
    throw new RangeError(`rate must be a plain decimal string: ${value}`);
  }
  const [whole, frac = ''] = value.split('.');
  return ratio(BigInt(whole + frac), 10n ** BigInt(frac.length));
}

/** Parse dollars ("1025", "998.19") to integer cents, refusing sub-cent input. */
export function dollarsToCents(value: string): bigint {
  if (!/^\d+(\.\d{1,2})?$/.test(value)) {
    throw new RangeError(`amount must be dollars with at most 2 decimals: ${value}`);
  }
  const [whole, frac = ''] = value.split('.');
  return BigInt(whole) * 100n + BigInt(frac.padEnd(2, '0'));
}

export function formatCents(cents: bigint): string {
  const neg = cents < 0n;
  const abs = neg ? -cents : cents;
  const whole = (abs / 100n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${neg ? '-' : ''}$${whole}.${(abs % 100n).toString().padStart(2, '0')}`;
}

const ceilCents = (r: Ratio): bigint => {
  const q = r.n / r.d;
  return r.n % r.d === 0n || r.n < 0n ? q : q + 1n;
};
const floorCents = (r: Ratio): bigint => {
  const q = r.n / r.d;
  return r.n % r.d === 0n || r.n >= 0n ? q : q - 1n;
};
/** Half-up rounding to the cent, for reported figures only. */
const roundCents = (r: Ratio): bigint => floorCents(add(r, ratio(1n, 2n)));

/** A ratio as a percentage string with `dp` decimals (display only). */
export function percent(r: Ratio | null, dp = 2): string | null {
  if (!r) return null;
  const scale = 10n ** BigInt(dp);
  const v = roundCents(mul(r, ratio(100n * scale)));
  const s = v.toString().padStart(dp + 1, '0');
  return `${s.slice(0, -dp)}.${s.slice(-dp)}%`;
}

// ---------------------------------------------------------------------------
// Configuration

export interface PricingConfig {
  currency: string; // ISO code, e.g. AUD
  targetMargin: string; // decimal string, e.g. "0.45"
  floorMargin: string; // decimal string, e.g. "0.449"
  gstRate: string; // decimal string, e.g. "0.10"; "0" when no GST applies
  maxDiscount: string; // largest permitted saving as a fraction of the reference price
  timezone: string; // IANA zone for timed promotions
}

/** The spec's defaults. Client profiles override margins and currency. */
export const DEFAULT_PRICING_CONFIG: PricingConfig = {
  currency: 'AUD',
  targetMargin: '0.45',
  floorMargin: '0.449',
  gstRate: '0.10',
  maxDiscount: '0.30',
  timezone: 'Australia/Brisbane',
};

// ---------------------------------------------------------------------------
// Cost

export interface CostLine {
  label: string;
  /** Units supplied, including free ones: buy one get two free is quantity 3. */
  quantity: number;
  /** Unit cost in cents, ex recoverable GST; null when not yet known. */
  unitCostCents: bigint | null;
  bonus?: boolean;
}

export interface CostInput {
  lines: CostLine[];
  labourCents?: bigint | null;
  fulfilmentCents?: bigint | null;
}

export interface CostResult {
  totalCents: bigint;
  /** Labels whose cost is unknown. A cost with unknowns is a lower bound. */
  unknown: string[];
}

export function totalCost(input: CostInput): CostResult {
  const unknown: string[] = [];
  let total = 0n;
  for (const line of input.lines) {
    if (!Number.isInteger(line.quantity) || line.quantity < 0) {
      throw new RangeError(`${line.label}: quantity must be a whole number`);
    }
    if (line.unitCostCents === null) {
      unknown.push(line.label);
      continue;
    }
    if (line.unitCostCents < 0n) throw new RangeError(`${line.label}: negative cost`);
    total += BigInt(line.quantity) * line.unitCostCents;
  }
  for (const [label, v] of [
    ['labour', input.labourCents],
    ['fulfilment', input.fulfilmentCents],
  ] as const) {
    if (v === null) unknown.push(label);
    else if (v !== undefined) {
      if (v < 0n) throw new RangeError(`${label}: negative cost`);
      total += v;
    }
  }
  return { totalCents: total, unknown };
}

/** Buy `buy`, get `free` free: every unit supplied is a cost. */
export function buyXGetYFree(
  label: string,
  buy: number,
  free: number,
  unitCostCents: bigint | null
): CostLine {
  return { label: `${label} (buy ${buy} get ${free} free)`, quantity: buy + free, unitCostCents };
}

// ---------------------------------------------------------------------------
// Prices

function rates(config: PricingConfig) {
  const m = parseRate(config.targetMargin);
  const floor = parseRate(config.floorMargin);
  const g = parseRate(config.gstRate);
  if (cmp(m, ONE) >= 0 || cmp(floor, ONE) >= 0) {
    throw new RangeError('margins must be below 1');
  }
  if (cmp(floor, m) > 0) throw new RangeError('floor margin is above target');
  return { m, floor, g };
}

/** Exact GST-inclusive price that earns margin `margin` on cost. */
function priceForMargin(costCents: bigint, margin: Ratio, g: Ratio): Ratio {
  return mul(div(ratio(costCents), sub(ONE, margin)), add(ONE, g));
}

export interface PriceTargets {
  targetIncCents: Ratio; // exact, not rounded
  minimumIncCents: bigint; // CEIL to the cent
}

export function priceTargets(costCents: bigint, config: PricingConfig): PriceTargets {
  const { m, floor, g } = rates(config);
  return {
    targetIncCents: priceForMargin(costCents, m, g),
    minimumIncCents: ceilCents(priceForMargin(costCents, floor, g)),
  };
}

/**
 * The whole-dollar price ending in 9 closest to the target, at or above the
 * minimum; a tie goes to the higher price. The floor always wins.
 */
export function psychologicalPrice(target: Ratio, minimumCents: bigint): bigint {
  // Candidates are 900 + 1000k cents ($9, $19, ...). Take the nearest two
  // around the target, drop any below the minimum, then step up as needed.
  const k = floorCents(div(sub(target, ratio(900n)), ratio(1000n)));
  const lo = 900n + 1000n * (k < 0n ? 0n : k);
  const candidates = [lo, lo + 1000n].filter(c => c >= minimumCents);
  if (candidates.length === 0) {
    const steps = ceilCents(div(ratio(minimumCents - 900n), ratio(1000n)));
    return 900n + 1000n * (steps < 0n ? 0n : steps);
  }
  const dist = (c: bigint) => {
    const d = sub(ratio(c), target);
    return d.n < 0n ? ratio(-d.n, d.d) : d;
  };
  return candidates.reduce((best, c) => {
    const o = cmp(dist(c), dist(best));
    return o < 0 || (o === 0 && c > best) ? c : best;
  });
}

/** The list price: always a whole dollar amount ending in 9. */
export function listPrice(costCents: bigint, config: PricingConfig): bigint {
  const t = priceTargets(costCents, config);
  return psychologicalPrice(t.targetIncCents, t.minimumIncCents);
}

// ---------------------------------------------------------------------------
// Results of a price

export interface PriceCheck {
  priceIncCents: bigint;
  revenueExCents: bigint; // rounded to the cent for display
  gstCents: bigint; // price minus revenueEx, so the two always add up
  profitCents: bigint;
  margin: Ratio | null; // null when there is no revenue
  markup: Ratio | null; // null when cost is zero
  marginDisplay: string | null;
  markupDisplay: string | null;
  meetsFloor: boolean;
  flags: string[];
}

/**
 * Margin and markup for a GST-inclusive price. GST is taken out of the price
 * once; it is never added on top of a price that already includes it.
 */
export function checkPrice(
  priceIncCents: bigint,
  costCents: bigint,
  config: PricingConfig
): PriceCheck {
  if (priceIncCents < 0n) throw new RangeError('negative price');
  const { floor, g } = rates(config);
  const revenueEx = div(ratio(priceIncCents), add(ONE, g));
  const profit = sub(revenueEx, ratio(costCents));
  const margin = priceIncCents === 0n ? null : div(profit, revenueEx);
  const markup = costCents === 0n ? null : div(profit, ratio(costCents));
  const flags: string[] = [];
  if (priceIncCents === 0n) flags.push('zero_revenue');
  if (costCents === 0n) flags.push('zero_cost');
  const meetsFloor = margin !== null && cmp(margin, floor) >= 0;
  if (!meetsFloor) flags.push('below_floor');
  const revenueExCents = roundCents(revenueEx);
  return {
    priceIncCents,
    revenueExCents,
    gstCents: priceIncCents - revenueExCents,
    profitCents: revenueExCents - costCents,
    margin,
    markup,
    marginDisplay: percent(margin),
    markupDisplay: percent(markup),
    meetsFloor,
    flags,
  };
}

// ---------------------------------------------------------------------------
// Discounts, bonuses and bundles

export interface ReferencePrice {
  priceIncCents: bigint;
  /** Where the regular price was seen, e.g. a URL or invoice number. */
  source: string;
  /** ISO date the regular price was last confirmed as charged. */
  verifiedAt: string | null;
}

export interface Saving {
  savingCents: bigint;
  savingFraction: Ratio;
  savingDisplay: string | null;
  claim: string | null; // null when the saving cannot be claimed truthfully
  flags: string[];
}

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2}))?$/;

/**
 * The only place a date string is read. Returns epoch milliseconds, or null
 * for anything that is not a real ISO date. Date.parse alone is not enough:
 * it silently turns 31 February into 3 March.
 */
function parseIsoDate(value: string | null, requireInstant: boolean): number | null {
  const m = value ? ISO_DATE.exec(value) : null;
  if (!m || (requireInstant && !m[4])) return null;
  const [year, month, day] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const calendar = new Date(Date.UTC(year, month - 1, day));
  if (calendar.getUTCMonth() !== month - 1 || calendar.getUTCDate() !== day) return null;
  const at = Date.parse(value as string);
  return Number.isNaN(at) ? null : at;
}

/** True only for a real ISO date or instant that is not later than `now`. */
function verifiedBy(verifiedAt: string | null, now: Date): boolean {
  const at = parseIsoDate(verifiedAt, false);
  return at !== null && at <= now.getTime();
}

/** The real saving against a regular price; only a price verified by `now` may be claimed. */
export function saving(
  offerIncCents: bigint,
  reference: ReferencePrice | null,
  config: PricingConfig,
  now: Date
): Saving {
  const flags: string[] = [];
  if (!reference || reference.priceIncCents <= 0n) {
    return { savingCents: 0n, savingFraction: ratio(0n), savingDisplay: null, claim: null, flags: ['no_reference_price'] };
  }
  const savingCents = reference.priceIncCents - offerIncCents;
  const fraction = ratio(savingCents, reference.priceIncCents);
  if (!verifiedBy(reference.verifiedAt, now) || !reference.source.trim()) flags.push('unverified_reference_price');
  if (savingCents <= 0n) flags.push('no_saving');
  if (cmp(fraction, parseRate(config.maxDiscount)) > 0) flags.push('discount_above_max');
  const display = percent(fraction);
  const claim =
    flags.length === 0
      ? `Save ${formatCents(savingCents)} (${display}) on the regular price of ${formatCents(reference.priceIncCents)}`
      : null;
  return { savingCents, savingFraction: fraction, savingDisplay: display, claim, flags };
}

/**
 * The most that bonus items may cost at price P while the offer stays at or
 * above the floor: P/(1+g) x (1 - floor) - base cost, rounded down.
 */
export function bonusBudget(priceIncCents: bigint, baseCostCents: bigint, config: PricingConfig): bigint {
  const { floor, g } = rates(config);
  const allowed = mul(div(ratio(priceIncCents), add(ONE, g)), sub(ONE, floor));
  const budget = floorCents(sub(allowed, ratio(baseCostCents)));
  return budget < 0n ? 0n : budget;
}

export type OfferStatus = 'draft' | 'needs_review' | 'ready_for_approval';

export interface OfferPromotion {
  id: string;
  startsAt: string; // ISO instant
  endsAt: string; // ISO instant
  timezone: string;
}

export interface Offer {
  id: string;
  kind: 'list' | 'discount' | 'bonus' | 'bundle';
  priceIncCents: bigint;
  cost: CostInput;
  reference?: ReferencePrice | null;
  promotion?: OfferPromotion | null;
  /** Other promotions this offer would be combined with. */
  stackedWith?: string[];
}

export interface OfferEvaluation {
  offer: Offer;
  cost: CostResult;
  price: PriceCheck;
  saving: Saving | null;
  status: OfferStatus;
  reasons: string[];
}

function promotionWindow(promo: OfferPromotion, now: Date): string[] {
  const start = parseIsoDate(promo.startsAt, true);
  const end = parseIsoDate(promo.endsAt, true);
  if (start === null || end === null || !promo.timezone) return ['promotion_window_invalid'];
  if (end <= start) return ['promotion_window_invalid'];
  if (now.getTime() < start) return ['promotion_not_started'];
  if (now.getTime() >= end) return ['promotion_expired'];
  return [];
}

/**
 * Evaluate an offer as it would be committed now. Every number is recomputed
 * from the inputs; nothing is taken on trust from a stored figure. The status
 * is never `active`: activation is a separate, human step.
 */
export function evaluateOffer(offer: Offer, config: PricingConfig, now: Date): OfferEvaluation {
  const cost = totalCost(offer.cost);
  const price = checkPrice(offer.priceIncCents, cost.totalCents, config);
  const reasons = [...price.flags.filter(f => f !== 'zero_cost')];
  if (cost.unknown.length) reasons.push('unknown_cost');
  let s: Saving | null = null;
  if (offer.kind === 'discount' || offer.reference) {
    s = saving(offer.priceIncCents, offer.reference ?? null, config, now);
    reasons.push(...s.flags);
  }
  if (offer.promotion) reasons.push(...promotionWindow(offer.promotion, now));
  if (offer.priceIncCents % 1000n !== 900n) reasons.push('price_not_ending_in_9');
  if ((offer.stackedWith?.length ?? 0) > 0) reasons.push('stacking_not_allowed');
  const unique = [...new Set(reasons)];
  return {
    offer,
    cost,
    price,
    saving: s,
    status: unique.length === 0 ? 'ready_for_approval' : 'needs_review',
    reasons: unique,
  };
}

/** The commit-time gate: throws unless the offer is ready for approval now. */
export function validateOfferForCommit(offer: Offer, config: PricingConfig, now: Date): OfferEvaluation {
  const evaluation = evaluateOffer(offer, config, now);
  if (evaluation.status !== 'ready_for_approval') {
    throw new OfferRejectedError(offer.id, evaluation.reasons);
  }
  return evaluation;
}

export class OfferRejectedError extends Error {
  constructor(
    readonly offerId: string,
    readonly reasons: string[]
  ) {
    super(`offer ${offerId} rejected: ${reasons.join(', ')}`);
    this.name = 'OfferRejectedError';
  }
}

/**
 * Three alternatives to a straight list price, each evaluated:
 * - discount: the lowest psychological price still at or above the floor,
 *   claimed against the list price only when that price is verified;
 * - bonus: the list price with bonus items up to the bonus budget;
 * - bundle: `bundleUnits` of the base at the list price per unit less what the
 *   floor allows, rounded to a psychological price.
 */
export function alternatives(
  base: CostInput,
  config: PricingConfig,
  now: Date,
  opts: {
    reference?: ReferencePrice | null;
    bonusLines?: CostLine[];
    bundleUnits?: number;
  } = {}
): OfferEvaluation[] {
  const baseCost = totalCost(base).totalCents;
  const list = listPrice(baseCost, config);
  const { minimumIncCents } = priceTargets(baseCost, config);
  const out: OfferEvaluation[] = [];

  // Discount: lowest whole dollar ending in 9 at or above the minimum.
  const lowest = psychologicalPrice(ratio(minimumIncCents), minimumIncCents);
  out.push(
    evaluateOffer(
      { id: 'discount', kind: 'discount', priceIncCents: lowest, cost: base, reference: opts.reference ?? null },
      config,
      now
    )
  );

  // Bonus: keep the list price, add bonus lines that fit the budget.
  const budget = bonusBudget(list, baseCost, config);
  const bonusLines = (opts.bonusLines ?? []).map(l => ({ ...l, bonus: true }));
  out.push(
    evaluateOffer(
      { id: 'bonus', kind: 'bonus', priceIncCents: list, cost: { ...base, lines: [...base.lines, ...bonusLines] } },
      config,
      now
    )
  );
  void budget;

  // Bundle: n units priced from n x cost, so the floor is checked on the whole.
  const n = opts.bundleUnits ?? 2;
  const bundleCost: CostInput = {
    lines: base.lines.map(l => ({ ...l, quantity: l.quantity * n })),
    labourCents: base.labourCents,
    fulfilmentCents: base.fulfilmentCents,
  };
  out.push(
    evaluateOffer(
      {
        id: 'bundle',
        kind: 'bundle',
        priceIncCents: listPrice(totalCost(bundleCost).totalCents, config),
        cost: bundleCost,
      },
      config,
      now
    )
  );
  return out;
}
