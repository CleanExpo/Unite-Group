---
type: wiki
updated: 2026-05-14
---

# Rana Handoff — 2026-05-14

Master handoff brief consolidating tonight's [[ccw]]-CRM + [[carsi]] overnight audit pipeline. Single source of truth for Rana Muzamil (Tech Lead) to action on Wed 14 May 2026. All anchors point at GitHub INDEX issues — [CCW-CRM #190](https://github.com/CleanExpo/CCW-CRM/issues/190) (29 issues) and [CARSI #146](https://github.com/CleanExpo/CARSI/issues/146) (25 issues) — plus the wiki Board syntheses ([[ccw-crm-board-synthesis-2026-05-14]] and [[carsi-board-synthesis-2026-05-14]]).

---

## 1. Headline

Overnight (2026-05-13 → 2026-05-14) the [[pi-ceo-architecture]] swarm audited CCW-CRM + CARSI end-to-end. Wave A produced two ground-truth discovery audits ([[ccw-crm-discovery-audit-2026-05-14]], [[carsi-discovery-audit-2026-05-14]]). Wave B ran six parallel Senior-Agent reviews (Technical Architect · Product Strategist · Market Strategist per repo). Wave C produced two CEO syntheses ranking 28 (CCW) + 24 (CARSI) actions as P0/P1/P2. Wave D opened 54 GitHub issues across both repos including two INDEX rollups. Wave E (this brief) consolidates the locked answers + 4-day CCW plan + 7-day CARSI plan into one Rana-actionable handoff. Awaits Phill YES/YES ratification before Rana starts.

---

## 2. Hard deadline — Mon 18 May 2026 10:00 AEST

Toby Bredhauer (CCW) returns from holiday Mon 18 May — corrected 2026-05-14 from the previously-believed Tue 26 May. Demo window collapsed by 8 days. The Tue-26-May cadence call must move forward to Mon 18 May or Tue 19 May AEST.

**"Demo-readiness" for CCW means a scope-reduced internal-ERP demo on a feature branch — NOT a full billing-platform demo.** Toby sees a green-build, auth-gated, scope-cut quote → order → invoice → Xero workflow. Stripe + customer portal are explicitly post-Mon-18.

The three hard blockers per [[ccw-crm-board-synthesis-2026-05-14]] §1:

1. **Build is red.** `npm run build` / `lint` / `tsc --noEmit` all fail because nobody re-ran `prisma generate` after the last three migrations on 2026-05-10 → 2026-05-12 (`ProductLocationStock`, `StockReservation`, `Cin7BomMaster`). Fix is one command — gates every other P0.
2. **Public-signup admin-promotion bug.** `src/app/api/auth/register/route.ts:34` auto-promotes every public self-signup to `admin`. Anyone who finds the production URL becomes admin on CCW's customer + financial data. Must be killed before any external link goes live.
3. **Stripe is zero-LOC.** Any "billing demo" must be Xero-only or scoped out. SaaS-style self-serve Stripe is a Sprint 2 problem; bill via the already-wired Xero integration for Mon 18 May.

---

## 3. The 4 Board-locked CCW questions + answers

Use these verbatim per [[ccw-crm-board-synthesis-2026-05-14]] §5. Phill ratifies on the Q-CCW1 gate (§7).

| # | Question | Locked answer | Rationale |
|---|----------|---------------|-----------|
| Q1 | Monorepo or single-app? | **SINGLE-APP** | `apps/web/` empty; `apps/backend/` orphan Python skeleton; `packages/*/` empty. One real Next.js app at root. `git rm` the scaffolding (~30 min). Alternative = ~1 week to legitimise the monorepo and slips Mon 18 May. |
| Q2 | Stripe in v1 by Mon 18 May? | **NO** | ~3 days work to wire (SDK + Checkout Session + webhook + Subscription model + UI) — forces dropping P0-5 (scope-cut) or P0-7 (sitemap) from the 4-day plan. Toby's billing can demo via existing Xero integration; SaaS Stripe is a Sprint 2 problem. |
| Q3 | HeyGen + AP2 — kill or wire? | **KILL** | Bundled into P0-5. Removes 15 stub routes + 2 settings UIs. Saves auth-gate work in P0-4. CCW is a carpet-cleaning-supplies distributor — neither feature has a business case. Reversible later. |
| Q4 | CCW-only ERP or multi-tenant SaaS? | **CCW-ONLY** | Toby is the only customer + an internal stakeholder, not a SaaS buyer. CCW-only deletes billing UI + pricing-public CTAs + public register flow. Cleanest demo story. Multi-tenant SaaS = 4+ weeks to legitimise. Forces Q2 = NO and Q5 = invite-only automatically. |
| Q5 | Self-register signup — keep or invite-only? | **INVITE-ONLY** | Forced by Q4. P0-2 closes the admin-promotion hole via `/api/team/invite` token flow. Removes "Sign up" from `MarketingHeader`. Most urgent security vector — Phill must explicitly bless the kill of public signup before Mon 18 May. |

---

## 4. The 5 Board-locked CARSI questions + answers

Use these verbatim per [[carsi-board-synthesis-2026-05-14]] §5. Phill ratifies on the Q-CARSI1 gate (§7).

| # | Question | Locked answer | Rationale |
|---|----------|---------------|-----------|
| Q1 | Abandon or rebase the 131-behind branch? | **ABANDON** | Cherry-pick the 4 unique seed-script commits onto fresh `origin/main` (~30 min) vs. mechanical rebase of 131 commits across 110 dirty files (days). PM-Core already shipped the lint/CI fixes upstream that this branch was attempting. 12 local commits ahead are stale duplicates. |
| Q2 | Who owns CARSI tech leadership? | **KEEP Rana w/ 7-day check-in trigger** | Deliver P0-1 through P0-6 within 5 working days as the test. If silent again past Day 7, transfer to PM-Core + a Senior Agent. 28-day silence is consistent with off-ramping but a single explicit re-engagement deserves one cycle. |
| Q3 | IICRC verification: self-attest / admin-review / API? | **ADMIN-REVIEW QUEUE** (middle path) | No public iicrc.org API exists; scraping is legally fragile. Manual moderator review of card images at registration. Defensible for the IICRC CEC moat per [[iicrc-content-initiative]]; cheap to operate at <500 cert holders. |
| Q4 | Monthly subscriptions ($44/$99) or one-shot only? | **KILL the $44/$99 subscription copy** | Code only supports one-shot Stripe Checkout. `/api/lms/subscription/status` returns hard-coded `has_subscription:false`. 1-hour rewrite of `/pricing` vs 4–5 day build. Stop selling something the code cannot deliver. |
| Q5 | Delete the 12 experimental routes? | **DELETE** | `/agents`, `/tasks`, `/demo`, `/demo-live`, `/council-demo`, `/dashboard-analytics`, `/status-demo`, `/design-system`, `/workflows`, `/workflows/[id]`, `/prd/generate`, `/prd/[id]`. AI-builder side-quests with no nav entry. Cuts type-check surface + reduces search-index dilution. |

---

## 5. Rana's day-by-day plan

### CCW — Wed 14 → Mon 18 May (4 days)

Copied from [[ccw-crm-board-synthesis-2026-05-14]] §6. Test-pass gate per day. Assumes Phill answers Q-CCW1 = YES by Wed 14 May EOD.

| Day | What ships | Test-pass gate |
|---|---|---|
| **Wed 14 May** | P0-1 regenerate Prisma + green build; P0-2 kill public self-signup + remove "Sign up" from header + 308 `/register` → `/login`; P0-8 delete `/api/webhooks/route.ts` | `npm run check:all` exits 0; anonymous POST `/api/auth/register` returns 403; no `/api/webhooks` references in `src/` |
| **Thu 15 May** | P0-5 delete 8 dead page-trees + AP2 UI + HeyGen routes (AM); P0-4 auth-gate the ~30 unintentionally-public routes + write `scripts/verify-route-auth.ts` (PM) | `find src/app/(dashboard) -name page.tsx | wc -l` drops by ~40; untagged-routes count = 0; legit-public allowlist documented |
| **Fri 16 May** | P0-6 canonical `/dashboard/*` tree + 301 mirrors (AM); P0-3 real `/contact` form + ripgrep 3-way domain fix (PM); P0-7 rewrite `sitemap.ts` + add `robots.ts` (PM) | `find src/app -name page.tsx | wc -l` ≤ 90; submitting `/contact` form creates `ContactSubmission` row; `curl /sitemap.xml` returns 7 real routes; `curl /robots.txt` disallows 9 paths |
| **Sat 17 May** | Manual click-through of full Toby demo path (marketing → contact → invite → onboarding → quote → order → invoice → Xero); Loom recording; open PR titled "CCW-CRM: Mon 18 May demo cut"; run [[opus-adversary]] pre-merge | Full demo path completes manually without errors; PR is green |
| **Sun 17 May** | DO NOT TOUCH PROD. Emergency fixes only. Final smoke test 09:00 AEST. | — |
| **Mon 18 May 10:00 AEST** | Walk Toby through demo cut. Use Loom as backup if live demo flakes. | Frame: "Here's the CCW workflow we're shipping. Stripe billing + customer portal are next sprint." |

**Slip protocol:** If any day's gate fails by EOD, Telegram-ping Phill (single-shot per [[feedback-no-repeating-alerts]]) with the specific failing gate and proposed cut. Don't ship behind a red gate.

### CARSI — Day 0 → Day 6 (7 days)

Copied from [[carsi-board-synthesis-2026-05-14]] §6. Assumes Phill answers Q-CARSI1 = YES by end of Day 0.

| Day | What ships | Test-pass gate |
|---|---|---|
| **Mon Day 0 (today)** | P0-1 WC credentials rotated at carsi.com.au; `.env.example` placeholder restored; husky guard added. Phill answers Q1/Q2/Q4. | `grep -E '(ck\|cs)_[a-f0-9]{32,}' .env.example` returns 0; new WC keys in 1Password |
| **Tue Day 1** | P0-2 `package.json` conflict resolved; P0-3 `prisma generate` + rename + cast cleanup; P0-4 rescue branch opened off `origin/main`, seed commits cherry-picked | `npm install` exits 0; `npx tsc --noEmit` exits 0; rescue PR green |
| **Wed Day 2** | P0-4 PR merged into `main`; legacy branch closed; P0-6 WordPress hero sanitiser shipped + redeployed (spot-check 5 random `/courses/[slug]` pages); P1-1 GA4 + PostHog wired + emitting `course_view` / `enrol_click` | Vercel green; 5 spot-checked courses show no "Already Purchased" hero; GA4 real-time shows pageviews |
| **Thu Day 3** | P0-5 day 1/3 (LmsQuiz + LmsQuestion models + migration; `/api/lms/quizzes/[id]` GET); P1-2 remove `force-dynamic` from `/`, `/courses`, `/courses/[slug]`, sitemap; P1-5 JWT_SECRET rename | Migration applies; GET returns shape; Lighthouse mobile LCP on `/courses` < 2.5s |
| **Fri Day 4** | P0-5 day 2/3 (`/api/lms/quizzes/[id]/submit` POST + CEC award hook); P1-6 17 env vars added to `.env.example`; P1-7 post-purchase redirect to first lesson | Sandbox quiz pass → CEC awarded visible in `/dashboard/student`; env audit clean |
| **Sat Day 5** | P0-5 day 3/3 (wire QuizPlayer into LearnCourseShell; remove dead redirect; Playwright e2e); P1-9 Stripe idempotency table | Full e2e enrol → lesson → quiz → cert path green in Playwright; replay Stripe event produces "duplicate skipped" |
| **Sun Day 6** | P1-3 KILL $44/$99 copy from `/pricing` (1 hour); P1-4 public chat rate-limit; P1-8 Resend wiring on `/contact` + `/subscribe`; P1-10 status canonicalisation | `/pricing` reflects code; `/contact` form produces email at contact@unite-group.in |

**End-of-week gate:** Repo on `main`, builds green, all tests pass, P0 1–6 closed, P1 1–2 + 4–10 closed (P1-3 actioned via "kill copy" path = 1 hour), QuizPlayer live with assessed CEC awards, GA4 measuring everything, no leaked secrets in git history.

---

## 6. GitHub issue index anchors

| Repo | INDEX issue | Total issues | Counts |
|------|-------------|--------------|--------|
| CCW-CRM | https://github.com/CleanExpo/CCW-CRM/issues/190 | 29 | 8 P0 / 12 P1 / 8 P2 + 1 INDEX |
| CARSI | https://github.com/CleanExpo/CARSI/issues/146 | 25 | 6 P0 / 10 P1 / 8 P2 + 1 INDEX |

**Phill action — manual:** pin both INDEX issues in the GitHub UI on each repo (Issues tab → click issue → "Pin issue" in the right sidebar). The `gh` CLI cannot pin issues — this is a one-click manual op that keeps the master register at the top of each repo's Issues list for the duration of the sprint.

---

## 7. Single Phill ratification gate

**STATUS: RATIFIED YES/YES — 2026-05-14 by Phill McGurk.** Both bundles locked in full; no overrides. Rana cleared to action P0-1 each repo on Mon morning. GitHub INDEX comments posted to [CCW-CRM #190](https://github.com/CleanExpo/CCW-CRM/issues/190) and [CARSI #146](https://github.com/CleanExpo/CARSI/issues/146) confirming the ratification.

---

Phill must answer two questions BEFORE Rana starts. Both are YES/NO ratifications of the Board-locked answers in §3 and §4 above. Reply YES/YES to the Telegram alert, or specify differences inline. Rana actions issue #1 in each repo immediately on YES.

**Q-CCW1.** Approve the 5 CCW Board-locked answers as a single bundle?

> SINGLE-APP · NO Stripe v1 · KILL HeyGen+AP2 · CCW-ONLY · INVITE-ONLY signup

**Q-CARSI1.** Approve the 5 CARSI Board-locked answers as a single bundle?

> ABANDON 131-behind branch · KEEP Rana w/ 7-day check-in trigger · ADMIN-REVIEW queue for IICRC · KILL $44/$99 subscription copy · DELETE 12 experimental routes

Both bundles are internally consistent and cover the full sprint surface. Splitting bundles is allowed but creates dependency drag — e.g., if CCW Q4 = MULTI-TENANT then Q2 and Q5 must also flip. The recommendation is YES/YES; the alternatives are documented in the Board syntheses if Phill wants to override any single line.

---

## 8. Cross-refs

[[ccw-crm-discovery-audit-2026-05-14]] · [[ccw-crm-review-technical-architect-2026-05-14]] · [[ccw-crm-review-product-strategist-2026-05-14]] · [[ccw-crm-review-market-strategist-2026-05-14]] · [[ccw-crm-board-synthesis-2026-05-14]] · [[carsi-discovery-audit-2026-05-14]] · [[carsi-review-technical-architect-2026-05-14]] · [[carsi-review-product-strategist-2026-05-14]] · [[carsi-review-market-strategist-2026-05-14]] · [[carsi-board-synthesis-2026-05-14]] · [[ccw]] · [[carsi]] · [[project-ccw-holiday-window]] · [[unite-group-nexus-architecture]] · [[iicrc-content-initiative]] · [[feedback-no-slack]] · [[feedback-secrets-handling]] · [[feedback-autonomous-mandate]] · [[feedback-no-repeating-alerts]] · [[feedback-make-calls-not-questions]] · [[opus-adversary]]
