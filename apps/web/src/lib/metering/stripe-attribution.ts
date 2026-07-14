/**
 * Stripe → per-business revenue + fees (WS1). Stripe is a DIRECT-attribution
 * source: unlike hosting (project → business via the attribution map), a Stripe
 * charge already knows its business — via `metadata.business_key` (the documented
 * convention; the estate runs one Stripe account, split by metadata).
 *
 * Pure transform: the live `charges.list` fetch is the caller's edge. A charge
 * WITHOUT `business_key` is surfaced as unattributed — never guessed onto a
 * business. Amounts are Stripe minor units (cents); currency must be AUD (the
 * estate account) or it is flagged for FX rather than silently mis-summed.
 */

export interface StripeChargeLike {
  id: string;
  /** Gross amount in minor units (cents). */
  amount: number;
  /** Amount refunded in minor units. */
  amountRefunded?: number;
  currency: string;
  /** Epoch seconds. */
  created: number;
  metadata?: Record<string, string>;
  /** Processing fee in minor units (from the expanded balance_transaction). */
  feeCents?: number;
  refunded?: boolean;
}

export interface RevenueLine {
  businessKey: string;
  amountAud: number;
  chargeId: string;
  periodStart: string;
}
export interface FeeLine {
  businessKey: string;
  amountAud: number;
  chargeId: string;
  periodStart: string;
}
export interface UnattributedCharge {
  chargeId: string;
  amount: number;
  reason: string;
}

export interface StripeAttribution {
  revenue: RevenueLine[];
  fees: FeeLine[];
  unattributed: UnattributedCharge[];
}

function isoDate(epochSeconds: number): string {
  return new Date(epochSeconds * 1000).toISOString().slice(0, 10);
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function attributeStripeCharges(
  charges: StripeChargeLike[]
): StripeAttribution {
  const out: StripeAttribution = { revenue: [], fees: [], unattributed: [] };

  for (const c of charges) {
    const businessKey = c.metadata?.business_key;
    if (!businessKey) {
      out.unattributed.push({
        chargeId: c.id,
        amount: c.amount,
        reason: 'charge has no metadata.business_key',
      });
      continue;
    }
    if (c.currency.toUpperCase() !== 'AUD') {
      out.unattributed.push({
        chargeId: c.id,
        amount: c.amount,
        reason: `non-AUD charge (${c.currency}) needs FX before attribution`,
      });
      continue;
    }
    const periodStart = isoDate(c.created);
    const netCents = c.amount - (c.amountRefunded ?? 0);
    if (netCents > 0) {
      out.revenue.push({
        businessKey,
        amountAud: round2(netCents / 100),
        chargeId: c.id,
        periodStart,
      });
    }
    if (c.feeCents && c.feeCents > 0) {
      out.fees.push({
        businessKey,
        amountAud: round2(c.feeCents / 100),
        chargeId: c.id,
        periodStart,
      });
    }
  }

  return out;
}
