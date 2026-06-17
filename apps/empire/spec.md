# Authority-Site In-House CRM — Build Specification

> **Project:** Authority-Site (aka Empire Command Center / Pi-CEO dashboard). Next.js 16 App Router · React 19 · TypeScript strict · Supabase Postgres · Vercel · Sentry · next-intl. Repo root: `/Users/phillmcgurk/Unite-Group`.
>
> **What this is:** the canonical specification to build out THIS project into a full professional in-house CRM. The sibling product **Unite-Hub is a SEPARATE CRM and is explicitly NOT specified here.**
>
> **Lead author:** assembled from the specialist team's contributions (Data/Domain Architect, API/Integration, UX/UI, AI Integration, Cloud/DevOps, Security/Compliance, QA/Test, Senior PM). Section 16 (multi-eyes review) records the board verdict: **REVISE → APPROVE-WITH-CONDITIONS; the four blockers B1–B4 and every MAJOR have been applied in this revision pass; clear to build on Phill's countersignature.**
>
> **Companion artifacts (cross-linked throughout):**
> - [`docs/spec/feature-coverage-matrix.md`](docs/spec/feature-coverage-matrix.md) — the FULL 15-pillar feature matrix.
> - [`docs/spec/data-model-erd.md`](docs/spec/data-model-erd.md) — entities, ERD, dedupe, privacy, RLS, migration plan.
> - [`docs/spec/phase-plan.md`](docs/spec/phase-plan.md) — detailed V1→V2→V3 milestones, estimates, dependencies.
> - [`docs/spec/senior-pm-board-verdict.md`](docs/spec/senior-pm-board-verdict.md) — the board verdict + sign-offs (mirrors §16).
>
> **Evidence rule (applies everywhere):** every factual claim is tagged `[VERIFIED]` (read in a named file), `[INFERENCE]` (reasoned), or `[UNCONFIRMED]` (could not verify). UNCONFIRMED claims are never presented as fact. Only real file paths are cited.

---

## Table of contents

1. Finish line & vision
2. Goals, non-goals & success metrics
3. Personas & access model
4. Current-state assessment
5. Feature inventory & coverage matrix (summary)
6. Domain & data architecture
7. API specification
8. UX / UI design
9. AI integration
10. Cloud, DevOps & observability
11. Security, privacy & compliance
12. Testing & QA strategy
13. Phased delivery plan
14. Risk register
15. Acceptance criteria & launch-readiness checklist
16. Senior PM multi-eyes review *(placeholder — review board)*
17. Sources & evidence index
18. Open questions / decisions needed

---

## 1. Finish line & vision

> **This is done when** Phill can run his entire sales-and-relationship motion — capture a lead, qualify it with advisory AI, convert it to a contact + opportunity, watch it move through a forecastable pipeline, sync the related email/calendar thread, and act on a human-approved next-best-action — **entirely inside the Authority-Site command-center**, with **every** CRM object backed by a Supabase table validated on a Supabase database branch and promoted to prod only via a merged, approved branch, **zero** AI auto-writes, and Supabase / Stripe / Linear holding their respective truths.

**Vision.** Authority-Site becomes Phill's daily operating cockpit (`docs/margot/crm-operating-model.md` `[VERIFIED]`): a single-tenant, in-house CRM on Vercel + Supabase where Margot advises and humans approve. We are NOT building Unite-Hub — we are building THIS project's own CRM spine on the existing command-center.

**Headline test of done (V1)** — the authoritative gate is §15.1; this is the five-line headline:
1. `crm_contacts` and `crm_opportunities` are live in prod (validated on a Supabase database branch, then promoted via a merged + approved branch) with CRUD, dedupe, and lead→contact conversion (via the `crm_convert_lead_to_contact()` RPC).
2. The approval workflow is wired end-to-end onto `src/lib/crm/approval-lifecycle.ts` `[VERIFIED engine exists]` — a gated write executes only on `may_execute`, never auto-executes, and writes an audit row.
3. The command-center shows a pipeline + forecast READ dashboard sourced from `crm_opportunities` (forecast is **single-currency AUD by construction** — see §6.2 of `data-model-erd.md`) — today the only pipeline surface, `src/app/api/empire/pipeline/route.ts`, reads `agent_actions` funnel counts, not opportunities `[VERIFIED]`.
4. Advisory AI (lead score + next-best-action) renders in the daily digest, recommendation-only, with zero auto-writes.
5. Email/calendar 2-way sync is shipping for at least one provider, OR the documented fast-follow fallback (read-only digest sync) is live so V1 ships on time.

---

## 2. Goals, non-goals & success metrics

### 2.1 Goals

| # | Goal | Why it matters | Phase |
|---|---|---|---|
| G1 | Promote `crm_contacts` + `crm_opportunities` to prod via a Supabase database branch (validate on branch, promote by merging an approved branch), with CRUD + dedupe + lead→contact conversion | Closes the core CRM spine; both migrations are drafted but UNAPPLIED today (`supabase/migrations/20260523103000_crm_contacts_opportunities.sql` `[VERIFIED]`) | V1 |
| G2 | Wire the approval workflow end-to-end: decision engine → execution handler → audit | The pure decision engine `src/lib/crm/approval-lifecycle.ts` exists but no route executes against it `[VERIFIED]`; preserves the recommendation-only safety contract | V1 |
| G3 | Ship a pipeline + forecast READ dashboard in the command-center | Gives Phill a forecastable view of commercial reality | V1 |
| G4 | Put advisory AI (lead scoring + next-best-action) into the daily digest, recommendation-only | `src/lib/crm/qualify-lead.ts` scores; `src/lib/crm/daily-digest.ts` renders — not yet joined `[VERIFIED]` | V1 |
| G5 | Deliver email/calendar 2-way sync, or the read-only fast-follow fallback | The single largest net-new build (the V1 long-pole); Composio today is connection-status mirror only `[VERIFIED]` | V1 |
| G6 | Make the command-center the system-of-record UI for accounts, communications, documents, reporting, and workflow automation | Turns a dashboard into a CRM | V2 |
| G7 | Add governance depth: granular RBAC, retention/consent automation, public API/webhooks, e-sign | Matures the platform for scale | V3+ |

### 2.2 Non-goals (locked)

| Non-goal | Rationale |
|---|---|
| Re-platform to AWS/Azure | LOCKED: Vercel + Supabase, own 100% of production code |
| Build / spec Unite-Hub | Separate product (`CLAUDE.md` `[VERIFIED]`); we build THIS project's CRM |
| External multi-tenant client portal in V1 | Single-tenant: Phill + Margot + small internal ops team |
| Granular per-record RBAC in V1 | Role-light, approval-gated writes in V1; granular RBAC is V3+ |
| AI auto-writing CRM data | AI is recommendation-only, human-approved, everywhere, forever |
| Direct prod DB writes (`psql` / `supabase db push` / MCP `apply_migration` against prod) | Every schema change is validated on a Supabase database branch and reaches prod (`lksfwktwtmyznckodsau`) only by merging an approved branch — never applied to prod directly or autonomously (`apps/empire/CLAUDE.md`) `[VERIFIED]` |
| CRM as billing truth | Stripe is billing truth; opportunities are forecast-only (`crm_opportunities` migration comment `[VERIFIED]`) |
| Quotes / line-items on opportunities in V1 | Opportunities are **forecast-only single-value** (`value_amount`) in V1; itemized quotes require Stripe-product linkage, deferred to V2 with the billing view. Confirm with Phill that no V1 sales motion needs a quote artifact (OQ-16). `[INFERENCE]` |
| Custom-field registry/UI in V1 | The `additional_data` jsonb extensibility surface exists on all CRM tables, but a typed custom-field registry/UI is deferred to V2 — V1 ships the fixed identity/pipeline schema so the long-pole (email/cal) owns the critical path. `[INFERENCE]` |

### 2.3 Success metrics

| Metric | Baseline (today) | V1 exit target | V2 target |
|---|---|---|---|
| CRM objects live in prod | leads + agent_actions only `[VERIFIED]` | + contacts + opportunities + approvals | + accounts/orgs + documents |
| Lead→contact→opportunity conversion | partial: convert route links lead→client but creates no contact `[VERIFIED]` | full lead→contact→opportunity, dedupe-checked | nurture + routing automation |
| AI safety contract violations (auto-writes) | 0 (advisory engines are pure-logic) | **0 — non-negotiable gate** | 0 |
| Approval workflow coverage | decision engine only, no execution | every gated write passes through approval lifecycle + audit | SLA timers on approvals |
| Email/calendar sync latency | n/a (not built) | 2-way < 5 min OR fallback digest < 24h | < 2 min, bidirectional |
| Forecast dashboard | none on opportunity data | weighted pipeline rollup by stage × probability | win/loss + cohort analytics |
| Test gate green on CRM lanes | focused jest suites pass `[INFERENCE]` | `test:all` + `type-check` + `security:routes-check` green; ≥80% coverage on `src/lib/crm/*` and CRM routes | e2e smoke (Playwright) added |
| Branch-first DB compliance | 100% (no prod CRM migration applied yet) | 100% — every promotion validated on a Supabase database branch then merged with approval | 100% |

---

## 3. Personas & access model

Single-tenant, role-light, approval-gated. The admin allow-list is 2 emails today (`src/lib/security/require-admin.ts`: `contact@unite-group.in`, `phill.mcgurk@gmail.com` `[VERIFIED]`).

| Persona | Who | Access in V1 | Write capability | Notes |
|---|---|---|---|---|
| **Phill (Operator/Owner)** | Founder | Full read; approves all gated writes; admin allow-list | Approves every gated mutation; can execute directly | Final approval authority; Supabase admin-email session OR service-role bearer `[VERIFIED dual-mode gate]` |
| **Margot (AI Orchestrator)** | Agent | Read CRM via a **distinct read-only credential** (V1 — see §3.1); produce drafts/recommendations; create approval-required tasks | **Never** auto-writes CRM truth — recommendation-only, enforced by the **credential boundary** (§3.1), not merely by which routes call the engine `[VERIFIED contract]` | Writes only via approved server routes; voice→task route already gates approval-required work (`src/app/api/pi-ceo/margot-voice/task/route.ts` `[VERIFIED]`); **must NOT hold the service-role bearer** |
| **Internal Ops (small team)** | 1–3 staff | Read; create leads/contacts/activities; submit opportunities for approval | Non-sensitive writes; sensitive writes (conversion, client merge, external comms) need Phill approval | Role-light; granular RBAC deferred to V3+ |
| **System/Cron** | Vercel cron + service-role | Integration mirrors, digest generation, sync jobs | Service-role server routes only; never client-side | E.g. `src/app/api/cron/integrations/composio/route.ts` `[VERIFIED]` |

**Access-model invariants (all phases):**
- All mutating CRM routes pass `requireAdmin` (service-role bearer → admin-email session fallback, fail-closed) `[VERIFIED]` — enforced by `npm run security:routes-check` `[VERIFIED script]`.
- TOTP MFA infra exists (`src/lib/auth/mfa/totp.ts`, `service.ts` `[VERIFIED]`); **enforced TOTP MFA on every `ALLOWED_ADMINS` account is a HARD V1 launch gate** (§11.9, §3.1) — contacts/opportunities cannot be promoted to prod with real PII until MFA is verified on Supabase + the founder Google account, evidence captured in §15.
- Browser/client code never writes sensitive CRM tables directly; only service-role server routes do.
- High-risk subject types (`client_merge`, `data_export`) always require explicit Phill/Board review (`approval-lifecycle.ts` HIGH_RISK_SUBJECT_TYPES `[VERIFIED]`).

### 3.1 Credential trust boundary (BLOCKER B2 — Security)

**Recommendation-only is enforced by route TOPOLOGY, not by credential — and the spec must stop presenting a convention as a control.** `requireAdmin`'s bearer branch compares `Authorization` against `SUPABASE_SERVICE_ROLE_KEY` (`src/lib/security/require-admin.ts:79-81`) `[VERIFIED]` — that single key authorizes **every** mutating CRM route (`POST`/`PATCH` `/api/crm/contacts`, `/api/crm/opportunities`, lead convert, etc.). The approval engine (`approval-lifecycle.ts`) governs only the **not-yet-built** `/api/crm/approvals/[id]/execute` route; it is **not** a chokepoint for the default mutation routes. So if Margot holds that bearer to *read* CRM data, it can also *write* CRM truth directly, bypassing the engine entirely.

**V1 controls (pulled into V1, not V2):**
- **Bearer = full CRM write authority.** This is stated plainly. Recommendation-only is enforced by **NOT issuing that bearer to Margot or any AI/agent process.**
- **Distinct read-only credential for Margot.** Margot reads CRM via a separate token whose `requireAdmin` branch maps to a read-only actor, OR via GET-only surfaces that never accept the service-role key.
- **Actor attribution (`x-actor-id`) is V1, not V2.** Every bearer write records the originating actor in `agent_actions` so the audit trail distinguishes Margot from Phill from a leaked key.
- **Acceptance:** *No credential issued to an AI/agent process can satisfy `requireAdmin` on any mutating CRM route.*

---

## 4. Current-state assessment

Every claim here is evidence-tagged; the per-section detail (§6–§12) carries the file-line citations.

> **⚠ Prod-state evidence integrity (BLOCKER B1).** "Migration file present in the repo" is **not** "applied in prod." The only machine-readable prod-schema artifact, `types/supabase.ts` (generated from prod ref `lksfwktwtmyznckodsau`, **dated 2026-05-22**), contains **no `public.Tables` definition** for `crm_leads`, `agent_actions`, or `nexus_clients` — only an unrelated `client_agent_actions` and `businesses` `[VERIFIED — grep over types/supabase.ts]`. The prod-applied state of these tables is therefore **`[UNCONFIRMED]`**. A **mandatory pre-M1.1 step** regenerates `types/supabase.ts` from prod, commits it as the §17 evidence baseline, and makes M1.1 verify each FK-target table exists in prod before the promote transaction runs (its FK references fail otherwise). See `data-model-erd.md` §1.

| Area | State today | Evidence |
|---|---|---|
| `crm_leads` table | Migration **file** in repo (status/score CHECKs, lower(email) index, service-role RLS, FK links); marketing form writes to it. **Prod-applied state `[UNCONFIRMED]`** — absent from `types/supabase.ts` | `supabase/migrations/20260523100000_crm_leads.sql`; `src/app/api/marketing/leads/route.ts` `[VERIFIED files]`; prod-applied `[UNCONFIRMED]` |
| `agent_actions` / `nexus_clients` / `businesses` (FK targets) | Migration **files** in repo; CRM contacts/opportunities reference them as FK targets. **Prod-applied state `[UNCONFIRMED]`** — `agent_actions`/`nexus_clients` absent from `types/supabase.ts` (only `client_agent_actions`/`businesses` present) | `types/supabase.ts` grep `[VERIFIED]`; prod-applied `[UNCONFIRMED]` |
| `crm_contacts` + `crm_opportunities` | **DRAFTED in one migration, NOT applied** to any branch or prod | `supabase/migrations/20260523103000_crm_contacts_opportunities.sql`; `docs/margot/crm-schema-inventory.md:239-240` `[VERIFIED]` |
| Dedupe | Route computes only `dedupe_email_key` + `dedupe_domain_key`; migration declares 4 keys but **no UNIQUE constraint** | `src/app/api/crm/contacts/route.ts:261-262`; migration (grep unique → none) `[VERIFIED]` |
| Lead conversion route | **Exists** (`src/app/api/crm/leads/[id]/convert/route.ts`) but links lead→`nexus_clients` only — it never materializes a `crm_contacts` row | route `:138-182` `[VERIFIED]` — corrects the locked-context "currently missing" claim |
| Approval engine | Pure-logic `evaluateCrmApprovalLifecycle`, `safeToAutoExecute` hard-`false`, **not wired to any route** | `src/lib/crm/approval-lifecycle.ts:50,141-281` `[VERIFIED]` |
| Advisory AI | `qualify-lead.ts` (pure scoring) and `daily-digest.ts` (pure render) exist but are not joined | `src/lib/crm/qualify-lead.ts`; `src/lib/crm/daily-digest.ts` `[VERIFIED]` |
| Email/calendar | Composio is a **connection-state mirror only** — no email/cal sync, OAuth tokens, or message-activity write | `src/lib/integrations/composio/sync.ts`, `client.ts` `[VERIFIED]` |
| Pipeline READ surface | The only pipeline endpoint reads `agent_actions` funnel counts, not `crm_opportunities` | `src/app/api/empire/pipeline/route.ts:44` `[VERIFIED]` |
| Audit trail | `agent_actions` live; every CRM route appends a sanitized timeline event; append-only by convention (no DB trigger) | `supabase/migrations/20260510000004_nexus_agent_actions.sql`; `src/lib/crm/activity-timeline.ts` `[VERIFIED]` |
| Command-center UI | 5-zone cockpit shell + Hermes Control Panel + lazy Daily CRM Digest; **no contacts list, pipeline board, or forecast dashboard** | `src/components/command-center/CommandCenterShell.tsx`; grep `[VERIFIED]` |
| CI / build | CI Gate runs type-check→lint→test:all→build; `ignoreBuildErrors:true`; `security:routes-check` + `check:schema-drift` exist but are NOT in CI | `.github/workflows/ci.yml`; `next.config.js:13-15`; `package.json` `[VERIFIED]` |
| Backups/DR | Daily physical, 7-day retention, **PITR disabled** (RPO ~24h); DR runbook DRAFT v0.2 | `docs/backup-pipeline-assessment.md:117-146` `[VERIFIED]` |
| DB-safety model | Supabase database branching: migrations in `apps/web/supabase/migrations/` are validated on an ephemeral per-branch DB, then promoted to prod only by merging an approved branch (Phill's typed approval; never applied to prod directly/autonomously). The former mirror sandbox (`xgqwfwqumliuguzhshwv`) and `scripts/sandbox-wizard.sh` were deleted ~15/06/2026 | `apps/empire/CLAUDE.md` `[VERIFIED]` |

---

## 5. Feature inventory & coverage matrix (summary)

The **full matrix** — every feature row with pillar | name | phase | status | owner | acceptance criteria | test mapping | source paths, grouped by all 15 pillars — is the artifact **[`docs/spec/feature-coverage-matrix.md`](docs/spec/feature-coverage-matrix.md)**. This section summarizes it.

**15-pillar coverage map (V1 / V2 / V3+ counts):**

| Pillar | V1 | V2 | V3+ | Headline V1 work |
|---|--:|--:|--:|---|
| 1 Identity & data foundation | 12 | 4 | 1 | Promote contacts (prod-state baseline first); 4-key dedupe (stable full-name) + UNIQUE backstop; lead→contact RPC; CRM-page gate hoist; privacy scopes |
| 2 Leads | 6 | 0 | 0 | Lead intake (live); convert→contact via RPC; historical-backfill = net-new only |
| 3 Opportunities / pipeline | 6 | 2 | 0 | Promote opportunities; single-currency forecast CHECK; `GET` + forecast rollup; READ pipeline board |
| 4 Activities & timeline | 4 | 0 | 1 | Unified `agent_actions` feed; R6 FK→nexus_clients + slug index; entity-filtered rails |
| 5 Email & calendar | 2 | 2 | 0 | **2-way sync (long-pole, signature-verified inbound) + read-only fallback** |
| 6 Communications & notifications | 2 | 1 | 0 | Voice ingress (live); consent provenance capture (422 on missing) |
| 7 Billing / revenue | 0 | 1 | 0 | (Stripe ARR view is V2; opportunities stay forecast-only) |
| 8 Documents / data room | 1 | 1 | 1 | Founder-only RLS (live); attachments V2 |
| 9 Reporting & analytics | 1 | 2 | 0 | Forecast rollup + dashboard e2e smoke |
| 10 Workflow automation | 2 | 1 | 0 | `updated_at` triggers; cron lifecycle wrapper (live) |
| 11 AI layer | 9 | 9 | 2 | Deterministic scoring + heuristic NBA in digest; approval execution handler; Margot read-only credential; voice transcript policy |
| 12 Approvals & governance | 8 | 1 | 0 | Approval create + execute endpoints (engine = single authority); append-only trigger; source-of-truth enforcement |
| 13 Admin & access | 7 | 1 | 1 | `requireAdmin` (live); enforced MFA gate; Margot credential + x-actor-id; single ALLOWED_ADMINS; CRM nav cluster |
| 14 Integrations | 5 | 3 | 1 | 9 cron mirrors, Stripe/Linear/DR-NRPG, 1Password (all live); +Apify acquisition/enrichment (V2, §9.10) |
| 15 Platform / non-functional | 41 | 6 | 1 | Prod-state baseline; CI gates; remove `ignoreBuildErrors`; PITR; idempotency table; optimistic locking; jest-axe contrast; rollback runbook; coverage gate; branch-first DB pipeline |

> **These are indicative row-counts, not normalized feature-counts (P19).** Each count is the number of matrix rows a specialist authored under that pillar, not a one-feature-per-row inventory — so infra-heavy Pillar 15 carries many rows while Billing (Pillar 7) carries one, and some rows collapse several features (e.g. Pillar 6's "templated sends, sequences, Telegram, notifications" is one row covering four features). The 15-pillar universe is fully covered with no blank phase cells; the counts measure rows, not granularity. See `feature-coverage-matrix.md` for the authoritative per-row detail.

**Status distribution (V1 rows):** the V1 set is roughly a third `exists`, a third `partial`, a third `missing` — i.e. a strong base with three concentrated gaps to close: (a) the **schema promotion** (contacts/opportunities), (b) the **approval execution wiring**, and (c) the **email/calendar sync** long-pole. See §13 for sequencing.

---

## 6. Domain & Data Architecture

> **Owner:** Data / Domain Architect. Authored against verified repo state on branch `mesh/mission-control-2026-06-11` (2026-06-16). Full ERD, dedupe table, and migration flowcharts are in **[`docs/spec/data-model-erd.md`](docs/spec/data-model-erd.md)**. **Source-of-truth law (locked):** Supabase = CRM truth; Stripe = billing truth; Linear = execution truth. **Migration law (locked):** every schema change is validated on a Supabase database branch, then promoted to prod only by merging an approved branch (Phill's typed approval) — never applied to prod directly or autonomously.

### 6.1 Entity model & relationships

The CRM spine layers on the existing Nexus identity tables. Three identity anchors (`businesses`, `nexus_clients`, `agent_actions`) are expected in prod and the CRM extends them rather than replacing them — but their **prod-applied state is `[UNCONFIRMED]`** (`agent_actions`/`nexus_clients` are absent from `types/supabase.ts`; see §4 BLOCKER B1 and `data-model-erd.md` §1). M1.1 verifies each FK-target exists in prod before promoting contacts/opportunities. See the ERD in [`data-model-erd.md`](docs/spec/data-model-erd.md#2-erd).

**Verified relationship facts:**
- `crm_leads` references `nexus_clients(id)` via `matched_client_id`/`converted_client_id` and `businesses(id)` via `matched_business_id`, all `ON DELETE SET NULL` — `…crm_leads.sql:21-23`. `[VERIFIED]`
- `crm_contacts` links to lead/client/business via `linked_*_id`, all `ON DELETE SET NULL` — `…103000.sql:15-17`. `[VERIFIED]`
- `crm_opportunities` links to lead/contact/client/business — `…103000.sql:91-94`. `[VERIFIED]`
- The unified timeline is carried by `agent_actions`, keyed by `action_type = 'crm_timeline_<event_type>'` and a sanitized `payload` — mapper `src/lib/crm/activity-timeline.ts:217-256`. `[VERIFIED]`

**Design decision — no separate `accounts`/`organizations` table in V1.** Org identity is carried by `businesses` (portfolio units) and `nexus_clients` (paying clients); `crm_contacts.company_name` is free-text for not-yet-a-client orgs. A normalized `crm_accounts` table is V2. `[INFERENCE — grounded in the single-tenant lock and the existing businesses/nexus_clients split]`

### 6.2 `crm_leads` (migration in repo; prod-applied state to be confirmed by `gen:types` before M1.1)

`crm_leads` is the V1 baseline the marketing form writes to; its migration file is in the repo but its **prod-applied state is `[UNCONFIRMED]`** (absent from `types/supabase.ts` — see §4 BLOCKER B1). One canonical status phrasing is used across §4 / §6.2 here and `data-model-erd.md` §1/§2. Notable for data architecture: `status` CHECK ∈ {new, qualified, nurture, converted, disqualified, spam} `[VERIFIED file]`; `qualification_score` 0–100 CHECK `[VERIFIED file]`; lower-cased functional email index `[VERIFIED file]`; **privacy debt** — stores raw `ip_address`/`user_agent` as `text` with no retention decision (`…crm_leads.sql:24-25`; flagged at `docs/margot/crm-operating-model.md:200`); the public route also stores `additional_data` verbatim with no filter (`marketing/leads/route.ts:126`). See §6.6, §11.6, §11.3, §18. `[VERIFIED file]`

### 6.3 `crm_contacts` + `crm_opportunities` (DRAFTED, not applied) — V1 target

Both tables are drafted in one migration (`…103000.sql`), guarded by a static test (`tests/unit/margot-crm-contacts-opportunities-migration.test.ts`). **Neither has been applied to any branch or prod.** `[VERIFIED]`

**`crm_contacts` — verified shape:** PK `id uuid`; identity (`display_name not null`, plus first/last/email/phone/role/company) with a **minimum-identity CHECK**; links (`linked_lead_id`/`linked_client_id`/`linked_business_id`, FK SET NULL); **4 dedupe key columns**; `privacy_scope not null default 'lead_scoped'` + 5-scope CHECK; consent/retention columns; status CHECK ∈ 7 values; indexes on email (lower), `dedupe_email_key`, 3× linked-id, status, owner, privacy_scope; RLS enabled with a single `service_role` ALL policy. `[VERIFIED]`

**`crm_opportunities` — verified shape:** 12-stage pipeline CHECK; status CHECK ∈ {open,won,lost,paused,blocked_review,cancelled}; `value_amount numeric ≥0 CHECK`, `value_currency`, `probability` 0–100 CHECK, `expected_close_at`; `approval_required`/`approval_status` columns; lead/contact/client/business FKs (SET NULL); in-schema comment "forecast-only … not billing truth" enforcing the Stripe source-of-truth law. `[VERIFIED]`

**Required V1 hardening (gaps the spec must close before promotion):**
1. **No DB-level dedupe uniqueness.** Add a partial UNIQUE index on `dedupe_email_key` (where not null) so the DB is the backstop, not the route's race-prone `SELECT … limit 1` (`…contacts/route.ts:180-202`). `[VERIFIED gap]`
2. **Two dedupe keys never populated.** Populate all four in the route (normalize phone to E.164-ish; `name_company_key = lower(trim(display_name))||'|'||lower(trim(company_name))`) and index them. `[VERIFIED gap]`
3. **No `updated_at` trigger.** Add a `set_updated_at` BEFORE UPDATE trigger (reuse pattern in `20260514142500_client_approvals.sql`). `[VERIFIED gap]`
4. **Lead→contact conversion does not exist, and must be atomic via a Postgres RPC (P5).** `src/app/api/crm/leads/[id]/convert/route.ts` converts **lead → `nexus_clients`** (sets `converted_client_id`/`matched_client_id` — `…convert/route.ts:146-152`); it never materializes a `crm_contacts` row, and it does a non-transactional `.update()` (`:172`) then a best-effort timeline insert in try/catch (`:182`) `[VERIFIED]`. The supabase-js client has **no multi-statement transaction**, so chained SDK calls cannot be atomic and will ship orphaned-contact partial commits. The V1 conversion flow MUST run inside a single **`SECURITY DEFINER` Postgres RPC `crm_convert_lead_to_contact()`** (validated on a database branch then promoted via a merged, approved branch in M1.1/M1.2) that, in one transaction: (a) upserts a deduped `crm_contacts` row from lead fields, (b) optionally seeds an opportunity, (c) sets lead status, (d) writes exactly one `agent_actions` event. Request/response JSON schema in §7.5. This closes OQ-6. `[VERIFIED — route read]`

### 6.4 Dedupe keys & strategy (V1)

Dedupe is **detect-and-block on write** in V1 (no auto-merge). Email is the only key strong enough to block on alone; domain is a hint; phone/name+company block only when a second key corroborates. **`dedupe_name_company_key` is derived from a stable normalized full-name (`first_name`+`last_name`), NOT the mutable `display_name`** — a rename must not silently change dedupe identity — and is **advisory-only** (never an automatic 409 on its own). **PATCH recomputes phone + name+company keys** (today PATCH recomputes only email keys) so keys never drift. Full derivation table in [`data-model-erd.md` §3](docs/spec/data-model-erd.md#3-dedupe-keys--strategy-v1). `[VERIFIED]`

### 6.5 Merge strategy

**V1: no record merge.** Conversion links rather than merges; cross-client mixing is blocked (the contacts route requires `boardApprovalId` when >1 link target is supplied — `…contacts/route.ts:234-239`; the convert route refuses on `matched_client_id` conflict). **V2: explicit, approval-gated merge** — `client_merge` is already modeled as a high-risk approval subject requiring Phill/Board review (`approval-lifecycle.ts:55,136-139`). The merge executor (loser→winner reconciliation, re-point `linked_*` FKs, archive loser, single timeline event, reversible via audit) is built in V2. **AI never executes a merge; it recommends.** `[VERIFIED engine; INFERENCE for the unbuilt executor]`

### 6.6 Privacy scopes

`crm_contacts.privacy_scope` (5-scope CHECK, default `lead_scoped`) is the per-record visibility band — forward-compatible metadata that becomes load-bearing at V3+ RBAC and drives redaction today. PII redaction in the timeline is enforced at write time (`activity-timeline.ts:105-153`; contacts route re-sanitizes the subject label). `crm_leads` IP/user-agent retention is unresolved privacy debt (§11.6). **Consent provenance is a V1 AC with teeth (P9):** `consent_source`/`consent_captured_at` columns exist (`…103000.sql:21-22`) but the contacts route writes only `marketing_consent` (`…contacts/route.ts:257`) `[VERIFIED]`; V1 requires that any write flipping `marketing_consent` true on either the contacts route or `marketing/leads` writes `consent_source` + a **server-side** `consent_captured_at`, and a consent=true write with no provenance is **rejected (422)**. `do_not_contact` is a hard server-side block on any send/sequence path. Full detail in [`data-model-erd.md` §4](docs/spec/data-model-erd.md#4-privacy-scopes) and §11.4–§11.6. `[VERIFIED]`

### 6.7 RLS policies

Every CRM table is RLS-enabled with a single `service_role` ALL policy and no authenticated/anon policy; `agent_actions` and `nexus_clients` additionally grant authenticated SELECT. **`agent_actions` grants `FOR SELECT TO authenticated USING (true)` (`…nexus_agent_actions.sql:37`)** — every authenticated principal can read the entire cross-entity audit/timeline trail `[VERIFIED]`. **V1 HARD GATE (P8):** tighten `agent_actions` SELECT to founder-email-only (mirror `data_room_documents`) in the **same M1.1 hardening migration** as the contacts/opportunities promotion — landing BEFORE ops-team authenticated principals are provisioned and BEFORE the M1.8-FB email/cal metadata lands in the table — with an **M1.1 exit assertion that an authenticated-non-founder key returns 0 rows from `agent_actions`**. Otherwise: keep service-role-only writes; add an `authenticated` SELECT to contacts/opportunities only once privacy-scope redaction is confirmed; the `service_role` ALL policy is the safety floor — no client-side write path is ever opened. **V3+:** `privacy_scope` becomes an RLS predicate (policy-only, no schema change). Full table in [`data-model-erd.md` §5](docs/spec/data-model-erd.md#5-rls-posture) and §11.2. `[VERIFIED current posture; INFERENCE for the planned policies]`

### 6.8 Approvals & timeline persistence (data-layer view)

- **Approvals (V1): no dedicated table** — Stage-1 task-subtype model; the pure-logic engine hard-codes `safeToAutoExecute=false`; `crm_opportunities` carries inline `approval_*` columns. `[VERIFIED]`
- **`crm_approvals` table is V2** — built branch-first (validated on a database branch, promoted via a merged approved branch) only when structured history/query needs are proven. `[VERIFIED plan]`
- **Timeline (V1): extend `agent_actions`** — 16-event taxonomy fixed in `activity-timeline.ts:1-17`; a dedicated timeline table is V3+. `[VERIFIED]`

### 6.9 Branch-first migration plan (V1 tables → prod)

The ordered branch-validation → merge-to-promote flow (contacts before opportunities, single transaction, security advisor, validate on a Supabase database branch, promote only by merging an approved branch, post-promote `gen:types` + `pg_policies`/`rowsecurity` assertions) is detailed in [`data-model-erd.md` §7](docs/spec/data-model-erd.md#7-sandbox-first-migration-plan-v1-tables--prod). `[VERIFIED]`

### Acceptance criteria for §6

The seven "data layer is done when" criteria are in [`data-model-erd.md` §8](docs/spec/data-model-erd.md#8-data-layer-is-done-when-v1-acceptance) and map to the §13 V1 exit gate.

---

## 7. API Specification

> **Owner:** API / Integration Specialist. This section is the contract for every HTTP surface that reads or mutates CRM truth, plus the integration mirrors. It is the authority for the source-of-truth matrix and the recommendation-only / approval-gated safety contract.

### 7.0 Scope & conventions

**Verified baseline (paths under `/Users/phillmcgurk/Unite-Group`):** Next.js 16 route handlers with `export const dynamic = 'force-dynamic'` `[VERIFIED]`; Zod `safeParse` on every body, `400` + machine error code on failure `[VERIFIED]`; per-request `createClient(URL, SERVICE_ROLE_KEY, { auth:{ persistSession:false }})`; tables enforce `service_role`-only RLS `[VERIFIED]`; every successful mutation appends a sanitized `agent_actions` row `[VERIFIED]`.

**Conventions for V1 (NEW where tagged):** versionless internal `/api/crm/*` paths (a versioned public `/api/v1/*` with API keys is **V3+**); JSON only; money is `numeric` + explicit `value_currency`; timestamps are ISO-8601 UTC (`z.string().datetime()`). `[VERIFIED]`

### 7.1 Authentication & authorization model

Distinct caller classes, distinct credential lanes — do not collapse them:

| Caller class | Credential | Gate | Routes |
|---|---|---|---|
| Phill / ops (browser) | Supabase session, email ∈ `ALLOWED_ADMINS` | `requireAdmin` session branch | All `/api/crm/*`, `/api/linear/issue`, `/api/empire/*` |
| Swarm / Margot / cron (server-to-server) | `Bearer <SUPABASE_SERVICE_ROLE_KEY>`, constant-time compare | `requireAdmin` bearer branch | Same |
| Cron sync workers | `Bearer <CRON_SECRET>` | `withSyncLifecycle` | `/api/cron/integrations/*` |
| Voice ingress | `Bearer <UNITE_CRM_INGEST_TOKEN>` | inline `timingSafeTokenMatch` | `/api/pi-ceo/margot-voice/task` |
| DR/NRPG lead intake | `Bearer <PI_DEV_OPS_CRM_LEAD_INTEGRATION_TOKEN>` + `x-integration-flow` + env enable | `requireCrmLeadIntegrationAccess` | `/api/integrations/dr-nrpg/crm/leads` |
| Public marketing form | none (anonymous) + IP rate-limit | `rateLimit` only | `/api/marketing/leads` |

`[VERIFIED — require-admin.ts, sync-lifecycle.ts, margot-voice/task/route.ts, crm-lead-integration-gate.ts, marketing/leads/route.ts]`

**`requireAdmin` contract (canonical gate):** service-role bearer tried first (constant-time via `timingSafeTokenMatch`); falls back to admin-email Supabase session; fails **closed** — `401` no credential, `403` not allow-listed. `[VERIFIED require-admin.ts:79-93]`

**Credential trust boundary (BLOCKER B2 — see §3.1):** the bearer branch compares `Authorization` against `SUPABASE_SERVICE_ROLE_KEY` (`require-admin.ts:79-81`), the single key that authorizes **every** mutating CRM route. Recommendation-only is enforced by **NOT issuing that bearer to any AI/agent process**, plus a distinct read-only Margot credential — it is a credential boundary, not a route convention. **AC:** no credential issued to an AI/agent process can satisfy `requireAdmin` on any mutating CRM route. `[VERIFIED]`

**Gaps to close (V1):**
- `ALLOWED_ADMINS` is duplicated in two files — **converge to the single `require-admin.ts` export with a grep/lint guard and a V1 AC** (a second definition fails CI). A duplicated trust anchor is a contract-integrity risk, not a style nit. `[VERIFIED duplicate set]`
- Bearer callers audit as generic `'service-role'` — **add `x-actor-id` attribution in V1 (not V2)** so the audit trail distinguishes Margot from Phill from a leaked key (§3.1). `[VERIFIED]`

### 7.2 Error model

Stable machine-readable codes (string `error`), never raw DB messages. Codes span `400` (validation), `401` (no/bad credential), `403` (forbidden/approval gate), `404`, `409` (dedupe/idempotency/state conflict), `410` (expired), `422` (terminal), `423` (feature-flag hold), `429` (rate limit), `500`, `503` (env not configured). `[VERIFIED across the CRM routes]`

**V1 normalization (NEW) — concrete error envelope (P25):** the DR/NRPG route returns `{ success, error, errorClass, retryable }` `[VERIFIED]`; promote this shape to all CRM mutation routes. The envelope is defined concretely:
- `errorClass` enum: `validation | auth | conflict | rate_limit | dependency | internal`.
- `retryable: boolean` is **derived from `errorClass`** (`internal`/`dependency`/`rate_limit` → retryable; `validation`/`auth`/`conflict` → not).
- The existing stable string `error` code (the §7.2 code table) is **preserved as a sibling field**, not replaced — callers that branch on the string keep working.

Example 5xx body:
```json
{ "success": false, "error": "crm_contact_persist_failed", "errorClass": "internal", "retryable": true }
```
**Acceptance:** every 5xx CRM response carries `errorClass` + `retryable: boolean`, with the stable `error` code retained.

### 7.3 Idempotency & concurrency

Natural-key idempotency exists today (email dedupe + `23505` catch on contacts; name+link dedupe on opportunities; `dedupe_key` on DR/NRPG; conditional `.is('converted_client_id', null)` on conversion; conditional `.eq('status','pending')` on client approval). `[VERIFIED]`

**V1 gap (HIGH) — resolved store (P12, closes OQ-9):** no client-supplied `Idempotency-Key` header exists today — a retried keyless contact/opportunity POST can duplicate. The in-memory option **cannot work on Vercel serverless** (per-invocation isolation), so a launch-blocking AC cannot depend on it. **Resolution:** the V1 store is a **persistent `crm_idempotency` table** (`key`, `resource_id`, `response_hash`, `expires_at`), promoted branch-first (validated on a database branch, merged via an approved branch); all CRM POST routes accept an optional `Idempotency-Key`, persist `(key → resource_id)`, and replay the stored response. (If the Board instead chooses to descope, `Idempotency-Key` drops to a fast-follow and the V1 idempotency guarantee is natural-key only — email dedupe + `23505`; the AC must move with it. Do **not** leave a launch-blocking AC depending on an undecided store.) `[INFERENCE — no idempotency-key code found]`

**Optimistic locking on PATCH (P24):** PATCH today is last-write-wins. **NEW:** PATCH on contacts/opportunities accepts an `If-Match`/`updated_at` precondition; a stale precondition returns `409` (or `412`) rather than silently overwriting a concurrent edit. Natural-key insert idempotency does not cover concurrent updates.

### 7.4 Source-of-truth matrix (API enforcement)

Routes MUST mirror, never overwrite, the truth source. `[VERIFIED against docs/margot/crm-operating-model.md:101-114]`

| Object | Source of truth | API rule | Conflict rule |
|---|---|---|---|
| Lead | Supabase `crm_leads` | `/api/marketing/leads` (write), `/api/crm/leads` (read) | CRM row must exist even if SendGrid fails `[VERIFIED]` |
| Contact | Supabase `crm_contacts` | `/api/crm/contacts` | Supabase wins; dedupe on email key |
| Opportunity | Supabase `crm_opportunities` | `/api/crm/opportunities` | **Forecast-only — NOT billing truth.** Stripe owns revenue |
| Client identity | Supabase `nexus_clients` | `/api/empire/clients/*` | lead→client conversion is approval-gated |
| Billing / revenue | **Stripe** | webhook + cron mirror | Stripe wins; CRM stores links/status only |
| Execution / tickets | **Linear / GitHub** | `/api/linear/issue`, webhooks | Execution system wins |
| Email / calendar | **Google via Composio** | cron | Provider wins; CRM logs activity refs, never message body in clear |
| Agent audit | Supabase `agent_actions` | all CRM routes append | Append-only; failed audit write logged, does not undo the safe mutation `[VERIFIED]` |

**Hard contract in code — scoped to opportunities only (P11):** the `additional_data` sensitive-data firewall (`containsUnsafeAdditionalData`) rejecting `stripe|payment|card|bank|email|phone|…` keys/values exists **only on opportunities** (`opportunities/route.ts:62-90`) `[VERIFIED]`. The other two write surfaces do NOT yet enforce it: **contacts hardcodes `additional_data: {}`** (`contacts/route.ts:263`, so nothing can be smuggled but nothing is filtered either) and the **public, unauthenticated `marketing/leads` route has NO filter** — it stores `leadData.additionalData` verbatim (`marketing/leads/route.ts:126`) `[VERIFIED]`. So the source-of-truth write contract is enforced **asymmetrically**, with the most-exposed surface unguarded. **V1 precondition of the source-of-truth AC:** the shared `src/lib/security/safe-additional-data.ts` (**new module**, §11.3) is imported by all three write surfaces, with a **per-route assertion** that each rejects billing/secret-shaped payloads (and a size cap on the public route). `[VERIFIED]`

### 7.5–7.7 Endpoint contracts — Leads, Contacts, Opportunities

- **Leads:** `POST /api/marketing/leads` (public, rate-limited; standardize 200→201; gains the shared `safe-additional-data` filter + size cap + ip/UA hashing per §11.3/§11.6); `GET /api/crm/leads` (admin, filters); `POST /api/crm/leads/[id]/convert` **EXISTS** (board-approval gated, dryRun, race-safe) — but only links lead→client.
- **NEW `POST /api/crm/leads/[id]/convert-to-contact` (atomic, RPC-backed — P5):** invokes the `crm_convert_lead_to_contact()` `SECURITY DEFINER` RPC so contact upsert + optional opportunity + lead-status + audit commit in **one Postgres transaction** (chained SDK calls are explicitly disallowed — supabase-js has no client transaction). Idempotent on `dedupe_email_key`; emits exactly one `contact_created` + `lead_converted` pair; second call → 409.
  - **Request body schema:** `{ leadFieldMapping?: {...overrides}, seedOpportunity?: boolean, opportunitySeed?: { name, stage, value_amount, value_currency:'AUD', probability }, boardApprovalId?: string, dryRun?: boolean }`.
  - **Responses:** `201 { contact, opportunity?, timelineEventId }` · `409 crm_lead_already_converted` / `crm_contact_conflict` · `200` (dryRun) `{ planned_contact, planned_opportunity?, planned_timeline_event }` · `4xx/5xx` per the §7.2 envelope (no partial-commit shape exists because the RPC is all-or-nothing). `[VERIFIED route present; INFERENCE for the new route]`
- **Contacts:** `POST` + `PATCH /api/crm/contacts` exist (identity-required, email dedupe → 409, multi-link approval gate, dedupe re-derive on email change). **V1 gaps / NEW:** `GET /api/crm/contacts` (list + by-id) with a **pagination/ordering contract** (`limit` default 20 / **max 100**, `cursor` or `offset`, `order_by=created_at desc` default, status/owner filters); phone/name+company dedupe now enforced (advisory, stable full-name key); **PATCH accepts `If-Match`/`updated_at` optimistic-lock precondition**; merge endpoint is V2. `[VERIFIED]`
- **Opportunities:** `POST` + `PATCH /api/crm/opportunities` exist (12 stages, won transitions need full approval, `additional_data` billing firewall + 4 KB cap, PATCH free-text redaction). **V1 gap / NEW:** `GET /api/crm/opportunities` (list, same pagination/ordering contract) **+ `GET /api/crm/opportunities/forecast`** rollup. The forecast is **single-currency by construction** — `value_currency` is pinned `NOT NULL DEFAULT 'AUD'` with `CHECK (value_currency = 'AUD')` in the M1.1 hardening migration (P6) — so `Σ(value_amount × probability/100)` per stage is well-defined and "matches API to the cent" is meaningful; the endpoint asserts a single currency and refuses cross-currency summation. Multi-currency + FX is V2. Products/line items are V2. `[VERIFIED]`
- **DELETE / archive (P24):** statuses `archived` / `blocked_review` exist in the contacts/opportunities schema but have no write contract. **NEW:** `PATCH … { status:'archived' }` (or `DELETE` → soft-archive) is the V1 archive contract — never a hard row delete; archive emits a timeline event; archived rows are excluded from default GET lists. Hard delete is out of scope (append-only posture).

### 7.8 Approvals & approval execution

Today, `client_approvals` + magic-link routes handle **client-deliverable** approvals (HMAC receipts, sha256 token-at-rest). CRM-object approval is enforced **inline** via `boardApprovalId` checks; the engine `evaluateCrmApprovalLifecycle` is **not wired to any route** — unit-tested logic only. `[VERIFIED]`

#### 7.8.1 Reconciling two parallel approval mechanisms (BLOCKER B3 — API)

The spec previously said "wire the handler onto the engine" without reconciling two **incompatible** mechanisms that exist in the live code `[VERIFIED]`:

| | Engine (`approval-lifecycle.ts`) | Live opportunities route (`route.ts:28`) |
|---|---|---|
| Status set | `{requested, approved, rejected, cancelled, executed, expired}` (`:54`) | `['not_required','requested','approved','rejected','expired']` — **no `cancelled`, no `executed`** |
| Execution precondition | `may_execute` requires recorded **`approvedBy` + `approvalReference`** (`:208-211`) | gates only on `approvalStatus==='approved'` + a free-text **`boardApprovalId`** (≥6 chars, `:150-158`) — captures no `approvedBy` |
| Convert route | n/a | gates solely on `boardApprovalId`; **never invokes the engine** |

**Resolution (V1, closes sub-question of OQ-5):**
1. **The engine is the single approval authority.** All gated CRM writes resolve through `evaluateCrmApprovalLifecycle`; the inline `boardApprovalId` gate is migrated onto it.
2. **Align the `crm_opportunities.approval_status` CHECK to the engine vocabulary** — add `cancelled` and `executed` (or document a deliberate projection mapping if the column intentionally carries a narrower set; the mapping must be written down).
3. **Capture `approvedBy` wherever an approval is recorded** so the engine's `may_execute` precondition (`approvedBy` + `approvalReference`) is satisfiable; a bare `boardApprovalId` is no longer sufficient to record an approval.
4. **Define the id mapping:** a request-supplied `boardApprovalId` resolves to an engine approval id (the `approvalReference`); the execute route loads the engine approval by that id.

**V1 NEW requirement — wire the execution handler onto the engine (locked scope item 1):**
- **`POST /api/crm/approvals`** — create request (persistence shape per `docs/margot/crm-approval-persistence-plan.md`: Stage-1 task-subtype vs Stage-2 table — OQ-5), status `requested`, emit `approval_requested`. **Request:** `{ subjectType, subjectId, requestedBy, reason, scope?, relatedObject }` → **Response:** `201 { approvalId, status:'requested' }`.
- **`POST /api/crm/approvals/[id]/execute`** — loads the approval, calls the engine; only when `decision==='may_execute'` (requires recorded `approvedBy` + `approvalReference`) performs the gated mutation, drives `crm_opportunities.approval_status` to `executed`, appends `approval_*`. **Request:** `{ approvedBy, approvalReference }` → **Response:** `200 { status:'executed', resourceId }` · `do_not_execute`/`already_executed`/`invalid_request` → 403/409/400. `safeToAutoExecute` is hard-`false` — the engine can never green-light an automatic write. **Acceptance:** a `requested` approval cannot execute (403); `client_merge`/`data_export` always set `requiresPhillReview`; executed is idempotent (409 on repeat); the opportunities `approval_status` enum and the engine vocabulary agree (or a documented projection maps them). `[VERIFIED engine; INFERENCE for the unbuilt endpoints]`

### 7.9 Daily digest & voice ingress

`GET /api/crm/daily-digest` aggregates advisory signals (no writes) — note the gate ordering bug: the env check precedes `requireAdmin` (`:43-48`), leaking config state (503 "not configured" vs 401 distinguishes config before auth); **V1 moves auth first, promoted to an explicit AC + a route-convention rule** — `requireAdmin` MUST run before any env/config branch on **every** gated route (with a `security:routes-check` assertion if feasible) so the oracle cannot reappear on new routes. Test: an unauthenticated digest request returns 401/403 regardless of configuration state. `POST /api/pi-ceo/margot-voice/task` lands `approval_required` packets as `status='blocked'` (assignee `'Phill approval'`) — recommendation-only preserved. `[VERIFIED]`

### 7.10 Integration mirror surface & Composio long-pole

**Read path:** 9 cron mirrors (`github/vercel/railway/digitalocean/supabase/onepassword/linear/stripe/composio`), all `CRON_SECRET`-gated via `withSyncLifecycle`, seeding/marking `sync_state`; stale detection by `checkStaleSyncs`. **Write path:** Stripe webhook (signature-verified) + GitHub webhook; Linear push-on-demand. `[VERIFIED]`

**Composio email/calendar — the V1 critical-path long-pole:** today only a connection-mirror (`listConnections` → `integration_composio_connections`). V1 net-new: OAuth connect, encrypted token storage (1Password vs Supabase Vault — OQ-3), inbound email/event → `agent_actions` activity refs (never message bodies in clear; **no subject line either** in the audit payload), outbound send/schedule **approval-gated**. **Fast-follow fallback (MUST ship):** read-only one-way ingest first so 2-way OAuth write-back cannot silently stretch V1.

**Composio inbound webhook contract (P24 — matching the verified Stripe/GitHub signature pattern):** inbound provider events are accepted only with **signature verification** (mirroring `webhooks/stripe`'s `constructEvent` + secret pattern) `[VERIFIED Stripe/GitHub pattern]`; each event carries a **per-event idempotency key** so a re-delivered provider event writes **0 new timeline rows** (inbound idempotency). Payload contract: `{ provider, eventType, externalId, occurredAt, threadRef, contactMatchHint }` → maps to one `agent_actions` activity ref; no message body/subject persisted. The fallback path uses the same idempotency semantics on poll. `[VERIFIED connection-mirror only]`

### 7.11 Acceptance criteria (§7)

1. Every CRM mutation route passes `requireAdmin`; `security:routes-check` reports 0 unprotected mutating routes; **no AI/agent credential can satisfy `requireAdmin` on a mutating route** (§3.1). 2. All errors use the stable code table **+ the `{errorClass, retryable}` envelope** (§7.2); no raw DB message reaches the client. 3. Lead→contact conversion runs through the **`crm_convert_lead_to_contact()` RPC** (single transaction), idempotent on email key, emits paired timeline events, no partial commit. 4. `POST /api/crm/approvals/[id]/execute` is wired to the engine as the **single authority**; `crm_opportunities.approval_status` vocabulary agrees with the engine (or a documented projection); `requested` cannot execute; `approvedBy` is captured; `safeToAutoExecute` is never honored as write authorization. 5. Source-of-truth matrix enforced; the **shared `safe-additional-data` filter is imported by all three write surfaces** (contacts, opportunities, marketing/leads), each asserting rejection of billing/secret-shaped payloads. 6. Composio V1 ships at minimum the read-only activity-ingest fallback with **signature-verified, per-event-idempotent** inbound; outbound send is approval-gated and off by default. 7. `Idempotency-Key` is honored on all CRM POSTs **backed by the persistent `crm_idempotency` table** (P12) — OR explicitly descoped to a fast-follow with the AC moved accordingly. 8. PATCH honors an `If-Match`/`updated_at` optimistic-lock precondition. 9. `agent_actions` has a `BEFORE UPDATE OR DELETE` append-only trigger (inserts succeed; updates/deletes rejected). 10. Single canonical `ALLOWED_ADMINS` export with a grep/lint guard (no second definition). 11. `requireAdmin` runs before any env/config branch on every gated route.

---

## 8. UX / UI Design

> **Owner:** UX/UI Design Specialist. CRM surfaces extend the existing **Command Center cockpit aesthetic**, not the marketing or client-portal look.

### 8.1 Design north star

Dark ground, monospace labels, a single accent ("Candy Red" `#dc143c`) reserved **exclusively** for signal states (live / blocked / approval-required), and a breathing pulse gated to live data only `[VERIFIED globals.css 207-237; CommandCenterShell.tsx]`. Three principles: **(1) Truth is visible** — every surface declares provenance with a `SourceBadge` `[VERIFIED]`; **(2) AI advises, the human commits** — every AI suggestion renders inside an explicit "recommendation" affordance with human Approve/Reject/Edit, visually impossible to confuse with a committed write `[INFERENCE from locked contract + HermesControlPanel pattern]`; **(3) Anti-slop restraint** — pulse/glow only for genuinely live/blocking states `[VERIFIED ActivityLog.tsx 15-17]`.

### 8.2 Three coexisting token systems

The repo ships three token sets; new CRM surfaces MUST pick the right one. **Rule:** every net-new command-center CRM surface renders in the **`--cc-*` cockpit** system; reused shadcn `ui/*` primitives are wrapped in a cockpit-styled container with `--cc-*` overrides (as `HermesControlPanel`/`DailyCrmDigestPanel` already do). The light `--layered-*` founder cards are the most likely accidental import — reuse their *logic*, rebuild *presentation* in `--cc-*`. `[VERIFIED globals.css; tailwind.config.ts]`

### 8.3 Current-state assessment

LIVE: 5-zone shell, admin gate, Daily CRM Digest (read-only), Hermes Control Panel (approval gates), Unified Activity Log (read-only). **MISSING:** contacts list/detail, CRM pipeline board, forecast dashboard. **PARTIAL:** approval queue (only add-on gate cards in Hermes). A generic `PipelineFlow` and light `OpportunityCard`/`LeadCard` exist but are not wired to `crm_opportunities`. `[VERIFIED — grep across src/components/]`

### 8.4 Information architecture

V1 keeps the **single-tenant cockpit-first** model: the command center stays home; CRM detail surfaces are reached from it. New V1 routes nest under `src/app/[locale]/command-center/crm/*`: `contacts`, `contacts/[id]`, `pipeline`, `opportunities/[id]`, `approvals`. A compact locale-preserving "CRM" nav cluster links Contacts/Pipeline/Approvals.

> **⚠ The admin gate is NOT inherited (P7 — UX, auth-bypass risk).** `command-center/layout.tsx` only sets `metadata` and `return children` `[VERIFIED]` — the session/admin check (`checkAdminSession` → redirect `/login` / `AccessDenied`) and `export const dynamic = 'force-dynamic'` live in `command-center/page.tsx` (`:22,30-35`), which child routes do **not** inherit in the App Router. Nesting alone would render every new CRM page (contacts, contacts/[id], pipeline, opportunities/[id], approvals) **UNGATED with PII**. **V1 fix (explicit M1.1/M1.6 task with effort):** either (a) hoist the session/admin check + `force-dynamic` into a **server** `command-center/layout.tsx` (or a new `crm/layout.tsx`) that all child pages inherit, OR (b) require every CRM page to call the gate helper. **Acceptance test:** an unauthenticated request to each new `crm/*` route redirects to `/login`, and a non-admin sees `AccessDenied`. `[gate-not-inherited VERIFIED]`

### 8.5 Surface specifications (V1)

- **Contacts list** — cockpit `Table` of `crm_contacts` with search/filter, `SourceBadge`, dedupe pip + approval-gated merge modal, `EmptyState`/`DegradedDataBanner`.
- **Contact detail** — two-column on xl: identity + linked opportunities left; per-entity activity timeline + AI next-best-action right rail; field edits open an approval-gated save (no direct write).
- **Pipeline board + forecast** — Tabs toggle board (stage columns, cockpit `OpportunityBoardCard`) and forecast (probability-weighted AUD ARR via `ui/chart`). **V1 is READ;** stage change is an approval-gated action menu, **NOT free drag** (drag implies an instant write — deferred to V2). Stale (>7d) cards show a Candy-Red border; forecast total matches the API to the cent (**single-currency AUD by construction**, §6.2 of `data-model-erd.md`). **Chart theming (minor):** `src/components/ui/chart.tsx` binds recharts to **light** shadcn tokens internally (`fill-muted-foreground` axis ticks, `bg-background`/`border-border` tooltip) `[VERIFIED]` — a cockpit container wrapper does NOT restyle recharts SVG internals; the forecast chart MUST map axis-tick fill, tooltip bg/border, and cursor to `--cc-*` via the `ChartContainer` CSS-var hooks / per-series `--color` overrides. Acceptance: forecast chart chrome renders in cockpit tokens (dark tooltip/axis), verified visually.
- **Approval queue** — first-class queue from the approval engine: requesting actor (human vs Margot), before→after **diff**, AI rationale, Approve/Reject/Edit. An unapproved AI suggestion can never mutate `crm_*` from the UI; each decision writes `agent_actions`; counts reconcile with the Hermes panel + digest.
- **Timeline & digest** — extend `ActivityLog` to accept an entity filter; add the advisory AI block to the digest with per-item Accept/Dismiss routing to the approval queue (never a direct write).
`[VERIFIED component inventory; INFERENCE for the new compositions]`

### 8.6 Component map

**Reuse as-is:** `SourceBadge`, `DegradedDataBanner`, `KpiStrip`, `GlobalStatusBar`, `Business360Grid`; shadcn `table/dialog/alert-dialog/tabs/chart/input/select/badge/skeleton/scroll-area/tooltip/toast`, `EmptyState`, `use-mobile`. **Reuse logic, restyle:** `OpportunityCard`/`LeadCard` stale/win-probability maps. **Net-new (`--cc-*`):** `CrmContactsTable`, `ContactDetailPanel`, `DedupeMergeDialog`, `OpportunityBoardCard`, `PipelineBoard`, `ForecastStrip`, `ApprovalQueue`, `ApprovalDiffRow`, `AiRecommendationCard`, `CrmNavCluster`. `[VERIFIED inventory]`

**Mutating-surface state coverage (V1 — required, was missing).** Every human-commits flow (approval-gated save, approve/reject/edit in the queue, conversion) MUST specify: **in-flight/pending** (disabled control + spinner), **success** (`role="status"`), and **failure** (`role="alert"`) states — not just empty/degraded. **Focus management:** the modal surfaces (`DedupeMergeDialog`, `ApprovalDiff` approve/reject, approval-gated field-edit save) trap focus, return focus to the trigger on close, and honor Esc. **First-run/empty IA:** contacts and opportunities are freshly promoted and empty in prod, so every surface's first render is the empty state — the pipeline board with zero opportunities and the forecast with no data must render an intentional onboarding empty state, not a broken-looking cockpit. **i18n:** the net-new CRM surfaces are locale-prefixed (next-intl); each needs a translation-key plan (Contacts/Pipeline/Approvals labels) — **except** the verbatim recommendation-only display language (§9.1), which renders in its fixed English wording. (V1 may declare English-only for CRM chrome with an explicit decision; do not leave it unstated.)

### 8.7–8.8 Accessibility & responsive (WCAG 2.1 AA)

**Contrast (P14 — measured, not hand-waved).** `--cc-ink-hush` is `#3d4654` (`globals.css:213`, "tertiary/inactive — far below ink-dim") and is **already used for small functional text** — `SourceBadge` timestamp, `MissionClock` zone labels, `GlobalStatusBar` separators `[VERIFIED]` — i.e. it is a **pre-existing AA failure**, not decorative-only. On the dark cockpit ground `#3d4654` is well below the AA 4.5:1 floor for body text (and likely below 3:1 large-text). **Rules:** measured ratios for `--cc-ink` / `--cc-ink-dim` / `--cc-ink-hush` against `--cc-bg` are tabled in this section before §8 is treated as buildable; **`#3d4654` MUST NOT be used for any CRM functional text** (timestamps, labels, secondary fields) — reserve it for non-text decoration or lighten it; an **automated contrast assertion (jest-axe)** is added to §8.9/§12; the existing `SourceBadge`/`MissionClock`/`GlobalStatusBar` usages are flagged as **pre-existing debt** to remediate. `[VERIFIED — #3d4654 in functional text]`

Body/interactive text uses `--cc-ink` (AA-passing); signal is never colour-only (pip always paired with a label); `role="log"`/`aria-live` on feeds, `role="status"`/`alert` on mutation results; `min-h-11` (44px) touch targets via a shared cockpit interactive primitive (today `min-h-11` appears in only 2 files — `HermesControlPanel`, `MargotVoicePanel` — so new CRM controls must use the shared primitive or each apply the target size, with a lint/test check) `[VERIFIED]`; reduced-motion honored via the shared `cc-breathe` keyframe.

**Responsive (net-new, not reuse — minor).** No command-center component uses `useIsMobile` today and `ui/table.tsx` is a plain HTML-table wrapper with no built-in collapse `[VERIFIED grep]`, so **table→card collapse below `md` and swipeable pipeline columns are net-new** behavior, tagged as build line items in M1.6 (not "established patterns"). V1 may instead descope mobile-card collapse to a horizontal-scroll table (acceptable for a single-operator cockpit) and say so explicitly; one responsive test is added either way. `[VERIFIED tokens/patterns; contrast ratios measured per above]`

### 8.9 Acceptance criteria (§8)

1. Every new CRM route under `command-center/crm/*` is admin-gated via a **hoisted server layout (or per-page gate helper) — the gate is NOT inherited from the existing page.tsx** (P7); an automated test asserts unauthenticated → `/login` and non-admin → `AccessDenied` on each `crm/*` route. 2. Every surface renders a `SourceBadge` and degrades via `DegradedDataBanner`/`EmptyState`; every mutating surface specifies in-flight (`disabled`+spinner), success (`role="status"`), and failure (`role="alert"`) states, with focus-trap/return-focus/Esc on modal flows. 3. No CRM surface produces a `crm_*` write without an approval-gated action; AI writes only via the approval queue — enforced by a §12 UI-level test asserting no contacts/opportunity/pipeline surface can issue a `crm_*` mutation except via the approval-queue path. 4. Forecast reconciles to the API to the cent (single-currency AUD); approval counts reconcile across queue/Hermes/digest; forecast chart chrome renders in cockpit `--cc-*` tokens (dark tooltip/axis). 5. **WCAG AA with measured ratios**: `--cc-ink-hush` (`#3d4654`) is barred from CRM functional text; a **jest-axe contrast assertion** runs in CI; keyboard-operable, signal never colour-only, reduced-motion honored. 6. All pulsing affordances reuse `cc-breathe`; no new animation on static data.

---

## 9. AI Integration

> **Owner:** AI Integration Specialist. Per-capability matrix rows feed [`feature-coverage-matrix.md`](docs/spec/feature-coverage-matrix.md) (pillar 11).

### 9.1 The recommendation-only contract (load-bearing — never weaken)

> **AI never writes CRM truth. AI advises; a human (Phill or the named approver) approves; only then does a guarded server route mutate Supabase.** Every AI-originated action that would change a lead/contact/opportunity/client/billing field, or send anything externally, is materialised as a *draft* or an *approval-required task* — not a write.

This is the de-facto posture today and the spec hardens it into a contract: `qualify-lead.ts` is a pure deterministic function whose `operatorNotes[0]` forbids auto-convert/identity-overwrite `[VERIFIED]`; `daily-digest.ts` emits a markdown safety note that no DB writes/deploys/sends are implied `[VERIFIED]`; the Margot voice path lands `approval_required` work as a blocked task and never executes it `[VERIFIED]`.

**Contract clauses (enforced by tests, route gates, the approval engine, AND the credential boundary):** **C1 no AI capability holds the service-role bearer — enforced by the credential boundary, not by route topology (§3.1, BLOCKER B2): the bearer = full CRM write authority, so recommendation-only is enforced by NOT issuing it to any AI/agent process, and Margot reads via a distinct read-only credential.** C2 every recommendation that *could* mutate produces an approval-required artifact; C3 every approved-then-executed AI action writes an `agent_actions` row (source + action_type + payload incl. model id + approver + status + `x-actor-id`); C4 AI output carries explicit provenance + the required display language; C5 no external LLM call over client/lead PII or voice transcripts without a named approval gate (AI-VOICE-001); C6 the source-of-truth matrix holds. `[VERIFIED C3/C5/C6; C1 corrected to a credential control per B2; the display language is verbatim in the candidate register]`

**Required operator-facing display language** (verbatim, wherever a score/recommendation appears):
```text
Lead score is recommendation-only. Human/Board-approved conversion rules and
strong identity checks are required before client creation, follow-up, or CRM
identity merge.
```

### 9.2–9.3 Capability map & current state

| Capability | Today | Phase | Recommendation-only enforcement |
|---|---|---|---|
| Lead scoring | `qualifyLead` — deterministic, live `[VERIFIED]` | V1 | Pure fn; surfaced in digest only |
| Next-best-action | heuristic `nextAction` strings in digest `[VERIFIED]` | V1 (heuristic) → V2 (LLM) | Digest text; no write |
| Draft-email | missing | V2 | Draft never auto-sends; send is a separate approved action |
| Forecast insight | deterministic rollup (§3) | V2 | Read-only commentary |
| Enrichment | missing | V2/V3+ | Suggested-edit row; identity gate before merge |
| Summarization | missing | V2 | No write; transcript summarization gated by AI-VOICE-001 |
| Voice → task → approval | live `[VERIFIED]` | V1 (harden) | `approval_required` → blocked task |
| Semantic search | live `POST /api/search/nexus` over `document_embeddings` `[VERIFIED]` | V2 (extend to CRM corpus) | Read-only retrieval, privacy-scoped |

**Decision flagged:** a legacy bespoke gateway scaffold `src/lib/ai/gateway/*` (OpenAI/Claude/Google/**Azure** providers) predates the locked Vercel-only decision and is unused on the CRM path. Recommend **quarantine-and-decommission**, standardising on the Vercel AI Gateway + AI SDK provider-string pattern (§9.5). `[VERIFIED scaffold exists; INFERENCE it is unused on the CRM path]`

### 9.4 Guardrails

No-auto-write (AI modules in `src/lib/ai/crm/*` are pure, returning data not effects; only guarded routes + the approval engine write); human approval gate (reuses `approval-lifecycle.ts` — V1 wires the execution handler); audit (every approved-then-executed action appends `agent_actions`); PII/data-minimisation (smallest field set; no transcript LLM-summarization until AI-VOICE-001; no cross-client bleed; zero-retention/no-training providers); prompt-injection (treat all retrieved/user content as data; output proposing a mutation always lands as a human-approved draft — injection cannot escalate to a write); rate-limiting/cost caps on every LLM/embeddings route. `[VERIFIED patterns; INFERENCE for the unbuilt modules]`

### 9.5 Model choice on Vercel

**Decision:** standardise on the **Vercel AI Gateway** fronting the **Vercel AI SDK**, addressing models by **provider string** (`anthropic/claude-*`, `openai/gpt-*`) — Vercel-native (no Azure/AWS), with provider failover, spend caps, and unified telemetry. Keep OpenAI `text-embedding-3-small` for the existing `document_embeddings` corpus (route via gateway when supported). Retire/quarantine `src/lib/ai/gateway/*`. Provider keys in Vercel env + 1Password, never in repo/CRM. `[INFERENCE — recommended architecture; repo today uses the raw openai SDK for embeddings only]`

### 9.6 V1 AI scope (locked) and what ships

1. **Keep** deterministic `qualifyLead` band/score as the V1 scoring engine. 2. **Add** a deterministic/heuristic next-best-action per lead/opportunity in `createCrmDailyDigest` (extend the existing `nextAction` plumbing). 3. **Harden** the voice approval path (transcript retention policy + tests). 4. **Wire** the approval execution handler onto `approval-lifecycle.ts` with an `agent_actions` audit row. **Explicitly deferred to V2+:** LLM NBA rationale, draft-email, summarization, enrichment, forecast narrative, CRM-corpus semantic search — V1 advisory AI is **deterministic-first** so the long-pole (email/cal sync) owns the V1 critical path, not the AI layer. `[VERIFIED fields/engines exist]`

### 9.7 Evaluation method

**Tier 1 (CI, every PR):** unit tests pin `qualifyLead` band boundaries + NBA rules; a mocked/static answer-shape harness (AI-RET-001 mould) asserts forbidden overclaims (an NBA recommendation must never assert "client created"/"email sent"/"auto-converted"); no live LLM in CI; `security:routes-check` proves no AI route became an unguarded mutating route. **Tier 2 (offline, gated, V2+):** golden-set eval scoring faithfulness/helpfulness/**safety**, with the safety dimension asserted deterministically (regex/structure), never by a model alone. `[VERIFIED harness pattern exists]`

### 9.8 Acceptance criteria (§9)

No AI module holds a service-role CRM write (`security:routes-check` passes); every mutating capability produces a draft/approval artifact; approved-then-executed actions write an `agent_actions` row with model id + approver; the display language renders wherever a score appears; no external LLM call over PII/transcripts without the named gate; source-of-truth honored; all LLM/embeddings routes admin-gated + rate-limited + cost-capped; mocked answer-shape eval green in CI; models addressed by provider string via the Vercel AI Gateway with the legacy scaffold quarantined; V1 advisory AI ships without any live LLM on the CRM path.

### 9.9 Phasing summary (AI)

- **V1:** deterministic scoring (live) + deterministic NBA in digest; hardened voice approval path; approval execution handler wired with audit. *No live LLM on the CRM path.*
- **V2:** Vercel AI Gateway + AI SDK standup; LLM NBA rationale, draft-email (no auto-send), summarization, forecast narrative; CRM-corpus semantic search with privacy scopes; offline eval harness.
- **V3+:** enrichment with approval-gated suggested edits, richer voice intents, semantic search across the data room, automated (still approval-gated) sequence suggestions.

### 9.10 External data acquisition & enrichment — Apify (post-board addendum, 2026-06-16)

> Added after the board review at Phill's request; the same recommendation-only and privacy contracts apply, and the integration is sequenced **after** the V1 critical path so it never competes with the email/cal long-pole. It has **not** itself been through the multi-eyes board.

**Apify** (managed scraper/actor platform) is the external data-acquisition layer feeding three recommendation-only use cases: **contact/company enrichment** (pillars 1, 11), **prospecting / lead-gen** (pillar 2), and **web monitoring / research**.

- **Contract (load-bearing).** Apify output **never auto-writes CRM truth.** Scraped/enriched records land as **approval-gated suggested-edit rows** through the existing `approval-lifecycle.ts` engine (identity gate before any merge); a human approves before any `crm_leads`/`crm_contacts` write — identical posture to §9.1 and pillar 11's "Enrichment as approval-gated suggested edits." `[INFERENCE — new integration, not yet built]`
- **Connection & auth.** `APIFY_API_KEY` already exists in the **unite-group** Vercel project env (Dev/Preview/Prod) `[VERIFIED — vercel env ls]`, pulled transiently (temp file outside the repo, deleted immediately), never committed, used via `Authorization: Bearer` against `api.apify.com`. An Apify MCP server (`https://mcp.apify.com`) is configured at local scope, OAuth pending `[VERIFIED — claude mcp]`. No Apify reference exists in the repo today `[VERIFIED — grep]`.
- **Current state (2026-06-16).** Account `Unite-Group`, **FREE** plan, previously empty; **4 reusable Store-actor tasks created**: `contact-info-scraper` (enrichment), Google Maps (prospecting), Google Search (monitoring), website-content-crawler (research) `[VERIFIED — Apify API]`.
- **Cost guardrail.** FREE plan ≈ $5/mo credits; some Store actors are paid rental. Every run is **bound by hard input limits and cost-confirmed before execution**; volume work needs a paid plan (OQ-18).
- **Compliance.** Scraped contact PII (emails/phones from Maps/SERP) is subject to the **same** privacy/consent/retention constraints as `crm_leads` (§11.6, OQ-4) and the shared `additional_data` redaction filter (§15.2); lawful-basis/consent for storing scraped contact data and target-site ToS are open decisions (OQ-18).
- **Phase.** Integration plumbing + the enrichment-suggested-edit pipeline are **V2** (prospecting/monitoring V2; deeper enrichment V3+). See coverage matrix pillar 14.

---

## 10. Cloud, DevOps & Observability

> **Owner:** Cloud/DevOps Specialist. Platform **locked to Vercel + Supabase** — no AWS/Azure re-platform. Every schema change is validated on a Supabase database branch, then promoted to prod only by merging an approved branch (never applied to prod directly/autonomously).

### 10.1 Current-state assessment

Hosting: Vercel, single region `syd1`, `framework nextjs` `[VERIFIED vercel.json]`. Build: `next build` with **`typescript.ignoreBuildErrors: true`** `[VERIFIED next.config.js:13-15]`. CI Gate: `npm ci → type-check → lint → test:all → build`, all blocking `[VERIFIED ci.yml]`. **`security:routes-check` and `check:schema-drift` exist as npm scripts but are NOT in `ci.yml`** `[VERIFIED]`. AI review board + Deepsec weekly + daily admin-JWT rotation are wired `[VERIFIED]`. Sentry wired via `withSentryConfig` with `tracesSampleRate: 1.0` hardcoded `[VERIFIED]`. DB-safety is Supabase database branching (no standing mirror sandbox; migrations validated on a per-branch DB, promoted to prod only via a merged approved branch) `[VERIFIED apps/empire/CLAUDE.md]`. Backups: daily physical, 7-day retention, **PITR disabled** (RPO ~24h) `[VERIFIED]`. 11 Vercel crons, all `CRON_SECRET`-gated via `withSyncLifecycle` `[VERIFIED]`. No region failover `[VERIFIED]`.

**Headline gaps for the CRM build:** (1) CI does not enforce the security route-inventory or schema-drift checks that already exist; (2) `ignoreBuildErrors:true` lets type-unsafe code (wrong column / missing field — exactly the CRM failure mode) reach prod; (3) branch validation → merge-to-promote is manual and must be audited (record the branch validation + approval per migration); (4) PITR off → the CRM's first 24h of writes are unrecoverable to a point in time; (5) Sentry traces at 100% — a cost/quota cliff as CRM traffic grows.

### 10.2 Environment & secret management

Source of truth: 1Password vault `Unite-Group-Infrastructure` → projected into Vercel env + GitHub Actions secrets; rotation flows one direction. Tiers: local dev / Preview point at the migration's **Supabase database branch** (ephemeral per-branch DB, never prod); Production = prod ref. **Acceptance:** `.env*` stay gitignored + a CI secret-leak grep; every env var documented in `environment-inventory.md`; **Preview deploys point at the per-branch database, never the prod Supabase ref** (launch-blocking control so no PR writes prod CRM data); new Composio OAuth secrets added to 1Password first, then `vercel env add`, never committed. `[VERIFIED gitignore; INFERENCE for branch-DB wiring]`

### 10.3 CI/CD pipeline (target)

**Hardening backlog (each an acceptance criterion):** (0) **(pre-M1.1, BLOCKER B1) regenerate `types/supabase.ts` from prod (`npm run gen:types`) and commit it as the §17 evidence baseline before treating any "prod-applied" claim as `[VERIFIED]`** — `check:schema-drift` then guards drift on every PR; (1) wire `security:routes-check` + `check:schema-drift` into `ci.yml` (V1, high leverage); (2) remove `ignoreBuildErrors` so type errors fail `next build` (V1); (3) a **migration-check job** that replays migrations on an ephemeral Supabase database branch (or a throwaway local Postgres via `psql --single-transaction --set ON_ERROR_STOP=on`) + runs the security advisor (V1 — directly protects the contacts/opportunities promotion); (4) a coverage gate on `src/lib/crm/**` + `src/app/api/crm/**` (V1 floor); (5) Sentry release + sourcemap upload on prod deploy (V1); (6) branch protection on `main` (V1). **Promotion strategy:** code via merge-to-`main`; **DB schema only by merging an approved Supabase database branch with Phill's typed approval** (validated on the per-branch DB first) — CI never writes prod schema, and no agent applies to prod autonomously; **every promoted migration ships with a paired down-migration `.sql`** (rollback runbook, P23). `[VERIFIED scripts exist; INFERENCE for the target jobs]`

### 10.5 Observability

Errors/traces via `withSentryConfig` + `instrumentation.ts`. **V1 fixes:** move `tracesSampleRate` to env (`SENTRY_TRACES_SAMPLE_RATE`, default 0.1 prod / 1.0 dev); add a `beforeSend` PII scrubber so CRM error events never carry raw contact email/phone; structured breadcrumbs on approval-lifecycle decisions and Composio sync runs; cron-stall alert when a 5-min cron's `last_success` exceeds 30 min. Uptime heartbeat (Cronitor/Better Uptime) is V2. `[VERIFIED Sentry wiring]`

### 10.6 Backups & DR

**Acceptance:** **PITR enabled on prod before the CRM holds real contact/opportunity data** (`pitr_enabled:true` on `lksfwktwtmyznckodsau`) — until then the 24h RPO is the headline launch risk, surfaced to Phill; weekly `backup-healthcheck.sh` in CI; one quarterly restore-to-a-database-branch drill moving the runbook off DRAFT v0.2. Retention 7 vs 30 days is a Board decision. `[VERIFIED current posture]`

### 10.7 Cron & edge posture

New CRM crons (digest advisory AI, email/cal sync) MUST use the `withSyncLifecycle` wrapper (inheriting auth, cadence guard, partial-failure handling) and respect the source-of-truth matrix — the email/cal sync mirrors into Supabase but the AI layer never auto-writes CRM records. Route CRM cron DB access through Supavisor to avoid pool exhaustion as crons multiply. `[VERIFIED wrapper]`

### 10.8 Launch-readiness checklist (§10)

`security:routes-check` + `check:schema-drift` required in CI; `ignoreBuildErrors` removed; CI migration-check on an ephemeral database branch + advisor; preview deploys pinned to the per-branch database (never prod); Sentry releases + sourcemaps + env-driven sample rate; CRM coverage threshold enforced; branch protection on `main`; **PITR enabled before contacts/opportunities go live**; weekly backup health-check + one restore drill; all CRM crons on `withSyncLifecycle` + Supavisor with <30 min stall alerts; secret-leak grep gate on the PR diff.

---

## 11. Security, Privacy & Compliance

> **Owner:** Security/Compliance Specialist. Single-tenant, service-role-centric. RLS is a defense-in-depth backstop; primary access control is the `requireAdmin` route gate.

### 11.1 Security model at a glance

Access-control layers (all VERIFIED in code): (1) **Route gate** `requireAdmin` — service-role bearer (constant-time `timingSafeEqual`) OR admin-email session, fail-closed 401/403; (2) **Scoped sub-gate** `requireCrmLeadIntegrationAccess` for DR-NRPG (flow-specific token + header + env flag + a guard refusing to run if the integration token equals the service-role key); (3) **DB RLS backstop** — `service_role FOR ALL` on all CRM tables; (4) **CI regression gate** `security:routes-check` — fails the build if any mutating handler ships without an auth wrapper / constant-time compare / webhook-signature verify / rate-limit. `[VERIFIED]`

### 11.2 RLS posture

CRM truth tables (`crm_leads`/`crm_contacts`/`crm_opportunities`) are correctly locked to service-role-only. **Two RLS gaps to close in V1:** **G-RLS-1 (HARD V1 GATE — was "medium", elevated per P8)** — `agent_actions` grants `FOR SELECT TO authenticated USING (true)` (`…nexus_agent_actions.sql:37`) on **all** rows `[VERIFIED]`; **tighten to founder-email-only (mirror `data_room_documents`) in the SAME M1.1 hardening migration as the contacts/opportunities promotion — landing BEFORE ops-team authenticated principals are provisioned and BEFORE the M1.8-FB email/cal metadata lands in the table**, kept in lockstep with the `require-admin` allow-list. **M1.1 exit assertion:** an authenticated-non-founder key returns **0 rows** from `agent_actions`. **G-RLS-2 (low)** — RLS is unverified against a live DB (draft-only migration); require a Supabase database-branch validation + `pg_policies` assertion before promotion. **AC:** anon and authenticated-non-founder reads return 0 rows from CRM truth tables AND `agent_actions`; every CRM table has `rowsecurity = true` + ≥1 policy. `[VERIFIED posture; gaps VERIFIED]`

### 11.3 `additional_data` secret-redaction filters

Enforcement is **inconsistent across the three write routes:** opportunities has a good recursive `containsUnsafeAdditionalData` refinement (`opportunities/route.ts:62-90`; the authoritative rejected-pattern list is `sensitiveAdditionalDataKeyPattern` at `:62` — `secret/token/stripe/card/bank/email/phone/cross-client/…` `[VERIFIED — see the regex for the exact list]`); contacts hardcodes `additional_data: {}` (`:263`); **the public, unauthenticated `marketing/leads` intake — the most exposed surface — has NO equivalent filter, storing `additional_data` verbatim at `:126` (G-AD-1, high).** **V1 fix:** extract a shared **`src/lib/security/safe-additional-data.ts` (new module — does not exist yet)** and apply it on all three CRM write paths; centralize the timeline-label redaction patterns too. **AC:** a single shared validator imported by contacts/opportunities/marketing-leads; a unit test asserts each sensitive pattern (token/stripe/card/email/cross-client) is rejected on every write route; over-cap payloads → 400. `[VERIFIED]`

### 11.4–11.6 Privacy scopes, consent, retention

**Privacy scopes** — recorded but not enforced in V1 (single-tenant; every read is founder/service-role); the column is forward-looking for V3+. The only concrete cross-scope control today is the multi-link board-approval guard (>1 link without `boardApprovalId` → 403). **Consent (G-CONSENT-1 — V1 AC with teeth, P9)** — `consent_source`/`consent_captured_at` columns exist (`…103000.sql:21-22`) but the route writes only `marketing_consent` (`:257`); V1 wires provenance server-side whenever consent flips true and **rejects (422)** a consent=true write with no provenance; `do_not_contact` status hard-blocks sends server-side. **Retention (G-RET-1 — No-Go condition 6, P10)** — `crm_leads` IP/user-agent minimization is **live PII debt**: raw values stored at `marketing/leads:124-125`. V1 **enforces** insert-time hash/truncate (or drops the columns) AND applies the shared `safe-additional-data` filter + size cap to the public route, with a stated 30–90 day retention window — OR §11.6 records that V1 only *records* the decision with the automated sweeper in V2, **with Phill's recorded §16 sign-off**. The `retention_policy` column written by no route today is decorative until the V2 sweeper. `[VERIFIED columns; gaps VERIFIED]`

### 11.7 Audit-trail completeness

`agent_actions` is the unified audit log; every CRM route appends a sanitized event; failed audit writes are caught and `console.error`'d (never thrown — append-only by convention). **G-AUDIT-1 (V1 gated control, P25):** no DB trigger blocks `UPDATE`/`DELETE` on `agent_actions` — add a `BEFORE UPDATE OR DELETE` trigger (pattern: `enforce_profiles_role_immutability`, `20260513000001_ra3008_security_hardening.sql:28`) in the M1.1 hardening migration, so a leaked service-role key cannot rewrite/delete audit history to cover tracks. **Acceptance: inserts still succeed while updates/deletes are rejected at the DB layer** (the trigger must coexist with the existing `service_role ALL` policy without breaking legitimate inserts). **G-AUDIT-2 (low):** route audit-write failures to Sentry, not just console, so a dropped audit row is observable. **AC:** every CRM create/update/convert/approval produces exactly one `agent_actions` row; mutation of historical rows rejected at the DB layer; audit failures surface in Sentry; no payload contains a raw secret/PII. `[VERIFIED]`

### 11.8 Approvals & source-of-truth enforcement

The approval lifecycle is a pure side-effect-free classifier; `safeToAutoExecute: false` is pinned at the type level — the recommendation-only contract is unbypassable at the type level. High-risk `client_merge`/`data_export` always set `requiresPhillReview`. **Correction to locked context:** the lead-conversion route is **NOT missing** — it exists, is `requireAdmin`-gated, board-approval-gated, and dry-run capable; V1 work here is wiring the execution handler + persisting approval state, not building the route. Opportunities are explicitly forecast-only, not billing truth; CRM stores links/status only. `[VERIFIED]`

### 11.9 Auth, sessions & MFA

Supabase Auth session + a hardcoded 2-email allow-list (`require-admin.ts:24-27`) reachable via Supabase session — appropriate for single-tenant V1, but a single phished/reused password on either founder email grants full CRM read + (per B2) full write via the session branch `[VERIFIED]`. Service-role bearer with constant-time compare; daily admin-JWT rotation. **G-AUTH-1 (HARD V1 LAUNCH GATE — was "medium", elevated per P17):** **enforced TOTP MFA on every `ALLOWED_ADMINS` account is a release gate — contacts/opportunities cannot be promoted to prod with real PII until MFA is verified on Supabase Auth + the founder Google account, with evidence captured in §15.** Founder-account MFA was previously `[UNCONFIRMED — docs/security/audit-2026-05-31.md:119-124]`; V1 confirms + evidences + enforces it (highest-leverage control for a service-role-centric model). A 2-account allow-list with optional MFA is not an acceptable production posture once real contact PII is stored. **G-AUTH-2 (medium):** add CSRF protection (or `SameSite=Strict` + origin check) on cookie-authenticated CRM POST/PATCH/DELETE.

### 11.10 Secret management & branch-first DB

Secrets in 1Password vault `Unite-Group-Infrastructure`, read at runtime; `.env*` gitignored; the credentials rule is absolute (never store secret values in CRM/docs). **G-SEC-1 (high):** the gitleaks pre-commit hook is **inactive** (`core.hooksPath` mismatch + binary not installed) `[VERIFIED docs/security/audit-2026-05-31.md:28-39]` — activate it AND add a gitleaks CI step so detection is not machine-dependent. Branch-first DB is a hard contract; the contacts/opportunities migration must not be promoted to prod until RLS is asserted on a Supabase database branch and the branch is merged with approval.

### 11.11 Deepsec scanning & observability

**G-DEEPSEC-1 (high):** the Deepsec scan reportedly **failed two consecutive weeks silently** `[VERIFIED audit:41-46]`, and the workflow only opens an issue — fix the invocation, make it fail loudly, and add it as a required status check. **G-OBS-1 (medium):** `sentry.server.config.ts` has no `beforeSend` PII scrubber and `tracesSampleRate: 1.0` — add the scrubber + lower the prod sample rate. **G-CI-1 (low):** branch protection on `main` reportedly allows admin force-push with 0 required reviewers — tighten to ≥1 review + enforce-for-admins.

### 11.13 Security launch-readiness checklist (§11)

All CRM truth tables service-role-only with anon/authenticated reads = 0 rows (asserted on a Supabase database branch); **`agent_actions` read tightened to founder-only in the M1.1 hardening migration (0-rows exit assertion) — No-Go condition 7**; shared `safe-additional-data` (new module) on all three write routes with per-route rejection assertion + size cap on the public route; consent provenance written (422 on missing); **IP/user-agent retention decided + enforced before promotion — No-Go condition 6**; `agent_actions` append-only trigger (inserts succeed, updates/deletes rejected) + audit failures to Sentry; **enforced MFA verified on every allow-listed account — No-Go condition 8** + CSRF on cookie-auth mutations; **no AI/agent credential satisfies `requireAdmin` on a mutating route + Margot read-only credential + `x-actor-id` (§3.1)**; **CRM-page admin gate hoisted into a server layout (not inherited)**; gitleaks pre-commit active + in CI; Deepsec green + required check; Sentry `beforeSend` + prod sampling; `security:routes-check` = 0 unprotected mutating routes.

---

## 12. Testing & QA Strategy

> **Owner:** QA/Test Specialist. The repo has a mature security-led test culture: **within the `tests/` directory** — 82 `*.test.ts(x)`, 5 `*.spec.ts`, 919 `it/test` blocks `[VERIFIED counts, `tests/` scope]` (repo-wide is higher; `src/`-co-located tests are excluded from this figure) — biased toward pure-logic unit + mocked-Supabase route integration tests. **No browser/e2e layer and no coverage gate yet.**

### 12.1 Current state

Runner: `ts-jest`, node env. **Two scripts, load-bearing distinction:** `npm test` runs **only** the 3 pipeline smoke tests (`tests/pipelines/*`); `npm run test:all` runs the **entire** suite (including the 5 `.spec.ts`). CI Gate uses `test:all` `[VERIFIED]`. No coverage threshold; no Playwright/e2e harness; only a `pre-push` husky hook (type-check), no `pre-commit` `[VERIFIED]`. Well-tested V1-relevant areas: approval engine (30+ cases), contacts/opportunities routes (~30 each, mocked Supabase), lead conversion (9 cases — route EXISTS), daily digest (50+), qualify-lead, activity-timeline, the unapplied-migration string-assert, sandbox credential boundary. `[VERIFIED]`

**Critical gaps for V1:** (1) no coverage threshold; (2) **no DB-backed integration tier** — every route test mocks Supabase, so RLS, CHECK constraints, dedupe **unique indexes**, and FK behaviour are never exercised against real Postgres; (3) no e2e for the pipeline/forecast READ dashboard; (4) email/calendar sync is the untested net-new long-pole.

### 12.2 Test pyramid for V1

- **Tier 1 — pure-logic unit (exists, largest):** every advisory/decision engine is a deterministic no-I/O function with injected `now`/`generatedAt`. The **AI safety contract is a test contract** — `safeToAutoExecute===false` across all subject-type × status combinations; advisory outputs carry no write side-effect.
- **Tier 2 — route integration (exists, mocked Supabase):** auth gate, approval gate, error model, no-leak logging.
- **Tier 3 — DB-backed integration (NEW, on an ephemeral Supabase database branch only — never prod):** RLS enforced; dedupe UNIQUE index actually blocks a duplicate (the only true proof); CHECK constraints + FK on-delete fire; Composio idempotent upsert + token refresh. Promotes the migration string-assert into a real database-branch migration-replay smoke test.
- **Tier 4 — e2e smoke (Playwright, NEW):** dashboard render, forecast rollup display, approval-queue visibility, AI advice labelled "recommendation".

### 12.3 Coverage gates in CI (NEW — V1 exit criterion)

`jest.config.js` adds `collectCoverage` + `coverageThreshold`: global **≥80/75/80/80**, with safety-critical ratchets — `approval-lifecycle.ts` ≥95/90/100/95, `qualify-lead.ts` & `daily-digest.ts` ≥90/85/90/90. CI replaces `test:all` with `test:all --coverage --ci`. A separate non-blocking `db-integration` job runs Tier-3 against an ephemeral database branch (never prod), promoted to blocking at v1.5. Add a `pre-commit` hook (`lint-staged` + `jest --findRelatedTests` for touched `src/lib/crm/**`). **Coverage ratchet rule:** thresholds only go up.

### 12.5 Target test matrix (V1 features → test types)

Legend: U=unit, I=mocked-route, D=DB-backed (Supabase database branch), E=Playwright, C=contract. Highlights: **dedupe (3)** — Tier-D mandatory (only a real unique index proves a second insert is rejected); **approval (5)** — the new execution handler MUST refuse to act unless the engine returns `may_execute` and MUST be the only path flipping an approval to `executed`; **email/cal (9)** — **contract-first**: token refresh on 401, inbound idempotency (re-poll = 0 new timeline rows), outbound event push, per-entity `failed[]` isolation, Supabase=truth/Composio mirrors — written **before** implementation; the read-only fallback ships behind a flag with its own reduced contract suite.

### 12.7–12.8 Quality gates & acceptance (§12)

A V1 merge is blocked by: `tsc --noEmit` clean; `eslint .` clean; `test:all --coverage` green + thresholds met (NEW); `next build` succeeds; new CRM route ⇒ matching integration test present (NEW lint); any schema change ⇒ Tier-3 database-branch migration-replay test green + reached prod only by merging an approved branch; e2e dashboard smoke green (NEW). The strategy is "done" when the coverage gate is live, a Tier-3 database-branch suite proves RLS + dedupe unique index + constraints + FK, every V1 feature row has its ✓✓ tiers green, email/cal has a contract suite before its implementation merges, and a single AI-safety suite asserts `safeToAutoExecute===false` + "no write side-effect" across every AI capability.

---

## 13. Phased delivery plan

> The detailed milestone tables, Gantt, dependency graph, and per-milestone exit criteria are in **[`docs/spec/phase-plan.md`](docs/spec/phase-plan.md)**. This section is the executive view.

### 13.0 Estimation basis

- Effort in **engineer-days (ed)**: one senior full-stack engineer, including implementation + tests + database-branch validation + PR review.
- **Blended day-rate assumption: AUD $1,200 / engineer-day** `[INFERENCE — surfaced as Open Question OQ-1; confirm before treating costs as firm]`. Indicative cost = ed × rate; all costs scale linearly with the confirmed rate.
- Existing pure-logic engines are reused, not rebuilt. `[VERIFIED they exist]`

> **Arithmetic reconciled (P4 / BLOCKER B4).** The V1 headline now equals the sum of its own milestones. M1.1…M1.8 sum to **44 ed** (4+5+3+5+4+5+4+14); the fallback variant (M1.8→M1.8-FB, 14→4) sums to **34 ed**. The previous "~40/~30" understated the most load-bearing number in the spec before the rate was even applied — corrected below. No parallelization discount is assumed; if one is later adopted it will be a named line item (e.g. "−4 ed if M1.3 and M1.6 run concurrently with M1.4").

| Phase | Core effort (ed) | Indicative cost (AUD) |
|---|--:|--:|
| **V1** (full email/cal sync) | **44** | **$52,800** |
| **V1** (with read-only fallback instead of full sync) | **34** | **$40,800** |
| **V2** | 49 | $58,800 |
| **V3+** | 42 | $50,400 |
| **Program total (V1 core + V2 + V3+)** | **135** | **$162,000** |

### 13.1 V1 — Core CRM spine + advisory AI + email/cal (LOCKED)

| Milestone | Exit criteria (abridged) | Effort | Cost (AUD) |
|---|---|--:|--:|
| **M1.0 Prod-state baseline (pre-M1.1, BLOCKER B1)** | regenerate `types/supabase.ts` from prod ref `lksfwktwtmyznckodsau`; commit as §17 evidence baseline; verify `crm_leads`/`nexus_clients`/`businesses` exist in prod | folded into M1.1 | — |
| M1.1 Schema live + hardening migration | contacts + opportunities validated on a Supabase database branch then promoted via a merged + approved branch (typed approval; FK-targets verified first); RLS verified; **hardening migration** = dedupe UNIQUE index + phone/name_company keys + `updated_at` trigger + **`agent_actions` append-only trigger** + **`agent_actions` SELECT founder-only (0-rows exit assertion)** + **`value_currency` NOT NULL DEFAULT 'AUD' + CHECK** + **R6 `nexus_clients` ref column + `payload->>slug` GIN index** + **`crm_idempotency` table** + **CRM-page admin-gate hoist into a server layout** | 4 | $4,800 |
| M1.2 Conversion (RPC-backed) | `crm_convert_lead_to_contact()` **SECURITY DEFINER RPC** (single transaction) materializes a deduped contact + optional opportunity + lead-status + one timeline event; 409 guards; request/response schema per §7.5; no partial commit | 5 | $6,000 |
| M1.3 Dedupe | duplicate by email/phone/name+company → 409; all four keys populated (name+company from stable full-name, advisory-only) + indexed; PATCH recomputes phone/name+company keys | 3 | $3,600 |
| M1.4 Approval execution (engine = single authority) | `POST /api/crm/approvals` + `/execute` wired onto the engine; opportunities `approval_status` vocabulary aligned to the engine (or documented projection); `approvedBy` captured; executes only on `may_execute`; idempotent; audit row | 5 | $6,000 |
| M1.5 Activity timeline | unified feed across leads/contacts/opps/approvals; sanitized labels; entity-filtered rails (filter on indexed `payload->>slug`) | 4 | $4,800 |
| M1.6 Pipeline + forecast READ | gated dashboard (admin-gate hoist confirmed) + `GET /api/crm/opportunities` reading `crm_opportunities`; **single-currency AUD** Σ(value × probability) by stage; cockpit-token chart chrome; <2s | 5 | $6,000 |
| M1.7 Advisory AI in digest | score + band + heuristic NBA per lead; AI writes nothing; safety note intact; required display language rendered | 4 | $4,800 |
| **M1.8 Email/cal 2-way (LONG-POLE / CRITICAL PATH)** | one provider 2-way; encrypted tokens (never in `additional_data`); signature-verified per-event-idempotent inbound; sync <5 min; failures non-fatal; outbound approval-gated/off by default | 14 | $16,800 |
| **M1.8-GATE Binary day-8 checkpoint (P13)** | by day 8: OAuth connect completes for one provider in sandbox AND inbound poll writes ≥1 real `agent_actions` timeline ref end-to-end; if either fails, M1.8→V1.5 and M1.8-FB ships. Owner-signed, named milestone | 0 (gate) | — |
| M1.8-FB Fallback (fast-follow) | read-only inbound digest sync <24h, labelled read-only, ships independently | 4 | $4,800 |

**V1 effort (core, full sync): 44 ed ≈ $52,800** (sum of M1.1…M1.8). With fallback instead of full sync (M1.8→M1.8-FB): **34 ed ≈ $40,800.**

**Long-pole containment (mandatory) — binary day-8 gate (P13).** M1.8 is time-boxed to 14 ed, but "demonstrably converging" is replaced by an **objective, owner-signed binary gate**: *By day 8, OAuth connect completes for one provider in sandbox AND inbound poll writes ≥1 real `agent_actions` timeline ref end-to-end. If either is not demonstrated, M1.8 is cut to V1.5 and M1.8-FB ships.* This is a named milestone (a checkpoint owner signs), not a judgement call — see phase-plan.md M1.8-GATE.

**Historical-lead backfill decision (V1, P22).** Conversion materializes contacts on **NEW** conversions only; leads already in `crm_leads` at promotion time are **net-new only — not back-converted in V1** (rationale: back-conversion would re-run dedupe/identity checks across an unbounded historical set with no operator in the loop, which is exactly the kind of bulk identity write the recommendation-only contract forbids without approval). A historical-lead backfill is an explicit V2 item, approval-batched. (Confirm with Phill — OQ-17.)

**Migration rollback runbook (V1, P23).** §15.2 requires "rollback plan documented per promoted migration," and Supabase database branching has no built-in down-migration path. The V1 rollback mechanism is: **(a) a paired down-migration `.sql` authored alongside every promoted up-migration** (idempotent `drop … if exists` in reverse dependency order, validated on a database branch then promoted via a merged approved branch like any other migration), **plus (b) the PITR restore-from-point-in-time procedure** (once PITR is enabled, R15) as the data-loss fallback. The owning artifact is a new `docs/runbooks/migration-rollback.md` template, referenced from the DR runbook.

**V1 exit criteria (gate to V2):** prod-state baseline regenerated (M1.0); contacts + opportunities live in prod; lead→contact→opp conversion working via the RPC; approval execution end-to-end with audit (engine = single authority); pipeline/forecast dashboard live (gated, single-currency); advisory AI in digest with zero auto-writes; email/cal sync OR fallback shipping (day-8 gate honored); `test:all` + `type-check` + `security:routes-check` green; ≥80% coverage on `src/lib/crm/*`.

### 13.2 V2 — CRM depth (~49 ed ≈ $58,800)

Accounts/orgs normalization (6); full email/cal 2-way + templates/tracking (10); communications & sequences (8); documents/data room attachments (6); reporting & analytics + PDF export (7); workflow automation + SLA timers (8); Stripe ARR/billing view, read-only (4). Also: Vercel AI Gateway standup with the legacy scaffold quarantined; LLM NBA/draft-email/summarization/forecast narrative (advisory, no auto-send); CRM-corpus semantic search; `crm_approvals` table if proven; `client_merge` executor; Playwright e2e; quarterly DR restore-to-a-database-branch drill. **Exit:** accounts live; full 2-way; sequences + automation; reporting w/ export; Stripe billing view; e2e smoke added.

### 13.3 V3+ — Governance, scale, intelligence (~42 ed ≈ $50,400)

Granular RBAC (`privacy_scope` becomes an active RLS predicate) (8); AI depth — draft emails, forecast insight, enrichment, summarization, semantic search, all recommendation-only (10); e-sign + proposals (6); public API + webhooks (8); privacy/consent/retention automation + DSAR (6); backups/DR runbook off DRAFT + PITR validation + restore drill (4).

---

## 14. Risk register

| ID | Risk | Severity | Likelihood | Mitigation | Owner |
|---|---|---|---|---|---|
| R1 | **Email/cal 2-way sync (M1.8) overruns and silently stretches V1** | High | High | 14-ed time-box; day-8 convergence checkpoint; mandatory read-only fallback M1.8-FB ships V1 on time; explicit long-pole flag in the plan | PM |
| R2 | The branch-validation/merge gate is bypassed and a migration hits prod directly | High | Medium | Branch-first DB hard contract; validate on a Supabase database branch + promote only by merging an approved branch (Phill's typed approval); PR review; NEVER `psql`/`db push`/MCP `apply_migration` on prod; No-Go gate | PM/Eng |
| R3 | AI auto-writes CRM data, breaking the recommendation-only contract | High | Low | `safeToAutoExecute:false` structurally enforced; every gated write passes the execution handler; unit test asserts no AI path reaches a write; No-Go gate | Eng |
| R4 | OAuth/email-cal token-at-rest mishandled (secret leakage) | High | Medium | Encrypt tokens at rest in a service-role-only table or 1Password reference; never in `additional_data`; secret-scan in CI | Eng |
| R5 | Dedupe gaps (only email enforced today) create duplicate contacts/opportunities | Medium | Medium | Implement + test all three keys; partial UNIQUE index backstop; 409 on conflict; backfill keys before go-live | Eng |
| R6 | `agent_actions.client_id` FK targets legacy `public.clients`, not `nexus_clients` (`…nexus_agent_actions.sql:13`) — timeline mislinks; the unified timeline is the V1 backbone | Medium | Medium | **V1 hardening-migration line item (M1.1):** add a corrected `nexus_clients`-referencing column (or repoint), with an acceptance that timeline events resolve to `nexus_clients`; add a `payload->>slug` GIN index for per-entity reads; feature-matrix Pillar 4 row | Eng |
| R7 | `tasks` + `voice_command_sessions` have no original repo migration (provenance gap) | Medium | High | Use the reconstructed proposal; validate on a Supabase database branch before any schema-affecting work | Eng |
| R8 | No e2e/Playwright harness — regressions slip past unit/integration tests | Medium | Medium | Gate `test:all` in CI now; add Playwright smoke (login + pipeline read + approval flow) at V2 exit | Eng |
| R9 | Single-tenant assumptions leak into schema, making V3+ multi-tenant costly | Low | Medium | Keep `privacy_scope` column; document tenant-boundary decisions | PM |
| R10 | Forecast dashboard reads the wrong source (today's `/api/empire/pipeline` reads `agent_actions`, not opportunities) | Medium | High | New forecast endpoint MUST read `crm_opportunities`; explicit source-of-truth label via `SourceBadge` | Eng |
| R11 | Blended-rate assumption ($1,200/ed) wrong → budget misread | Low | Medium | Tagged `[INFERENCE]`, surfaced as OQ-1; all costs scale linearly | PM |
| R12 | MFA not enforced on operator login despite TOTP infra existing; founder-account MFA unverified | Medium | Medium | Make MFA-on-login a V1 launch-readiness checkbox; confirm + evidence provider-account MFA | Eng |
| R13 | Public lead intake stores raw ip/UA (`:124-125`) and `additional_data` verbatim with no filter (`:126`, G-AD-1) — most exposed surface, weakest discipline; **No-Go condition 6** | High | Medium | Extract a shared `safe-additional-data.ts` (**new module**) and apply on all three write routes; per-pattern rejection test + size cap; hash/truncate ip/UA at insert | Eng |
| R14 | Deepsec scan failed silently 2 weeks + gitleaks pre-commit inactive — security regressions land while the dashboard reads green | High | Medium | Fix + make Deepsec a required check; activate gitleaks hook + add a gitleaks CI step | Eng |
| R15 | PITR disabled (RPO ~24h, destructive restore) — the CRM's first day of writes is unrecoverable to a point in time | High | Medium | Enable Supabase PITR (Pro addon) before contacts/opportunities go live; validate every migration on a database branch before promoting it via a merged approved branch | DevOps |
| R16 | `ignoreBuildErrors:true` ships type-unsafe code (wrong column/missing field) to prod | High | Medium | Set `ignoreBuildErrors:false`; pair with `check:schema-drift` in CI so committed types must match live schema | DevOps |

---

## 15. Acceptance criteria & launch-readiness checklist

### 15.1 V1 acceptance criteria (functional)

- [ ] `crm_contacts` + `crm_opportunities` live in prod, validated on a Supabase database branch and promoted by merging an approved branch with Phill's typed approval.
- [ ] **(Pre-M1.1) `types/supabase.ts` regenerated from prod and committed as the §17 baseline; M1.1 verified `crm_leads`/`nexus_clients`/`businesses` exist in prod before the promote transaction.**
- [ ] Lead→contact→opportunity conversion runs through the **`crm_convert_lead_to_contact()` RPC** (single transaction, no partial commit) producing a deduped contact, optional opportunity, and one audit event; identity-conflict and already-converted guards return 409.
- [ ] Dedupe enforced on email, phone, and name+company (name+company from a stable full-name, advisory-only); duplicate returns 409 with a test per key; a partial UNIQUE index on `dedupe_email_key` exists in prod; PATCH recomputes phone/name+company keys.
- [ ] Approval workflow end-to-end with the **engine as single authority** (opportunities `approval_status` vocabulary aligned or projection documented; `approvedBy` captured): a gated write is blocked until `approved`, executes only on `may_execute`, never on `rejected`/`expired`, is idempotent, and writes an audit row. `safeToAutoExecute` is always `false`.
- [ ] Unified activity timeline renders leads + contacts + opportunities + approvals with PII/secret-redacted labels; timeline events resolve to `nexus_clients` (R6 corrected).
- [ ] Pipeline + forecast dashboard reads `crm_opportunities`, shows **single-currency AUD** weighted forecast (Σ value × probability) by stage, refreshes < 2s.
- [ ] Advisory AI in daily digest: each lead shows score + band + next-best-action; AI writes nothing; the "No production DB writes…" safety note is intact; the required display language renders.
- [ ] Email/calendar 2-way sync live for ≥1 provider, OR the M1.8-FB read-only fallback live and clearly labelled.

### 15.2 V1 launch-readiness checklist (non-functional / governance)

- [ ] `npm run test:all` green (CI must run `test:all`, not the 3-test `npm test`).
- [ ] `npm run type-check` green; `next build` runs with `ignoreBuildErrors:false`.
- [ ] `npm run security:routes-check` reports 0 unprotected mutating routes; both it and `check:schema-drift` are required CI steps.
- [ ] ≥80% coverage on `src/lib/crm/*` and all `src/app/api/crm/*` routes; safety-critical ratchets met.
- [ ] All mutating CRM routes pass `requireAdmin`; shared `safe-additional-data` applied on all three write routes (contacts/opportunities/marketing-leads), each with a per-route rejection assertion; single canonical `ALLOWED_ADMINS` export (grep/lint guard).
- [ ] **No AI/agent credential can satisfy `requireAdmin` on any mutating CRM route (§3.1); Margot reads via a distinct read-only credential; `x-actor-id` attribution recorded in `agent_actions`.**
- [ ] `{errorClass, retryable}` envelope on all CRM 5xx; `If-Match`/`updated_at` optimistic-lock precondition on PATCH; `crm_idempotency` table backing `Idempotency-Key` (or descope recorded).
- [ ] **MFA enforced on every `ALLOWED_ADMINS` account (Supabase Auth + founder Google) — release gate, evidenced in §15 before promoting contacts/opportunities with real PII.**
- [ ] Paired down-migration `.sql` authored per promoted migration; `docs/runbooks/migration-rollback.md` template in place (P23).
- [ ] Source-of-truth labels visible in UI (Supabase=CRM, Stripe=billing, Linear=execution).
- [ ] OAuth tokens (if M1.8) encrypted at rest; never in `additional_data`; gitleaks pre-commit active + gitleaks in CI; secret-leak grep on the PR diff passes.
- [ ] Sentry capturing CRM route errors with a `beforeSend` PII scrubber; env-driven trace sampling; no PII in breadcrumbs.
- [ ] `agent_actions` append-only trigger live; audit-write failures surface in Sentry; `agent_actions` SELECT tightened to founder-only.
- [ ] **PITR enabled on prod** before contacts/opportunities hold real data; `crm_leads` IP/user-agent retention decided + implemented.
- [ ] Preview deploys pinned to the per-branch database (never the prod Supabase ref); branch protection on `main` (≥1 review, enforce-for-admins); Deepsec green + required check.
- [ ] Branch-first DB compliance: no CRM migration reached prod outside a merged, approved Supabase database branch; every promoted migration has a recorded branch validation + approval; rollback plan documented per promoted migration.
- [ ] Phill sign-off recorded (Section 16 board verdict).

### 15.3 Go / No-Go rule (reconciled with the High-risk register — P15, OQ-12 resolved)

The previous 4-condition rule sat next to four "High" risks the same spec calls launch risks while OQ-12 left their gating status undecided. **OQ-12 is now resolved:** the **data-safety items that protect real customer PII at go-live are promoted into the No-Go list** — they are not punch-list polish.

**No-Go if ANY of (data-integrity / safety contract):**
1. Any AI auto-write path exists, or any AI/agent credential can satisfy `requireAdmin` on a mutating route (§3.1).
2. A CRM migration reached prod outside a merged, approved Supabase database branch (no branch validation / no typed approval), or was applied to prod directly/autonomously.
3. `security:routes-check` finds an unprotected mutating route.
4. Neither M1.8 nor M1.8-FB is live.

**No-Go if ANY of (PII-at-go-live data-safety — newly promoted from the High register):**
5. **PITR is not enabled on prod** before contacts/opportunities hold real data (R15).
6. **The public `marketing/leads` intake has no `safe-additional-data` redaction filter / no ip-UA minimization** (R13).
7. **`agent_actions` SELECT is still world-readable to any authenticated principal** (G-RLS-1 / P8).
8. **Enforced TOTP MFA is not verified on every `ALLOWED_ADMINS` account** (G-AUTH-1 / R12 / P17).

**Accepted-risk fast-follows (recorded sign-off required, NOT No-Go):** gitleaks pre-commit activation + CI step (R14/G-SEC-1), Deepsec green + required check (R14/G-DEEPSEC-1), branch protection ≥1 review (G-CI-1), Sentry `beforeSend` PII scrubber + prod sampling (G-OBS-1), the `crm_leads` retention *sweeper* (the *decision* + insert-time hash is No-Go via item 6; the automated sweeper is V2). These ship close behind GA with **Phill's recorded sign-off in §16** — they are accepted-risk, not unresolved gates. Everything outside conditions 1–8 and this list is a punch-list item.

---

## 16. Senior PM Multi-Eyes Review — Board Verdict

> Also recorded standalone in [`docs/spec/senior-pm-board-verdict.md`](docs/spec/senior-pm-board-verdict.md) (identical content).

**Board verdict: REVISE (APPROVE-WITH-CONDITIONS, with four hard blocks before build).**
**Sign-off date: 2026-06-16. Chair: Chief Reviewer.**

Until the four BLOCK items below are resolved in the spec text and this section's sign-offs are countersigned, the spec remains **DRAFT — not approved for build.** None of the blocks are structural; every one is a reconcile-the-numbers or close-the-open-decision fix. The board is unanimous that the underlying design is sound and the evidence discipline is exceptional — this is a spec that earns trust and then leaves four load-bearing decisions un-made.

> **Revision status (this pass):** the four blockers (B1–B4) and every MAJOR have been applied to the spec text and the three companion artifacts. B1 → §4/§6.1/§6.2 + `data-model-erd.md` §1 (prod-state downgraded to `[UNCONFIRMED]`, mandatory M1.0 regen step). B2 → new §3.1 credential trust boundary. B3 → §7.8.1 approval reconciliation. B4 → §13.0/§13.1 arithmetic corrected to 44/34 ed. This section records the board's verdict and sign-offs as the authoritative gate.

---

### What the board reviewed

Five lenses reviewed `spec.md`, `docs/spec/feature-coverage-matrix.md`, `docs/spec/data-model-erd.md`, and `docs/spec/phase-plan.md` against the live repository. The chair independently re-verified every blocker and major finding against real files before adjudicating.

| Lens | Verdict | Headline finding |
|---|---|---|
| Senior PM / Completeness | Approve with changes | V1 milestones sum to **44 ed**, headline said ~40 — the single most-cited number was internally inconsistent |
| Data Architecture | Approve with changes | **BLOCKER**: "LIVE [VERIFIED]" prod claims are unconfirmed against the only machine-readable prod artifact |
| Security & Privacy | Approve with changes | **BLOCKER**: recommendation-only is enforced by route topology, not by credential — one shared god-key is the whole trust boundary |
| API & Source-of-Truth | Approve with changes | **BLOCKER**: two parallel, unreconciled approval mechanisms (engine vocabulary ≠ live route enum) |
| UX & Accessibility | Approve with changes | Nested CRM pages do **not** inherit the admin gate (layout is metadata-only) — an auth-bypass on PII read surfaces |
| Evidence Integrity | Approve with changes | ~95 cited paths spot-checked; all existing paths confirmed; only nits — independently corroborated all three blockers |

---

### The three blockers (all independently re-verified by the chair)

**B1 — Prod-state evidence integrity (Data Architecture).** The spec tagged `crm_leads`, `agent_actions`, `nexus_clients` and friends as "LIVE / prod-applied [VERIFIED]." The chair confirmed: `types/supabase.ts` — the only machine-readable prod-schema artifact in the repo — contains **no `public.Tables` definition** for `crm_leads`, `agent_actions`, or `nexus_clients` (only `client_agent_actions`, an unrelated table). The spec verified that migration *files* exist and conflated that with prod-*applied* state. This is load-bearing: M1.1's promote transaction references these tables as FK targets; if they are not actually in prod, the promotion fails. (Note: the data-arch review dated the artifact 2026-05-10; it is actually 2026-05-22 — the conclusion is unchanged.) **Fix: downgrade to [UNCONFIRMED], regenerate types from prod as the §17 baseline, and make M1.1 verify each FK target before promoting.**

**B2 — Recommendation-only is a convention, not a control (Security).** The chair confirmed `require-admin.ts:79-81`: the bearer branch compares `Authorization` against `SUPABASE_SERVICE_ROLE_KEY`, the one key that authorizes **every** mutating CRM route. The approval engine only governs the (not-yet-built) execute route. Margot is granted CRM read access; if Margot holds that bearer to read, it can write CRM truth directly, bypassing `approval-lifecycle.ts` entirely. Clause C1 ("no AI capability holds a service-role CRM write") is therefore an org convention presented as an enforced invariant. **Fix: give Margot a distinct read-only credential, declare bearer = full write authority, pull actor attribution into V1, and add the AC that no agent credential can satisfy `requireAdmin` on a mutating route.**

**B3 — Two unreconciled approval mechanisms (API).** The chair confirmed the engine speaks `{requested,approved,rejected,cancelled,executed,expired}` and requires `approvedBy`+`approvalReference` for `may_execute`, while the live opportunities route enum (`route.ts:28`) is `['not_required','requested','approved','rejected','expired']` — no `cancelled`, no `executed` — and gates on a free-text `boardApprovalId` that captures no `approvedBy`; the convert route never calls the engine at all. The spec said "wire the handler onto the engine" without specifying how `approval_status` reaches `executed` or how `boardApprovalId` maps to an engine id. **Fix: declare the engine the single authority, align the CHECK vocabulary, require `approvedBy` capture, and define the id mapping (sub-question of OQ-5).**

**Plus one major elevated to BLOCK by the chair: the arithmetic (B4).** V1 milestones sum to **44 ed** (full) and **34 ed** (fallback), but the headline said ~40/~30 and quoted AUD $48,000/$36,000 against an implied $52,800/$40,800 at the stated $1,200/ed. (The PM review computed the fallback as 33; it is 34 — same direction, slightly larger understatement.) This is the single most load-bearing number in the document and it disagreed with the sum of its own parts before the rate assumption was even applied. It blocks because OQ-1 already names the rate "the highest-leverage answer" — the spec must not understate the quantity it multiplies.

---

### The convergence — where all five lenses agree

The spec is **unusually trustworthy**. Three independent lenses (PM, Data, Evidence) each spot-checked dozens of line-anchored claims and found them accurate: the contacts/opportunities migration has no UNIQUE constraint; the contacts route populates only `dedupe_email_key`/`dedupe_domain_key` (phone/name_company permanently null); the convert route links to `nexus_clients` and never materializes a contact; `safeToAutoExecute` is type-pinned false; the daily-digest env check precedes `requireAdmin` (config-state oracle); the empire pipeline reads `agent_actions` not `crm_opportunities`; `ignoreBuildErrors:true`. The chair re-verified all of these. The spec even **corrects an error in its own locked context** (the convert route is not "missing") with a code citation — a strong integrity signal. All 15 pillars are covered with no blank phase cells, the email/calendar long-pole is honestly called out as the critical path with a mandatory independently-shippable fallback, and the recommendation-only safety contract is preserved in prose throughout. The disagreement is never about *whether* the design is right — it is about four decisions the spec deferred and a number it rounded the wrong way.

---

### The real tensions and trade-offs

1. **"Atomic conversion" vs the platform.** Three lenses (PM, Data, API) independently flagged that the supabase-js client has no multi-statement transaction, so the §6.3 "atomically or with compensating cleanup" acceptance is unmeetable as chained SDK calls and will ship orphaned-contact bugs. The board mandates a single SECURITY DEFINER Postgres RPC promoted branch-first (validated on a Supabase database branch, then merged with approval). This is the clearest example of the spec's pattern: a correct *requirement* with an unspecified *mechanism*.

2. **The crisp No-Go rule vs the High-risk register.** The §15.3 four-condition No-Go rule read cleanly, but it sat beside four "High" risks the same spec calls launch risks (PITR-before-real-data, public-intake redaction, founder MFA, audit-trail world-read) while OQ-12 left their gating status undecided. The board will not accept a clean rule next to undecided gates: either promote the data-safety items into No-Go, or record them as accepted-risk fast-follows with Phill's signature. The board's instinct is that **PITR-before-real-PII, public-intake redaction, audit read-tightening, and MFA enforcement belong in the No-Go list** — they protect real customer PII at go-live, not punch-list polish. (Resolved in §15.3.)

3. **The single-operator cockpit vs production posture.** Security correctly observes that a 2-email allow-list with optional MFA and a shared service-role key is acceptable for a solo build but not once real contact PII lands in prod. The board sides with promoting MFA, the Margot credential split, and the `agent_actions` read-tightening into V1 — the cost is small and the failure mode (one phished password or one leaked key = full read+write) is catastrophic for a CRM.

4. **Granularity of the coverage matrix.** Defensible but not audit-clean: Pillar 15 carries 26 infra rows while billing carries 1, and comms collapses four features into one row. A one-sentence "indicative row-counts, not feature-counts" disclaimer resolves it without re-authoring. (Added to §5 and the matrix.)

---

### Board verdict (one paragraph)

This is a strong, evidence-disciplined specification that the board is confident can ship a safe, professional in-house CRM on the locked Vercel + Supabase platform — and it is **not yet approved for build.** The work is genuinely impressive: every current-state claim the board spot-checked against the repo held, all 15 pillars are phase-tagged with no gaps, the email/calendar long-pole is honestly contained with a mandatory fallback, and the recommendation-only AI safety contract is preserved in the prose. But four load-bearing items must be closed first: (B1) the "LIVE/VERIFIED" prod-schema claims are unconfirmed against the only machine-readable prod artifact and must be downgraded with a mandatory regenerate-types-first step; (B2) the recommendation-only contract is enforced by which routes happen to call the engine rather than by the credential boundary, so Margot needs a distinct read-only credential and the spec must stop presenting a convention as a control; (B3) two parallel approval mechanisms with incompatible status vocabularies must be reconciled onto the engine as the single authority; and (B4) the V1 effort headline understates its own milestone sum (44 ed, not ~40) on the most-cited number in the document. Alongside these, the board requires the conversion-atomicity RPC, the single-currency forecast constraint, the CRM-page admin-gate hoist, consent provenance, public-intake redaction, the audit-read tightening, and the No-Go/risk reconciliation — all spec-text or one-migration fixes, none structural. **Resolve the four blocks and record sign-off in this section, and the spec is clear to build.**

---

### Sign-offs

- **Senior PM / Completeness** — APPROVE WITH CHANGES (P4 arithmetic, P13 binary day-8 gate, P15 No-Go reconciliation, P18–P20 clarifications).
- **Data Architecture** — APPROVE WITH CHANGES, **BLOCKING on P1** (prod-state evidence integrity); plus P5 RPC, P6 currency, P16 R6 FK, P21 dedupe stability.
- **Security & Privacy** — APPROVE WITH CHANGES, **BLOCKING on P2** (shared service-role credential); plus P8 audit-read, P9 consent, P10 public-intake redaction, P17 MFA.
- **API & Source-of-Truth** — APPROVE WITH CHANGES, **BLOCKING on P3** (approval-mechanism reconciliation); plus P5 atomicity, P11 firewall asymmetry, P12 idempotency, P24–P25 contracts.
- **UX Feasibility & Accessibility** — APPROVE WITH CHANGES (P7 gate-inheritance, P14 WCAG contrast; responsive/chart-theming scope corrections; mutating-surface state coverage).
- **Evidence Integrity** — APPROVE WITH CHANGES (nits only; independently corroborated all three blockers in the live repo).
- **Chief Reviewer (board chair)** — **REVISE: BLOCK on P1–P4; clear to build immediately on their resolution.**

---

## 17. Sources & evidence index

This spec cites only real files under `/Users/phillmcgurk/Unite-Group`. Tags: `[VERIFIED]` (read in the named file), `[INFERENCE]` (reasoned), `[UNCONFIRMED]` (could not verify). **"Migration file present in repo" is tagged `[VERIFIED file]`; "applied in prod" is a separate claim tagged `[UNCONFIRMED]` unless corroborated by the prod-schema artifact below.**

**Prod-schema baseline artifact:** `types/supabase.ts` — generated from prod ref `lksfwktwtmyznckodsau`, **dated 2026-05-22 19:03** `[VERIFIED file mtime + header]`. It contains **no `public.Tables` definition** for `crm_leads`, `agent_actions`, or `nexus_clients` (only an unrelated `client_agent_actions` and `businesses` are present) `[VERIFIED — grep]`. This is the only machine-readable prod artifact in the repo; it is **stale relative to the CRM migrations** and MUST be regenerated (`npm run gen:types`) as the M1.0 evidence baseline before any §6 "prod-applied" claim is treated as `[VERIFIED]`. (BLOCKER B1.)

**Core schema & migrations [VERIFIED file — prod-applied state [UNCONFIRMED] per B1]:** `supabase/migrations/20260523100000_crm_leads.sql`; `supabase/migrations/20260523103000_crm_contacts_opportunities.sql` (drafted, not applied; no UNIQUE constraint; `value_currency` nullable free-text no DEFAULT/CHECK at `:86`; contacts before opportunities); `supabase/migrations/20260510000004_nexus_agent_actions.sql` (`agent_actions FOR SELECT TO authenticated USING(true)` at `:37`; `client_id REFERENCES public.clients` not `nexus_clients` at `:13`); `supabase/migrations/20260514142500_client_approvals.sql` (updated_at trigger pattern); `supabase/migrations/20260513000001_ra3008_security_hardening.sql` (immutability trigger pattern, `:28`); `supabase/migrations/20260518100000_data_room_documents.sql` (founder-only SELECT).

**Routes [VERIFIED]:** `src/app/api/crm/contacts/route.ts` (POST/PATCH; email+domain dedupe only at `:261-262` — phone/name_company never populated; `additional_data:{}` hardcoded at `:263`; `marketing_consent` written at `:257` but consent provenance omitted; 409 paths); `src/app/api/crm/opportunities/route.ts` (won-approval gate at `:148-160`; `additional_data` billing firewall `containsUnsafeAdditionalData` at `:62-90`; PATCH redaction; `approval_status` enum at `:28` lacks `cancelled`/`executed`; `value_currency` defaults `'AUD'` only when amount supplied at `:423,527`); `src/app/api/crm/leads/[id]/convert/route.ts` (EXISTS; links lead→nexus_client only at `:146-152`, no contact materialization; non-transactional update at `:172` then best-effort timeline insert at `:182`); `src/app/api/marketing/leads/route.ts` (raw `ip_address`/`user_agent` at `:124-125`; `additional_data` stored verbatim, **no filter**, at `:126`); `src/app/api/crm/daily-digest/route.ts` (env check at `:43-45` before `requireAdmin` at `:47-48` — ordering bug); `src/app/api/pi-ceo/margot-voice/task/route.ts` (approval_required → blocked); `src/app/api/empire/pipeline/route.ts` (reads `agent_actions` at `:44`, not `crm_opportunities`); `src/app/api/integrations/dr-nrpg/crm/leads/route.ts` (`{errorClass,retryable}` envelope reference); `src/app/api/cron/integrations/*`; `src/app/api/webhooks/stripe/route.ts` (signature-verify pattern for the Composio inbound contract).

**Libraries [VERIFIED]:** `src/lib/crm/approval-lifecycle.ts` (`safeToAutoExecute:false` hard-pinned at `:50`; status set `{requested,approved,rejected,cancelled,executed,expired}` at `:54`; `may_execute` requires `approvedBy`+`approvalReference` at `:208-211`; high-risk subjects; not wired to any route); `src/lib/crm/qualify-lead.ts` (pure, recommendation-only); `src/lib/crm/daily-digest.ts` (pure, safety note, `nextAction` fields); `src/lib/crm/activity-timeline.ts` (16-event taxonomy, write-time PII redaction); `src/lib/security/require-admin.ts` (dual-mode gate at `:79-93`; bearer = `SUPABASE_SERVICE_ROLE_KEY` at `:79-81`; 2-email allow-list at `:24-27`); `src/lib/security/safe-compare.ts`; `src/lib/security/crm-lead-integration-gate.ts`; `src/lib/runtime/sync-lifecycle.ts`; `src/lib/runtime/stale-sync-check.ts`; `src/lib/integrations/composio/{client,sync}.ts` (connection-mirror only); `src/lib/auth/mfa/{totp,service}.ts`; `src/lib/ai/gateway/*` (legacy, Azure-aware, unused on CRM path). **`src/components/command-center/{SourceBadge,MissionClock,GlobalStatusBar}.tsx`** use `--cc-ink-hush` (`#3d4654`, `globals.css:213`) for functional text — pre-existing AA debt. **`src/app/[locale]/command-center/layout.tsx`** is metadata-only (no gate); the gate + `force-dynamic` live in `page.tsx:22,30-35` (gate NOT inherited).

**New modules to be created (do not exist yet — `[INFERENCE — new]`):** `src/lib/security/safe-additional-data.ts` (shared `additional_data` redaction filter, referenced by §7.4/§11.3/§14 R13/§15.2 — **new module**, not existing code); the `crm_convert_lead_to_contact()` Postgres RPC; the `crm_idempotency` table; `docs/runbooks/migration-rollback.md`.

**Config / CI / ops [VERIFIED]:** `vercel.json` (syd1, 11 crons); `next.config.js` (`ignoreBuildErrors:true`, Sentry); `.github/workflows/{ci.yml,review-board.yml,deepsec-weekly.yml,rotate-admin-jwt.yml}`; `package.json` (`test` vs `test:all`, `security:routes-check`, `check:schema-drift`); `scripts/check-route-inventory.ts` (note: `scripts/sandbox-wizard.sh` was DELETED ~15/06/2026 — DB-safety is now Supabase database branching per `apps/empire/CLAUDE.md`); `jest.config.js`; `sentry.server.config.ts` (`tracesSampleRate:1.0`, no `beforeSend`); `.gitleaks.toml`.

**Docs / operating model [VERIFIED]:** `docs/margot/crm-operating-model.md` (source-of-truth matrix, identity policy, privacy debt); `docs/margot/crm-schema-inventory.md` (unapplied status, provenance gaps); `docs/margot/ai-enhancement-candidate-register.md` (AI-VOICE-001, display language); `docs/backup-pipeline-assessment.md` (PITR off); `docs/runbooks/disaster-recovery.md` (DRAFT v0.2); `docs/security/audit-2026-05-31.md` (gitleaks/Deepsec/branch-protection findings).

**Key `[INFERENCE]` items:** no `crm_accounts` needed in V1; the Vercel AI Gateway architecture (repo uses raw openai SDK for embeddings only); the new approval/forecast/idempotency/convert-to-contact endpoints and the `crm_convert_lead_to_contact()` RPC; preview per-branch-database-pinning enforcement; the historical-lead "net-new only" backfill decision; quotes/custom-fields V2 deferral rationale; the AUD $1,200/ed blended rate (also drives all costs).

**Key `[UNCONFIRMED]` items (never presented as fact):** **prod-applied state of `crm_leads`, `agent_actions`, `nexus_clients`, `nexus_businesses`, `data_room_documents`, `client_approvals`** — migration files exist in repo, but `types/supabase.ts` (prod, 2026-05-22) omits them; regenerate via `gen:types` before treating any as prod-applied (B1); founder-account MFA on Supabase/GitHub/Vercel/Stripe (per the standing audit); the exact Supabase PITR monthly cost; the blended day-rate (no rate is defined anywhere in the repo).

**Apify integration (post-board addendum, 2026-06-16) [VERIFIED]:** `APIFY_API_KEY` present in the **unite-group** Vercel project env (Dev/Preview/Prod) `[VERIFIED — vercel env ls]`; Apify MCP server `https://mcp.apify.com` configured at local scope, OAuth pending `[VERIFIED — claude mcp]`; account `Unite-Group` FREE plan with 4 reusable Store-actor tasks created 2026-06-16 (contact-info / Google-Maps / Google-Search / website-content) `[VERIFIED — Apify API]`; **no Apify reference in the repo** `[VERIFIED — grep]`. CRM wiring is `[INFERENCE — new, not built]`. See §9.10.

---

## 18. Open questions / decisions needed

Aggregated and de-duplicated across all specialists. **OQ-1 (rate)** recurs in every discipline and is the single highest-leverage answer. **The board revision pass RESOLVED OQ-5 (sub-question), OQ-6, OQ-9, and OQ-12 in the spec text; they remain listed below with their resolution noted, and require Phill's confirmation only where flagged.**

1. **OQ-1 — Blended engineer-day rate.** All V1/V2/V3 costs assume **AUD $1,200/ed** `[INFERENCE]`; confirm the actual rate (internal cost vs agency-equivalent). Costs scale linearly.
2. **OQ-2 — Email/calendar provider for V1.** Google Workspace, Microsoft 365, or via Composio toolkits? A Google-calendar client already exists at `src/lib/scheduling/google-calendar-client.ts` — is Google the intended first provider? This sets the OAuth registration and the ~14-ed long-pole scope.
3. **OQ-3 — Token-at-rest for email/cal OAuth.** Encrypted in a service-role-only Supabase table, or referenced via 1Password? And which Google scopes (read-only for the fallback vs full send/write for 2-way)? Needed before M1.8 starts.
4. **OQ-4 — `crm_leads` IP/user-agent retention & privacy.** Hash/truncate + fixed retention window, OR drop the columns? What is the lawful basis/consent model? This blocks prod promotion of the lead intake.
5. **OQ-5 — Approval persistence shape.** Stage-1 task-subtype vs Stage-2 dedicated `crm_approvals` table (`docs/margot/crm-approval-persistence-plan.md` defers this). The approval-execution endpoint design depends on the answer. **RESOLVED (sub-question, B3/§7.8.1): the engine `approval-lifecycle.ts` is the single approval authority; the opportunities `approval_status` CHECK is aligned to the engine vocabulary (or a documented projection); `approvedBy` is captured; a request `boardApprovalId` resolves to the engine `approvalReference`.** The Stage-1 vs Stage-2 *storage* shape still needs Phill's confirmation.
6. **OQ-6 — Lead→contact conversion semantics.** **RESOLVED (P5/§6.3/§7.5): the convert route is extended to materialize a contact (+ optional opportunity) via the `crm_convert_lead_to_contact()` SECURITY DEFINER RPC in a single Postgres transaction (chained supabase-js SDK calls cannot be atomic). Conversion is atomic, all-or-nothing.** Confirm with Phill whether the opportunity-seed is opt-in per conversion (assumed yes).
7. **OQ-7 — Dedupe enforcement strength.** Email-only block-on-write with phone/name+company as soft warnings (recommended), or should a phone match alone hard-block (higher duplicate-prevention, higher false-positive risk)?
8. **OQ-8 — `authenticated` SELECT RLS timing.** When can it be added to `crm_contacts`/`crm_opportunities` for direct command-center reads vs keeping all reads service-role-routed? Depends on whether privacy-scope redaction exists in the read surface at V1. Relatedly: tighten `agent_actions` reads to founder-only now (recommended) or at V2?
9. **OQ-9 — Idempotency-Key store.** **RESOLVED (P12/§7.3): the V1 store is the persistent `crm_idempotency` table (key, resource_id, response_hash, expires_at) promoted branch-first (validated on a Supabase database branch, merged with approval) — the in-memory window cannot work on Vercel serverless (per-invocation isolation). If the Board instead descopes `Idempotency-Key` to a fast-follow, the launch-blocking AC moves with it and the V1 guarantee is natural-key only.** Confirm with Phill: V1 table vs descope.
10. **OQ-10 — Composio fallback testing.** Prove email/cal idempotency against the real Composio sandbox or against `nock`-mocked HTTP for V1? (Affects whether the long-pole tests need live OAuth credentials in CI.) And should the CI migration-check provision a Supabase database branch via GHA secrets, or must every branch validation stay on a developer's machine?
11. **OQ-11 — PITR + backups.** Approve the Supabase Pro addon to enable PITR (RPO ~24h → seconds) before contacts/opportunities hold real data? What is the acceptable RPO and is the monthly cost approved? Backup retention 7 vs 30 days?
12. **OQ-12 — Security launch blockers.** **RESOLVED (P15/§15.3): PITR-before-real-PII (R15), public-intake redaction + ip/UA minimization (R13), `agent_actions` read-tightening (G-RLS-1), and enforced MFA (G-AUTH-1) are promoted to No-Go conditions 5–8. Gitleaks activation, Deepsec-green, branch-protection ≥1 review, and Sentry `beforeSend` are accepted-risk fast-follows requiring Phill's recorded §16 sign-off.** Still open for Phill: is consent withdrawal a dedicated audited route, and is DSAR/export tooling V1 or V2?
13. **OQ-13 — Legacy AI gateway + model ids.** Approve decommission/quarantine of `src/lib/ai/gateway/*` (Azure-aware, unused on CRM path) in favour of the Vercel AI Gateway? Which exact model ids back reasoning/drafting vs cheap/bulk via provider strings? Which providers are approved for PII-adjacent prompts (zero-retention/no-training)? Route the existing OpenAI embeddings through the gateway or keep the direct SDK call to avoid re-embedding `document_embeddings`? Resolve AI-VOICE-001 transcript retention before any transcript LLM summarization; define the offline LLM eval acceptance thresholds + cadence and who curates the golden set.
14. **OQ-14 — UX choices.** CRM nav cluster as Global-Status-Bar pips vs a slim dedicated row? Confirm V1 stage-change is an approval-gated action menu (no drag). Does dedupe merge require an explicit approval task or is a confirm-dialog-only path acceptable for the single operator? Per-entity timeline 20-row cap vs pagination? Mobile priority for the pipeline board in V1? Global command palette for V1 or V2? Formal WCAG AA contrast re-audit of the `--cc-*` palette (esp. `--cc-ink-hush`)?
15. **OQ-15 — Ops team & multi-region.** Internal ops team size and exact V1 write permissions (non-sensitive vs approval-gated)? Always-on multi-region (syd1 + iad1) now, or a documented break-glass toggle (V2)? Should preview deploys talk to Supabase at all (pinned to the per-branch database, recommended) or be fully mocked?
16. **OQ-16 — Quotes / line-items in V1 (P20).** The spec defers itemized quotes/line-items to V2 (opportunities are forecast-only single-value in V1; quotes require Stripe-product linkage deferred with the billing view). **Confirm no V1 sales motion needs a quote artifact.**
17. **OQ-17 — Historical-lead backfill (P22).** The spec materializes contacts on NEW conversions only; existing `crm_leads` at promotion time are **net-new only — not back-converted in V1** (back-conversion is an approval-batched V2 item, to avoid an unapproved bulk identity write). **Confirm "net-new only" is acceptable, or request a V1 backfill task.**
18. **OQ-18 — Apify data-acquisition governance (§9.10).** The FREE Apify account caps real usage (≈$5/mo; some Store actors are paid rental) — approve a **paid Apify plan** for prospecting/enrichment volume? What is the **lawful basis / consent model** for storing scraped contact PII (emails/phones from Maps/SERP), and **which Store actors are approved** given target-site ToS? Confirm Apify enrichment lands **only as approval-gated suggested edits** (never auto-write), consistent with §9.10 and the recommendation-only contract.

---

*End of specification. Companion artifacts: [feature-coverage-matrix.md](docs/spec/feature-coverage-matrix.md) · [data-model-erd.md](docs/spec/data-model-erd.md) · [phase-plan.md](docs/spec/phase-plan.md). Section 16 records the board verdict (REVISE — clear to build on resolution of B1–B4, now applied); awaiting Phill's countersignature.*
