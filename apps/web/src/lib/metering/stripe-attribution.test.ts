import { describe, it, expect } from 'vitest';

import {
  attributeStripeCharges,
  type StripeChargeLike,
} from './stripe-attribution';

const charge = (p: Partial<StripeChargeLike>): StripeChargeLike => ({
  id: 'ch_1',
  amount: 10000, // $100.00
  currency: 'aud',
  created: 1783900800, // 2026-07-13
  metadata: { business_key: 'carsi' },
  feeCents: 320, // $3.20
  ...p,
});

describe('attributeStripeCharges', () => {
  it('attributes a tagged AUD charge to revenue + fees for its business', () => {
    const r = attributeStripeCharges([charge({})]);
    expect(r.revenue).toEqual([
      expect.objectContaining({ businessKey: 'carsi', amountAud: 100 }),
    ]);
    expect(r.fees).toEqual([
      expect.objectContaining({ businessKey: 'carsi', amountAud: 3.2 }),
    ]);
    expect(r.unattributed).toHaveLength(0);
  });

  it('surfaces a charge with no business_key as unattributed (never guessed)', () => {
    const r = attributeStripeCharges([charge({ id: 'ch_x', metadata: {} })]);
    expect(r.revenue).toHaveLength(0);
    expect(r.unattributed[0]).toMatchObject({
      chargeId: 'ch_x',
      reason: 'charge has no metadata.business_key',
    });
  });

  it('flags a non-AUD charge for FX instead of mis-summing it', () => {
    const r = attributeStripeCharges([charge({ id: 'ch_usd', currency: 'usd' })]);
    expect(r.revenue).toHaveLength(0);
    expect(r.unattributed[0].reason).toMatch(/non-AUD/);
  });

  it('nets refunds off revenue', () => {
    const r = attributeStripeCharges([
      charge({ amount: 10000, amountRefunded: 2500 }),
    ]);
    expect(r.revenue[0].amountAud).toBe(75);
  });

  it('drops a fully-refunded charge from revenue (but keeps no phantom line)', () => {
    const r = attributeStripeCharges([
      charge({ amount: 10000, amountRefunded: 10000, feeCents: 0 }),
    ]);
    expect(r.revenue).toHaveLength(0);
    expect(r.fees).toHaveLength(0);
  });
});
