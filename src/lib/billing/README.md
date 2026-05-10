# Billing — Stripe subscription setup

Admin-side server flow for creating Stripe subscriptions for portfolio businesses.

## Architecture

```
POST /api/billing/subscribe       Phill calls this to provision a subscription for a business
POST /api/billing/webhook         Stripe POSTs subscription/invoice events here
```

Identity: each `public.businesses` row tracks `stripe_customer_id`, `stripe_subscription_id`, `subscription_tier`, `subscription_status`, `subscription_current_period_end`.

## One-time setup

### 1. Get API keys from the Stripe dashboard

Login: support@carsi.com.au → https://dashboard.stripe.com/test/apikeys

Copy three values:
- `sk_test_...` (Secret key)
- `pk_test_...` (Publishable key — only needed when client-side Elements is wired up)
- Webhook signing secret comes from step 3 below

### 2. Create the three Products + Prices in Stripe

Dashboard → Products → Add product. Create three products with monthly recurring AUD prices:

| Product | Price | Frequency |
|---|---|---|
| Unite-Group Starter | A$200 | monthly |
| Unite-Group Growth | A$400 | monthly |
| Unite-Group Pro | A$800 | monthly |

Copy each Price ID (starts with `price_...`).

### 3. Create the webhook endpoint

Dashboard → Developers → Webhooks → Add endpoint:
- URL: `https://unite-group.in/api/billing/webhook`
- Events to send:
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.paid`
  - `invoice.payment_failed`

After creating, click the endpoint and reveal the signing secret (`whsec_...`).

### 4. Add env vars to Vercel + .env.local

```bash
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID_STARTER=price_...
STRIPE_PRICE_ID_GROWTH=price_...
STRIPE_PRICE_ID_PRO=price_...
```

## Subscribing a business

```bash
curl -X POST https://unite-group.in/api/billing/subscribe \
  -H "Content-Type: application/json" \
  -H "x-admin-token: $PI_CEO_API_KEY" \
  -d '{"business_id": "<uuid>", "tier": "pro"}'
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

`status: "incomplete"` is expected — Stripe creates the subscription with the first invoice in `open` state. To collect payment:
- For an existing customer with a saved card: it auto-confirms, webhook fires `invoice.paid`, status → `active`.
- For a new customer: pass the `client_secret` to a Stripe Elements form on the client-side to collect card details (UI not yet built).

## Going live

1. Test the full flow end-to-end with `sk_test_` and a [test card](https://stripe.com/docs/testing).
2. When confident: swap to `sk_live_`, `pk_live_`, recreate the webhook on the live dashboard, copy the live `whsec_` and live `price_` IDs.
