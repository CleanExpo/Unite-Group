// ANZ Industry Association membership tiers — pre-build for Q3 2026 launch.
// Per Brain-1 wiki industry-association-vision-2026.md: incorporation Jul–Sep 2026,
// founding member recruitment Q3, three annual membership levels.
// CCW's existing $2,750/mo SaaS contract is bespoke, not a tier — link it manually
// via stripe_subscription_id on the businesses row.

export type MembershipTier = 'base' | 'professional' | 'master';

export interface TierConfig {
  id: MembershipTier;
  label: string;
  annualPriceAud: number;
  priceIdEnvVar: string;
  includes: string[];
}

export const TIERS: Record<MembershipTier, TierConfig> = {
  base: {
    id: 'base',
    label: 'Base',
    annualPriceAud: 299,
    priceIdEnvVar: 'STRIPE_PRICE_ID_BASE',
    includes: ['Member directory listing', 'Monthly newsletter', 'Annual report'],
  },
  professional: {
    id: 'professional',
    label: 'Professional',
    annualPriceAud: 799,
    priceIdEnvVar: 'STRIPE_PRICE_ID_PROFESSIONAL',
    includes: ['Base benefits', 'CARSI training access', 'Member pricing on equipment'],
  },
  master: {
    id: 'master',
    label: 'Master',
    annualPriceAud: 2499,
    priceIdEnvVar: 'STRIPE_PRICE_ID_MASTER',
    includes: [
      'Professional benefits',
      'Annual conference seat',
      'Awards table priority',
      'Advocacy + government submissions',
      'Priority directory placement',
    ],
  },
};

export function resolvePriceId(tier: MembershipTier): string {
  const config = TIERS[tier];
  const priceId = process.env[config.priceIdEnvVar];
  if (!priceId) {
    throw new Error(`${config.priceIdEnvVar} not set in environment`);
  }
  return priceId;
}
