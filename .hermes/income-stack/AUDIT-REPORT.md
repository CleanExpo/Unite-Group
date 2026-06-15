# AU Restoration Stack Audit — 2026-06-12

## 1. One-screen summary
| Product | First $ path | Top blocker | Time to first $ | Confidence |
|---|---|---|---|---|
| CARSI | Sell renewal-focused IICRC training to time-poor AU restoration techs, then upsell employer proof packs | No master plan file; product strategy says renewal cockpit is P0 but the audit only found scattered strategy docs, not a single execution source | 1-3 weeks if existing checkout + live pages are already functioning | Medium |
| RestoreAssist | Close the compliance/pilot gate, then convert Beyond Clean / pilot orgs before EOFY pressure hits | Prod security gap: RLS disabled on 119 of ~180 prod tables; plus RA-4956 gate, backend deploy workflow drift, and prod env TLS bypass | 2-6 weeks, but only after owner-gated fixes | High |
| DR-NRPG | Send the contractor recruitment batch, convert 10 confirmations, then turn recruitment into paid contractor onboarding | The email campaign is drafted but not yet shipped; sending is blocked by live-db dependency, SendGrid env vars, and the script still needs confirmation to run safely | 3-10 days once the send path is approved and env is present | High |

## 2. Per-product status

### CARSI
**GREEN and shippable today**
- Live product positioning is coherent: time-poor AU restoration technicians needing IICRC renewal is a clear buyer.
- The product already has the right customer-facing surface area: 8 live industry pages, Stripe checkout, gamification/CEC UI, and Claire AI assistant.
- The roadmap already identifies two revenue-oriented priorities: the renewal cockpit (P0) and employer-proof-pack (P1).
- Industry expansion Tier 1 is already defined for hospitality, education, insurance, and strata.

**What blocks first charge**
- No CARSI master plan file exists. That is a planning gap because there is no single source of truth equivalent to RestoreAssist’s master plan.
- The audit did not find a canonical execution file mapping P0/P1 to shipped code, so Phill cannot verify what is truly next without reopening the scattered docs.
- Exact citation for the gap: `~/CARSI/docs/PRODUCT_STRATEGY_CUSTOMER_FIRST_REVIEW.md` says renewal cockpit is P0 and employer-proof-pack is P1, but there is no master plan file in the repo.

**Owner-gated actions only Phill can do**
- Approve the single-source plan for CARSI: either create one canonical master plan or explicitly bless the current strategy docs as the operating source.
- Decide whether to prioritise renewal cockpit first, or employer-proof-pack first for B2B revenue.
- Decide whether CARSI should be sold purely as individual renewal help or also as org-facing proof infrastructure this quarter.

**Quickest path to a paying customer**
- Push the renewal cockpit and checkout flow as the core offer for individual techs, then add employer-proof-pack as the immediate upsell for team managers who need evidence of training.
- The fastest sale is a renewal reminder / completion pack for one restoration tech already active in the market.

### RestoreAssist
**GREEN and shippable today**
- Production is live at `restoreassist.app` and the master plan confirms real prod data exists in Supabase, not just test data.
- Sprint M is complete; SP-3 and SP-8 shipped; iOS sign-in loop was fixed; and the help library is live.
- The soft-pilot runbook exists, and the pilot path is clearly identified (`Beyond Clean` is recommended).
- The Xero stability sprint is fully enumerated, so the work is known and bounded.

**What blocks first charge**
- **P0 security gap:** RLS is disabled on 119 of ~180 prod tables. Master plan calls this the single biggest production-readiness gap.
- **RA-4956** is the production go-live gate and still has P0/P1 sub-issues open: RA-4951, RA-4952, RA-4859, RA-4953, RA-4954, RA-4955.
- `NODE_TLS_REJECT_UNAUTHORIZED` is set in Vercel Production env vars and needs audit/removal.
- `deploy-production.yml` has been broken since 2026-04-25.
- Branch `release/sandbox-to-main-2026-05-16-final` is behind `origin/main`.
- The repo has uncommitted work: modified iOS Package.resolved plus untracked `.agents/`, `.codex/`, and `AGENTS.md`.
- Missing-migration signal: the audit did not find a `prisma/migrations` path in the repo search results; that needs a targeted repo check before any release claims.

**Owner-gated actions only Phill can do**
- Decide the canonical prod Supabase project and whether the old active project should be decommissioned.
- Approve the RLS/policy remediation as a first-class P0 and accept the rollout risk.
- Remove or justify the production TLS-bypass env var.
- Decide whether the broken CI deploy workflow is still needed or should be retired in favor of the current deployment path.
- Choose the first pilot customer and authorise the owner-gated cutover.

**Quickest path to a paying customer**
- Close the RLS gap, clear RA-4956, then launch the Beyond Clean soft pilot and immediately use it to convert the first compliant paying org before EOFY pressure peaks.
- If the gate cannot close this week, the next-best paid path is a narrow Xero-stability engagement with an existing pilot customer, because the deadline is concrete and valuable.

### DR-NRPG
**GREEN and shippable today**
- The product direction is clear: agency model, no phone contact, online forms only, and support via `support@disasterrecovery.com.au`.
- Pricing tiers are already encoded and coherent: Rural $395, Semi-rural $595, Tier1 $795, Tier2 $995, Tier3 $1,095.
- The Stage-6 recruitment campaign is fully drafted, including email body, follow-up, and scheduling flow.
- The recruitment script exists at `scripts/send-contractor-recruitment-emails.ts`.
- The campaign docs are aligned on the general mechanics: 20 recipients, 10 confirmations target, SendGrid or platform email.

**What blocks first charge**
- The recruitment email campaign is drafted but not yet sent.
- The send script depends on a live Prisma query path (`prisma.contractorProfile.findMany`) and SendGrid credentials (`SENDGRID_API_KEY`, plus optional `EMAIL_FROM` / `EMAIL_FROM_NAME`).
- The script still needs a deliberate `--dry-run` / send decision from Phill because live sending is owner-impacting and touches real contractors.
- The execution report says “Ready to Send,” but that is not the same as actually having sent the batch.
- Repo state: `main` is behind `origin/main` by 2 commits and `CLAUDE.md` is modified.

**Owner-gated actions only Phill can do**
- Approve the live email send.
- Confirm the contractor list and any exclusions before outreach.
- Approve whether the incentive wording and timing are final for the market.
- Decide whether to ship the platform email path or use SendGrid for the batch.

**Quickest path to a paying customer**
- Send the contractor recruitment batch, book 10 confirmations, and use those calls to close the first paid contractor subscription or referral-driven agency intro.
- The immediate income move is not the software itself; it is the email campaign that activates the network.

## 3. The P0 list across all three
- **1) RestoreAssist: RLS disabled on 119 prod tables.** This is the largest live security and trust gap. Verify with: `rg -n "RLS disabled|119 of ~180 prod tables|ENABLE RLS" ~/RestoreAssist/.claude/aggregation/MASTER_PLAN.md ~/RestoreAssist/.claude/aggregation/supabase/state.md`
- **2) RestoreAssist: RA-4956 go-live gate not closed.** Verify with: `rg -n "RA-4956|RA-4951|RA-4952|RA-4859|RA-4953|RA-4954|RA-4955" ~/RestoreAssist/.claude/aggregation/MASTER_PLAN.md`
- **3) RestoreAssist: production TLS bypass env var.** Verify with: `rg -n "NODE_TLS_REJECT_UNAUTHORIZED" ~/RestoreAssist/.claude/aggregation/MASTER_PLAN.md ~/RestoreAssist`
- **4) DR-NRPG: recruitment send is drafted but not executed.** Verify with: `test -f ~/DR-NRPG/scripts/send-contractor-recruitment-emails.ts && rg -n "--dry-run|--confirm|SENDGRID_API_KEY|prisma.contractorProfile.findMany" ~/DR-NRPG/scripts/send-contractor-recruitment-emails.ts`
- **5) CARSI: no master plan file, so execution priority is not canonical.** Verify with: `find ~/CARSI -path '*/MASTER_PLAN.md' -o -path '*/master-plan*.md'`

## 4. This-week action list
1. **RestoreAssist — make RLS remediation the top P0 and assign an owner.** Verification: `rg -n "RLS disabled on 119|RA-4956" ~/RestoreAssist/.claude/aggregation/MASTER_PLAN.md`
2. **RestoreAssist — remove or justify `NODE_TLS_REJECT_UNAUTHORIZED` in prod env.** Verification: `rg -n "NODE_TLS_REJECT_UNAUTHORIZED" ~/RestoreAssist/.claude/aggregation/MASTER_PLAN.md`
3. **RestoreAssist — reconcile the release branch with main before any go-live claims.** Verification: `git -C ~/RestoreAssist status --short --branch`
4. **DR-NRPG — run a dry run of the contractor email sender and validate the recipient list.** Verification: `node -e "require('fs').accessSync('~/DR-NRPG/scripts/send-contractor-recruitment-emails.ts')"` (or `test -f ~/DR-NRPG/scripts/send-contractor-recruitment-emails.ts`)
5. **DR-NRPG — if the dry run is clean, approve the live send.** Verification: `rg -n "Mode: DRY RUN|Sent: 20/20|All emails sent successfully" ~/DR-NRPG/.claude/STAGE-6-RECRUITMENT-EXECUTION-REPORT.md`
6. **CARSI — create or nominate a single canonical master plan.** Verification: `find ~/CARSI -name 'MASTER_PLAN.md' -o -name 'master-plan*.md'`
7. **CARSI — confirm the renewal cockpit is the first commercial deliverable.** Verification: `rg -n "renewal cockpit|employer-proof-pack|P0|P1" ~/CARSI/docs/PRODUCT_STRATEGY_CUSTOMER_FIRST_REVIEW.md ~/CARSI/docs/industry-expansion-roadmap.md`

## 5. What I did not check
- I did not run any migrations, database writes, or Supabase actions.
- I did not run `pnpm dev`, `pnpm build`, or `pnpm test`.
- I did not validate application runtime behavior in a browser.
- I did not inspect every code path, API route, or schema in each repo.
- I did not open Vercel, Linear, GitHub, or Supabase dashboards directly.
- I did not audit every untracked file, only the repo state surfaced by `git status` and the requested source documents.
- I did not verify whether every missing migration is truly absent; I only confirmed that no `migrations` path appeared in the local file searches performed for this audit.
