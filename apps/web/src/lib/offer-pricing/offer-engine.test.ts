import { describe, expect, it } from 'vitest';
/**
 * The pricing spec's required cases, with its own numbers: 45% target, 44.9%
 * floor, 10% GST, psychological pricing on.
 */
import {
  DEFAULT_PRICING_CONFIG as SPEC,
  type CostInput,
  alternatives,
  bonusBudget,
  buyXGetYFree,
  checkPrice,
  dollarsToCents,
  evaluateOffer,
  listPrice,
  OfferRejectedError,
  priceTargets,
  psychologicalPrice,
  saving,
  totalCost,
  validateOfferForCommit,
} from './offer-engine';

const $ = dollarsToCents;
const NOW = new Date('2026-11-09T00:00:00Z');
const cost500: CostInput = { lines: [{ label: 'base', quantity: 1, unitCostCents: $('500') }] };
const verified = (price: string) => ({
  priceIncCents: $(price),
  source: 'invoice INV-1',
  verifiedAt: '2026-11-01',
});

describe('target and minimum', () => {
  it('$500 cost gives a $1,000 target and a $998.19 minimum', () => {
    const t = priceTargets($('500'), SPEC);
    expect(t.targetIncCents).toEqual({ n: 100000n, d: 1n });
    expect(t.minimumIncCents).toBe($('998.19'));
  });

  it('the list price is $999, the closest whole dollar ending in 9', () => {
    expect(listPrice($('500'), SPEC)).toBe($('999'));
  });
});

describe('margin checks', () => {
  it('$999 passes at about 44.94%', () => {
    const c = checkPrice($('999'), $('500'), SPEC);
    expect(c.meetsFloor).toBe(true);
    expect(c.marginDisplay).toBe('44.94%');
    expect(c.revenueExCents).toBe($('908.18'));
    expect(c.gstCents).toBe($('90.82'));
    expect(c.profitCents).toBe($('408.18'));
    expect(c.markupDisplay).toBe('81.64%');
  });

  it('$998 fails', () => {
    const c = checkPrice($('998'), $('500'), SPEC);
    expect(c.meetsFloor).toBe(false);
    expect(c.flags).toContain('below_floor');
  });

  it('$875 gives about 37.14% and fails', () => {
    const c = checkPrice($('875'), $('500'), SPEC);
    expect(c.marginDisplay).toBe('37.14%');
    expect(c.meetsFloor).toBe(false);
  });

  it('the cent boundary: $998.19 passes, $998.18 fails', () => {
    expect(checkPrice($('998.19'), $('500'), SPEC).meetsFloor).toBe(true);
    expect(checkPrice($('998.18'), $('500'), SPEC).meetsFloor).toBe(false);
  });

  it('never adds GST twice: GST is taken out of the inclusive price once', () => {
    const c = checkPrice($('1100'), $('500'), SPEC);
    expect(c.revenueExCents).toBe($('1000'));
    expect(c.gstCents).toBe($('100'));
    expect(c.revenueExCents + c.gstCents).toBe($('1100'));
  });
});

describe('psychological pricing', () => {
  it('never goes below the floor, even when a lower candidate is closer', () => {
    // Target $1,000 but minimum $1,000.50: $999 is closer, yet below the floor.
    expect(psychologicalPrice({ n: 100000n, d: 1n }, $('1000.50'))).toBe($('1009'));
  });

  it('a tie between two candidates goes to the higher price', () => {
    // $1,004 is $5 from both $999 and $1,009.
    expect(psychologicalPrice({ n: 100400n, d: 1n }, 0n)).toBe($('1009'));
  });
});

describe('savings', () => {
  it('$1,025 regular against $999 is a $26 saving, about 2.54%', () => {
    const s = saving($('999'), verified('1025'), SPEC, NOW);
    expect(s.savingCents).toBe($('26'));
    expect(s.savingDisplay).toBe('2.54%');
    expect(s.claim).toBe('Save $26.00 (2.54%) on the regular price of $1,025.00');
  });

  it('an unverified regular price is flagged and cannot be claimed', () => {
    const s = saving($('999'), { priceIncCents: $('1025'), source: 'competitor ad', verifiedAt: null }, SPEC, NOW);
    expect(s.flags).toContain('unverified_reference_price');
    expect(s.claim).toBeNull();
  });

  it('a saving above the maximum discount is flagged', () => {
    expect(saving($('500'), verified('1000'), SPEC, NOW).flags).toContain('discount_above_max');
  });
});

describe('cost', () => {
  it('buy one get two free counts 3 units', () => {
    const line = buyXGetYFree('filter', 1, 2, $('10'));
    expect(line.quantity).toBe(3);
    expect(totalCost({ lines: [line] }).totalCents).toBe($('30'));
  });

  it('unknown costs are flagged and block the offer', () => {
    const e = evaluateOffer(
      { id: 'o', kind: 'list', priceIncCents: $('999'), cost: { lines: [{ label: 'freight', quantity: 1, unitCostCents: null }], labourCents: null } },
      SPEC,
      NOW
    );
    expect(e.cost.unknown).toEqual(['freight', 'labour']);
    expect(e.status).toBe('needs_review');
    expect(e.reasons).toContain('unknown_cost');
  });

  it('bonuses are counted and can make an offer fail', () => {
    const budget = bonusBudget($('999'), $('500'), SPEC);
    expect(budget).toBe($('0.40'));
    const withBonus = evaluateOffer(
      { id: 'o', kind: 'bonus', priceIncCents: $('999'), cost: { lines: [...cost500.lines, { label: 'bonus', quantity: 1, unitCostCents: $('0.41'), bonus: true }] } },
      SPEC,
      NOW
    );
    expect(withBonus.price.meetsFloor).toBe(false);
    expect(withBonus.status).toBe('needs_review');
  });
});

describe('zero inputs', () => {
  it('zero cost: margin 100%, no markup', () => {
    const c = checkPrice($('99'), 0n, SPEC);
    expect(c.marginDisplay).toBe('100.00%');
    expect(c.markup).toBeNull();
    expect(c.meetsFloor).toBe(true);
  });

  it('zero revenue: no margin, below the floor', () => {
    const c = checkPrice(0n, $('500'), SPEC);
    expect(c.margin).toBeNull();
    expect(c.flags).toEqual(expect.arrayContaining(['zero_revenue', 'below_floor']));
  });
});

describe('promotions', () => {
  const offer = (startsAt: string, endsAt: string, stackedWith: string[] = []) => ({
    id: 'promo',
    kind: 'discount' as const,
    priceIncCents: $('999'),
    cost: cost500,
    reference: verified('1025'),
    promotion: { id: 'p1', startsAt, endsAt, timezone: 'Australia/Brisbane' },
    stackedWith,
  });

  it('a live promotion is ready for approval, never active', () => {
    const e = validateOfferForCommit(offer('2026-11-01T00:00:00+10:00', '2026-11-30T23:59:59+10:00'), SPEC, NOW);
    expect(e.status).toBe('ready_for_approval');
  });

  it('an expired promotion is blocked at commit', () => {
    expect(() =>
      validateOfferForCommit(offer('2026-10-01T00:00:00+10:00', '2026-11-01T00:00:00+10:00'), SPEC, NOW)
    ).toThrow(OfferRejectedError);
  });

  it('stacking is blocked, and no configuration can allow it', () => {
    const o = offer('2026-11-01T00:00:00+10:00', '2026-11-30T00:00:00+10:00', ['p2']);
    expect(evaluateOffer(o, SPEC, NOW).reasons).toContain('stacking_not_allowed');
    const override = { ...SPEC, allowStacking: true } as typeof SPEC;
    expect(evaluateOffer(o, override, NOW).status).toBe('needs_review');
    expect(() => validateOfferForCommit(o, override, NOW)).toThrow(OfferRejectedError);
  });

  it.each(['bogus', '2027-01-01', '2026-02-31', '2026-11-01T25:00:00Z', '01/11/2026'])(
    'a regular price verified on %s makes no claim and cannot be committed',
    verifiedAt => {
      const o = {
        ...offer('2026-11-01T00:00:00+10:00', '2026-11-30T00:00:00+10:00'),
        reference: { ...verified('1025'), verifiedAt },
      };
      const e = evaluateOffer(o, SPEC, NOW);
      expect(e.saving?.claim).toBeNull();
      expect(e.reasons).toContain('unverified_reference_price');
      expect(() => validateOfferForCommit(o, SPEC, NOW)).toThrow(OfferRejectedError);
    }
  );

  it.each([
    ['2026-02-31T00:00:00Z', '2026-11-30T00:00:00Z'],
    ['2026-11-01T00:00:00Z', '2026-11-31T00:00:00Z'],
    ['2026-11-01', '2026-11-30T00:00:00Z'],
    ['2026-11-01T00:00:00', '2026-11-30T00:00:00Z'],
  ])('a promotion window of %s to %s is invalid', (startsAt, endsAt) => {
    const o = offer(startsAt, endsAt);
    expect(evaluateOffer(o, SPEC, NOW).reasons).toContain('promotion_window_invalid');
    expect(() => validateOfferForCommit(o, SPEC, NOW)).toThrow(OfferRejectedError);
  });

  it('a price above the floor that does not end in 9 is refused, and no configuration can allow it', () => {
    const o = { id: 'list', kind: 'list' as const, priceIncCents: 99819n, cost: { lines: [{ label: 'base', quantity: 1, unitCostCents: 50000n }] } };
    expect(checkPrice(o.priceIncCents, 50000n, SPEC).meetsFloor).toBe(true);
    expect(evaluateOffer(o, SPEC, NOW).reasons).toContain('price_not_ending_in_9');
    const override = { ...SPEC, psychologicalPricing: false } as typeof SPEC;
    expect(() => validateOfferForCommit(o, override, NOW)).toThrow(OfferRejectedError);
  });

  it('a regular price with a blank source makes no claim', () => {
    expect(saving($('999'), { ...verified('1025'), source: '   ' }, SPEC, NOW).claim).toBeNull();
  });

  it('a regular price verified at the moment of commit may be claimed', () => {
    expect(saving($('999'), { ...verified('1025'), verifiedAt: NOW.toISOString() }, SPEC, NOW).claim).not.toBeNull();
  });
});

describe('alternatives', () => {
  it('returns discount, bonus and bundle, each checked against the floor', () => {
    const alts = alternatives(cost500, SPEC, NOW, { reference: verified('1025'), bundleUnits: 2 });
    expect(alts.map(a => a.offer.kind)).toEqual(['discount', 'bonus', 'bundle']);
    for (const a of alts) expect(a.price.meetsFloor).toBe(true);
  });
});
