/**
 * FX → AUD. All per-project P&L is reported in AUD, but sources bill in their
 * own currency (Vercel/DO/LLM in USD, Stripe/domains in AUD). Rates are INJECTED
 * (a real per-period FX feed downstream) — never hard-coded here, so we don't
 * bake stale/fake numbers into the ledger. AUD is always 1:1.
 */

/** currency (ISO 4217) → multiplier to AUD for the relevant period. */
export type FxRates = Record<string, number>;

function round4(n: number): number {
  return Math.round((n + Number.EPSILON) * 1e4) / 1e4;
}

/** Convert `amount` in `currency` to AUD using the supplied rate table. */
export function toAud(amount: number, currency: string, rates: FxRates): number {
  const rate = currency === 'AUD' ? 1 : rates[currency];
  if (rate == null) {
    throw new Error(`toAud: no FX rate supplied for '${currency}'`);
  }
  return round4(amount * rate);
}

export { round4 };
