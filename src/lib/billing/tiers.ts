export type BillingTier = 'starter' | 'growth' | 'pro';

export interface TierConfig {
  id: BillingTier;
  label: string;
  monthlyPriceAud: number;
  priceIdEnvVar: string;
}

export const TIERS: Record<BillingTier, TierConfig> = {
  starter: {
    id: 'starter',
    label: 'Starter',
    monthlyPriceAud: 200,
    priceIdEnvVar: 'STRIPE_PRICE_ID_STARTER',
  },
  growth: {
    id: 'growth',
    label: 'Growth',
    monthlyPriceAud: 400,
    priceIdEnvVar: 'STRIPE_PRICE_ID_GROWTH',
  },
  pro: {
    id: 'pro',
    label: 'Pro',
    monthlyPriceAud: 800,
    priceIdEnvVar: 'STRIPE_PRICE_ID_PRO',
  },
};

export function resolvePriceId(tier: BillingTier): string {
  const config = TIERS[tier];
  const priceId = process.env[config.priceIdEnvVar];
  if (!priceId) {
    throw new Error(`${config.priceIdEnvVar} not set in environment`);
  }
  return priceId;
}
