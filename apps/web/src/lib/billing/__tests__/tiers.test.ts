// src/lib/billing/__tests__/tiers.test.ts
// Tests for the membership tier definitions and price-id resolution.

import { describe, it, expect, afterEach } from 'vitest';
import { TIERS, resolvePriceId } from '../tiers';

describe('billing tiers', () => {
  afterEach(() => {
    delete process.env.STRIPE_PRICE_ID_BASE;
  });

  it('defines all three tiers with ascending annual prices', () => {
    expect(TIERS.base.annualPriceAud).toBe(299);
    expect(TIERS.professional.annualPriceAud).toBe(799);
    expect(TIERS.master.annualPriceAud).toBe(2499);
    expect(TIERS.base.annualPriceAud).toBeLessThan(TIERS.professional.annualPriceAud);
    expect(TIERS.professional.annualPriceAud).toBeLessThan(TIERS.master.annualPriceAud);
  });

  it('resolves a price id from the tier env var when set', () => {
    process.env.STRIPE_PRICE_ID_BASE = 'price_base_123';
    expect(resolvePriceId('base')).toBe('price_base_123');
  });

  it('throws an honest error when the price-id env var is missing', () => {
    expect(() => resolvePriceId('base')).toThrow('STRIPE_PRICE_ID_BASE not set');
  });
});
