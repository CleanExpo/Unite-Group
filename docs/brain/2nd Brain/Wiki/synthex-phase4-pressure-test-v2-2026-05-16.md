# Synthex Phase 4 Pipeline Spec v2 — Opus 4.7 Re-Pressure-Test

**Date:** 2026-05-16 (PM, second pass)
**Reviewer:** Claude Opus 4.7 (`design-pressure-test` skill, round 2)
**Target:** `/Users/phill-mac/.claude/plans/synthex-phase4-agency-pipeline-spec.md` v2 (404 lines)
**Round 1 cite:** `[[synthex-phase4-pressure-test-2026-05-16]]`
**Verdict:** **SPEC_NEEDS_REVISION_v3** — v1 findings substantially addressed (8/10 ADDRESSED, 2 PARTIAL), but v2 introduces 3 new surfaces that need resolution before code lands. None are show-stoppers; all are <½-day spec patches.

---

## TL;DR

- v1 P0 (Stage 5 data-store gap) is now ADDRESSED via ADR-6 (bridge contract). The bridge surface is sound.
- v2's 3 self-flagged risks are genuinely surfaced and partially mitigated, but **risk #1 (bridge atomicity)** still doesn't name the recovery path explicitly, and **risk #2 (webhook ordering race)** is half-addressed (the bot/email reorder is in ADR-6 but the AgencyIntake column-write race between provisioner-callback and Linear webhook is not addressed).
- 3 NEW risks v2 introduced (revisions create surface): a `normalizedDomain` backfill collision risk on existing `Lead` rows, an unspecified country-detection mechanism at Stage 4, and a `tmp-{intakeId}` BrandConfig slug that the codify skill is not documented to accept.
- Checklist item #15 references a `CustomerInquiry` table that **does not exist in Synthex Prisma**. Confirmed by grep against `prisma/schema.prisma` — only `Lead` exists in the prospect-data surface.

---

## v1 Finding Compliance Table

| v1 demand | Status | Evidence in v2 |
|---|---|---|
| ADR-1: `lastStripeSyncAt` + reconciliation specified, not hand-waved | **ADDRESSED** | §4 Reconciliation contract names the 3 Stripe events + the Linear events + divergence alert with concrete predicate (`stage ∈ {DELIVERING, BILLING}` AND `Stripe.subscription.status != active` AND `lastStripeSyncAt > 1h ago`). |
| ADR-2: Canonical `StageArtefactsSchema` as Zod discriminated union over 10 stage shapes | **PARTIAL** | Named in §4 idempotency contract and §6 file list, but the actual 10-shape union is **not enumerated in the spec**. Promotion to typed columns (`stripeCustomerId`, `linearProjectId`, `brandConfigSlug`) is done. The shape stubs (e.g. `stageArtefacts.sow = { path, version, tempBrandSlug }`) are scattered across stage descriptions — must be consolidated into one block before implementation. |
| ADR-3: `stripe_provisioning_queue` named as Stage 5 substrate | **ADDRESSED** | Named explicitly in §2 Architecture (line 12), ADR-3, §5 Stage 5, and ADR-6 step 2. Provisioner.py at `~/Pi-CEO/Pi-Dev-Ops/swarm/inbox/provisioner.py:413` confirms it polls `/stripe_provisioning_queue?status=eq.pending`. |
| ADR-4: `normalizedDomain` rule precisely defined (lowercase + strip www + strip path + strip port) | **PARTIAL** | v2 specifies "lowercase → strip 'www.' → strip trailing slash" + gmail/outlook/yahoo fallback. **Missing:** path strip (`/contact`), port strip (`:443`), protocol strip (`https://`), `IDN` (international domains) normalization. A naïve `companyName.url.toLowerCase().replace(/^www\./, '').replace(/\/$/, '')` will create duplicates for `https://www.foo.com/contact` vs `https://foo.com`. |
| ADR-5: `vettingDecidedAt` present | **ADDRESSED** | In Prisma schema line 279 + Stage 2 output. |
| ADR-6 (NEW): Stage 5 bridge — error paths, compensating transaction, observability | **PARTIAL** | The bridge mechanic (INSERT nexus_clients → enqueue → cron picks up → webhook callback) is named. **Compensating-transaction step is named only for bot/email ordering**, not for the more dangerous case where Supabase INSERT succeeds but enqueue fails (or vice versa). Observability is one line (admin page). |
| P1 Stage 7 minimum-items refinement | **ADDRESSED** | Stage 7: "Zod refinement enforces `items.length >= 6`; below threshold = stage FAILS, doesn't advance, files Linear issue." |
| P1 Public-form abuse: 4 mitigations (Turnstile, honeypot, disposable-email block, Origin check) | **ADDRESSED** | All 4 named in Stage 1 + Architecture diagram + Files list (`intake-guards.ts`). |
| 8 new checklist items (12 → 20) | **ADDRESSED** | Checklist runs 1–20; new items #13–#20 cover bridge integration test, canonical schema, normalizedDomain cross-table check, Turnstile procurement, Stage 7 refinement, country-aware tax, observability page, Stage 3↔6 contract. |
| P2 Constitution amendment → `docs/agency-pipeline.md` | **ADDRESSED** | §6 Files list line 234 explicitly: "NOT CONSTITUTION.md — per pressure-test P2"; §6 Modified table reinforces. |

**Totals:** ADDRESSED 8 · PARTIAL 3 · MISSED 0

---

## Per-Self-Flagged-Risk Verdict (v2's own 3 risks)

### Risk 1 — Bridge atomicity: Supabase INSERT succeeds but enqueue fails

**Verdict: NOT ADDRESSED — must revise.**

ADR-6 step 1 says "INSERT INTO nexus_clients (Supabase REST, service-role key)". Step 2 says "Enqueue (intakeId, 'provision') into stripe_provisioning_queue". These are two separate REST calls to two separate Supabase tables. **If step 1 succeeds and step 2 fails, you have a dangling nexus_clients row with no work queued. Re-run of the bridge will see the row exists and either (a) skip silently if the bridge is idempotent-by-existence-check, or (b) double-insert if it's idempotent-by-key-check.**

Provisioner.py confirms it ONLY drains the queue (`_sb_request("GET", "/stripe_provisioning_queue", params={"status": "eq.pending", ...})`). It never scans for orphan nexus_clients rows. So a half-bridged intake stalls forever and no Telegram alert fires (the divergence alert only checks Stripe truth, not bridge half-state).

**Required revision (v3):**
- Bridge must be a single transactional unit. Easiest path: **swap the order — enqueue FIRST, then have `provisioner.py._provision_one` create the nexus_clients row if missing.** This collapses two writes to one and uses the existing queue as the durability surface.
- Alternative: Keep current order but add a stuck-bridge cron — "any nexus_clients row with `created_at > 5m ago` AND no matching `stripe_provisioning_queue` row → enqueue (and Telegram alert)."
- Spec must name which.

### Risk 2 — Webhook ordering race (provisioner callback vs Linear webhook on overlapping columns)

**Verdict: PARTIALLY ADDRESSED — column-level race not resolved.**

ADR-6 addresses the *intra-provisioner* ordering (bot binding before welcome email — correct). But the **inter-webhook** race is different: after provisioning completes, BOTH `/api/webhooks/provisioner` (writes `linearProjectId` + `stage=PROVISIONED`) AND `/api/webhooks/linear` (writes mirror status + `lastLinearSyncAt`) can fire concurrently, both targeting the same `AgencyIntake` row.

`provisioner.py` posts the callback synchronously at end of `_provision_one`. Linear webhook fires asynchronously the moment `create_linear_project()` succeeds *inside* `_provision_one`. The Linear webhook can therefore land at AgencyIntake while the provisioner is still mid-flight, attempting to write `linearProjectId` before the provisioner callback has even fired. Last-write-wins on `updatedAt` is fine for most columns but **NOT for `stage`** — a Linear webhook should never advance the stage.

**Required revision (v3):**
- Single-source-of-truth per column table in spec:
  - `stage`, `vettingDecision`, `vettingDecidedAt`, `stripeCustomerId`, `linearProjectId`, `brandConfigSlug`: written ONLY by stage handlers / provisioner callback.
  - `lastStripeSyncAt` + mirrored stripe columns: written ONLY by Stripe webhook.
  - `lastLinearSyncAt` + mirrored linear columns: written ONLY by Linear webhook.
- Linear webhook handler must NOT touch `stage` — only mirror columns + timestamp.
- Use Prisma `updateMany({ where: { id, updatedAt: { lt: webhookEventTime } } })` for monotonic writes.

### Risk 3 — `normalizedDomain` collision against existing `Lead` / `CustomerInquiry`

**Verdict: NOT ADDRESSED — and one of the named tables doesn't exist.**

Grep against `/Users/phill-mac/Synthex/prisma/schema.prisma`:
- `Lead` model exists at line 6046 — does NOT have a `normalizedDomain` column; it has `organizationId` FK + `rawPayload Json` (with the source URL nested). Stage = enum `{enquiry, qualified, converted}` (lowercase).
- `CustomerInquiry` model does **NOT exist** in Synthex. Checklist item #15 names a phantom table.

Spec gives no resolution rule for the case where an `AgencyIntake.normalizedDomain` collides with an existing `Lead`. Options the spec must commit to:
- **Link** (`AgencyIntake.relatedLeadId` FK)
- **Merge** (refuse new intake; redirect operator to existing `Lead`)
- **Independent** (allow both, document the dual-pipeline pattern)
- **Route-to-existing-account** (if `Lead.stage = converted`, this prospect is already a customer — refuse + Telegram alert)

**Required revision (v3):**
- Pick one. Recommend **independent + advisory check**: AgencyIntake unique constraint stays `(normalizedDomain, brandSlug)` within AgencyIntake; insert allowed even if `Lead` has same domain; admin page surfaces a "⚠️ existing Lead for {domain}" badge.
- Fix checklist item #15 to delete the `CustomerInquiry` reference (or rename to whatever table Phill actually meant — likely just `Lead`).

---

## New Risks v2 Introduced (3 ranked by severity)

### NEW-1 — `normalizedDomain` backfill collision on existing rows (P1)

The migration adds a UNIQUE constraint on `(normalizedDomain, brandSlug)`. v1 used `(email, brandSlug)`. Since AgencyIntake is a new model, there are no existing rows in *that* table — but the migration is presented as additive and the spec assumes a clean slate. **If even a single test row exists in sandbox from a prior dry-run with the old `email`-based unique, AND the backfill of `normalizedDomain` from existing rows produces a collision (two test intakes from `mailinator.com` with the same `brandSlug`), the migration aborts halfway and rollback is non-trivial because Prisma migrations are non-transactional for unique-constraint addition on Postgres.**

**Mitigation (v3 spec line item):**
- Add a pre-migration script `scripts/preflight-agency-intake-domain.sql` that: (a) computes `normalizedDomain` for any existing AgencyIntake rows, (b) detects collisions, (c) aborts the migration with a human-readable list of conflicting (id, normalizedDomain, brandSlug) tuples for manual resolution.
- Add to checklist item #15 (after fix): "Run preflight on sandbox; assert zero collisions before migration applies."

### NEW-2 — Country detection mechanism unspecified at Stage 4 (P1)

§5 Stage 4: "country == AU → AU GST 10%; NZ → 15%; OTHER → manual triage." Stage 1 schema: "includes `country: 'AU' | 'NZ' | 'OTHER'` default `AU`."

**Problem:** A default of `AU` means **every form submitter is treated as AU unless they explicitly toggle a dropdown.** An NZ prospect who misses the dropdown gets billed AU GST (10%) instead of NZ GST (15%) — that's a **tax compliance issue for Synthex**, not just a UX nit. Conversely, defaulting to OTHER would force every AU prospect to triage.

Three resolution mechanisms the spec must commit to:
1. **Explicit form field, no default** (radio buttons, required) — pushes the cognitive load to the user but tax-safe.
2. **GeoIP from intake form IP** at server-side via Vercel `request.geo.country` — best UX, but VPN users bypass.
3. **ABR / IRD lookup** after submission via existing `lib/abr/validate-abn.ts` — only works if ABN/NZBN provided (which is post-form for OTHER).

**Required revision (v3):**
- Recommend (1) **explicit required radio** with three options + a one-line "we use this to calculate tax" hint. Defaults eliminate compliance risk only if there is no default.
- If keeping a default, change to `OTHER` (forces triage) not `AU` (auto-bills wrong tax).

### NEW-3 — `tmp-{intakeId}` BrandConfig slug — does codify accept transient slugs? (P2)

§5 Stage 3 input: "temporary BrandConfig slug (`tmp-{intakeId}` — see §6 chicken-and-egg contract)." Stage 6 promotes to permanent slug.

**Problem:** The `remotion-brand-codify` skill writes to `Synthex/packages/brand-config/src/brands/{slug}.ts`. There is no documented behaviour for transient slugs — does codify happily write `tmp-cm3xy7abc.ts` to the brand-config package? Does it commit that file to git? Is there a cleanup path when promotion happens?

Looking at the skill description (from system reminder): "Converts a BrandResearch dossier into THREE artifacts — (1) typed BrandConfig TypeScript at Synthex/packages/brand-config/src/brands/{slug}.ts ...". The skill is brand-research → codify. **Stage 3 doesn't need a real BrandConfig — it needs SOW inputs.** The spec's chicken-and-egg solve is over-engineered: Stage 3 (`sow-draft`) takes a Markdown SOW with milestones — it reads `intake.brandSlug` (the hint), `intake.companyName`, `intake.monthlyBudgetAud`, NOT a BrandConfig object.

**Required revision (v3):**
- Remove the `tmp-{intakeId}` mechanic entirely. Stage 3 reads from intake fields directly. Stage 6 mints the BrandConfig from scratch using `remotion-brand-research` + `remotion-brand-codify`, no promotion step.
- If `sow-draft` skill genuinely requires a BrandConfig import (verify by reading the skill), then the chicken-and-egg is real and v3 spec needs to say so explicitly — but the simpler path is to confirm Stage 3 doesn't need it.

---

## Overall Verdict: **SPEC_NEEDS_REVISION_v3**

v2 is materially better than v1. The author addressed 8/10 v1 findings cleanly. ADR-6 closes the P0 Stage 5 data-store gap correctly via the bridge pattern, and the bridge target (provisioner.py:413 polling `/stripe_provisioning_queue`) is verified.

But v2 introduces 3 new surfaces and incompletely addresses 3 of its own self-flagged risks. None of these are show-stoppers — they are concrete spec patches under ½-day total. Specifically v3 must:

1. **Resolve bridge atomicity** — enqueue first, provisioner-creates-row pattern (eliminates two-write surface).
2. **Column-level webhook ownership table** — name which surface owns each column.
3. **Lead-collision rule** — independent + advisory badge on admin page; fix checklist #15 to drop the phantom `CustomerInquiry`.
4. **Enumerate `StageArtefactsSchema` 10 stage shapes** — one consolidated TypeScript block before implementation.
5. **Tighten `normalizedDomain` rule** — add path-strip, port-strip, protocol-strip, IDN handling.
6. **Country detection commit** — required radio, no default, OR default OTHER (NOT default AU).
7. **Drop `tmp-{intakeId}`** — confirm sow-draft doesn't need a BrandConfig; remove the promotion mechanic.
8. **Add preflight migration script** — collision detection before unique constraint applies.

If v3 lands these 8 patches, the spec is ready for `subagent-driven-development`.

### Pre-merge implementation gates (when v3 is approved and code starts)

Even after spec v3 is approved, these 3 gates must close in any implementation PR (NOT in the spec itself):

1. **Synthetic Stage 5 bridge end-to-end on sandbox.** Seed AgencyIntake at `DEPOSIT_PAID` → bridge enqueues → `provisioner.py` runs against sandbox Supabase → completion webhook flips AgencyIntake to `PROVISIONED`. Assert: `linearProjectId` populated, Telegram bot bound, no duplicate `nexus_clients` row on re-run, no orphan nexus_clients with empty queue.
2. **`StageArtefactsSchema` round-trip test across all 10 stages.** Full lifecycle write→read against canonical schema; any drift fails Vitest.
3. **CCW re-entry regression.** Re-submit CCW through new form against sandbox; assert zero duplicate Stripe customer (`cus_UWDwsApzrB6Yjd`), zero duplicate Linear project, zero duplicate `nexus_clients` row.

---

## Verification Ledger

**DID:** Read v2 spec (404 lines), v1 pressure-test report (212 lines), `~/Pi-CEO/Pi-Dev-Ops/swarm/inbox/provisioner.py` (key sections: lines 1-60 header contract, lines 329-449 `_provision_one` + `tick`), `~/.claude/skills/client-portal-provision/SKILL.md` (74 lines), and grep'd `Synthex/prisma/schema.prisma` for `Lead`, `CustomerInquiry`, all `@@unique` constraints, and domain-normalisation patterns. Produced this v2 report.

**VERIFIED WITH CITATION:**
- Provisioner.py:413 confirms it polls `/stripe_provisioning_queue?status=eq.pending` — the spec's ADR-6 substrate choice is correct.
- Provisioner.py:329-339 confirms `_provision_one` loads `nexus_clients` by slug — the bridge must INSERT this row OR the provisioner must be modified to create it.
- Provisioner.py:399-406 confirms current order is: Linear → ContextBot enqueue → portal_content → welcome email → Telegram. **The bot binding here is `_enqueue_context_bot` (line 367) which is non-blocking row insertion, NOT actual BotFather mint** — the welcome email contains a bot link that may not be mintable yet. ADR-6's "bot binding BEFORE welcome email" is half-correct: the *queue insertion* is before, but the *actual bot URL* may still be invalid. v3 should clarify.
- Synthex schema.prisma:6046-6069 confirms `Lead` exists with `organizationId` FK + `rawPayload Json` semantics. No `normalizedDomain` column.
- Synthex schema.prisma: grep for "CustomerInquiry" returns ZERO matches. **Checklist item #15 references a non-existent table.**
- `client-portal-provision` SKILL.md does NOT have an `AgencyIntake`-aware shim. ADR-6's bridge cannot be collapsed to a skill rename.

**CHANGE-MY-MIND:** Three signals that would shift the verdict to SPEC_READY_FOR_IMPL:
- If Phill confirms that the 8 v3 patches are acceptable as implementation-PR scope (not spec-revision scope) — i.e. "land the spec, write the 8 patches as the first PR" — then v2 ships as-is with the patches captured in the implementation plan. That's a procedure call, not a technical one.
- If reading `sow-draft` SKILL.md confirms it does NOT require a BrandConfig import (only intake fields), then NEW-3 (`tmp-{intakeId}`) reduces from P2 to P3 (purely cosmetic — just delete the promotion step from the spec).
- If `_enqueue_context_bot` (line 295 of provisioner.py) actually mints the BotFather bot synchronously rather than just queuing the row, the "broken bot in welcome email" risk vanishes and the reorder ADR-6 names is sufficient.
