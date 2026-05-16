# Synthex Supabase Billing — Real Paying-User State

**Date:** 2026-05-16
**Phase:** Finalisation Arc — Phase 1b (re-run)
**Source of truth:** Supabase project `znyjoyjsvjotlzjppzal` (Synthex), `public.subscriptions`
**Method:** Read-only `SELECT` via Supabase MCP. No mutations.
**Window:** 2026-02-15 → 2026-05-16 (last 90 days)

---

## Verdict

**NUMBER_ESTABLISHED for today. NO_HISTORICAL_AUDIT for trend.**

- The "today" snapshot is exact and reliable — pulled directly from `subscriptions` rows.
- The 90-day trend is **lower-bound only**. There is no append-only state-history table for subscription transitions. `audit_logs` (88 rows) contains zero `action` values matching `subscription / plan / billing / invoice / cancel`. Cancelled rows with `cancelled_at` set: zero. So cancellations that were hard-deleted (rather than soft-cancelled) leave no trace.

## Headline numbers (snapshot 2026-05-16)

| Metric | Value |
|---|---|
| Total rows in `subscriptions` | **5** |
| Status = `active` | 5 |
| Status = `cancelled` / `past_due` / `inactive` / `trialing` | **0** |
| Paying (`plan IN ('professional','business','custom')`) | **2** |
| Free (`plan = 'free'`) | 3 |
| Active trials (`trial_end >= NOW()`) | 0 |
| `users` table size (denominator) | 21 |

**The "~1,000 paying users" claim is CONTRADICTED.** The real prod Supabase count is **2 paying subscriptions** (both `plan='custom'`, status=active). The schema's prod billing table cannot physically host 1,000 paying users — it has 5 total rows.

## By-tier breakdown

| Plan | Status=active count |
|---|---|
| `free` | 3 |
| `custom` | 2 |
| `professional` | 0 |
| `business` | 0 |

Schema reference: `prisma/schema.prisma` lines 1419–1454. Plan enum-by-convention: `free`, `professional`, `business`, `custom` (string column, not enforced).

## 90-day delta

| Metric | Value | Notes |
|---|---|---|
| Active paying 90d ago (2026-02-15) — lower bound | **0** | Earliest row `created_at` = 2026-02-19 |
| Active paying today | **2** | |
| Net change | **+2 paying** | Both `custom` plan |
| Created in window | 5 (all 5 rows) | Subscriptions table effectively built within the window |
| Cancellations in window (`cancelled_at`) | 0 | No soft-cancels recorded |
| `past_due` today | 0 | |
| Hard-deleted cancellations | **Unmeasurable** — no audit trail |

**90-day "churn" approximation:** indeterminate. With zero `cancelled_at` rows and no audit trail of deletions, voluntary cancellation rate over the window can only be stated as `≥ 0` (a useless bound). Recommend: introduce a `subscription_events` append-only table OR Honcho/event-log mirror so future windows are reconstructible.

## Direct-invoice revenue

| Table | Rows | Window |
|---|---|---|
| `invoices` | 0 | n/a |
| `invoice_line_items` | 0 | n/a |
| `revenue_entries` | 0 | n/a (and `revenue_entries` is a creator-tracking model for end-users logging sponsorship/ad income — NOT Synthex SaaS revenue) |

**Direct-invoice gross AUD across the window: $0.** No invoices have ever been written to the prod `invoices` table.

## Schema-vs-reality flag (recommendation)

The `subscriptions` table still carries `stripe_customer_id`, `stripe_subscription_id`, `stripe_price_id` columns even though Phill confirmed 2026-05-16 that Stripe is NOT the billing rail. One row currently has `has_stripe = true` (id `mm2kf7ve4731514fb9c60ea5`, plan=custom, period 2026-02-25 → 2036-02-25). Either:

1. Synthex DID briefly run a Stripe customer for that one row (and the row was migrated to direct-invoice afterwards), OR
2. The `stripe_customer_id` is a leftover from copy-paste; not actually mapped to a live Stripe customer.

Either way, **2-of-2 paying customers** is the real number. The Stripe-shaped schema is misleading and should either be wired up or columns dropped.

## Recommendations

1. **Stop quoting "~1,000 paying users."** Real prod is 2. Even counting all `active` (free + paid) it is 5. The closest 4-digit number is `~1,000` is off by ~500x.
2. **Add `subscription_events` append-only ledger** so future 90-day windows can be reconstructed (mandatory if churn ever becomes a board KPI).
3. **Decide on Stripe vs direct-invoice** and drop the unused columns OR wire up the rail. Schema is currently a half-built bridge.
4. **Direct-invoice rail is unbuilt:** `invoices`/`invoice_line_items` tables exist with zero rows. If direct invoicing is the chosen path, no invoices have ever been issued through this system — current paying customers are presumably billed via some out-of-band mechanism (Xero, manual bank transfer, or PDF).

---

## Raw SQL appendix

```sql
-- Snapshot by status × plan
SELECT status, plan, COUNT(*) AS n
FROM subscriptions
GROUP BY status, plan
ORDER BY n DESC;
-- Result: (active,free,3), (active,custom,2)

-- Full row dump
SELECT id, plan, status,
       current_period_start, current_period_end,
       cancel_at_period_end, cancelled_at,
       trial_start, trial_end,
       created_at, updated_at,
       stripe_customer_id IS NOT NULL AS has_stripe
FROM subscriptions
ORDER BY created_at;
-- 5 rows: earliest 2026-02-19, latest 2026-04-30. 1 has_stripe=true.

-- Audit log probe
SELECT DISTINCT action
FROM audit_logs
WHERE action ILIKE '%subscription%'
   OR action ILIKE '%plan%'
   OR action ILIKE '%billing%'
   OR action ILIKE '%invoice%'
   OR action ILIKE '%cancel%';
-- Result: 0 rows

-- 90-day window aggregates
SELECT
  COUNT(*) FILTER (WHERE created_at <= '2026-02-15' AND status='active') AS active_90d_ago_lower_bound,
  COUNT(*) FILTER (WHERE created_at <= '2026-02-15' AND status='active' AND plan <> 'free') AS paying_90d_ago_lower_bound,
  COUNT(*) FILTER (WHERE status='active') AS active_today,
  COUNT(*) FILTER (WHERE status='active' AND plan <> 'free') AS paying_today,
  COUNT(*) FILTER (WHERE created_at >= '2026-02-15') AS created_in_window,
  COUNT(*) FILTER (WHERE cancelled_at >= '2026-02-15') AS cancelled_in_window,
  COUNT(*) FILTER (WHERE status='past_due') AS past_due_today,
  COUNT(*) FILTER (WHERE status='cancelled') AS cancelled_today,
  COUNT(*) FILTER (WHERE trial_end IS NOT NULL AND trial_end >= NOW()) AS active_trials
FROM subscriptions;
-- Result: 0, 0, 5, 2, 5, 0, 0, 0, 0

-- Revenue tables
SELECT COUNT(*) FROM invoices;             -- 0
SELECT COUNT(*) FROM invoice_line_items;   -- 0
SELECT COUNT(*) FROM revenue_entries;      -- 0 (and wrong table — creator income tracker, not SaaS revenue)
```

## Verification ledger

- **DID:** queried prod Supabase project `znyjoyjsvjotlzjppzal` via MCP `execute_sql`. Pulled `subscriptions` (5 rows, full dump), `invoices` (0), `invoice_line_items` (0), `revenue_entries` (0). Probed `audit_logs` for billing-shaped actions — 0 matches. Read schema (`prisma/schema.prisma:1419-1494, 5098-5146`).
- **VERIFIED WITH CITATION:** prod row count == 5, paying == 2 (both plan='custom'), all 5 rows created on/after 2026-02-19 (inside 90-day window), zero `cancelled_at` populated, zero `past_due`, zero `cancelled`. Invoices table never written.
- **CHANGE-MY-MIND:** if Synthex has a separate billing system (Xero / bank-transfer / Stripe-direct outside this schema) whose state is NOT mirrored to `subscriptions`. Production reality could then have more paying customers that this DB doesn't know about. The 1,000 claim would still need its own evidence — direct-invoice ledger, bank statements, Xero export, or Stripe dashboard.
