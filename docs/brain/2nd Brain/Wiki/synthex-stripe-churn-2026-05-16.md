# Synthex Stripe Churn-Mix Analysis — 90-day window (2026-02-15 → 2026-05-16)

**Phase:** 1b of Synthex Finalisation Arc
**Run date:** 2026-05-16 (UTC)
**Source of truth:** Stripe live API (`api.stripe.com/v1/*`) using `sk_live_*` from `~/.hermes/.env`
**Account:** `acct_1SzE5KGib5mMf28d` — Synthex (Unite Group), country `AU`, default currency `aud`
**Window unix:** `created[gte]=1771113600` `created[lte]=1778889600`
**Mode:** Read-only. No mutations issued.

---

## Verdict

**DATA_GAP — the population the brief assumes does not exist in this Stripe live account.**

The brief framed the work as a churn analysis over "~1,000 paying users on Pro / Growth / Scale AUD tiers, live since 2026-03-13 / v8.0." The live Stripe account holds **4 customers total and 3 subscriptions total** (all 3 created today, 2026-05-15 UTC). No subscriptions exist that reference any Synthex product. No charges occurred in the 90-day window. No payment failures, no dunning events, no involuntary cancellations.

You cannot compute churn against a denominator of zero. Reporting a "0% / 0%" churn rate would be misleading — the correct answer is that the premise is wrong and needs reconciling before churn is a meaningful question.

---

## Headline numbers

| Metric | Value | Source |
| --- | --- | --- |
| Active Synthex subscriptions at period start (2026-02-15) | **0** | `/v1/subscriptions?status=all` paginated; 0 created prior to window |
| Active Synthex subscriptions at period end (2026-05-16) | **0** | No active subs reference any Synthex product |
| Total subscriptions in account (any product, any status) | **3** | `/v1/subscriptions?status=all` — all created 2026-05-15 |
| Total customers in account | **4** | `/v1/customers` paginated |
| Subscription deletions in window | **1** | `/v1/events?type=customer.subscription.deleted` — a same-minute create→cancel test artifact |
| Subscription updates (cancel_at_period_end flips) in window | **0** | `/v1/events?type=customer.subscription.updated` |
| Invoice payment failures in window | **0** | `/v1/events?type=invoice.payment_failed` |
| Charges in window | **0** | `/v1/charges?created[gte/lte]=…` |
| Voluntary churn % | **N/A** (denominator = 0) | — |
| Involuntary churn % | **N/A** (denominator = 0) | — |
| Net subscriber change | **0** | start 0 → end 0 |
| MRR start | **A$0** | — |
| MRR end | **A$0** (no Synthex subs); A$2,500 / mo of CCW-CRM | — |

---

## By-tier breakdown (Pro / Growth / Scale)

The brief assumes Pro / Growth / Scale AUD tiers. **No products with those names exist.** The closest match in the Stripe product catalogue is the legacy Synthex tier set Starter / Professional / Enterprise.

| Brief-named tier | Closest live product | Live product status | Subs in window |
| --- | --- | --- | --- |
| Pro | `prod_Tx8cWpkBV5RP5X` "SYNTHEX - Professional" (introductory A$99) and `prod_UAk1z3GAsL47Qd` "SYNTHEX Professional" (A$249) | active | **0** |
| Growth | no product matches "Growth" by name | n/a | **0** |
| Scale | no product matches "Scale" by name | n/a | **0** |
| (Starter, for completeness) | `prod_Tx8gdIuaNqDMVS` "SYNTHEX-Starter" (A$49 / A$399) | active | **0** |
| (Enterprise, for completeness) | `prod_UAjvfjO00z094P` and `prod_Tx8jZd59rVws68` (A$99 / A$249 / A$1,499) | active | **0** |

**Finding:** either the brief's tier naming (Pro / Growth / Scale) is from a planned v8.0 catalogue that has not yet been provisioned in live Stripe, or the live tiers have been renamed Starter / Professional / Enterprise and the brief is using stale names. Either way, no live customer is paying for any Synthex tier today.

---

## Top 5 cancellation reasons

| Rank | Reason / feedback | Count |
| --- | --- | --- |
| 1 | `cancellation_requested` (no feedback text) | 1 |
| 2 | — | — |
| 3 | — | — |
| 4 | — | — |
| 5 | — | — |

Single deletion event in window: `evt_1TXBVjGib5mMf28dzSoTDp8Z` at 2026-05-15T02:29:59Z, cancelling `sub_1TXBV0…dl51tuNw` 45 seconds after it was created. This is an internal setup / smoke-test artifact, not a paying-customer cancellation.

---

## Mix-shift trend (month-over-month)

| Month | New subs | Cancellations (any reason) | Net |
| --- | --- | --- | --- |
| 2026-02-15 → 2026-02-28 | 0 | 0 | 0 |
| 2026-03 | 0 | 0 | 0 |
| 2026-04 | 0 | 0 | 0 |
| 2026-05 (to 16th) | 3 | 1 | +2 |

**Direction:** flat at zero for the first 75 days of the window; trace activity only in the last 24 hours, and that activity is internal Stripe-product setup (CCW-CRM products, not Synthex). No mix-shift signal to report.

---

## Pass / fail against the stated rubric

| Rubric clause | Stated threshold | Observed | Outcome |
| --- | --- | --- | --- |
| Voluntary churn | < 5% | N/A (no denominator) | DATA_GAP |
| Involuntary churn | < 2% | N/A (no denominator) | DATA_GAP |

---

## What this likely means (hypotheses to validate, not conclusions)

These are hypotheses for Phase 2 / brief-author reconciliation. Phase 1b is read-only and does not act on them.

1. **synthex.social v8.0 may not be billing through this Stripe account.** Possibilities: a separate Stripe account, a separate processor, a Supabase-only entitlement layer, or pre-revenue (free beta with no Stripe touch yet).
2. **The "~1,000 paying users" figure may live somewhere other than Stripe** — e.g. Supabase `auth.users` count, an analytics dashboard, a CRM, or a pre-launch waitlist.
3. **Pro / Growth / Scale naming may be from a planned v8.x catalogue that has not been pushed to Stripe live.** The live Synthex products use Starter / Professional / Enterprise.
4. **The 4 customers and 3 subs in this account are all non-Synthex setup activity** — 2 customers from CCW-CRM SaaS product setup today, 1 from Dimitri ITR setup yesterday, and 1 older customer (`cus_Tx8zwttkOowcCB`, created 2026-02-10) with no subscription.

---

## Verification ledger

- **DID:** Pulled live Stripe data via REST API for the window 2026-02-15 → 2026-05-16 UTC. Listed all customers (paginated to has_more=False), all subscriptions (status=all), events of types `customer.subscription.deleted`, `customer.subscription.updated`, `invoice.payment_failed`, and charges in window. Identified Synthex products vs non-Synthex products in the catalogue. Wrote findings + raw CSV to this wiki page.
- **VERIFIED:** Authenticated against `acct_1SzE5KGib5mMf28d` (Synthex, AU, AUD) — confirmed via `/v1/account` response. Paginated `/v1/subscriptions?status=all` to has_more=False → 3 records total. Paginated `/v1/customers` to has_more=False → 4 records total. Event-type queries returned 1, 0, 0, 0 respectively in window. Charges in window: 0. None of the 3 subscriptions reference a Synthex product (their `product` is `prod_UWDwOiE8VWA7Yf` "CCW-CRM" or `prod_UWCTIrPvuhwLRe` "Dimitri ITR"). Citations: `/v1/subscriptions` response (3 rows below), `/v1/events?type=customer.subscription.deleted&created[gte]=…` (1 row below), `/v1/customers` (4 rows below). Stripe key value never written to chat or to this file; only the `sk_live` prefix and length 107 logged.
- **CHANGE-MY-MIND:** I would revise from DATA_GAP to a real churn-rate finding if any of the following is shown: (a) a different Stripe account ID holds the 1,000 Synthex subscribers (please supply the account ID — re-run takes ~5 min), (b) Synthex v8.0 entitlements are tracked in Supabase / non-Stripe and "churn" should be measured from auth.users + entitlement status instead (different skill — Postgres pull, not Stripe pull), (c) the Pro / Growth / Scale tiers were recently renamed to Starter / Professional / Enterprise — but no subscriptions reference them either, so this alone wouldn't change the verdict, (d) the run window is wrong (e.g. you meant FY-to-date or last 30 days), (e) test-mode data was intended (current pull is live; test-mode would need `sk_test_…`).

---

## Appendix A — Raw evidence (CSV)

### A.1 All subscriptions (status=all, 3 rows total in account)

```csv
sub_id,status,created_unix,canceled_at_unix,cancel_at_period_end,price_id,product_id,unit_amount,currency,cd_reason,cd_feedback,cd_comment,created_iso
sub_1TXBVjGib5mMf28dQwKOlS4a,active,1778812199,,false,price_1TXBVjGib5mMf28dQbgzWA3B,prod_UWDwOiE8VWA7Yf,250000,aud,,,,2026-05-15T02:29:59Z
sub_1TXBV0Gib5mMf28ddl51tuNw,canceled,1778812154,1778812199,false,price_1TXBV0Gib5mMf28d76PHUc6n,prod_UWDwOiE8VWA7Yf,250000,aud,cancellation_requested,,,2026-05-15T02:29:14Z
sub_1TXA4pGib5mMf28dcGKGe7Hr,trialing,1778806686,,false,price_1TXA4oGib5mMf28dP3xQC4LH,prod_UWCTIrPvuhwLRe,250000,aud,,,,2026-05-15T00:58:06Z
```

### A.2 customer.subscription.deleted events in window (1 row)

```csv
event_id,created_unix,created_iso,sub_id,sub_status_at_event,canceled_at_unix,cd_reason,cd_feedback
evt_1TXBVjGib5mMf28dzSoTDp8Z,1778812199,2026-05-15T02:29:59Z,sub_1TXBV0Gib5mMf28ddl51tuNw,canceled,1778812199,cancellation_requested,
```

### A.3 customer.subscription.updated events in window (0 rows)

```csv
event_id,created_unix,sub_id,cancel_at_period_end_before,cancel_at_period_end_after
(no rows)
```

### A.4 invoice.payment_failed events in window (0 rows)

```csv
event_id,created_unix,invoice_id,customer_id,amount_due,currency,attempt_count
(no rows)
```

### A.5 Charges in window (0 rows)

```csv
charge_id,created_unix,amount,currency,paid,status,customer_id
(no rows)
```

### A.6 All customers (4 rows total in account)

```csv
customer_id,created_unix,created_iso,email_present,name_present,delinquent
cus_UWDwsApzrB6Yjd,1778812153,2026-05-15T02:29:13Z,yes,yes,false
cus_UVsxkQCAvCAWSK,1778734075,2026-05-14T04:47:55Z,yes,yes,false
cus_U4RBpzXcXJgIMf,1772403488,2026-03-01T22:18:08Z,yes,no,false
cus_Tx8zwttkOowcCB,1770721332,2026-02-10T11:02:12Z,yes,yes,false
```

### A.7 Catalogue — recurring AUD prices on Synthex-branded products

```csv
price_id,product_id,product_name,unit_amount_aud_cents,interval,nickname
price_1TCOXVGib5mMf28dj89HOem5,prod_UAk1z3GAsL47Qd,SYNTHEX Professional,24900,month,
price_1TCOS3Gib5mMf28d29hc0xPk,prod_UAjvfjO00z094P,Synthex- Enterprise,9900,month,
price_1TCOOYGib5mMf28dszIDjxan,prod_Tx8jZd59rVws68,SYNTHEX-Enterprise (legacy),24900,month,SYNTHEX-Enterprise Pack
price_1TCOOYGib5mMf28dWMxRfEFo,prod_Tx8jZd59rVws68,SYNTHEX-Enterprise (legacy),9900,month,SYNTHEX-Enterprise Pack + Tier
price_1TCO8GGib5mMf28d0W7pYdtY,prod_Tx8gdIuaNqDMVS,SYNTHEX-Starter,4900,month,SYNTHEX Marketing AI Assistance Starter Pack
price_1TCNtQGib5mMf28d0AD1agWQ,prod_Tx8cWpkBV5RP5X,SYNTHEX - Professional,9900,month,Introductory Offer
price_1SzERcGib5mMf28dUtekyYdD,prod_Tx8jZd59rVws68,SYNTHEX-Enterprise (legacy),149900,month,
price_1SzEPXGib5mMf28dIGtzfWYj,prod_Tx8gdIuaNqDMVS,SYNTHEX-Starter,39900,month,
price_1SzEKxGib5mMf28dZt4YEcYC,prod_Tx8cWpkBV5RP5X,SYNTHEX - Professional,24900,month,
```

None of the live subscriptions in A.1 reference any product_id in A.7.

---

## Appendix B — Provenance

- Tooling: `curl` against Stripe REST API + `python3` JSON parsing. No CLI, no MCP authentication step (Stripe MCP requires OAuth which would not bind to the Hermes key).
- Key handling: sourced from `~/.hermes/.env` via `set -a; . ~/.hermes/.env; set +a` in a subshell; value never printed; only `sk_live` prefix and length 107 disclosed.
- Pagination: `/v1/subscriptions?status=all` and `/v1/customers` both paginated to `has_more=False`; results not truncated.
- Mutations: zero. No POST / PATCH / DELETE was issued. The single deletion event in the window pre-existed (timestamp 2026-05-15T02:29:59Z, before this run started at 2026-05-16).
