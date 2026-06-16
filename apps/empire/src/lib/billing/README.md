# Billing — Stripe subscription scaffold

Pre-build for the **ANZ Industry Association** launch (Q3 2026 incorporation, founding member recruitment Jul–Sep 2026). See `2nd Brain/Wiki/industry-association-vision-2026.md` for the full plan.

## Status — what's wired vs deferred

| Layer | Status |
|---|---|
| Stripe customer + subscription primitives | ✅ Built |
| Webhook signature verification (HMAC-SHA256) | ✅ Built |
| `businesses` schema (`stripe_*`, `subscription_*` columns) | ✅ Migrated |
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
POST /api/billing/subscribe       Admin route — provision membership for a business
POST /api/billing/webhook         Stripe POSTs subscription/invoice events here
```

Identity: each `public.businesses` row carries `stripe_customer_id`, `stripe_subscription_id`, `subscription_tier`, `subscription_status`, `subscription_current_period_end`.

## Notes on existing customers

**CCW** is on a bespoke SaaS contract — A$2,750/mo, $33k/yr ARR, signed 2026-05-03. That's not a tier; it's a custom Stripe Subscription created outside this code. To track it in our schema, set the columns directly on the businesses row:

```sql
UPDATE public.businesses
SET stripe_customer_id = '<from Stripe>',
    stripe_subscription_id = '<from Stripe>',
    subscription_tier = NULL,            -- bespoke, not a tier
    subscription_status = 'active',
    subscription_current_period_end = '<next renewal>'
WHERE slug = 'ccw-crm';
```

The webhook handler will keep this row in sync going forward — same Stripe account, same `whsec_` covers all subscriptions.

## Setup steps (when association launches Q3 2026)

### 1. Get API keys

Stripe dashboard (login: support@carsi.com.au) → Developers → API keys

Copy `sk_test_...` for staging, `sk_live_...` for production.

### 2. Create three Products + Prices in Stripe

Dashboard → Products → Add product. Three products with **annual** recurring AUD prices:

| Product | Price | Frequency |
|---|---|---|
| ANZ Industry Association — Base Membership | A$299 | yearly |
| ANZ Industry Association — Professional Membership | A$799 | yearly |
| ANZ Industry Association — Master Membership | A$2,499 | yearly |

Copy each Price ID (starts with `price_...`).

### 3. Create webhook endpoint

Dashboard → Developers → Webhooks → Add endpoint:
- URL: `https://unite-group.in/api/billing/webhook` (or association domain when live)
- Events:
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.paid`
  - `invoice.payment_failed`

Reveal the signing secret (`whsec_...`).

### 4. Add env vars to Vercel + .env.local

```bash
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID_BASE=price_...
STRIPE_PRICE_ID_PROFESSIONAL=price_...
STRIPE_PRICE_ID_MASTER=price_...
```

## Subscribing a business (admin curl)

```bash
curl -X POST https://unite-group.in/api/billing/subscribe \
  -H "Content-Type: application/json" \
  -H "x-admin-token: $PI_CEO_API_KEY" \
  -d '{"business_id": "<uuid>", "tier": "professional"}'
```

Response:
```json
{
  "subscription_id": "sub_...",
  "customer_id": "cus_...",
  "status": "incomplete",
  "client_secret": "pi_..._secret_..."
}
```

`status: "incomplete"` is expected — Stripe creates the subscription with the first invoice in `open` state. The `client_secret` is for the front-end checkout flow when that UI is built.
