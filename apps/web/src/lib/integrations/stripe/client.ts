// Lazy, fail-safe Stripe client for Nexus (UNI-2328).
// Returns null when STRIPE_SECRET_KEY is unset so the app boots and CI builds
// without credentials — every caller must handle the null case (graceful
// degradation, per src/lib/integrations/CLAUDE.md). apiVersion is intentionally
// omitted so the pinned SDK default is used (avoids a brittle literal-type pin).

import Stripe from 'stripe'

let cached: Stripe | null | undefined

export function getStripe(): Stripe | null {
  if (cached !== undefined) return cached
  const key = process.env.STRIPE_SECRET_KEY?.trim()
  cached = key ? new Stripe(key) : null
  return cached
}

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim())
}
