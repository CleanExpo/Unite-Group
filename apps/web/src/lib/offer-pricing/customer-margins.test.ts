import { describe, expect, it } from 'vitest';
import { pricingConfigFor } from './customer-margins';
import { checkPrice, listPrice } from './offer-engine';

const COST = 50_000n;

describe('customer margins', () => {
  it.each(['ccw', 'bulcs-holdings'])('%s is on 33.33%%', slug => {
    const c = pricingConfigFor(slug);
    expect(c.targetMargin).toBe('0.3333');
    expect(c.floorMargin).toBe('0.3323');
    expect(c.currency).toBe('AUD');
    expect(c.gstRate).toBe('0.10');
  });

  it.each(['duncan-ventures', 'CCW', '', 'unknown'])(
    '%s is on the standard 45%%',
    slug => {
      const c = pricingConfigFor(slug);
      expect(c.targetMargin).toBe('0.45');
      expect(c.floorMargin).toBe('0.449');
    }
  );

  it('a reduced-margin list price clears its floor and costs less than standard', () => {
    const reduced = pricingConfigFor('ccw');
    const standard = pricingConfigFor('anyone-else');
    const price = listPrice(COST, reduced);
    expect(price).toBeLessThan(listPrice(COST, standard));
    expect(checkPrice(price, COST, reduced).meetsFloor).toBe(true);
    expect(checkPrice(price, COST, standard).meetsFloor).toBe(false);
  });
});
