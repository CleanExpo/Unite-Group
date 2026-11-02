// Website System plans a proposal can offer (UNI-3173).
//
// PLACEHOLDERS, until Phill decides prices and the UNI-3141 entitlement table exists. Replace this one module then.
// The figures and inclusions come from the three service tiers in UNI-1979. A proposal copies its plan when it is
// created, so changing this file never changes what an already-issued proposal says or charges.

export type WebsitePlan = {
  id: string
  name: string
  /** What Stripe charges each period, in AUD cents, including GST. */
  amountCents: number
  interval: 'month' | null
  isPlaceholder: boolean
  scope: readonly string[]
}

export const WEBSITE_PLANS: readonly WebsitePlan[] = [
  {
    id: 'foundation',
    name: 'Foundation',
    amountCents: 150_000,
    interval: 'month',
    isPlaceholder: true,
    scope: [
      'A monthly search visibility report with priority actions',
      'Four social posts a week, approved against your brand',
      'One 60 second explainer video a month',
      'A brand audit every quarter',
    ],
  },
  {
    id: 'growth',
    name: 'Growth',
    amountCents: 200_000,
    interval: 'month',
    isPlaceholder: true,
    scope: [
      'Everything in Foundation',
      'Weekly search and competitor alerts',
      'Two explainer videos a month',
      'A LinkedIn authority campaign',
      'A monthly strategy call with Unite Group',
    ],
  },
  {
    id: 'full-agency',
    name: 'Full Agency',
    amountCents: 250_000,
    interval: 'month',
    isPlaceholder: true,
    scope: [
      'Everything in Growth',
      'A full website rebuild',
      'An expansion strategy for new markets',
      'A weekly performance dashboard',
    ],
  },
]

export function findPlan(id: string): WebsitePlan | null {
  return WEBSITE_PLANS.find((plan) => plan.id === id) ?? null
}

/** Bump when the terms below change: each acceptance is recorded against the version it saw. */
export const PROPOSAL_TERMS_VERSION = '2026-11-02-draft'

export const PROPOSAL_TERMS: readonly string[] = [
  'We deliver the work listed in this proposal for the price shown, which includes GST.',
  'A monthly plan is charged each month until either of us ends it in writing.',
  'Your card details are handled by Stripe. We never see or keep them.',
  'Our full terms of service also apply.',
]
