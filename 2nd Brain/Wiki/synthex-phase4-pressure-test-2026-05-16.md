# Synthex Phase 4 Pipeline Spec — Opus 4.7 Pressure-Test

**Date:** 2026-05-16
**Reviewer:** Claude Opus 4.7 (design-pressure-test skill)
**Target:** `/Users/phill-mac/.claude/plans/synthex-phase4-agency-pipeline-spec.md` (382 lines)
**Verdict:** **SPEC_NEEDS_REVISION** — 5 of 5 ADRs have valid criticisms; 8 new architectural risks identified; one is a near-miss show-stopper (Stage 5 data-store gap).

---

## TL;DR — Show-stoppers

1. **Stage 5 data-store mismatch (P0).** The spec says `client-portal-provision` wraps `Pi-Dev-Ops/swarm/inbox/provisioner.py`. The provisioner reads from `nexus_clients` + `stripe_provisioning_queue` tables in **Supabase**, not from `AgencyIntake` in **Synthex Prisma**. The spec assumes a wrapper exists. It doesn't. This is a 2–4 day data-bridging gap, not a "thin dispatcher".
2. **ADR-1 partially wrong** — Stripe is the customer-visible system of record for billing; ADR-1's claim that AgencyIntake is canonical is correct for *pipeline state* but the spec doesn't separate "pipeline state" from "billing state", and webhook reconciliation is unspecified.
3. **No observability whatsoever** — operator has no way to know Stage 7 ran but produced 0 outputs, or that the provisioner failed halfway. Spec mentions Telegram ping but nothing structured.

---

## Per-ADR Verdicts

### ADR-1 — Single `AgencyIntake` as canonical state — **REVISE**

The spec frames AgencyIntake as canonical pipeline state but conflates that with billing state. Stripe IS the system of record for billing — `checkout.session.completed`, invoice status, dunning, refunds. AgencyIntake holds *pointers* into Stripe (customer id, invoice ids) but those pointers can rot:

- Stripe customer deleted in dashboard → `stageArtefacts.stripe.customerId` is now a dangling reference.
- Invoice voided in Stripe → AgencyIntake still thinks BILLING is healthy.
- Webhook delivery fails → AgencyIntake.stage stays at `STRIPE_LINKED` even though deposit cleared.

**Revision:**
- Keep AgencyIntake canonical for **pipeline position** only.
- Explicitly call out: "Stripe is canonical for billing; AgencyIntake mirrors via webhook reconciliation."
- Add a `lastStripeSyncAt` timestamp + a `reconcileBilling(intakeId)` job that pulls truth from Stripe and rewrites local mirror. Run on every stage advance past STRIPE_LINKED.
- Same for Linear: `lastLinearSyncAt`.

### ADR-2 — JSON `stageArtefacts` column — **REVISE (downgrade scope)**

Zod-per-handler mitigates write-time drift but NOT cross-stage read drift. Concrete failure: Stage 6 (`onboard.ts`) reads `stageArtefacts.sow.brandSlug` to feed brand-codify. Stage 3 (`sow.ts`) was edited 6 weeks ago and now writes `stageArtefacts.sow.brand_slug` (typo / rename). Zod inside Stage 3 passes (its own schema is consistent with itself). Zod inside Stage 6 throws at runtime when an intake reaches that stage. Test won't catch it because the Vitest tests in `__tests__/idempotency.test.ts` test the *handler* in isolation.

**Revision:**
- Define a single canonical `StageArtefactsSchema` Zod object in `lib/agency-pipeline/types.ts` covering ALL stage outputs.
- Every stage handler imports the same schema and parses the *whole* artefacts object on read AND write.
- One Vitest case that does a full lifecycle write → read across all 10 stages with the canonical schema.
- Reconsider typed columns for the 3 most-critical artefacts (stripeCustomerId, linearProjectId, brandSlug) — these are queried for joins; JSON-only is genuinely a Prisma footgun.

### ADR-3 — No retry-with-backoff framework — **ACCEPT with caveat**

At N=2 → 10 manual is fine. BUT the spec misjudges Stage 5: it requires a worker even at N=1. `client-portal-provision` Hour-1 spin-up creates Linear project (~3s) + Supabase rows (~1s) + ContextBot Telegram bot binding (~2s, sometimes 10s) + Resend welcome email (~2s) + Telegram ping (~1s). Best case ~10s, worst case 30s+. Vercel function timeout (Hobby 10s, Pro 60s, Enterprise 900s) — at Pro you have ~30s headroom.

The spec's stated pattern is the Stripe webhook handler enqueues + the provisioner runs out-of-band via cron/CLI. That IS the worker pattern, just not named. **Make it explicit:** "Stage 5 dispatch is asynchronous; webhook returns 200 immediately, provisioner.py picks up from stripe_provisioning_queue on next cron tick. No synchronous in-route invocation."

**Critical-bottleneck client-count:** N>20 weekly intakes is when no-queue genuinely breaks (operator can't track which stages stalled). N=10 cumulative is fine because peak concurrency is ~1–2.

### ADR-4 — `(contactEmail, brandSlug)` composite — **REVISE**

Two valid criticisms:
- **Same person re-pitching under same brand from a different email** (e.g. switches from gmail to corporate) creates a new row. Now you have 2 intakes for "Toby @ CCW" with no link.
- **Domain-based identity is stronger.** An agency-fit decision is fundamentally about the *brand* + its *domain*, not the inbox of the operator who happened to fill the form.

**Revision:**
- Composite: `(normalizedDomain, brandSlug)` where `normalizedDomain` is derived from `companyName` URL OR `contactEmail` domain (lowercased, www-stripped, no trailing slash).
- Keep `contactEmail` as a non-unique searchable index.
- Document the carve-out: gmail/outlook/yahoo public-mailbox domains fall back to email-based identity.

### ADR-5 — `vettingDecision` separate from `stage` — **ACCEPT**

The dual-state-machine concern is real in general but here it's justified because `WAITLISTED` is a re-enterable state. Collapsing into one enum forces `WAITLIST_THEN_SOW_DRAFTED` style values, which is worse. Keep as-is. **Caveat:** add a `vettingDecidedAt: DateTime?` so the audit trail of when the decision was filed is queryable.

---

## Per-Self-Flagged-Risk Verdicts

### Risk 1 — Untyped JSON drift under N=10 — **CONFIRMED, mitigation insufficient**

Concrete drift scenario:
- Week 1: Stage 4 writes `stageArtefacts.stripe.paymentLinkUrl`.
- Week 6: Stripe MCP signature changes, you refactor `stripe-milestone-invoice` to return `paymentLink: { url, id }`.
- Week 6: New intakes write the new shape; week-1 intakes still have the old shape; Stage 9 (Bill) reads both and crashes on the old ones.

**Mitigation:** Single canonical Zod schema (per ADR-2 revision) + a migration runner (`scripts/migrate-stage-artefacts.ts`) that lifts old rows to the current schema on schema bumps. Without this you ship a quiet timebomb.

### Risk 2 — No queue / no worker — **CONFIRMED, see ADR-3**

Stage 5 requires async-worker pattern at N=1. The spec implicitly relies on the existing `stripe_provisioning_queue` table + cron tick but never names it. Add an explicit section "Async stages and how they're driven" mapping each stage to sync-in-route vs cron-driven worker.

### Risk 3 — CCW re-entry as only idempotency test — **CONFIRMED, propose 3**

CCW re-entry is necessary but insufficient. Three synthetic intakes the spec must replay-clean before flag-flip:

1. **Mid-stage death:** Submit fake intake → ceo-board ACCEPT → run Stage 3 → kill process during `stripe-milestone-invoice` API call (after Stripe customer created, before AgencyIntake.stageArtefacts.stripe persisted). Re-run; assert no duplicate Stripe customer, AgencyIntake row reflects Stripe truth.
2. **Webhook arrives before stage row exists** (race): Stripe webhook fires `checkout.session.completed` for a `(intakeId, stageKey)` that was never written because Stage 4 crashed pre-persist. Webhook handler must gracefully no-op + alert, not crash.
3. **Concurrent re-submit:** Same `(email, brandSlug)` submitted twice within 200ms (form double-click). Unique constraint resolves one to 200 silently; second client receives identical "thank you" without DB error leaking. Test that no Telegram ping fires twice.

---

## New Architectural Risks (ranked by severity)

### 1. P0 — Stage 5 data-store gap

`provisioner.py` reads `nexus_clients` + `stripe_provisioning_queue` in **Supabase** (project `znyjoyjsvjotlzjppzal`). `AgencyIntake` lives in **Synthex Prisma Postgres** (the app DB). These are different stores. The spec's "thin dispatcher" assumption is wrong — a bridge is required:

- Either `AgencyIntake` row mirrors itself to `nexus_clients` on PROVISIONED transition, OR
- `provisioner.py` is refactored to read from `AgencyIntake` directly (via app-level read API).

This is a ~2–4 day track, not a wrapper. **Spec must add Stage 5a "Mirror intake to nexus_clients" or refactor provisioner contract.**

### 2. P0 — Stage 5 partial-failure has no compensating transaction

Provisioner does Linear → ContextBot → portal_content PATCH → welcome email → Telegram. If welcome email goes out but ContextBot binding fails, you have a client receiving "your portal is live" with a broken bot. There is no rollback. Currently `provisioner.py` continues past welcome-email failure but a ContextBot-binding fail throws and the queue row goes `failed` — meanwhile email + Linear + portal_content already happened. Re-run will skip those (idempotent), retry ContextBot. Net effect: client may be momentarily broken for ~minutes between provisioner crash and operator re-run.

**Mitigation:** Reorder so Telegram-bot binding completes BEFORE welcome email is sent (the bot URL is in the email anyway). Or send the welcome email last, gated on all prior steps succeeding.

### 3. P1 — Public form abuse surface

Spec mentions Zod + rate-limit (5/min/IP) but no:
- Captcha (Turnstile / hCaptcha) — bot fills 5 forms/min/IP × 1000 IPs = 5000/min, drowns Phill's Telegram + Resend quota.
- Disposable-email check (mailinator, 10minutemail) — adversarial submissions to waste ceo-board cycles.
- Honeypot field (zero-CSS hidden input that real users never fill).
- `Origin` header check (form posts from your own domain only).

**Mitigation:** Add Cloudflare Turnstile (already on synthex domain) + honeypot + disposable-email blocklist. Without these, public form ships a DoS vector.

### 4. P1 — Stage 7 silent zero-output mode

`marketing-orchestrator` is a topological dispatcher. If a sub-skill returns empty (e.g. `marketing-copywriter` throws and is caught), the orchestrator can plausibly write `deliveries[weekKey] = { ok: true, items: [] }`. brand-guardian then runs over zero artefacts → trivially passes. Spec assumes brand-guardian catches low-quality content. It can't catch *absent* content.

**Mitigation:** Stage 7 contract must assert `items.length >= expectedMin` where expectedMin = 1 blog + 4 social + 1 newsletter = 6. Below threshold = stage fails, doesn't advance. Add as a Zod refinement on the deliveries artefact schema.

### 5. P1 — No observability / dashboard

Spec adds zero observability. Operator has:
- A Telegram ping on intake submit (one-shot).
- CLI `pnpm pipeline:status <id>` (manual).

Missing:
- `app/admin/agency-pipeline/page.tsx` listing all rows with stage + age + last-error.
- Structured logs (`logger.info({ intakeId, stageKey, durationMs, ok })`) so we can query "what's the median time from VETTING → SOW_DRAFTED in the last 30 days?"
- Stale-stage alert: any row in same stage > 7 days fires a Telegram nudge.

**Mitigation:** Add a thin admin page (one route, ~150 LoC) + structured logs + cron-driven stale alert. Without it the pipeline is a black box.

### 6. P2 — Constitution amendment ceremony

Spec says "modify `CONSTITUTION.md`: +5 lines on idempotency invariants." Per Mavericks ruling Q5 (documented-principle vs constitutional), routine operational invariants do NOT require ceo-board ratification — they ARE documented principles. **However**, "AgencyIntake is the single source of truth for pipeline state" is closer to constitutional (it's a multi-quarter architectural commitment, expensive to undo) than operational. Recommend running ceo-board Q for this line specifically OR keep it OUT of CONSTITUTION.md and put it in `docs/agency-pipeline.md` instead. The spec currently puts it in CONSTITUTION.md without ceo-board ratification — that's an inconsistency with the ceremony architecture from the maximum-everything plan.

**Mitigation:** Move the invariant text from `CONSTITUTION.md` to `docs/agency-pipeline.md` § "Architectural Invariants". CONSTITUTION.md is reserved for ceo-board-ratified rules.

### 7. P2 — AU-only assumption (ABN, GST)

Spec assumes AU. What about:
- NZ entity wanting Synthex agency services (no ABN, has NZBN, GST is 15% not 10%).
- AU sole-trader without ABN (legal but rare).
- AU not-yet-GST-registered (turnover < $75k threshold).

Stage 4 (`stripe-milestone-invoice`) hard-codes AU GST tax registration. If an NZ prospect submits the form, the pipeline silently miscalculates tax.

**Mitigation:** Add `country: 'AU' | 'NZ' | 'OTHER'` to the intake schema with `AU` default. Stage 4 branches: AU → AU GST, NZ → NZ GST 15%, OTHER → no automatic tax + manual review flag. At minimum, validate `abn` only when `country=AU` and route non-AU intakes to a "manual triage" sub-flow.

### 8. P2 — Stage 6 chicken-and-egg with Stage 3

Stage 3 (SOW) "Input: `AgencyIntake` accepted + `BrandConfig` slug + ICP." Stage 6 (Onboard) "Output: New `brand-config/src/brands/{slug}.ts`."

**The BrandConfig doesn't exist until Stage 6.** Stage 3 must therefore EITHER:
- Use a placeholder BrandConfig keyed by `intake.brandSlug` (the user's hint).
- Run a lightweight pre-brand-research step at Stage 3.
- Defer Stage 3 until after Stage 6 (which means Stripe link comes after onboarding — fine, but reorders the pipeline).

The spec doesn't address this. As written, Stage 3 will throw on first run because `brand-config/src/brands/{ccw}.ts` style file doesn't exist yet for new prospects. CCW happens to already have one — every new prospect won't.

**Mitigation:** Add Stage 2.5 "preliminary brand sketch" using only the form-captured `websiteUrl` to produce a 1-page BrandConfig stub. OR explicitly accept that Stage 3 reads from intake fields directly without a BrandConfig dependency. The current spec is ambiguous.

### 9. P3 — `pm-core` CLI security

`pnpm pipeline:advance <id>` runs unauthenticated locally. If Phill's laptop is compromised, an attacker can advance arbitrary intakes through provisioning, including sending real welcome emails + creating real Linear projects. Spec assumes CLI = trusted operator.

**Mitigation:** Acceptable for N=10 if laptop is the security boundary. Document the assumption. Add a `--confirm "{intakeId}"` flag for destructive operations (stripe, provision) so accidental advance can't fire.

---

## Overall Verdict — **SPEC_NEEDS_REVISION**

Spec is 70% there. The architecture is sound, the ADRs are well-reasoned, the file list is appropriately scoped. But:

- Stage 5 data-store gap is a near-miss show-stopper (P0).
- Stripe webhook reconciliation is hand-waved (P0/P1).
- Public-form abuse surface is incomplete (P1).
- Stage 7 silent-zero-output is a quality risk (P1).
- Stage 3↔6 ordering is logically inconsistent (P2).

None of these require throwing the spec out. All can be addressed with targeted revisions. Recommend **one revision pass + re-review** before migration lands.

---

## Pre-Implementation Checklist — Additions

The spec's 12 items are good. Add these 8 to make 20:

- [ ] **13. Confirm Stage 5 data-bridging strategy.** Either mirror AgencyIntake → nexus_clients OR refactor provisioner.py to read from app-level API. (Y/N + which)
- [ ] **14. Adopt single canonical `StageArtefactsSchema` Zod object** rather than per-handler schemas. (Y/N)
- [ ] **15. Add 3 columns to AgencyIntake:** `lastStripeSyncAt`, `lastLinearSyncAt`, `vettingDecidedAt`. (Y/N)
- [ ] **16. Idempotency key composite changes from `(email, brandSlug)` to `(normalizedDomain, brandSlug)`** with email fallback for public-mail domains. (Y/N)
- [ ] **17. Public-form hardening:** Cloudflare Turnstile + honeypot + disposable-email blocklist + Origin header check. (Y/N)
- [ ] **18. Stage 7 deliveries Zod refinement** requiring `items.length >= 6` (1 blog + 4 social + 1 newsletter). (Y/N)
- [ ] **19. Admin observability page** `app/admin/agency-pipeline/page.tsx` listing rows + stale-stage alert cron. (Y/N)
- [ ] **20. Country-aware tax handling:** intake schema accepts `country` field; Stage 4 branches on AU/NZ/OTHER. (Y/N)

---

## Verification Ledger

- **DID:** Read spec (382 LoC), maximum-everything plan §4 + §5, billing reality wiki, CCW SOW JSON, Synthex `prisma/schema.prisma` model list (160+ models incl. existing `Lead` model at line 6046 — overlapping but distinct purpose), and `Pi-Dev-Ops/swarm/inbox/provisioner.py` (462 lines, particularly the `_provision_one` function at line 329). Produced this report.
- **VERIFIED WITH CITATION:** Provisioner.py:334-339 reads `nexus_clients` via Supabase REST (`_sb_request("GET", "/nexus_clients", ...)`) — distinct data store from AgencyIntake. Existing `Lead` model (schema.prisma:6046) carries different semantics (`organizationId` FK, `stage` ∈ {enquiry, qualified, converted}, `rawPayload Json`) and won't collide. CCW SOW already minted in Stripe (customer `cus_UWDwsApzrB6Yjd`, product `prod_UWfKxu3oyCrcYW`, deposit `plink_1TXbznGib5mMf28djW9jzBAH`); CCW re-entry test against this state is the strongest regression.
- **CHANGE-MY-MIND:** If `client-portal-provision` skill (not provisioner.py — the wrapping skill) already has an `AgencyIntake`-aware shim that bridges to nexus_clients (I did not find one in this review), then Risk #1 reduces from P0 to P2 (skill exists, just rename it). If Stage 7 `marketing-orchestrator` already enforces a minimum-items contract internally (not visible from the spec or skill descriptions), Risk #4 reduces from P1 to P3. If Cloudflare Turnstile is already wired site-wide on synthex.social (unlikely but possible — wasn't grep'd), Risk #3 reduces from P1 to P2.
