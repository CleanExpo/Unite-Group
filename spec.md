# Authority-Site In-House CRM — Build Specification

> **Project:** Authority-Site (aka Empire Command Center / Pi-CEO dashboard). Next.js 16 App Router · React 19 · TypeScript strict · Supabase Postgres · Vercel · Sentry · next-intl. Repo root: `/Users/phillmcgurk/Unite-Group`.
>
> **What this is:** the canonical specification to build out THIS project into a full professional in-house CRM. The sibling product **Unite-Hub is a SEPARATE CRM and is explicitly NOT specified here.**
>
> **Lead author:** assembled from the specialist team's contributions (Data/Domain Architect, API/Integration, UX/UI, AI Integration, Cloud/DevOps, Security/Compliance, QA/Test, Senior PM). Section 16 (multi-eyes review) is a placeholder for the review board.
>
> **Companion artifacts (cross-linked throughout):**
> - [`docs/spec/feature-coverage-matrix.md`](docs/spec/feature-coverage-matrix.md) — the FULL 15-pillar feature matrix.
> - [`docs/spec/data-model-erd.md`](docs/spec/data-model-erd.md) — entities, ERD, dedupe, privacy, RLS, migration plan.
> - [`docs/spec/phase-plan.md`](docs/spec/phase-plan.md) — detailed V1→V2→V3 milestones, estimates, dependencies.
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

> **This is done when** Phill can run his entire sales-and-relationship motion — capture a lead, qualify it with advisory AI, convert it to a contact + opportunity, watch it move through a forecastable pipeline, sync the related email/calendar thread, and act on a human-approved next-best-action — **entirely inside the Authority-Site command-center**, with **every** CRM object backed by a Supabase table promoted through `scripts/sandbox-wizard.sh`, **zero** AI auto-writes, and Supabase / Stripe / Linear holding their respective truths.

**Vision.** Authority-Site becomes Phill's daily operating cockpit (`docs/margot/crm-operating-model.md` `[VERIFIED]`): a single-tenant, in-house CRM on Vercel + Supabase where Margot advises and humans approve. We are NOT building Unite-Hub — we are building THIS project's own CRM spine on the existing command-center.

**Three-line test of done (V1):**
1. `crm_contacts` and `crm_opportunities` are live in prod (sandbox-promoted) with CRUD, dedupe, lead→contact conversion, and an end-to-end approval workflow wired onto `src/lib/crm/approval-lifecycle.ts` `[VERIFIED engine exists]`.
2. The command-center shows a pipeline + forecast READ dashboard sourced from `crm_opportunities` — today the only pipeline surface, `src/app/api/empire/pipeline/route.ts`, reads `agent_actions` funnel counts, not opportunities `[VERIFIED]`.
3. Email/calendar 2-way sync is shipping for at least one provider, OR the documented fast-follow fallback (read-only digest sync) is live so V1 ships on time.

---

## 2. Goals, non-goals & success metrics

### 2.1 Goals

| # | Goal | Why it matters | Phase |
|---|---|---|---|
| G1 | Promote `crm_contacts` + `crm_opportunities` to prod via sandbox-wizard, with CRUD + dedupe + lead→contact conversion | Closes the core CRM spine; both migrations are drafted but UNAPPLIED today (`supabase/migrations/20260523103000_crm_contacts_opportunities.sql` `[VERIFIED]`) | V1 |
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
| Direct prod DB writes (`psql` / `supabase db push` / MCP `apply_migration`) | Every schema change routes through `scripts/sandbox-wizard.sh` (sandbox→diff→promote) `[VERIFIED wizard exists]` |
| CRM as billing truth | Stripe is billing truth; opportunities are forecast-only (`crm_opportunities` migration comment `[VERIFIED]`) |

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
| Sandbox-first compliance | 100% (no prod CRM migration applied yet) | 100% — every promotion has a `diff` artifact + typed confirm | 100% |

---

## 3. Personas & access model

Single-tenant, role-light, approval-gated. The admin allow-list is 2 emails today (`src/lib/security/require-admin.ts`: `contact@unite-group.in`, `phill.mcgurk@gmail.com` `[VERIFIED]`).

| Persona | Who | Access in V1 | Write capability | Notes |
|---|---|---|---|---|
| **Phill (Operator/Owner)** | Founder | Full read; approves all gated writes; admin allow-list | Approves every gated mutation; can execute directly | Final approval authority; Supabase admin-email session OR service-role bearer `[VERIFIED dual-mode gate]` |
| **Margot (AI Orchestrator)** | Agent | Read CRM; produce drafts/recommendations; create approval-required tasks | **Never** auto-writes CRM truth — recommendation-only `[VERIFIED]` | Writes only via approved server routes; voice→task route already gates approval-required work (`src/app/api/pi-ceo/margot-voice/task/route.ts` `[VERIFIED]`) |
| **Internal Ops (small team)** | 1–3 staff | Read; create leads/contacts/activities; submit opportunities for approval | Non-sensitive writes; sensitive writes (conversion, client merge, external comms) need Phill approval | Role-light; granular RBAC deferred to V3+ |
| **System/Cron** | Vercel cron + service-role | Integration mirrors, digest generation, sync jobs | Service-role server routes only; never client-side | E.g. `src/app/api/cron/integrations/composio/route.ts` `[VERIFIED]` |

**Access-model invariants (all phases):**
- All mutating CRM routes pass `requireAdmin` (service-role bearer → admin-email session fallback, fail-closed) `[VERIFIED]` — enforced by `npm run security:routes-check` `[VERIFIED script]`.
- TOTP MFA infra exists (`src/lib/auth/mfa/totp.ts`, `service.ts` `[VERIFIED]`); enforcing MFA on operator login is a V1 launch-readiness item.
- Browser/client code never writes sensitive CRM tables directly; only service-role server routes do.
- High-risk subject types (`client_merge`, `data_export`) always require explicit Phill/Board review (`approval-lifecycle.ts` HIGH_RISK_SUBJECT_TYPES `[VERIFIED]`).

---

## 4. Current-state assessment

Every claim here is evidence-tagged; the per-section detail (§6–§12) carries the file-line citations.

| Area | State today | Evidence |
|---|---|---|
| `crm_leads` table | Migration written (status/score CHECKs, lower(email) index, service-role RLS, FK links); marketing form writes to it | `supabase/migrations/20260523100000_crm_leads.sql`; `src/app/api/marketing/leads/route.ts` `[VERIFIED]` |
| `crm_contacts` + `crm_opportunities` | **DRAFTED in one migration, NOT applied** to sandbox or prod | `supabase/migrations/20260523103000_crm_contacts_opportunities.sql`; `docs/margot/crm-schema-inventory.md:239-240` `[VERIFIED]` |
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
| Sandbox wizard | `scripts/sandbox-wizard.sh` setup/sync/apply/diff/status/reset/promote; sandbox mirrors prod via `pg_dump --schema-only`; promote needs typed "promote to prod" | `scripts/sandbox-wizard.sh` `[VERIFIED]` |

---

## 5. Feature inventory & coverage matrix (summary)

The **full matrix** — every feature row with pillar | name | phase | status | owner | acceptance criteria | test mapping | source paths, grouped by all 15 pillars — is the artifact **[`docs/spec/feature-coverage-matrix.md`](docs/spec/feature-coverage-matrix.md)**. This section summarizes it.

**15-pillar coverage map (V1 / V2 / V3+ counts):**

| Pillar | V1 | V2 | V3+ | Headline V1 work |
|---|--:|--:|--:|---|
| 1 Identity & data foundation | 7 | 4 | 1 | Promote contacts; 4-key dedupe + UNIQUE backstop; lead→contact materialization; privacy scopes |
| 2 Leads | 4 | 0 | 0 | Lead intake (live); convert route extension to create a contact |
| 3 Opportunities / pipeline | 4 | 3 | 0 | Promote opportunities; `GET` + forecast rollup; READ pipeline board |
| 4 Activities & timeline | 3 | 0 | 1 | Unified `agent_actions` feed across all objects; entity-filtered rails |
| 5 Email & calendar | 2 | 2 | 0 | **2-way sync (long-pole) + read-only fallback** |
| 6 Communications & notifications | 2 | 1 | 0 | Voice ingress (live); consent provenance capture |
| 7 Billing / revenue | 0 | 1 | 0 | (Stripe ARR view is V2; opportunities stay forecast-only) |
| 8 Documents / data room | 1 | 1 | 1 | Founder-only RLS (live); attachments V2 |
| 9 Reporting & analytics | 1 | 2 | 0 | Forecast rollup + dashboard e2e smoke |
| 10 Workflow automation | 2 | 1 | 0 | `updated_at` triggers; cron lifecycle wrapper (live) |
| 11 AI layer | 8 | 8 | 2 | Deterministic scoring + heuristic NBA in digest; approval execution handler; voice transcript policy |
| 12 Approvals & governance | 7 | 1 | 0 | Approval create + execute endpoints; append-only trigger; source-of-truth enforcement |
| 13 Admin & access | 4 | 1 | 2 | `requireAdmin` (live); MFA enforcement; JWT rotation (live); CRM nav cluster |
| 14 Integrations | 5 | 0 | 1 | 9 cron mirrors, Stripe/Linear/DR-NRPG, 1Password (all live) |
| 15 Platform / non-functional | 18 | 7 | 1 | Wire CI gates; remove `ignoreBuildErrors`; PITR; coverage gate; sandbox-first pipeline |

**Status distribution (V1 rows):** the V1 set is roughly a third `exists`, a third `partial`, a third `missing` — i.e. a strong base with three concentrated gaps to close: (a) the **schema promotion** (contacts/opportunities), (b) the **approval execution wiring**, and (c) the **email/calendar sync** long-pole. See §13 for sequencing.

---

## 6. Domain & Data Architecture

> **Owner:** Data / Domain Architect. Authored against verified repo state on branch `mesh/mission-control-2026-06-11` (2026-06-16). Full ERD, dedupe table, and migration flowcharts are in **[`docs/spec/data-model-erd.md`](docs/spec/data-model-erd.md)**. **Source-of-truth law (locked):** Supabase = CRM truth; Stripe = billing truth; Linear = execution truth. **Migration law (locked):** every schema change routes through `scripts/sandbox-wizard.sh` (sandbox `apply` → `diff` → `promote` with typed `promote to prod`).

### 6.1 Entity model & relationships

The CRM spine layers on the existing Nexus identity tables. Three identity anchors already exist in prod-applied migrations (`businesses`, `nexus_clients`, `agent_actions`); the CRM extends them rather than replacing them. See the ERD in [`data-model-erd.md`](docs/spec/data-model-erd.md#2-erd).

**Verified relationship facts:**
- `crm_leads` references `nexus_clients(id)` via `matched_client_id`/`converted_client_id` and `businesses(id)` via `matched_business_id`, all `ON DELETE SET NULL` — `…crm_leads.sql:21-23`. `[VERIFIED]`
- `crm_contacts` links to lead/client/business via `linked_*_id`, all `ON DELETE SET NULL` — `…103000.sql:15-17`. `[VERIFIED]`
- `crm_opportunities` links to lead/contact/client/business — `…103000.sql:91-94`. `[VERIFIED]`
- The unified timeline is carried by `agent_actions`, keyed by `action_type = 'crm_timeline_<event_type>'` and a sanitized `payload` — mapper `src/lib/crm/activity-timeline.ts:217-256`. `[VERIFIED]`

**Design decision — no separate `accounts`/`organizations` table in V1.** Org identity is carried by `businesses` (portfolio units) and `nexus_clients` (paying clients); `crm_contacts.company_name` is free-text for not-yet-a-client orgs. A normalized `crm_accounts` table is V2. `[INFERENCE — grounded in the single-tenant lock and the existing businesses/nexus_clients split]`

### 6.2 `crm_leads` (LIVE)

`crm_leads` is the V1 baseline the marketing form writes to. Notable for data architecture: `status` CHECK ∈ {new, qualified, nurture, converted, disqualified, spam} `[VERIFIED]`; `qualification_score` 0–100 CHECK `[VERIFIED]`; lower-cased functional email index `[VERIFIED]`; **privacy debt** — stores raw `ip_address`/`user_agent` as `text` with no retention decision (`…crm_leads.sql:24-25`; flagged at `docs/margot/crm-operating-model.md:200`). See §6.6, §11.6, §18. `[VERIFIED]`

### 6.3 `crm_contacts` + `crm_opportunities` (DRAFTED, not applied) — V1 target

Both tables are drafted in one migration (`…103000.sql`), guarded by a static test (`tests/unit/margot-crm-contacts-opportunities-migration.test.ts`). **Neither has been applied to sandbox or prod.** `[VERIFIED]`

**`crm_contacts` — verified shape:** PK `id uuid`; identity (`display_name not null`, plus first/last/email/phone/role/company) with a **minimum-identity CHECK**; links (`linked_lead_id`/`linked_client_id`/`linked_business_id`, FK SET NULL); **4 dedupe key columns**; `privacy_scope not null default 'lead_scoped'` + 5-scope CHECK; consent/retention columns; status CHECK ∈ 7 values; indexes on email (lower), `dedupe_email_key`, 3× linked-id, status, owner, privacy_scope; RLS enabled with a single `service_role` ALL policy. `[VERIFIED]`

**`crm_opportunities` — verified shape:** 12-stage pipeline CHECK; status CHECK ∈ {open,won,lost,paused,blocked_review,cancelled}; `value_amount numeric ≥0 CHECK`, `value_currency`, `probability` 0–100 CHECK, `expected_close_at`; `approval_required`/`approval_status` columns; lead/contact/client/business FKs (SET NULL); in-schema comment "forecast-only … not billing truth" enforcing the Stripe source-of-truth law. `[VERIFIED]`

**Required V1 hardening (gaps the spec must close before promotion):**
1. **No DB-level dedupe uniqueness.** Add a partial UNIQUE index on `dedupe_email_key` (where not null) so the DB is the backstop, not the route's race-prone `SELECT … limit 1` (`…contacts/route.ts:180-202`). `[VERIFIED gap]`
2. **Two dedupe keys never populated.** Populate all four in the route (normalize phone to E.164-ish; `name_company_key = lower(trim(display_name))||'|'||lower(trim(company_name))`) and index them. `[VERIFIED gap]`
3. **No `updated_at` trigger.** Add a `set_updated_at` BEFORE UPDATE trigger (reuse pattern in `20260514142500_client_approvals.sql`). `[VERIFIED gap]`
4. **Lead→contact conversion does not exist.** `src/app/api/crm/leads/[id]/convert/route.ts` converts **lead → `nexus_clients`** (sets `converted_client_id`/`matched_client_id` — `…convert/route.ts:146-152`); it never materializes a `crm_contacts` row. The V1 conversion flow must (a) upsert a deduped `crm_contacts` row from lead fields, (b) optionally seed an opportunity, (c) set lead status, (d) write one `agent_actions` event — atomically or with compensating cleanup. `[VERIFIED — route read]`

### 6.4 Dedupe keys & strategy (V1)

Dedupe is **detect-and-block on write** in V1 (no auto-merge). Email is the only key strong enough to block on alone; domain is a hint; phone/name+company block only when a second key corroborates. Full derivation table in [`data-model-erd.md` §3](docs/spec/data-model-erd.md#3-dedupe-keys--strategy-v1). `[VERIFIED]`

### 6.5 Merge strategy

**V1: no record merge.** Conversion links rather than merges; cross-client mixing is blocked (the contacts route requires `boardApprovalId` when >1 link target is supplied — `…contacts/route.ts:234-239`; the convert route refuses on `matched_client_id` conflict). **V2: explicit, approval-gated merge** — `client_merge` is already modeled as a high-risk approval subject requiring Phill/Board review (`approval-lifecycle.ts:55,136-139`). The merge executor (loser→winner reconciliation, re-point `linked_*` FKs, archive loser, single timeline event, reversible via audit) is built in V2. **AI never executes a merge; it recommends.** `[VERIFIED engine; INFERENCE for the unbuilt executor]`

### 6.6 Privacy scopes

`crm_contacts.privacy_scope` (5-scope CHECK, default `lead_scoped`) is the per-record visibility band — forward-compatible metadata that becomes load-bearing at V3+ RBAC and drives redaction today. PII redaction in the timeline is enforced at write time (`activity-timeline.ts:105-153`; contacts route re-sanitizes the subject label). `crm_leads` IP/user-agent retention is unresolved privacy debt. Consent is first-class on contacts and leads. Full detail in [`data-model-erd.md` §4](docs/spec/data-model-erd.md#4-privacy-scopes) and §11.4–§11.6. `[VERIFIED]`

### 6.7 RLS policies

Every CRM table is RLS-enabled with a single `service_role` ALL policy and no authenticated/anon policy; `agent_actions` and `nexus_clients` additionally grant authenticated SELECT. **V1 plan:** keep service-role-only writes; add an `authenticated` SELECT to contacts/opportunities only once privacy-scope redaction is confirmed; tighten `agent_actions` SELECT to founder-only; the `service_role` ALL policy is the safety floor — no client-side write path is ever opened. **V3+:** `privacy_scope` becomes an RLS predicate (policy-only, no schema change). Full table in [`data-model-erd.md` §5](docs/spec/data-model-erd.md#5-rls-posture) and §11.2. `[VERIFIED current posture; INFERENCE for the planned policies]`

### 6.8 Approvals & timeline persistence (data-layer view)

- **Approvals (V1): no dedicated table** — Stage-1 task-subtype model; the pure-logic engine hard-codes `safeToAutoExecute=false`; `crm_opportunities` carries inline `approval_*` columns. `[VERIFIED]`
- **`crm_approvals` table is V2** — built sandbox-first only when structured history/query needs are proven. `[VERIFIED plan]`
- **Timeline (V1): extend `agent_actions`** — 16-event taxonomy fixed in `activity-timeline.ts:1-17`; a dedicated timeline table is V3+. `[VERIFIED]`

### 6.9 Sandbox-first migration plan (V1 tables → prod)

The ordered apply→diff→promote flow (contacts before opportunities, single transaction, security advisor, typed confirm, post-promote `gen:types` + `pg_policies`/`rowsecurity` assertions) is detailed in [`data-model-erd.md` §7](docs/spec/data-model-erd.md#7-sandbox-first-migration-plan-v1-tables--prod). `[VERIFIED]`

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

**`requireAdmin` contract (canonical gate):** service-role bearer tried first (constant-time via `timingSafeTokenMatch`); falls back to admin-email Supabase session; fails **closed** — `401` no credential, `403` not allow-listed. `[VERIFIED require-admin.ts:90-93]`

**Gaps to close (V1):** `ALLOWED_ADMINS` is duplicated in two files — converge to the single `require-admin.ts` export; bearer callers audit as a generic `'service-role'` — add `x-actor-id` attribution (V2). `[VERIFIED duplicate set; INFERENCE for attribution]`

### 7.2 Error model

Stable machine-readable codes (string `error`), never raw DB messages. Codes span `400` (validation), `401` (no/bad credential), `403` (forbidden/approval gate), `404`, `409` (dedupe/idempotency/state conflict), `410` (expired), `422` (terminal), `423` (feature-flag hold), `429` (rate limit), `500`, `503` (env not configured). `[VERIFIED across the CRM routes]`

**V1 normalization (NEW):** the DR/NRPG route returns `{ success, error, errorClass, retryable }` `[VERIFIED]`; promote this `errorClass` + `retryable` shape to all CRM mutation routes so Margot/swarm decide retry-vs-escalate deterministically. **Acceptance: every 5xx CRM response carries `retryable: boolean`.**

### 7.3 Idempotency & concurrency

Natural-key idempotency exists today (email dedupe + `23505` catch on contacts; name+link dedupe on opportunities; `dedupe_key` on DR/NRPG; conditional `.is('converted_client_id', null)` on conversion; conditional `.eq('status','pending')` on client approval). `[VERIFIED]`

**V1 gap (HIGH):** no client-supplied `Idempotency-Key` header anywhere — a retried keyless contact/opportunity POST can duplicate. **NEW requirement:** accept an optional `Idempotency-Key` on all CRM POST routes, persist `(key → resource_id)` in a short-TTL store, replay the stored response. `[INFERENCE — no idempotency-key code found]`

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

**Hard contract in code:** opportunities `additional_data` has a sensitive-data firewall (`containsUnsafeAdditionalData`) rejecting `stripe|payment|card|bank|…` keys/values — billing data physically cannot be smuggled into pipeline truth. `[VERIFIED opportunities/route.ts:34-90]`

### 7.5–7.7 Endpoint contracts — Leads, Contacts, Opportunities

- **Leads:** `POST /api/marketing/leads` (public, rate-limited; standardize 200→201); `GET /api/crm/leads` (admin, filters); `POST /api/crm/leads/[id]/convert` **EXISTS** (board-approval gated, dryRun, race-safe) — but only links lead→client. **NEW `POST /api/crm/leads/[id]/convert-to-contact`** materializes a deduped `crm_contacts` row (`linked_lead_id`, status), idempotent on `dedupe_email_key`, emitting `contact_created` + `lead_converted` events; second call → 409. `[VERIFIED route present; INFERENCE for the new route]`
- **Contacts:** `POST` + `PATCH /api/crm/contacts` exist (identity-required, email dedupe → 409, multi-link approval gate, dedupe re-derive on email change). **V1 gaps:** no `GET` (needed for timeline + dashboard); phone/name+company dedupe not enforced; merge endpoint is V2. `[VERIFIED]`
- **Opportunities:** `POST` + `PATCH /api/crm/opportunities` exist (12 stages, won transitions need full approval, `additional_data` billing firewall + 4 KB cap, PATCH free-text redaction). **V1 gap:** no `GET` + `/forecast` rollup (Σ value × probability/100 per stage) for the pipeline dashboard; products/line items are V2. `[VERIFIED]`

### 7.8 Approvals & approval execution

Today, `client_approvals` + magic-link routes handle **client-deliverable** approvals (HMAC receipts, sha256 token-at-rest). CRM-object approval is enforced **inline** via `boardApprovalId` checks; the engine `evaluateCrmApprovalLifecycle` is **not wired to any route** — unit-tested logic only. `[VERIFIED]`

**V1 NEW requirement — wire the execution handler onto the engine (locked scope item 1):**
- **`POST /api/crm/approvals`** — create request (persistence shape per `docs/margot/crm-approval-persistence-plan.md`: Stage-1 task-subtype vs Stage-2 table — open question), status `requested`, emit `approval_requested`.
- **`POST /api/crm/approvals/[id]/execute`** — loads the approval, calls the engine; only when `decision==='may_execute'` (requires recorded `approvedBy` + `approvalReference`) performs the gated mutation, marks `executed`, appends `approval_*`. `do_not_execute`/`already_executed`/`invalid_request` → 403/409/400. `safeToAutoExecute` is hard-`false` — the engine can never green-light an automatic write. **Acceptance:** a `requested` approval cannot execute (403); `client_merge`/`data_export` always set `requiresPhillReview`; executed is idempotent (409 on repeat). `[VERIFIED engine; INFERENCE for the unbuilt endpoints]`

### 7.9 Daily digest & voice ingress

`GET /api/crm/daily-digest` aggregates advisory signals (no writes) — note the gate ordering bug: the env check precedes `requireAdmin` (`:43-48`), leaking config state; V1 moves auth first. `POST /api/pi-ceo/margot-voice/task` lands `approval_required` packets as `status='blocked'` (assignee `'Phill approval'`) — recommendation-only preserved. `[VERIFIED]`

### 7.10 Integration mirror surface & Composio long-pole

**Read path:** 9 cron mirrors (`github/vercel/railway/digitalocean/supabase/onepassword/linear/stripe/composio`), all `CRON_SECRET`-gated via `withSyncLifecycle`, seeding/marking `sync_state`; stale detection by `checkStaleSyncs`. **Write path:** Stripe webhook (signature-verified) + GitHub webhook; Linear push-on-demand. `[VERIFIED]`

**Composio email/calendar — the V1 critical-path long-pole:** today only a connection-mirror (`listConnections` → `integration_composio_connections`). V1 net-new: OAuth connect, encrypted token storage (1Password vs Supabase Vault — open question), inbound email/event → `agent_actions` activity refs (never message bodies in clear), outbound send/schedule **approval-gated**. **Fast-follow fallback (MUST ship):** read-only one-way ingest first so 2-way OAuth write-back cannot silently stretch V1. `[VERIFIED connection-mirror only]`

### 7.11 Acceptance criteria (§7)

1. Every CRM mutation route passes `requireAdmin`; `security:routes-check` reports 0 unprotected mutating routes. 2. All errors use the stable code table; no raw DB message reaches the client. 3. Lead→contact conversion route exists, idempotent on email key, emits paired timeline events. 4. `POST /api/crm/approvals/[id]/execute` is wired to the engine; `requested` cannot execute; `safeToAutoExecute` is never honored as write authorization. 5. Source-of-truth matrix enforced (opportunities reject billing-shaped `additional_data`). 6. Composio V1 ships at minimum the read-only activity-ingest fallback; outbound send is approval-gated and off by default. 7. All CRM POSTs accept and honor an `Idempotency-Key` header.

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

V1 keeps the **single-tenant cockpit-first** model: the command center stays home; CRM detail surfaces are reached from it. Nest all CRM routes under the already-gated `src/app/[locale]/command-center/crm/*` segment so they inherit the admin gate + `force-dynamic` — never create top-level `/[locale]/crm/*`. New V1 routes: `contacts`, `contacts/[id]`, `pipeline`, `opportunities/[id]`, `approvals`. A compact locale-preserving "CRM" nav cluster links Contacts/Pipeline/Approvals. `[INFERENCE on IA; gate pattern VERIFIED]`

### 8.5 Surface specifications (V1)

- **Contacts list** — cockpit `Table` of `crm_contacts` with search/filter, `SourceBadge`, dedupe pip + approval-gated merge modal, `EmptyState`/`DegradedDataBanner`.
- **Contact detail** — two-column on xl: identity + linked opportunities left; per-entity activity timeline + AI next-best-action right rail; field edits open an approval-gated save (no direct write).
- **Pipeline board + forecast** — Tabs toggle board (stage columns, cockpit `OpportunityBoardCard`) and forecast (probability-weighted ARR via `ui/chart`). **V1 is READ;** stage change is an approval-gated action menu, **NOT free drag** (drag implies an instant write — deferred to V2). Stale (>7d) cards show a Candy-Red border; forecast total matches the API to the cent.
- **Approval queue** — first-class queue from the approval engine: requesting actor (human vs Margot), before→after **diff**, AI rationale, Approve/Reject/Edit. An unapproved AI suggestion can never mutate `crm_*` from the UI; each decision writes `agent_actions`; counts reconcile with the Hermes panel + digest.
- **Timeline & digest** — extend `ActivityLog` to accept an entity filter; add the advisory AI block to the digest with per-item Accept/Dismiss routing to the approval queue (never a direct write).
`[VERIFIED component inventory; INFERENCE for the new compositions]`

### 8.6 Component map

**Reuse as-is:** `SourceBadge`, `DegradedDataBanner`, `KpiStrip`, `GlobalStatusBar`, `Business360Grid`; shadcn `table/dialog/alert-dialog/tabs/chart/input/select/badge/skeleton/scroll-area/tooltip/toast`, `EmptyState`, `use-mobile`. **Reuse logic, restyle:** `OpportunityCard`/`LeadCard` stale/win-probability maps. **Net-new (`--cc-*`):** `CrmContactsTable`, `ContactDetailPanel`, `DedupeMergeDialog`, `OpportunityBoardCard`, `PipelineBoard`, `ForecastStrip`, `ApprovalQueue`, `ApprovalDiffRow`, `AiRecommendationCard`, `CrmNavCluster`. `[VERIFIED inventory]`

### 8.7–8.8 Accessibility & responsive (WCAG 2.1 AA)

Body/interactive text uses `--cc-ink` (AA-passing); `--cc-ink-hush` is restricted to large decorative labels (contrast not yet formally audited — open question); signal is never colour-only (pip always paired with a label); `role="log"`/`aria-live` on feeds, `role="status"`/`alert` on mutation results; `min-h-11` (44px) touch targets; reduced-motion honored via the shared `cc-breathe` keyframe; tables collapse to cards below `md` via `use-mobile`; pipeline columns become horizontally swipeable on mobile. `[VERIFIED tokens/patterns; INFERENCE on contrast ratios]`

### 8.9 Acceptance criteria (§8)

1. Three new admin-gated CRM routes under `command-center/crm/*` inherit the gate + `force-dynamic`. 2. Every surface renders a `SourceBadge` and degrades via `DegradedDataBanner`/`EmptyState`. 3. No CRM surface produces a `crm_*` write without an approval-gated action; AI writes only via the approval queue. 4. Forecast reconciles to the API to the cent; approval counts reconcile across queue/Hermes/digest. 5. WCAG AA: keyboard-operable, AA body contrast, signal never colour-only, reduced-motion honored. 6. All pulsing affordances reuse `cc-breathe`; no new animation on static data.

---

## 9. AI Integration

> **Owner:** AI Integration Specialist. Per-capability matrix rows feed [`feature-coverage-matrix.md`](docs/spec/feature-coverage-matrix.md) (pillar 11).

### 9.1 The recommendation-only contract (load-bearing — never weaken)

> **AI never writes CRM truth. AI advises; a human (Phill or the named approver) approves; only then does a guarded server route mutate Supabase.** Every AI-originated action that would change a lead/contact/opportunity/client/billing field, or send anything externally, is materialised as a *draft* or an *approval-required task* — not a write.

This is the de-facto posture today and the spec hardens it into a contract: `qualify-lead.ts` is a pure deterministic function whose `operatorNotes[0]` forbids auto-convert/identity-overwrite `[VERIFIED]`; `daily-digest.ts` emits a markdown safety note that no DB writes/deploys/sends are implied `[VERIFIED]`; the Margot voice path lands `approval_required` work as a blocked task and never executes it `[VERIFIED]`.

**Contract clauses (enforced by tests, route gates, the approval engine):** C1 no AI capability holds a service-role CRM write; C2 every recommendation that *could* mutate produces an approval-required artifact; C3 every approved-then-executed AI action writes an `agent_actions` row (source + action_type + payload incl. model id + approver + status); C4 AI output carries explicit provenance + the required display language; C5 no external LLM call over client/lead PII or voice transcripts without a named approval gate (AI-VOICE-001); C6 the source-of-truth matrix holds. `[VERIFIED C1/C3/C5/C6; the display language is verbatim in the candidate register]`

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

---

## 10. Cloud, DevOps & Observability

> **Owner:** Cloud/DevOps Specialist. Platform **locked to Vercel + Supabase** — no AWS/Azure re-platform. Every schema change routes through `scripts/sandbox-wizard.sh`.

### 10.1 Current-state assessment

Hosting: Vercel, single region `syd1`, `framework nextjs` `[VERIFIED vercel.json]`. Build: `next build` with **`typescript.ignoreBuildErrors: true`** `[VERIFIED next.config.js:13-15]`. CI Gate: `npm ci → type-check → lint → test:all → build`, all blocking `[VERIFIED ci.yml]`. **`security:routes-check` and `check:schema-drift` exist as npm scripts but are NOT in `ci.yml`** `[VERIFIED]`. AI review board + Deepsec weekly + daily admin-JWT rotation are wired `[VERIFIED]`. Sentry wired via `withSentryConfig` with `tracesSampleRate: 1.0` hardcoded `[VERIFIED]`. Sandbox-wizard is local-only (no CI reference) `[VERIFIED]`. Backups: daily physical, 7-day retention, **PITR disabled** (RPO ~24h) `[VERIFIED]`. 11 Vercel crons, all `CRON_SECRET`-gated via `withSyncLifecycle` `[VERIFIED]`. No region failover `[VERIFIED]`.

**Headline gaps for the CRM build:** (1) CI does not enforce the security route-inventory or schema-drift checks that already exist; (2) `ignoreBuildErrors:true` lets type-unsafe code (wrong column / missing field — exactly the CRM failure mode) reach prod; (3) sandbox→promote is entirely manual and unaudited; (4) PITR off → the CRM's first 24h of writes are unrecoverable to a point in time; (5) Sentry traces at 100% — a cost/quota cliff as CRM traffic grows.

### 10.2 Environment & secret management

Source of truth: 1Password vault `Unite-Group-Infrastructure` → projected into Vercel env + GitHub Actions secrets; rotation flows one direction. Tiers: local dev = `.env.sandbox` (sandbox ref, mode 600, gitignored); **Preview = sandbox ref**; Production = prod ref. **Acceptance:** `.env*`/`.sandbox-cache/` stay gitignored + a CI secret-leak grep; every env var documented in `environment-inventory.md`; **Preview deploys pinned to the sandbox Supabase ref** (launch-blocking control so no PR writes prod CRM data); new Composio OAuth secrets added to 1Password first, then `vercel env add`, never committed. `[VERIFIED gitignore; INFERENCE for pinning enforcement]`

### 10.3 CI/CD pipeline (target)

**Hardening backlog (each an acceptance criterion):** (1) wire `security:routes-check` + `check:schema-drift` into `ci.yml` (V1, high leverage); (2) remove `ignoreBuildErrors` so type errors fail `next build` (V1); (3) a **migration-check job** that applies migrations to a throwaway sandbox (`psql --single-transaction --set ON_ERROR_STOP=on`, mirroring `cmd_apply`) + runs the security advisor (V1 — directly protects the contacts/opportunities promotion); (4) a coverage gate on `src/lib/crm/**` + `src/app/api/crm/**` (V1 floor); (5) Sentry release + sourcemap upload on prod deploy (V1); (6) branch protection on `main` (V1). **Promotion strategy:** code via merge-to-`main`; **DB schema only via the human-gated `sandbox-wizard.sh promote`** — CI never writes prod schema. `[VERIFIED scripts exist; INFERENCE for the target jobs]`

### 10.5 Observability

Errors/traces via `withSentryConfig` + `instrumentation.ts`. **V1 fixes:** move `tracesSampleRate` to env (`SENTRY_TRACES_SAMPLE_RATE`, default 0.1 prod / 1.0 dev); add a `beforeSend` PII scrubber so CRM error events never carry raw contact email/phone; structured breadcrumbs on approval-lifecycle decisions and Composio sync runs; cron-stall alert when a 5-min cron's `last_success` exceeds 30 min. Uptime heartbeat (Cronitor/Better Uptime) is V2. `[VERIFIED Sentry wiring]`

### 10.6 Backups & DR

**Acceptance:** **PITR enabled on prod before the CRM holds real contact/opportunity data** (`pitr_enabled:true` on `lksfwktwtmyznckodsau`) — until then the 24h RPO is the headline launch risk, surfaced to Phill; weekly `backup-healthcheck.sh` in CI; one quarterly restore-to-sandbox drill moving the runbook off DRAFT v0.2. Retention 7 vs 30 days is a Board decision. `[VERIFIED current posture]`

### 10.7 Cron & edge posture

New CRM crons (digest advisory AI, email/cal sync) MUST use the `withSyncLifecycle` wrapper (inheriting auth, cadence guard, partial-failure handling) and respect the source-of-truth matrix — the email/cal sync mirrors into Supabase but the AI layer never auto-writes CRM records. Route CRM cron DB access through Supavisor to avoid pool exhaustion as crons multiply. `[VERIFIED wrapper]`

### 10.8 Launch-readiness checklist (§10)

`security:routes-check` + `check:schema-drift` required in CI; `ignoreBuildErrors` removed; CI migration-check on a clean sandbox + advisor; preview deploys sandbox-pinned; Sentry releases + sourcemaps + env-driven sample rate; CRM coverage threshold enforced; branch protection on `main`; **PITR enabled before contacts/opportunities go live**; weekly backup health-check + one restore drill; all CRM crons on `withSyncLifecycle` + Supavisor with <30 min stall alerts; secret-leak grep gate on the PR diff.

---

## 11. Security, Privacy & Compliance

> **Owner:** Security/Compliance Specialist. Single-tenant, service-role-centric. RLS is a defense-in-depth backstop; primary access control is the `requireAdmin` route gate.

### 11.1 Security model at a glance

Access-control layers (all VERIFIED in code): (1) **Route gate** `requireAdmin` — service-role bearer (constant-time `timingSafeEqual`) OR admin-email session, fail-closed 401/403; (2) **Scoped sub-gate** `requireCrmLeadIntegrationAccess` for DR-NRPG (flow-specific token + header + env flag + a guard refusing to run if the integration token equals the service-role key); (3) **DB RLS backstop** — `service_role FOR ALL` on all CRM tables; (4) **CI regression gate** `security:routes-check` — fails the build if any mutating handler ships without an auth wrapper / constant-time compare / webhook-signature verify / rate-limit. `[VERIFIED]`

### 11.2 RLS posture

CRM truth tables (`crm_leads`/`crm_contacts`/`crm_opportunities`) are correctly locked to service-role-only. **Two RLS gaps to close in V1:** **G-RLS-1 (medium)** — `agent_actions` grants `authenticated` SELECT on **all** rows; tighten to founder-email-only (mirror `data_room_documents`) before a second non-founder authenticated user (V2 ops) exists, kept in lockstep with the `require-admin` allow-list. **G-RLS-2 (low)** — RLS is unverified against a live DB (draft-only migration); require a `sandbox-wizard apply` + `pg_policies` assertion before promotion. **AC:** anon and authenticated-non-founder reads return 0 rows from CRM truth tables; every CRM table has `rowsecurity = true` + ≥1 policy. `[VERIFIED posture; gaps VERIFIED]`

### 11.3 `additional_data` secret-redaction filters

Enforcement is **inconsistent across the three write routes:** opportunities has a good recursive `safeAdditionalData` refinement; contacts hardcodes `additional_data: {}`; **the public, unauthenticated `marketing/leads` intake — the most exposed surface — has NO equivalent filter (G-AD-1, high).** **V1 fix:** extract a shared `src/lib/security/safe-additional-data.ts` and apply it on all three CRM write paths; centralize the timeline-label redaction patterns too. **AC:** a single shared validator imported by contacts/opportunities/marketing-leads; a unit test asserts each sensitive pattern (token/stripe/card/email/cross-client) is rejected on every write route; over-cap payloads → 400. `[VERIFIED]`

### 11.4–11.6 Privacy scopes, consent, retention

**Privacy scopes** — recorded but not enforced in V1 (single-tenant; every read is founder/service-role); the column is forward-looking for V3+. The only concrete cross-scope control today is the multi-link board-approval guard (>1 link without `boardApprovalId` → 403). **Consent (G-CONSENT-1, medium)** — `consent_source`/`consent_captured_at` columns exist but the route writes only `marketing_consent`; wire provenance server-side whenever consent flips true; `do_not_contact` status hard-blocks sends. **Retention (G-RET-1, medium)** — decide `crm_leads` IP/user-agent minimization (hash/truncate or omit + 30–90 day purge) **before** prod promotion; a retention sweeper honoring `retention_policy` is V2. `[VERIFIED columns; gaps VERIFIED]`

### 11.7 Audit-trail completeness

`agent_actions` is the unified audit log; every CRM route appends a sanitized event; failed audit writes are caught and `console.error`'d (never thrown — append-only by convention). **G-AUDIT-1 (medium):** no DB trigger blocks `UPDATE`/`DELETE` on `agent_actions` — add a `BEFORE UPDATE OR DELETE` trigger (pattern: `enforce_profiles_role_immutability`). **G-AUDIT-2 (low):** route audit-write failures to Sentry, not just console, so a dropped audit row is observable. **AC:** every CRM create/update/convert/approval produces exactly one `agent_actions` row; mutation of historical rows rejected at the DB layer; audit failures surface in Sentry; no payload contains a raw secret/PII. `[VERIFIED]`

### 11.8 Approvals & source-of-truth enforcement

The approval lifecycle is a pure side-effect-free classifier; `safeToAutoExecute: false` is pinned at the type level — the recommendation-only contract is unbypassable at the type level. High-risk `client_merge`/`data_export` always set `requiresPhillReview`. **Correction to locked context:** the lead-conversion route is **NOT missing** — it exists, is `requireAdmin`-gated, board-approval-gated, and dry-run capable; V1 work here is wiring the execution handler + persisting approval state, not building the route. Opportunities are explicitly forecast-only, not billing truth; CRM stores links/status only. `[VERIFIED]`

### 11.9 Auth, sessions & MFA

Supabase Auth session + a hardcoded 2-email allow-list (appropriate for single-tenant V1); service-role bearer with constant-time compare; daily admin-JWT rotation. **G-AUTH-1 (medium):** founder-account MFA on Supabase/GitHub/Vercel/Stripe is **unverifiable from the repo** `[UNCONFIRMED — docs/security/audit-2026-05-31.md:119-124]` — confirm + evidence + enforce Supabase Auth MFA for the admin emails (highest-leverage control for a service-role-centric model). **G-AUTH-2 (medium):** add CSRF protection (or `SameSite=Strict` + origin check) on cookie-authenticated CRM POST/PATCH/DELETE.

### 11.10 Secret management & sandbox-first

Secrets in 1Password vault `Unite-Group-Infrastructure`, read at runtime; `.env.sandbox` gitignored; the credentials rule is absolute (never store secret values in CRM/docs). **G-SEC-1 (high):** the gitleaks pre-commit hook is **inactive** (`core.hooksPath` mismatch + binary not installed) `[VERIFIED docs/security/audit-2026-05-31.md:28-39]` — activate it AND add a gitleaks CI step so detection is not machine-dependent. Sandbox-first is a hard contract; the contacts/opportunities migration must not be promoted until RLS is asserted in sandbox.

### 11.11 Deepsec scanning & observability

**G-DEEPSEC-1 (high):** the Deepsec scan reportedly **failed two consecutive weeks silently** `[VERIFIED audit:41-46]`, and the workflow only opens an issue — fix the invocation, make it fail loudly, and add it as a required status check. **G-OBS-1 (medium):** `sentry.server.config.ts` has no `beforeSend` PII scrubber and `tracesSampleRate: 1.0` — add the scrubber + lower the prod sample rate. **G-CI-1 (low):** branch protection on `main` reportedly allows admin force-push with 0 required reviewers — tighten to ≥1 review + enforce-for-admins.

### 11.13 Security launch-readiness checklist (§11)

All CRM truth tables service-role-only with anon/authenticated reads = 0 rows (asserted in sandbox); `agent_actions` read tightened to founder-only; shared `safeAdditionalData` on all three write routes; consent provenance written; IP/user-agent retention decided + enforced before promotion; `agent_actions` append-only trigger + audit failures to Sentry; founder MFA verified + CSRF on cookie-auth mutations; gitleaks pre-commit active + in CI; Deepsec green + required check; Sentry `beforeSend` + prod sampling; `security:routes-check` = 0 unprotected mutating routes.

---

## 12. Testing & QA Strategy

> **Owner:** QA/Test Specialist. The repo has a mature security-led test culture: ~82 `*.test.ts(x)` + 5 `*.spec.ts` files, ~919 `it/test` blocks, biased toward pure-logic unit + mocked-Supabase route integration tests. **No browser/e2e layer and no coverage gate yet.** `[VERIFIED counts]`

### 12.1 Current state

Runner: `ts-jest`, node env. **Two scripts, load-bearing distinction:** `npm test` runs **only** the 3 pipeline smoke tests (`tests/pipelines/*`); `npm run test:all` runs the **entire** suite (including the 5 `.spec.ts`). CI Gate uses `test:all` `[VERIFIED]`. No coverage threshold; no Playwright/e2e harness; only a `pre-push` husky hook (type-check), no `pre-commit` `[VERIFIED]`. Well-tested V1-relevant areas: approval engine (30+ cases), contacts/opportunities routes (~30 each, mocked Supabase), lead conversion (9 cases — route EXISTS), daily digest (50+), qualify-lead, activity-timeline, the unapplied-migration string-assert, sandbox credential boundary. `[VERIFIED]`

**Critical gaps for V1:** (1) no coverage threshold; (2) **no DB-backed integration tier** — every route test mocks Supabase, so RLS, CHECK constraints, dedupe **unique indexes**, and FK behaviour are never exercised against real Postgres; (3) no e2e for the pipeline/forecast READ dashboard; (4) email/calendar sync is the untested net-new long-pole.

### 12.2 Test pyramid for V1

- **Tier 1 — pure-logic unit (exists, largest):** every advisory/decision engine is a deterministic no-I/O function with injected `now`/`generatedAt`. The **AI safety contract is a test contract** — `safeToAutoExecute===false` across all subject-type × status combinations; advisory outputs carry no write side-effect.
- **Tier 2 — route integration (exists, mocked Supabase):** auth gate, approval gate, error model, no-leak logging.
- **Tier 3 — DB-backed integration (NEW, sandbox ref `xgqwfwqumliuguzhshwv` only):** RLS enforced; dedupe UNIQUE index actually blocks a duplicate (the only true proof); CHECK constraints + FK on-delete fire; Composio idempotent upsert + token refresh. Promotes the migration string-assert into a real `sandbox-wizard apply` smoke test.
- **Tier 4 — e2e smoke (Playwright, NEW):** dashboard render, forecast rollup display, approval-queue visibility, AI advice labelled "recommendation".

### 12.3 Coverage gates in CI (NEW — V1 exit criterion)

`jest.config.js` adds `collectCoverage` + `coverageThreshold`: global **≥80/75/80/80**, with safety-critical ratchets — `approval-lifecycle.ts` ≥95/90/100/95, `qualify-lead.ts` & `daily-digest.ts` ≥90/85/90/90. CI replaces `test:all` with `test:all --coverage --ci`. A separate non-blocking `db-integration` job runs Tier-3 against the sandbox (never prod), promoted to blocking at v1.5. Add a `pre-commit` hook (`lint-staged` + `jest --findRelatedTests` for touched `src/lib/crm/**`). **Coverage ratchet rule:** thresholds only go up.

### 12.5 Target test matrix (V1 features → test types)

Legend: U=unit, I=mocked-route, D=DB-backed sandbox, E=Playwright, C=contract. Highlights: **dedupe (3)** — Tier-D mandatory (only a real unique index proves a second insert is rejected); **approval (5)** — the new execution handler MUST refuse to act unless the engine returns `may_execute` and MUST be the only path flipping an approval to `executed`; **email/cal (9)** — **contract-first**: token refresh on 401, inbound idempotency (re-poll = 0 new timeline rows), outbound event push, per-entity `failed[]` isolation, Supabase=truth/Composio mirrors — written **before** implementation; the read-only fallback ships behind a flag with its own reduced contract suite.

### 12.7–12.8 Quality gates & acceptance (§12)

A V1 merge is blocked by: `tsc --noEmit` clean; `eslint .` clean; `test:all --coverage` green + thresholds met (NEW); `next build` succeeds; new CRM route ⇒ matching integration test present (NEW lint); any schema change ⇒ Tier-3 sandbox-apply test green + reached prod only via `sandbox-wizard promote`; e2e dashboard smoke green (NEW). The strategy is "done" when the coverage gate is live, a Tier-3 sandbox suite proves RLS + dedupe unique index + constraints + FK, every V1 feature row has its ✓✓ tiers green, email/cal has a contract suite before its implementation merges, and a single AI-safety suite asserts `safeToAutoExecute===false` + "no write side-effect" across every AI capability.

---

## 13. Phased delivery plan

> The detailed milestone tables, Gantt, dependency graph, and per-milestone exit criteria are in **[`docs/spec/phase-plan.md`](docs/spec/phase-plan.md)**. This section is the executive view.

### 13.0 Estimation basis

- Effort in **engineer-days (ed)**: one senior full-stack engineer, including implementation + tests + sandbox apply/diff + PR review.
- **Blended day-rate assumption: AUD $1,200 / engineer-day** `[INFERENCE — surfaced as Open Question OQ-1; confirm before treating costs as firm]`. Indicative cost = ed × rate; all costs scale linearly with the confirmed rate.
- Existing pure-logic engines are reused, not rebuilt. `[VERIFIED they exist]`

| Phase | Core effort (ed) | Indicative cost (AUD) |
|---|--:|--:|
| **V1** (full email/cal sync) | ~40 | $48,000 |
| **V1** (with read-only fallback instead of full sync) | ~30 | $36,000 |
| **V2** | ~49 | $58,800 |
| **V3+** | ~42 | $50,400 |
| **Program total (V1 core + V2 + V3+)** | **~131** | **$157,200** |

### 13.1 V1 — Core CRM spine + advisory AI + email/cal (LOCKED)

| Milestone | Exit criteria (abridged) | Effort | Cost (AUD) |
|---|---|--:|--:|
| M1.1 Schema live | contacts + opportunities promoted via wizard (`diff` + typed confirm); RLS verified; hardening migration applied | 4 | $4,800 |
| M1.2 Conversion | lead→contact→opportunity materializes a deduped contact + optional opportunity + paired timeline events; 409 guards | 5 | $6,000 |
| M1.3 Dedupe | duplicate by email/phone/name+company → 409; all four keys populated + indexed | 3 | $3,600 |
| M1.4 Approval execution | `POST /api/crm/approvals` + `/execute` wired onto the engine; executes only on `may_execute`; idempotent; audit row | 5 | $6,000 |
| M1.5 Activity timeline | unified feed across leads/contacts/opps/approvals; sanitized labels; entity-filtered rails | 4 | $4,800 |
| M1.6 Pipeline + forecast READ | dashboard + `GET /api/crm/opportunities` reading `crm_opportunities`; Σ(value × probability) by stage; <2s | 5 | $6,000 |
| M1.7 Advisory AI in digest | score + band + heuristic NBA per lead; AI writes nothing; safety note intact | 4 | $4,800 |
| **M1.8 Email/cal 2-way (LONG-POLE / CRITICAL PATH)** | one provider 2-way; encrypted tokens (never in `additional_data`); sync <5 min; failures non-fatal; outbound approval-gated/off by default | 14 | $16,800 |
| M1.8-FB Fallback (fast-follow) | read-only inbound digest sync <24h, labelled read-only, ships independently | 4 | $4,800 |

**V1 effort (core, excl. fallback): ~40 ed ≈ $48,000.** With fallback instead of full sync: ~30 ed ≈ $36,000.

**Long-pole containment (mandatory):** M1.8 is time-boxed to 14 ed. If not demonstrably converging by **day 8**, V1 ships with M1.8-FB and M1.8 moves to V1.5 — so email/cal cannot silently stretch the V1 timeline.

**V1 exit criteria (gate to V2):** contacts + opportunities live in prod; lead→contact→opp conversion working; approval execution end-to-end with audit; pipeline/forecast dashboard live; advisory AI in digest with zero auto-writes; email/cal sync OR fallback shipping; `test:all` + `type-check` + `security:routes-check` green; ≥80% coverage on `src/lib/crm/*`.

### 13.2 V2 — CRM depth (~49 ed ≈ $58,800)

Accounts/orgs normalization (6); full email/cal 2-way + templates/tracking (10); communications & sequences (8); documents/data room attachments (6); reporting & analytics + PDF export (7); workflow automation + SLA timers (8); Stripe ARR/billing view, read-only (4). Also: Vercel AI Gateway standup with the legacy scaffold quarantined; LLM NBA/draft-email/summarization/forecast narrative (advisory, no auto-send); CRM-corpus semantic search; `crm_approvals` table if proven; `client_merge` executor; Playwright e2e; quarterly DR restore-to-sandbox drill. **Exit:** accounts live; full 2-way; sequences + automation; reporting w/ export; Stripe billing view; e2e smoke added.

### 13.3 V3+ — Governance, scale, intelligence (~42 ed ≈ $50,400)

Granular RBAC (`privacy_scope` becomes an active RLS predicate) (8); AI depth — draft emails, forecast insight, enrichment, summarization, semantic search, all recommendation-only (10); e-sign + proposals (6); public API + webhooks (8); privacy/consent/retention automation + DSAR (6); backups/DR runbook off DRAFT + PITR validation + restore drill (4).

---

## 14. Risk register

| ID | Risk | Severity | Likelihood | Mitigation | Owner |
|---|---|---|---|---|---|
| R1 | **Email/cal 2-way sync (M1.8) overruns and silently stretches V1** | High | High | 14-ed time-box; day-8 convergence checkpoint; mandatory read-only fallback M1.8-FB ships V1 on time; explicit long-pole flag in the plan | PM |
| R2 | A sandbox-wizard promotion is bypassed and a migration hits prod directly | High | Medium | Sandbox-first hard contract; require a `diff` artifact + typed "promote to prod"; PR review; NEVER `psql`/`db push`/MCP `apply_migration` on prod; No-Go gate | PM/Eng |
| R3 | AI auto-writes CRM data, breaking the recommendation-only contract | High | Low | `safeToAutoExecute:false` structurally enforced; every gated write passes the execution handler; unit test asserts no AI path reaches a write; No-Go gate | Eng |
| R4 | OAuth/email-cal token-at-rest mishandled (secret leakage) | High | Medium | Encrypt tokens at rest in a service-role-only table or 1Password reference; never in `additional_data`; secret-scan in CI | Eng |
| R5 | Dedupe gaps (only email enforced today) create duplicate contacts/opportunities | Medium | Medium | Implement + test all three keys; partial UNIQUE index backstop; 409 on conflict; backfill keys before go-live | Eng |
| R6 | `agent_actions.client_id` FK targets legacy `public.clients`, not `nexus_clients` — timeline mislinks | Medium | Medium | Add a corrected reference column via a sandbox migration; map timeline through `payload->>slug` until fixed | Eng |
| R7 | `tasks` + `voice_command_sessions` have no original repo migration (provenance gap) | Medium | High | Use the reconstructed sandbox-only proposal; validate via sandbox diff before any schema-affecting work | Eng |
| R8 | No e2e/Playwright harness — regressions slip past unit/integration tests | Medium | Medium | Gate `test:all` in CI now; add Playwright smoke (login + pipeline read + approval flow) at V2 exit | Eng |
| R9 | Single-tenant assumptions leak into schema, making V3+ multi-tenant costly | Low | Medium | Keep `privacy_scope` column; document tenant-boundary decisions | PM |
| R10 | Forecast dashboard reads the wrong source (today's `/api/empire/pipeline` reads `agent_actions`, not opportunities) | Medium | High | New forecast endpoint MUST read `crm_opportunities`; explicit source-of-truth label via `SourceBadge` | Eng |
| R11 | Blended-rate assumption ($1,200/ed) wrong → budget misread | Low | Medium | Tagged `[INFERENCE]`, surfaced as OQ-1; all costs scale linearly | PM |
| R12 | MFA not enforced on operator login despite TOTP infra existing; founder-account MFA unverified | Medium | Medium | Make MFA-on-login a V1 launch-readiness checkbox; confirm + evidence provider-account MFA | Eng |
| R13 | Public lead intake has no `additional_data` redaction filter (G-AD-1) — most exposed surface, weakest discipline | High | Medium | Extract a shared `safe-additional-data.ts` and apply on all three write routes; per-pattern rejection test | Eng |
| R14 | Deepsec scan failed silently 2 weeks + gitleaks pre-commit inactive — security regressions land while the dashboard reads green | High | Medium | Fix + make Deepsec a required check; activate gitleaks hook + add a gitleaks CI step | Eng |
| R15 | PITR disabled (RPO ~24h, destructive restore) — the CRM's first day of writes is unrecoverable to a point in time | High | Medium | Enable Supabase PITR (Pro addon) before contacts/opportunities go live; run `sandbox-wizard diff` before every promote | DevOps |
| R16 | `ignoreBuildErrors:true` ships type-unsafe code (wrong column/missing field) to prod | High | Medium | Set `ignoreBuildErrors:false`; pair with `check:schema-drift` in CI so committed types must match live schema | DevOps |

---

## 15. Acceptance criteria & launch-readiness checklist

### 15.1 V1 acceptance criteria (functional)

- [ ] `crm_contacts` + `crm_opportunities` live in prod, promoted via `sandbox-wizard` with a saved `diff` artifact and typed "promote to prod" confirmation.
- [ ] Lead→contact→opportunity conversion produces a deduped contact row, optional opportunity, and an audit event; identity-conflict and already-converted guards return 409.
- [ ] Dedupe enforced on email, phone, and name+company; duplicate returns 409 with a test per key; a partial UNIQUE index on `dedupe_email_key` exists in prod.
- [ ] Approval workflow end-to-end: a gated write is blocked until `approved`, executes only on `may_execute`, never on `rejected`/`expired`, is idempotent, and writes an audit row. `safeToAutoExecute` is always `false`.
- [ ] Unified activity timeline renders leads + contacts + opportunities + approvals with PII/secret-redacted labels.
- [ ] Pipeline + forecast dashboard reads `crm_opportunities`, shows weighted forecast (Σ value × probability) by stage, refreshes < 2s.
- [ ] Advisory AI in daily digest: each lead shows score + band + next-best-action; AI writes nothing; the "No production DB writes…" safety note is intact; the required display language renders.
- [ ] Email/calendar 2-way sync live for ≥1 provider, OR the M1.8-FB read-only fallback live and clearly labelled.

### 15.2 V1 launch-readiness checklist (non-functional / governance)

- [ ] `npm run test:all` green (CI must run `test:all`, not the 3-test `npm test`).
- [ ] `npm run type-check` green; `next build` runs with `ignoreBuildErrors:false`.
- [ ] `npm run security:routes-check` reports 0 unprotected mutating routes; both it and `check:schema-drift` are required CI steps.
- [ ] ≥80% coverage on `src/lib/crm/*` and all `src/app/api/crm/*` routes; safety-critical ratchets met.
- [ ] All mutating CRM routes pass `requireAdmin`; shared `safe-additional-data` applied on all three write routes.
- [ ] MFA enforced on operator login (TOTP infra exists); founder provider-account MFA evidenced.
- [ ] Source-of-truth labels visible in UI (Supabase=CRM, Stripe=billing, Linear=execution).
- [ ] OAuth tokens (if M1.8) encrypted at rest; never in `additional_data`; gitleaks pre-commit active + gitleaks in CI; secret-leak grep on the PR diff passes.
- [ ] Sentry capturing CRM route errors with a `beforeSend` PII scrubber; env-driven trace sampling; no PII in breadcrumbs.
- [ ] `agent_actions` append-only trigger live; audit-write failures surface in Sentry; `agent_actions` SELECT tightened to founder-only.
- [ ] **PITR enabled on prod** before contacts/opportunities hold real data; `crm_leads` IP/user-agent retention decided + implemented.
- [ ] Preview deploys pinned to the sandbox Supabase ref; branch protection on `main` (≥1 review, enforce-for-admins); Deepsec green + required check.
- [ ] Sandbox-first compliance: no CRM migration reached prod outside the wizard; `sandbox-wizard status` healthy; rollback plan documented per promoted migration.
- [ ] Phill sign-off recorded (Section 16 board verdict).

### 15.3 Go / No-Go rule

**No-Go if any of:** any AI auto-write path exists; a CRM migration reached prod outside the wizard; `security:routes-check` finds an unprotected mutating route; or neither M1.8 nor M1.8-FB is live. Everything else is a punch-list item, not a launch blocker.

---

## 16. Senior PM multi-eyes review

> **(To be completed by the review board.)**
>
> This section is intentionally left as a placeholder. The review board will record: the board verdict (APPROVE / APPROVE-WITH-CONDITIONS / REQUEST-CHANGES), per-discipline sign-offs (Data/Domain, API/Integration, UX/UI, AI, DevOps, Security, QA, Senior PM), any conditions or blocking findings, and the date of sign-off. Until this section is filled, the spec is **DRAFT — not approved for build.**

---

## 17. Sources & evidence index

This spec cites only real files under `/Users/phillmcgurk/Unite-Group`. Tags: `[VERIFIED]` (read in the named file), `[INFERENCE]` (reasoned), `[UNCONFIRMED]` (could not verify).

**Core schema & migrations [VERIFIED]:** `supabase/migrations/20260523100000_crm_leads.sql`; `supabase/migrations/20260523103000_crm_contacts_opportunities.sql` (drafted, not applied; no UNIQUE constraint; contacts before opportunities); `supabase/migrations/20260510000004_nexus_agent_actions.sql`; `supabase/migrations/20260514142500_client_approvals.sql` (updated_at trigger pattern); `supabase/migrations/20260513000001_ra3008_security_hardening.sql` (immutability trigger pattern); `supabase/migrations/20260518100000_data_room_documents.sql` (founder-only SELECT).

**Routes [VERIFIED]:** `src/app/api/crm/contacts/route.ts` (POST/PATCH; email+domain dedupe only — phone/name_company never populated; 409 paths); `src/app/api/crm/opportunities/route.ts` (won-approval gate; `additional_data` billing firewall; PATCH redaction); `src/app/api/crm/leads/[id]/convert/route.ts` (EXISTS; links lead→nexus_client only, no contact materialization); `src/app/api/marketing/leads/route.ts` (no `additional_data` filter); `src/app/api/crm/daily-digest/route.ts` (env check before auth — ordering bug); `src/app/api/pi-ceo/margot-voice/task/route.ts` (approval_required → blocked); `src/app/api/empire/pipeline/route.ts` (reads `agent_actions`, not `crm_opportunities`); `src/app/api/integrations/dr-nrpg/crm/leads/route.ts`; `src/app/api/cron/integrations/*`; `src/app/api/webhooks/stripe/route.ts`.

**Libraries [VERIFIED]:** `src/lib/crm/approval-lifecycle.ts` (`safeToAutoExecute:false` hard-pinned; high-risk subjects; not wired to any route); `src/lib/crm/qualify-lead.ts` (pure, recommendation-only); `src/lib/crm/daily-digest.ts` (pure, safety note, `nextAction` fields); `src/lib/crm/activity-timeline.ts` (16-event taxonomy, write-time PII redaction); `src/lib/security/require-admin.ts` (dual-mode gate, 2-email allow-list); `src/lib/security/safe-compare.ts`; `src/lib/security/crm-lead-integration-gate.ts`; `src/lib/runtime/sync-lifecycle.ts`; `src/lib/runtime/stale-sync-check.ts`; `src/lib/integrations/composio/{client,sync}.ts` (connection-mirror only); `src/lib/auth/mfa/{totp,service}.ts`; `src/lib/ai/gateway/*` (legacy, Azure-aware, unused on CRM path).

**Config / CI / ops [VERIFIED]:** `vercel.json` (syd1, 11 crons); `next.config.js` (`ignoreBuildErrors:true`, Sentry); `.github/workflows/{ci.yml,review-board.yml,deepsec-weekly.yml,rotate-admin-jwt.yml}`; `package.json` (`test` vs `test:all`, `security:routes-check`, `check:schema-drift`); `scripts/{sandbox-wizard.sh,check-route-inventory.ts}`; `jest.config.js`; `sentry.server.config.ts` (`tracesSampleRate:1.0`, no `beforeSend`); `.gitleaks.toml`.

**Docs / operating model [VERIFIED]:** `docs/margot/crm-operating-model.md` (source-of-truth matrix, identity policy, privacy debt); `docs/margot/crm-schema-inventory.md` (unapplied status, provenance gaps); `docs/margot/ai-enhancement-candidate-register.md` (AI-VOICE-001, display language); `docs/backup-pipeline-assessment.md` (PITR off); `docs/runbooks/disaster-recovery.md` (DRAFT v0.2); `docs/security/audit-2026-05-31.md` (gitleaks/Deepsec/branch-protection findings).

**Key `[INFERENCE]` items:** no `crm_accounts` needed in V1; the Vercel AI Gateway architecture (repo uses raw openai SDK for embeddings only); the new approval/forecast/idempotency endpoints; preview sandbox-pinning enforcement; the AUD $1,200/ed blended rate (also drives all costs).

**Key `[UNCONFIRMED]` items:** founder-account MFA on Supabase/GitHub/Vercel/Stripe (per the standing audit); the exact Supabase PITR monthly cost; the blended day-rate (no rate is defined anywhere in the repo).

---

## 18. Open questions / decisions needed

Aggregated and de-duplicated across all specialists. **OQ-1 (rate)** recurs in every discipline and is the single highest-leverage answer.

1. **OQ-1 — Blended engineer-day rate.** All V1/V2/V3 costs assume **AUD $1,200/ed** `[INFERENCE]`; confirm the actual rate (internal cost vs agency-equivalent). Costs scale linearly.
2. **OQ-2 — Email/calendar provider for V1.** Google Workspace, Microsoft 365, or via Composio toolkits? A Google-calendar client already exists at `src/lib/scheduling/google-calendar-client.ts` — is Google the intended first provider? This sets the OAuth registration and the ~14-ed long-pole scope.
3. **OQ-3 — Token-at-rest for email/cal OAuth.** Encrypted in a service-role-only Supabase table, or referenced via 1Password? And which Google scopes (read-only for the fallback vs full send/write for 2-way)? Needed before M1.8 starts.
4. **OQ-4 — `crm_leads` IP/user-agent retention & privacy.** Hash/truncate + fixed retention window, OR drop the columns? What is the lawful basis/consent model? This blocks prod promotion of the lead intake.
5. **OQ-5 — Approval persistence shape.** Stage-1 task-subtype vs Stage-2 dedicated `crm_approvals` table (`docs/margot/crm-approval-persistence-plan.md` defers this). The approval-execution endpoint design depends on the answer.
6. **OQ-6 — Lead→contact conversion semantics.** Should the existing convert route be **extended** to ALSO create a contact + opportunity in one call (locked scope implies yes), or kept as a separate client-link operation with a new conversion route alongside? Is conversion atomic, or are contact/opportunity separate approval-gated steps?
7. **OQ-7 — Dedupe enforcement strength.** Email-only block-on-write with phone/name+company as soft warnings (recommended), or should a phone match alone hard-block (higher duplicate-prevention, higher false-positive risk)?
8. **OQ-8 — `authenticated` SELECT RLS timing.** When can it be added to `crm_contacts`/`crm_opportunities` for direct command-center reads vs keeping all reads service-role-routed? Depends on whether privacy-scope redaction exists in the read surface at V1. Relatedly: tighten `agent_actions` reads to founder-only now (recommended) or at V2?
9. **OQ-9 — Idempotency-Key store.** A small `crm_idempotency` table (key, resource_id, response_hash, expires_at) via sandbox-wizard (survives restarts) vs a header-only in-memory window (simpler, loses guarantees across deploys)?
10. **OQ-10 — Composio fallback testing.** Prove email/cal idempotency against the real Composio sandbox or against `nock`-mocked HTTP for V1? (Affects whether the long-pole tests need live OAuth credentials in CI.) And should the CI migration-check be granted sandbox DB credentials via GHA secrets, or must every sandbox apply stay on a developer's machine?
11. **OQ-11 — PITR + backups.** Approve the Supabase Pro addon to enable PITR (RPO ~24h → seconds) before contacts/opportunities hold real data? What is the acceptable RPO and is the monthly cost approved? Backup retention 7 vs 30 days?
12. **OQ-12 — Security launch blockers.** Are the standing-audit criticals (inactive gitleaks hook, Deepsec failures, branch protection ≥1 review, founder-account MFA evidence) V1 launch blockers or fast-follow? Should consent withdrawal be a dedicated audited route, and is DSAR/export tooling needed in V1 or V2?
13. **OQ-13 — Legacy AI gateway + model ids.** Approve decommission/quarantine of `src/lib/ai/gateway/*` (Azure-aware, unused on CRM path) in favour of the Vercel AI Gateway? Which exact model ids back reasoning/drafting vs cheap/bulk via provider strings? Which providers are approved for PII-adjacent prompts (zero-retention/no-training)? Route the existing OpenAI embeddings through the gateway or keep the direct SDK call to avoid re-embedding `document_embeddings`? Resolve AI-VOICE-001 transcript retention before any transcript LLM summarization; define the offline LLM eval acceptance thresholds + cadence and who curates the golden set.
14. **OQ-14 — UX choices.** CRM nav cluster as Global-Status-Bar pips vs a slim dedicated row? Confirm V1 stage-change is an approval-gated action menu (no drag). Does dedupe merge require an explicit approval task or is a confirm-dialog-only path acceptable for the single operator? Per-entity timeline 20-row cap vs pagination? Mobile priority for the pipeline board in V1? Global command palette for V1 or V2? Formal WCAG AA contrast re-audit of the `--cc-*` palette (esp. `--cc-ink-hush`)?
15. **OQ-15 — Ops team & multi-region.** Internal ops team size and exact V1 write permissions (non-sensitive vs approval-gated)? Always-on multi-region (syd1 + iad1) now, or a documented break-glass toggle (V2)? Should preview deploys talk to Supabase at all (sandbox-pinned, recommended) or be fully mocked?

---

*End of specification. Companion artifacts: [feature-coverage-matrix.md](docs/spec/feature-coverage-matrix.md) · [data-model-erd.md](docs/spec/data-model-erd.md) · [phase-plan.md](docs/spec/phase-plan.md). Section 16 awaits the review board.*
