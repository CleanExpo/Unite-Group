# Billing — Stripe subscription scaffold

Pre-build for the **ANZ Industry Association** launch (Q3 2026 incorporation, founding member recruitment Jul–Sep 2026). See `2nd Brain/Wiki/industry-association-vision-2026.md` for the full plan.

> Ported into `apps/web` from `apps/authority-legacy` as part of the P1 Stripe convergence. See `docs/convergence/migration-map.md`.

## Status — what's wired vs deferred

| Layer | Status |
|---|---|
| Stripe customer + subscription primitives | ✅ Built |
| Webhook signature verification (HMAC-SHA256) | ✅ Built |
| `stripe_events` ledger + `stripe_provisioning_queue` | ✅ Migrated (`20260612000000_stripe_events.sql`) |
| `businesses` subscription columns (`stripe_*`, `subscription_*`) | ⚠️ NOT migrated in apps/web — billing/webhook route degrades to `not_connected` until added |
| `nexus_clients` (onboarding checkout + Stripe webhook activation) | ⚠️ NOT migrated in apps/web — onboarding + stripe webhook routes degrade to 501 `not_connected` |
| `profiles.stripe_*` (cancel/portal/subscribe/receipt) | ⚠️ NOT present in apps/web — those routes degrade to 501 `not_connected` |
| Three tier definitions (Base / Professional / Master) | ✅ Defined, awaiting Stripe Products |
| Stripe API keys + Products + webhook endpoint | ⏳ Deferred to Q3 2026 launch |
| Admin UI (`/empire/billing`) | ⏳ Deferred until tiers actually sell |
| Member-facing checkout / signup UI | ⏳ Q3 2026 |

## Membership tiers (per association revenue model)

| Tier | Price | Includes | Year-1 target |
|---|---|---|---|
| Base | A$299/yr | Directory listing, newsletter, annual report | $150k |
| Professional | A$799/yr | Base + CARSI training access, equipment pricing | $200k |
| Master | A$2,499/yr | Professional + conference, awards table, advocacy, priority listing | $125k |

## Architecture

```
POST /api/billing/subscribe       User route — change subscription plan (needs profiles.stripe_*)
POST /api/billing/cancel          User route — cancel at period end (needs profiles.stripe_*)
POST /api/billing/portal          User route — Stripe Customer Portal (needs profiles.stripe_*)
POST /api/billing/receipt         User route — email a branded receipt (needs profiles.stripe_*)
POST /api/billing/webhook         Stripe POSTs subscription/invoice events (needs businesses.subscription_*)
```

Identity (target schema, not yet migrated in apps/web): each `public.businesses` row would carry `stripe_customer_id`, `stripe_subscription_id`, `subscription_tier`, `subscription_status`, `subscription_current_period_end`; per-user billing identity would live on a `public.profiles` row (`stripe_customer_id`, `stripe_subscription_id`, `plan`, `cancellation_reason`, `cancelled_at`).

Until those columns/tables exist in `apps/web`, the dependent routes return an honest `503 not_connected` rather than touching schema that isn't there — no mock data is ever returned. This follows the No-Invaders rule (no fake-as-real).

## Setup steps (when association launches Q3 2026)

### 1. Migrate the schema

Add the `profiles` billing columns and `businesses` subscription columns (and, if onboarding checkout is needed, the `nexus_clients` table) via the sandbox wizard. Track in `docs/convergence/migration-map.md`.

### 2. Get API keys

Stripe dashboard → Developers → API keys. Copy `sk_test_...` for staging, `sk_live_...` for production.

### 3. Create three Products + Prices in Stripe

Dashboard → Products → Add product. Three products with **annual** recurring AUD prices:

| Product | Price | Frequency |
|---|---|---|
| ANZ Industry Association — Base Membership | A$299 | yearly |
| ANZ Industry Association — Professional Membership | A$799 | yearly |
| ANZ Industry Association — Master Membership | A$2,499 | yearly |

Copy each Price ID (starts with `price_...`).

### 4. Create webhook endpoint

Dashboard → Developers → Webhooks → Add endpoint:
- URL: `https://<app-domain>/api/billing/webhook` (or `/api/webhooks/stripe`)
- Events: `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`

Reveal the signing secret (`whsec_...`).

### 5. Add env vars to Vercel + .env.local

```bash
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID_BASE=price_...
STRIPE_PRICE_ID_PROFESSIONAL=price_...
STRIPE_PRICE_ID_MASTER=price_...
```
