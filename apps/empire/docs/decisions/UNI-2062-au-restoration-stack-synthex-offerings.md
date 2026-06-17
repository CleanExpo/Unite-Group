# UNI-2062: AU Restoration Stack → Synthex Agency Wrapping

> **Status**: DRAFT — pending Phill sign-off via 24h Board quiet-period window
> **Date**: 2026-06-12
> **Decision owner**: Margot (agent-drafted) / Phill (sign-off)
> **Unblocks**: First-dollar campaigns for CARSI / RestoreAssist / DR-NRPG; Synthex cross-product brand positioning
> **Migration**: `.hermes/income-stack/20260612110000_synthex_au_restoration_stack_strategy.sql`
> **Auto-promote window**: 24h from notification. If Phill objects within window, the migration is held on its database branch and not merged to prod.

---

## Context

Phill owns three products in the AU restoration vertical that, together, form a complete funnel:

| Product | Domain | Buyer | Pricing (live) | State |
|---|---|---|---|---|
| **CARSI** | `carsi.com.au` | Individual AU restoration technicians (IICRC renewal) | Foundation $44/mo, Growth $99/mo, org $795/yr | Live, 8 industry pages, Stripe checkout |
| **RestoreAssist** | `restoreassist.app` | AU restoration company owners/managers | $79/tech/mo (Fork 7 charter) | Production live, 56 orgs, 51 invites pending, P0 RLS gap |
| **DR-NRPG** | `disasterrecovery.com.au` | AU restoration contractors | $395–$1,095/mo pop-tiered | 95% code-complete, 151/151 tests, recruitment email drafted not sent |

The Phill operating model: Synthex is the **internal full-service digital marketing agency** that wraps the portfolio. Synthex owns the cross-product brand DNA, the lead funnel, the campaign calendar, and the experimental layer. Per the constitution, Synthex is internal — the customer-facing surface stays on the three product domains.

This decision registers the AU restoration stack as **one of Synthex's wrapped agency offerings**, with each product's `businesses` row updated with a `synthex_offering` JSONB payload describing pricing, first-dollar path, blockers, and ref pointers to the audit + offer documents in `~/Unite-Group/.hermes/income-stack/`.

## Options

| # | Strategy | Rationale For | Rationale Against |
|---|---------|--------------|-------------------|
| A | **No Synthex wrapping** — let each product sell standalone | Simpler; no cross-product complexity; each business keeps independent brand | Misses the funnel effect; AU restoration is a small enough market that a unified pitch converts better; triple the marketing spend for same reach |
| B | **Synthex wraps, products surface stays clean** *(this proposal)* | One agency positioning, three product surfaces; cross-promo in-app; shared campaign calendar; Synthex remains internal per constitution | Slight brand-coupling risk if a product's customer reads the agency-wrapped positioning and gets confused about who they're buying from |
| C | **Synthex becomes the customer-facing surface, products become white-label backends** | Maximum funnel control; one URL to rule them all | Conflicts with the existing product domains (carsi.com.au, restoreassist.app, disasterrecovery.com.au) that already have organic traffic; rebuilds all three pricing/onboarding flows; violates "Synthex is internal" constitution rule |

## Decision: **B. Synthex wraps, products surface stays clean**

**Why this wins**
1. **Same buyer, three products.** AU restoration is a small market — a restoration company owner is also the employer of CARSI students and the buyer of NRPG contractor leads. A unified agency pitch captures all three relationships from one conversation.
2. **No public rebuild.** Each product keeps its existing domain, onboarding, and pricing. Synthex stays internal. The "agency" is metadata, not a new product surface.
3. **Auditable.** The strategy lives in `businesses.brand_config` JSONB (real column) and `client_approvals` (signed-hash audit trail). Every change is Board-visible.
4. **Reversible.** The migration has an explicit down-section. If the strategy underperforms in 90 days, Phill approves a follow-up migration (validated on a database branch, then merged to prod) that runs the down-section and the three product rows return to pre-strategy state.
5. **Income-side already grounded.** Each of the three products has a real first-dollar path documented in the audit report — not a hypothesis. The Synthex wrapping is a multiplier on income paths that already exist.

## What this unlocks

- **CARSI** — first 10 individual IICRC tech subscribers at $44 or $99/mo via the renewal-cockpit pitch (P0 in product strategy).
- **RestoreAssist** — pilot cutover RA-1723 (Beyond Clean) once Phill approves the owner-gated action; first paid company at $79/tech/mo × techs on staff.
- **DR-NRPG** — 20-recipient recruitment email batch sent (one command: `npx ts-node scripts/send-contractor-recruitment-emails.ts --confirm`); first 10 confirmations convert to $395–$1,095/mo subscriptions.
- **Synthex** — cross-product brand DNA + campaign calendar in the agency row, with three queued campaigns and three queued experiments.

## Schema impact

```sql
-- On businesses (4 rows: carsi, restore, nrpg, synthex)
brand_config JSONB  -- existing column, additive update only
  + synthex_offering (carsi, restore, nrpg)
  + agency_offerings.au_restoration_stack (synthex)

-- On client_approvals (1 new pending row)
+ (slug=unite-group, deliverable=au-restoration-stack-strategy, status=pending)
```

No new tables. No RLS changes. No destructive migrations. All changes are additive on existing columns, idempotent (`COALESCE` and `||`).

## Migration path

1. **Branch** — land the migration in `apps/web/supabase/migrations/` on a PR and validate it on a Supabase database branch (the ephemeral per-branch DB replays the migrations). **Never validate against prod.**
2. **Diff** — on the database branch, confirm only the 4 businesses rows + 1 client_approvals row are touched.
3. **Verify** — on the database branch, read back each row's `brand_config` JSONB and the new `client_approvals` row.
4. **Notify** — Phill receives the diff + the read-back. **24h Board quiet-period clock starts here.**
5. **Promote** — if no objection in 24h, promote to prod (`lksfwktwtmyznckodsau`) **only by merging the approved branch** — never apply to prod directly or autonomously.
6. **Rollback** — if the strategy is reversed, a follow-up migration runs the down-section (validated on a database branch, then merged to prod). The decision doc and the approval row's `status` field track the lifecycle.

## Owner-gated actions only Phill can do

- **Approve the recruitment email send** for NRPG (one command, after the migration is verified on a database branch).
- **Approve the RestoreAssist pilot cutover (RA-1723)** for Beyond Clean.
- **Approve the RLS remediation on the 119 prod tables** (the largest live security gap; not in this migration).
- **Type "promote to prod"** if Phill wants to skip the 24h quiet period.

## Verification commands

Validate on a Supabase database branch — never against prod. `$BRANCH_DATABASE_URL`
is the connection string for the ephemeral per-branch DB.

```bash
# Land the migration in apps/web/supabase/migrations/, then provision/validate a
# database branch (via the Supabase GitHub integration or the create_branch MCP/CLI).
# The branch DB replays the migrations from supabase/migrations/.

# Verify the four businesses rows + the new approval row (on the branch DB)
psql "$BRANCH_DATABASE_URL" -c "SELECT slug, jsonb_pretty(brand_config -> 'synthex_offering') FROM businesses WHERE slug IN ('carsi','restore','nrpg');"
psql "$BRANCH_DATABASE_URL" -c "SELECT slug, jsonb_pretty(brand_config -> 'agency_offerings') FROM businesses WHERE slug = 'synthex';"
psql "$BRANCH_DATABASE_URL" -c "SELECT client_slug, deliverable_id, status, expires_at FROM client_approvals WHERE deliverable_id = 'au-restoration-stack-strategy';"

# Promote to prod (lksfwktwtmyznckodsau) ONLY by merging the approved branch,
# after the 24h quiet period or Phill's typed go — never apply to prod directly.
```

## What this decision does NOT do

- Does **not** touch the `RestoreAssist` production database. The RLS gap on 119 tables is a separate ticket (RA-4956) and a separate decision.
- Does **not** send any customer-facing email. The NRPG recruitment email is a separate, owner-gated action.
- Does **not** create new vendors. All writes go to the existing Unite-Group CRM Supabase.
- Does **not** rebuild any product surface. CARSI / RestoreAssist / DR-NRPG keep their existing domains, pricing, and onboarding.

## Next actions

1. I land the migration in `apps/web/supabase/migrations/` on a PR.
2. I provision a Supabase database branch, validate the migration on it, capture the diff + read-back, and post it to Phill.
3. **24h quiet-period begins.**
4. If no objection: I promote to prod by merging the approved branch and report the verified state.
5. If objection: I hold the migration on its database branch (unmerged) and revise the decision doc.
