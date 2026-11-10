/**
 * Which margin each customer is priced at (Phill, 09/11/2026). Everyone is on
 * the standard margin unless named here. Change a customer by changing this list.
 */
import { DEFAULT_PRICING_CONFIG, type PricingConfig } from './offer-engine';

const REDUCED_MARGIN = { targetMargin: '0.3333', floorMargin: '0.3323' };

/** CCW (Toby Bredhauer) and Bulcs Holdings (Ivi Sims). */
const REDUCED_MARGIN_CUSTOMERS = new Set(['ccw', 'bulcs-holdings']);

export function pricingConfigFor(customerSlug: string): PricingConfig {
  return REDUCED_MARGIN_CUSTOMERS.has(customerSlug)
    ? { ...DEFAULT_PRICING_CONFIG, ...REDUCED_MARGIN }
    : DEFAULT_PRICING_CONFIG;
}
