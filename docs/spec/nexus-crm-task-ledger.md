# Nexus CRM — Verified Task Ledger

**Project:** Unite-Group Nexus CRM (Authority-Site / Empire — `CleanExpo/Unite-Group`). Next.js 16 / React 19 / Supabase / Vercel.
**Scope:** ONLY the Nexus CRM — `nexus_clients` + `crm_leads` / `crm_contacts` / `crm_opportunities` + `agent_actions` + the command-center. This ledger does **NOT** cover RestoreAssist (a separate product).
**Date:** 2026-06-16
**Source inventory audited:** `docs/spec/feature-coverage-matrix.md` (148 rows / 15 pillars). Every claimed status was re-verified against the real files under `/Users/phillmcgurk/Unite-Group`. The matrix's claimed status was **NOT trusted** — it over-claims.

## The "$2B CRM = fully working" bar

A task counts as **working** only when all three hold:

1. **IMPLEMENTED** — the code / migration / component actually exists (path cited).
2. **CONNECTED** — wired end-to-end: route called by a UI/ingress, table written by the route, data read by a surface — not orphaned code.
3. **WORKING** — test or clear functional evidence it behaves correctly (a passing test, or an obviously-correct pure function).

**trueStatus vocabulary:** `working` (all three, real evidence) · `built-unverified` (built + wired, but runtime/prod-applied state unproven) · `partial` (some of it real, materially incomplete) · `over-claimed` (matrix said done/partial, code does not back it) · `missing` (not built). `broken` is used in the working column when the existing artifact is evidently wrong.

---

## 1. ROLLUP — counts by true status

| trueStatus | Count | % of 148 |
|---|---:|---:|
| **working** (fully — the bar) | 16 | 10.8% |
| **built-unverified** | 17 | 11.5% |
| **partial** | 18 | 12.2% |
| **over-claimed** | 8 | 5.4% |
| **missing** | 89 | 60.1% |
| **TOTAL** | **148** | 100% |

### The single honest number

> **Fully-working = 16 / 148 = 10.8%.**
> Another 17 (11.5%) are **built-unverified** — code exists and is wired, but cannot be called "working" because the underlying tables are not provably applied to prod (see B1). If B1 clears and those pass a live exercise, the realistic ceiling rises toward ~22%.

### Per-pillar rollup (trueStatus)

| Pillar | working | built-unverified | partial | over-claimed | missing | Total |
|---|---:|---:|---:|---:|---:|---:|
| 1 Identity & data foundation | 0 | 3 | 1 | 1 | 12 | 17 |
| 2 Leads | 3 | 1 | 0 | 0 | 2 | 6 |
| 3 Opportunities / pipeline | 1 | 3 | 0 | 0 | 4 | 8 |
| 4 Activities & timeline | 1 | 1 | 2 | 0 | 2 | 6 |
| 5 Email & calendar | 0 | 0 | 0 | 1 | 3 | 4 |
| 6 Communications & notifications | 1 | 0 | 0 | 1 | 1 | 3 |
| 7 Billing / revenue | 0 | 0 | 0 | 1 | 0 | 1 |
| 8 Documents / data room | 0 | 1 | 0 | 1 | 1 | 3 |
| 9 Reporting & analytics | 0 | 0 | 0 | 0 | 3 | 3 |
| 10 Workflow automation | 0 | 0 | 1 | 0 | 2 | 3 |
| 11 AI layer | 3 | 1 | 5 | 1 | 8 | 18 |
| 12 Approvals & governance | 2 | 1 | 1 | 1 | 4 | 9 |
| 13 Admin & access | 0 | 2 | 0 | 1 | 6 | 9 |
| 14 Integrations | 1 | 4 | 1 | 0 | 3 | 9 |
| 15 Platform / non-functional | 4 | 0 | 7 | 2 | 36 | 49 |
| **TOTAL** | **16** | **17** | **18** | **8** | **89** | **148** |

### OVER-CLAIMED — matrix said done/partial, the code does not back it (8)

These are the most dangerous rows: the inventory presents them as further along than the code supports. Treat any roadmap built on the raw matrix as inflated by at least these 8.

| Pillar | Task | Matrix claimed | Reality |
|---|---|---|---|
| 1 | Custom fields on CRM objects (`additional_data`) | partial | No shared `src/lib/crm/` filter exists; contacts route hardcodes `additional_data:{}`. Only opportunities filters, inline. |
| 5 | Composio email/calendar 2-way sync (V1 long-pole) | partial | Only **connection-state mirror** exists — no email/cal ingest, no token flow, no send path. The "partial" is a different feature than the row describes. `integration_composio_connections` absent from prod types. |
| 6 | Templated sends, nurture sequences, Telegram, notifications | partial | No CRM sequence/nurture engine. Cited Telegram approval-callback is a **personal-intelligence JSONL gate**, not a CRM send flow. |
| 7 | Stripe ARR/subscription view (CRM billing) | partial | The ARR rollup that exists is **empire data-room P&L**, not a CRM surface. No CRM billing route; claimed test does not exist. |
| 8 | Attach proposals/files to CRM objects | partial | **No implementation at all** — zero attachment code; claimed test does not exist. Cited helper is empire data-room freshness, unrelated. |
| 11 | AI action audit trail (`agent_actions`) | exists | `agent_actions` **absent from prod types**; claimed test `ai-action-audit.test.ts` does not exist. Code path exists but table not applied. |
| 12 | Approval queue surface (UI) | partial | No CRM approval-queue component exists; cited paths are the engine (no UI) and a generic control panel. Effectively missing. |
| 13 | Enforce TOTP MFA on every allow-listed account (HARD V1 gate) | partial | MFA code exists but is **opt-in only** — `requireAdmin` never calls `verifyMFA`; service writes to `users`/`security_audit_log` tables absent from prod. The launch gate is **not enforced in code**. |

Plus two Pillar-15 over-claims in the working/broken sense: **Sentry traces sample rate** (claimed partial — actually all three configs hardcode `1.0`, env-driven not started) and **Gitleaks pre-commit** (claimed active — `core.hooksPath=.husky/_`, the `.githooks` gitleaks hook is not wired).

---

## 2. THE TRUE-STATE PICTURE

**What genuinely works today** is the perimeter, the agent-ingress, and the pure-logic engines — not the CRM record surfaces. Verified-working items are: public lead intake (`/api/marketing/leads`), lead list + lead→client conversion routes, the Margot voice task/signed-url pipeline, the deterministic `qualifyLead` scorer, the recommendation-only approval-lifecycle engine, the sanitized timeline mapper, the `requireAdmin` gate (logic), the integration mirrors plumbing, the sandbox-wizard credential boundary, the CI gate, and the 227-test AI-RET-001 read-back harness. These are real, tested, and wired.

**The biggest gaps to a complete CRM** are the entire human-facing surface and the data layer's prod state. There is **no CRM UI whatsoever** — no contacts list, no contact detail, no pipeline board, no forecast dashboard, no approval queue, no CRM nav cluster (Pillars 1/3/9/12/13 UI rows are all missing). Read paths are thin: `GET /api/crm/contacts` and `GET /api/crm/opportunities` + forecast rollup do not exist. The approval **execution** endpoint that would make the (verified) lifecycle engine the single runtime authority is missing, leaving that engine orphaned. Email/calendar sync — the named V1 long-pole — is connection-mirror only.

**The prerequisite that gates everything (BLOCKER B1):** the only machine-readable prod artifact, `types/supabase.ts`, is **stale (dated 2026-05-22, confirmed `May 22 19:03`)** and contains **zero** of `crm_leads` / `crm_contacts` / `crm_opportunities` / `nexus_clients` / `integration_*` / `agent_actions` as applied CRM tables. Migration FILE in the repo ≠ applied in prod. Therefore **every "working" verdict that depends on a CRM/integration table is runtime-unverified** and was downgraded to `built-unverified`. Worse, the FK targets `public.nexus_clients` (referenced by `crm_leads`, `crm_contacts`, `crm_opportunities`) point at a table not present in the prod oracle, so a naive promote will fail on referential integrity. **No CRM record feature can be called truly working until prod state is regenerated and the dependency chain (`nexus_clients` → `crm_*` → `agent_actions`) is confirmed applied.**

> **✅ TIER 0 RESULT — live prod query, 2026-06-16 (corrects the inference above).** A read-only `information_schema` query against prod ref `lksfwktwtmyznckodsau` shows the stale `types/supabase.ts` was *incomplete*, not authoritative. **PRESENT in prod:** `nexus_clients` (with `id` — the FK target), `agent_actions` (with `action_type, payload, business_id, client_id, status…` — compatible), plus `integration_composio_connections`, `security_audit_log`, `tasks`, `voice_command_sessions`, `client_approvals`, `data_room_documents`, `document_embeddings`, `businesses`, `client_agent_actions`. **ABSENT from prod:** `crm_leads`, `crm_contacts`, `crm_opportunities` (sandbox/draft only). **Consequences:** (a) the FK targets DO exist, so a promote will **not** fail referentially — the board's biggest B1 fear is retired; (b) the only genuinely-unapplied CRM tables are the three `crm_*`; (c) the `built-unverified` rows backed by *present* tables (agent_actions audit, integration mirrors, MFA's `security_audit_log`, voice/tasks) upgrade toward verified; (d) `types/supabase.ts` must still be regenerated because it is wrong — an artifact fix, not a blocker.

---

## 3. PRIORITIZED PATH TO FULLY-WORKING

Ordered punch-list. Do the tiers in order — Tier 0 unblocks the whole built-unverified column.

### Tier 0 — Verify prod state (THE blocker; unblocks ~17 built-unverified rows)

1. **Regenerate `types/supabase.ts` from prod (ref `lksfwktwtmyznckodsau`)** — it is stale (May 22). This is BLOCKER B1; it invalidates every "applied/live" claim until done.
2. ✅ **DONE (2026-06-16) — dependency chain CONFIRMED in prod:** `nexus_clients` (FK target, present), `agent_actions` (present + compatible), and the integration/security/voice tables all exist; only `crm_leads` / `crm_contacts` / `crm_opportunities` are absent. The promote will **not** fail referentially.
3. **Promote the CRM migrations branch-first** (`20260523100000_crm_leads.sql`, `20260523103000_crm_contacts_opportunities.sql`, `20260510000004_nexus_agent_actions.sql`): write/keep the migrations in `apps/web/supabase/migrations/`, validate them on a Supabase database branch (ephemeral per-branch DB; never against prod), then promote to prod (`lksfwktwtmyznckodsau`) ONLY by merging the approved branch — never apply to prod directly or autonomously. Re-regenerate types and diff after the merge.
4. **Wire `check:schema-drift` into CI** — the script exists but is not a CI step and would currently fail (types already diverge). Add it with `SUPABASE_ACCESS_TOKEN` so drift can never silently recur.

### Tier 1 — Connect / finish the built-unverified & partial (turn near-done into working)

5. **`GET /api/crm/contacts` (list + by-id)** — missing read side; contacts route is POST/PATCH-only. Required before any contacts UI.
6. **`GET /api/crm/opportunities` + `/forecast` rollup (single-currency AUD)** — no GET handler, no weighted (Σ value×probability/100) rollup; harden `value_currency` to `NOT NULL DEFAULT 'AUD' + CHECK` first.
7. **CRM approval **request + execute** endpoints** (`POST /api/crm/approvals`, `POST /api/crm/approvals/[id]/execute`) — make `evaluateCrmApprovalLifecycle` the single runtime gate (it is verified but orphaned today); 403 on `requested`, idempotent 409 on `executed`, append `agent_actions`.
8. **Finish timeline event-write coverage** — wire the un-emitted types: `lead_captured` / `lead_qualified` (marketing + lead routes), `approval_approved/rejected/cancelled/expired` (approval-lifecycle), `task_completed`, `integration_stale`.
9. **Build the real email/calendar ingest** (Pillar 5 long-pole) — fetch Gmail/Calendar via Composio, write read-only activity rows, approval-gate send (off by default); add `composio-email-ingest.test.ts`. Today is connection-mirror only.
10. **Add direct unit tests for `require-admin.ts`** (401-vs-403 branch, constant-time path) and for the **client-deliverable magic-link routes** (mint→approve, double-approve→409, expiry→410, HMAC receipt) — both are built but have zero direct test coverage; remove `@ts-nocheck`.

### Tier 2 — Close the V1 HARD gates / security holes (No-Go conditions)

11. **Enforce MFA as a real gate** — `requireAdmin`/`checkAdminSession` must reject sessions lacking verified MFA; migrate MFA state off the absent `users`/`security_audit_log` tables. (No-Go condition 8.)
12. **Tighten `agent_actions` read policy to founder-only** — current policy is `FOR SELECT TO authenticated USING (true)`; every authenticated principal can read the entire audit trail. (No-Go condition 7.)
13. **Distinct read-only Margot credential + `x-actor-id` attribution (B2)** — today all mutating routes share one service-role bearer audited as the literal `'service-role'`; a leaked key is indistinguishable from Margot/Phill.
14. **Converge `ALLOWED_ADMINS`** — defined **7 times** (canonical + 6 route-local copies); add a CI grep guard so a second definition fails the build.
15. **`auth-before-config` fix** on `daily-digest/route.ts` (503 leaks config state before `requireAdmin`) and **Composio inbound webhook** signature verification + idempotency.

### Tier 3 — Build the missing V1 surfaces (the entire CRM UI)

16. **Contacts list + detail/timeline pages**, **Pipeline board + forecast dashboard**, **Approval queue UI**, **CRM nav cluster**, **per-entity ActivityLog filter** — all missing; gate behind a hoisted server `command-center/crm` admin layout.
17. **Lead→CONTACT materialization** (`crm_convert_lead_to_contact` RPC + `convert-to-contact` route) — the existing convert route links lead→client only and never creates a contact, non-transactionally.
18. **Platform V1 hardening backlog:** `updated_at` triggers, shared `safe-additional-data.ts`, consent provenance + `do_not_contact` send-block, optimistic-locking on PATCH, idempotency-key table, unified error envelope, CSRF on cookie-auth, `next.config.js ignoreBuildErrors:false`, route-inventory + schema-drift in CI, Playwright smoke, coverage thresholds, Sentry `beforeSend` PII scrub + env-driven sample rate.

### Tier 4 — V2 / V3+ (deferred, correctly missing)

Products/line-items, drag-and-drop pipeline, full mailbox round-trip, win/loss + KPI analytics + PDF export, rules/SLA engine, Vercel AI Gateway + draft-email/forecast-narrative/enrichment/CRM-semantic-search depth, Apify acquisition/enrichment/prospecting, versioned public `/api/v1/*`, `crm_accounts`/`crm_approvals`/`activity_timeline` dedicated tables, privacy-scope RLS, granular RBAC, multi-region failover, DR drill off-DRAFT, retention sweeper, post-deploy smoke + heartbeat.

---

## 4. FULL LEDGER

`impl` = implemented · `conn` = connected · `work` = working column. Evidence terse (path refs); full evidence in the verified JSON.

### Pillar 1 — Identity & data foundation

| Task | Phase | Claimed | TRUE | impl | conn | work | Gap (terse) |
|---|---|---|---|---|---|---|---|
| crm_contacts table | V1 | partial | built-unverified | partial | partial | unverified | Migration `20260523103000` exists L6-78; absent from prod types. Promote + regen; add applied-schema test. |
| Dedupe keys + DB uniqueness | V1 | partial | partial | partial | partial | code-only | Route computes only email/domain keys (`contacts/route.ts` L241-262); no UNIQUE index; phone/name keys never populated. |
| Privacy scopes on contacts | V1 | partial | built-unverified | yes | yes | code-only | CHECK + multi-link 403 implemented & tested; table not prod-applied; not yet an RLS predicate. |
| Contact create/update POST+PATCH | V1 | partial | built-unverified | yes | partial | code-only | `contacts/route.ts` L204-404, tested (mocked). No UI consumer; table not in prod. |
| Contact read GET (list+by-id) | V1 | missing | missing | no | no | n/a | No `export async function GET` in contacts route. |
| Phone & name+company dedupe | V1 | missing | missing | no | no | n/a | Columns exist L27-28, route never writes them. |
| Lead→contact conversion RPC | V1 | missing | missing | no | no | n/a | `crm_convert_lead_to_contact` = 0 hits. |
| Contacts list surface (UI) | V1 | missing | missing | no | no | n/a | No `command-center/crm` dir. |
| Contact detail + per-entity timeline | V1 | missing | missing | no | no | n/a | No detail route; ActivityLog is global feed. |
| Custom fields (additional_data) | V2 | partial | **over-claimed** | partial | no | code-only | No shared `src/lib/crm/` filter; contacts hardcodes `additional_data:{}` L263. |
| Prod-state baseline / regen types (B1) | V1 | missing | missing | no | no | broken | THE blocker. types stale; nexus_clients FK targets absent in prod. |
| CRM admin gate hoisted to layout | V1 | missing | missing | no | no | n/a | Preventative; no crm/* pages exist yet. |
| Contact merge executor | V2 | missing | missing | no | no | n/a | No merge logic in `src/lib/crm/`. |
| Contact merge POST /merge | V2 | missing | missing | no | no | n/a | No route file. |
| Dedupe / merge review modal (UI) | V1 | missing | missing | no | no | n/a | No CRM UI; primitives only. |
| Normalized crm_accounts table | V2 | missing | missing | no | no | n/a | Free-text company_name in V1. |
| Privacy-scope RLS enforcement | V3+ | missing | missing | no | no | n/a | service_role-only RLS today; correctly deferred. |

### Pillar 2 — Leads

| Task | Phase | Claimed | TRUE | impl | conn | work | Gap (terse) |
|---|---|---|---|---|---|---|---|
| crm_leads table | V1 | partial | built-unverified | yes | partial | unverified | `20260523100000_crm_leads.sql` complete; absent from prod types; nexus_clients FK risk. |
| Public lead intake POST /marketing/leads | V1 | exists | **working** | yes | yes | verified | Rate-limited, SendGrid-independent, writes crm_leads, tested. (Returns 200 not 201; no qualifyLead call.) |
| Lead list GET /api/crm/leads | V1 | exists | **working** | yes | partial | verified | Admin-gated, zod filters, tested. No dedicated UI caller. |
| Lead→client conversion POST /convert | V1 | exists | **working** | yes | partial | verified | Board-approval gated, dryRun, race-safe, tested. Does NOT create contact. |
| Lead→CONTACT materialization | V1 | missing | missing | no | no | n/a | No convert-to-contact route / RPC. |
| Historical-lead backfill decision (P22) | V1 | missing | missing | no | n/a | n/a | Policy row; record decision in phase-plan.md. |

### Pillar 3 — Opportunities / pipeline

| Task | Phase | Claimed | TRUE | impl | conn | work | Gap (terse) |
|---|---|---|---|---|---|---|---|
| crm_opportunities table | V1 | partial | built-unverified | yes | partial | code-only | Migration L80-171 (12-stage CHECK); absent from prod types. |
| Opportunity create/update POST+PATCH | V1 | partial | built-unverified | yes | partial | verified | Won-approval gate, billing firewall, PATCH redaction; 35 tests (mocked). Table not prod. |
| Opportunity inline approval gating | V1 | exists | built-unverified | yes | yes | verified | ≥6-char boardApprovalId + approved before won; tested. Gates a prod-unconfirmed table. |
| Opportunity read GET + forecast rollup | V1 | missing | missing | no | no | n/a | No GET; no weighted forecast endpoint. |
| value_currency NOT NULL DEFAULT AUD + CHECK | V1 | missing | missing | no | no | n/a | Column nullable, no default/CHECK; route accepts USD/NZD/GBP/EUR. |
| Pipeline board + forecast dashboard (UI) | V1 | missing | missing | no | no | n/a | No pipeline route; cited components unwired/wrong stage enum. |
| Products / line items / quotes | V2 | missing | missing | no | no | n/a | Forecast-only single-value in V1. |
| Optimistic drag-and-drop stage change | V2 | missing | missing | no | no | n/a | No board to build on. |

### Pillar 4 — Activities & timeline

| Task | Phase | Claimed | TRUE | impl | conn | work | Gap (terse) |
|---|---|---|---|---|---|---|---|
| Unified timeline via agent_actions extension | V1 | partial | partial | yes | partial | code-only | Mapper tested; only 5 of 16 event types written; agent_actions not prod-confirmed. |
| Sanitized agent_actions append on every mutation | V1 | exists | built-unverified | yes | yes | verified | Append-only, non-fatal on failure, tested. Table not prod-confirmed. |
| Unified activity timeline (global feed UI) | V1 | partial | partial | yes | partial | code-only | ActivityLog live-wired to agent_actions; no entity-filter prop; generic shape not crm_timeline_*. |
| agent_actions.client_id FK fix + slug index (R6) | V1 | missing | missing | no | no | broken | FK references `public.clients` not `nexus_clients`; no slug index. |
| Dedicated activity_timeline table | V3+ | missing | missing | no | no | n/a | Correctly deferred. |

### Pillar 5 — Email & calendar

| Task | Phase | Claimed | TRUE | impl | conn | work | Gap (terse) |
|---|---|---|---|---|---|---|---|
| Composio email/cal 2-way sync (V1 long-pole) | V1 | partial | **over-claimed** | partial | partial | code-only | Connection-state mirror only — no ingest/token/send. `integration_composio_connections` absent from prod types; no tests. |
| Read-only email/cal digest fallback | V1 | missing | missing | no | no | n/a | daily-digest has no email/cal; cited path is a social digest. |
| Email/calendar surface UI | V2 | missing | missing | no | no | n/a | No EmailThreadView. |
| Full e2e mailbox/cal round-trip tests | V2 | missing | missing | no | no | n/a | google-calendar-client.ts orphaned (zero importers). |

### Pillar 6 — Communications & notifications

| Task | Phase | Claimed | TRUE | impl | conn | work | Gap (terse) |
|---|---|---|---|---|---|---|---|
| Voice ingress POST /margot-voice/task | V1 | exists | **working** | yes | yes | verified | Separate ingest token, approval→blocked, 23 tests; target tables in prod. |
| Consent provenance + marketing_consent on sends | V1 | missing | missing | no | no | broken | consent_source/captured_at never written; no do_not_contact send gate. |
| Templated sends / nurture / Telegram / notifications | V2 | partial | **over-claimed** | partial | partial | code-only | No CRM sequence engine; cited Telegram callback is a PI JSONL gate. |

### Pillar 7 — Billing / revenue

| Task | Phase | Claimed | TRUE | impl | conn | work | Gap (terse) |
|---|---|---|---|---|---|---|---|
| Stripe ARR/subscription view (CRM, read-only) | V2 | partial | **over-claimed** | partial | partial | code-only | ARR rollup is empire data-room P&L, not CRM. No CRM billing route; claimed test absent; integration_stripe_* not in prod types. |

### Pillar 8 — Documents / data room

| Task | Phase | Claimed | TRUE | impl | conn | work | Gap (terse) |
|---|---|---|---|---|---|---|---|
| Founder-only RLS on data_room_documents | V1 | exists | built-unverified | yes | yes | unverified | Policies in `20260518100000`; wired empire-side. Table absent from prod types; no pg_policies test. |
| Attach proposals/files to CRM objects | V2 | partial | **over-claimed** | no | no | n/a | No attachment code at all; claimed test absent; cited helper unrelated. |
| E-sign + proposals flow | V3+ | missing | missing | no | no | n/a | Correctly missing. |

### Pillar 9 — Reporting & analytics

| Task | Phase | Claimed | TRUE | impl | conn | work | Gap (terse) |
|---|---|---|---|---|---|---|---|
| Forecast rollup unit + dashboard e2e smoke | V1 | missing | missing | no | no | n/a | No weighted forecast fn; no Playwright config. |
| Win/loss + activity analytics dashboard | V2 | missing | missing | no | no | n/a | ui/chart.tsx orphaned; AnalyticsDashboard unrelated. |
| Win/loss, activity, KPI dashboards + PDF export | V2 | missing | missing | no | no | n/a | Claimed test absent; no reporting route. |

### Pillar 10 — Workflow automation

| Task | Phase | Claimed | TRUE | impl | conn | work | Gap (terse) |
|---|---|---|---|---|---|---|---|
| updated_at BEFORE UPDATE triggers on CRM tables | V1 | missing | missing | no | no | n/a | No trigger; copy client_approvals pattern. |
| Authenticated cron lifecycle wrapper (CRON_SECRET) | V1 | exists | partial | yes | partial | verified | Wrapper sound + used by integration crons, BUT no CRM digest/email-cal cron exists (claim false). |
| Rules/triggers, conditional tasks, SLA on approvals | V2 | missing | missing | no | no | n/a | No rule engine. |

### Pillar 11 — AI layer

| Task | Phase | Claimed | TRUE | impl | conn | work | Gap (terse) |
|---|---|---|---|---|---|---|---|
| Deterministic lead scoring (qualifyLead) | V1 | exists | **working** | yes | partial | verified | Pure scorer, tested. Confirm ingest call site. |
| Next-best-action in daily digest | V1 | partial | partial | partial | yes | code-only | Leads get a hardcoded constant; opps read DB column — no NBA rule. |
| Recommendation-only contract enforcement | V1 | partial | partial | partial | partial | code-only | routes-check enforces auth posture, not "no AI service-role write". |
| Margot voice → task → approval pipeline | V1 | exists | built-unverified | yes | yes | verified | Tested; tables in prod. Live insert not observed. |
| Margot voice signed-url issuance | V1 | exists | **working** | yes | yes | verified | requireAdmin, 900s, fails closed, tested. |
| AI action audit trail (agent_actions) | V1 | exists | **over-claimed** | yes | yes | code-only | agent_actions absent from prod types; claimed test absent. |
| Approval execution handler on lifecycle | V1 | missing | partial | partial | no | code-only | Engine complete + tested but ORPHANED — no guarded route consumes it. |
| Voice transcript retention/privacy (AI-VOICE-001) | V1 | missing | missing | no | no | n/a | Raw transcript stored; candidate blocked_approval. |
| AI recommendation affordance (advisory UI) | V1 | missing | missing | no | no | n/a | No AiRecommendationCard. |
| Vercel AI Gateway + AI SDK standup | V2 | missing | missing | no | no | n/a | No ai/@ai-sdk deps; legacy gateway still imported. |
| LLM next-best-action rationale | V2 | missing | missing | no | no | n/a | No generateObject. |
| Draft-email assistance | V2 | missing | missing | no | no | n/a | Composio client is read-only lister. |
| Timeline/thread/transcript summarization | V2 | missing | missing | no | no | n/a | No LLM summarization; blocked by AI-VOICE-001. |
| Forecast insight narrative | V2 | missing | missing | no | no | n/a | No narrative code. |
| Semantic search over CRM corpus | V2 | partial | partial | partial | partial | code-only | Route searches Nexus docs not CRM; no privacy scopes; not rate-limited. |
| Mocked answer-shape eval harness (AI-RET-001) | V2 | partial | **working** | yes | yes | verified | 227 tests, forbids overclaims. More built than "partial"; consider upgrading. |
| Decommission legacy AI gateway scaffold | V2 | partial | partial | partial | partial | code-only | Still imported by content-gen/compliance/cognitive; not quarantined. |
| LLM cost/rate-limit & spend caps on AI routes | V2 | partial | partial | partial | partial | code-only | search/nexus route NOT rate-limited; no token budget. |
| Enrichment as approval-gated suggested edits | V3+ | missing | missing | no | no | n/a | No suggested-edit model. |
| AI depth umbrella (draft/forecast/enrich/search) | V3+ | missing | missing | no | no | n/a | None implemented; floor + harness only. |

### Pillar 12 — Approvals & governance

| Task | Phase | Claimed | TRUE | impl | conn | work | Gap (terse) |
|---|---|---|---|---|---|---|---|
| Stage-1 task-subtype approval persistence | V1 | exists | **working** | yes | partial | verified | Pure classifier, 35 tests. No persistence caller (logic-only). |
| Recommendation-only approval lifecycle engine | V1 | exists | **working** | yes | partial | verified | safeToAutoExecute hard-false; 35 tests. Not yet single runtime authority. |
| Approval-execution endpoint /execute | V1 | missing | missing | no | no | n/a | No approvals dir; engine orphaned from execution. |
| Approval request endpoint POST /approvals | V1 | missing | missing | no | no | n/a | No create route. |
| Client-deliverable magic-link approval | V1 | exists | built-unverified | yes | yes | code-only | sha256-at-rest, HMAC receipt, race-safe; but ZERO tests, table not prod, @ts-nocheck. |
| Approval queue surface (UI) | V1 | partial | **over-claimed** | no | no | n/a | No queue component; cited paths are engine + generic panel. |
| agent_actions append-only DB trigger | V1 | missing | missing | no | no | n/a | No trigger; table not prod. |
| Source-of-truth enforcement (no overwrite Stripe/Linear) | V1 | exists | partial | partial | partial | unverified | Policy/convention; no automated guard test. |
| crm_approvals dedicated table | V2 | missing | missing | no | no | n/a | No migration; correctly deferred. |

### Pillar 13 — Admin & access

| Task | Phase | Claimed | TRUE | impl | conn | work | Gap (terse) |
|---|---|---|---|---|---|---|---|
| requireAdmin shared auth gate | V1 | exists | built-unverified | yes | yes | code-only | Clean gate, imported by routes; no direct unit test for 401-vs-403/constant-time. |
| Admin JWT daily rotation to Vercel env | V1 | exists | built-unverified | yes | yes | code-only | Workflow + script present; no test; dry-run not executed here. |
| Enforce TOTP MFA (HARD V1 gate) | V1 | partial | **over-claimed** | partial | no | broken | Opt-in only; requireAdmin never calls verifyMFA; writes to absent `users`/`security_audit_log`. |
| Distinct read-only Margot credential + x-actor-id (B2) | V1 | missing | missing | no | no | n/a | Single service-role bearer audited as literal 'service-role'. |
| Single canonical ALLOWED_ADMINS export | V1 | missing | missing | no | no | n/a | Defined 7× (1 canonical + 6 route-local); no guard. |
| CRM navigation cluster (cockpit IA) | V1 | missing | missing | no | no | n/a | No cluster; underlying pages missing. |
| Generic secret rotation workflow | V2 | missing | missing | no | no | n/a | Only single-purpose JWT rotation. |
| (Pulled to V1) Actor attribution x-actor-id | V1 | missing | missing | no | no | n/a | Cross-ref of B2; missing. |
| Full multi-section nav + granular RBAC | V3+ | missing | missing | no | no | n/a | Only 2-entry allow-list; correctly deferred. |

### Pillar 14 — Integrations

| Task | Phase | Claimed | TRUE | impl | conn | work | Gap (terse) |
|---|---|---|---|---|---|---|---|
| Integration cron mirrors (9) via withSyncLifecycle | V1 | exists | built-unverified | yes | yes | code-only | All 9 routes + read surface wired; sync-contract is shape-only; `integration_sync_state` absent from prod types. (onepassword off-Vercel.) |
| Stripe billing mirror + signature-verified webhook | V1 | exists | built-unverified | yes | yes | code-only | Webhook verifies sig, idempotent, atomic; tables absent from prod types; no dedicated webhook test; @ts-nocheck. |
| Linear execution mirror + issue create/update | V1 | exists | built-unverified | yes | yes | code-only | Admin-gated, tested (mocked fetch); integration_linear_* absent from prod types; no negative-auth assert. |
| DR/NRPG external lead intake | V1 | exists | built-unverified | yes | partial | code-only | Least-privilege gate, dedupe idempotency, retry classification, tested (mocked supabase); downstream CRM tables absent from prod → would 503. |
| 1Password secret mgmt + sandbox-first creds | V1 | exists | **working** | yes | yes | verified | Credential-boundary test (~20 cases) over the real shell script. No prod-table dependency. |
| Apify data-acquisition connection | V2 | partial | partial | no | no | n/a | Zero apify refs in repo; "partial" is external Vercel/Apify state only. |
| Apify enrichment → suggested edits | V2 | missing | missing | no | no | n/a | No code. |
| Apify prospecting/monitoring → advisory leads | V2 | missing | missing | no | no | n/a | No code. |
| Versioned public API /api/v1/* | V3+ | missing | missing | no | no | n/a | No v1 dir; correctly deferred. |

### Pillar 15 — Platform / non-functional

| Task | Phase | Claimed | TRUE | impl | conn | work | Gap (terse) |
|---|---|---|---|---|---|---|---|
| RLS on all CRM tables (service-role floor) | V1 | exists | built-unverified | yes | partial | unverified | Migrations enable RLS; tables absent from prod types; only string-assert test. |
| authenticated SELECT RLS for command-center reads | V1 | missing | missing | no | n/a | n/a | Only service_role ALL exists. |
| Tighten agent_actions read to founder-only (HARD gate) | V1 | missing | missing | no | n/a | broken | Policy is `TO authenticated USING (true)` — full audit trail readable. |
| Branch-first migration pipeline | V1 | exists | **working** | yes | yes | verified | Migrations in `apps/web/supabase/migrations/`, validated on a Supabase database branch (never prod), promoted to prod only via a merged + approved branch. |
| crm_leads IP/user-agent retention decision | V1 | missing | missing | no | n/a | n/a | Raw ip/user_agent text, no retention. |
| Shared additional_data redaction across routes | V1 | missing | missing | no | no | n/a | Filter only in opportunities; contacts hardcodes {}. |
| safeAdditionalData secret-redaction (opportunities) | V1 | exists | **working** | yes | yes | verified | Regex + recursive scan + rejection; tested. |
| Timeline subject-label redaction | V1 | exists | **working** | yes | yes | verified | Replaces display_name before audit; tested. |
| CSRF protection on cookie-auth mutations | V1 | missing | missing | no | n/a | n/a | No CSRF/SameSite/origin check. |
| CI Gate (type-check/lint/test/build) on every PR | V1 | exists | **working** | yes | yes | verified | ci.yml four-stage gate (build has ignoreBuildErrors caveat — own row). |
| Wire security route-inventory check into CI | V1 | partial | partial | partial | no | code-only | Script + test exist; NOT a ci.yml step. |
| Wire schema-drift check into CI | V1 | partial | partial | partial | no | unverified | Script exists; not in CI; types already drift. |
| Remove typescript.ignoreBuildErrors | V1 | missing | missing | no | n/a | broken | next.config.js L15 `true`. |
| CI migration-check on sandbox before promote | V1 | missing | missing | no | n/a | n/a | No CI migration job. |
| Vercel preview wired to per-branch Supabase database branch | V1 | missing | missing | no | n/a | unverified | vercel.json has no preview override; previews should target the PR's Supabase database branch, never prod. |
| Sentry traces sample rate env-driven | V1 | partial | **over-claimed** | no | n/a | broken | All 3 configs hardcode `1.0`. |
| Sentry release tagging + sourcemap upload | V1 | partial | partial | partial | partial | unverified | Plumbing present; needs SENTRY_AUTH_TOKEN (env fact). |
| PII scrubbing on Sentry events (beforeSend) | V1 | missing | missing | no | n/a | n/a | No beforeSend hook. |
| Test coverage gate for CRM lib/API | V1 | missing | missing | no | n/a | n/a | No collectCoverage/threshold. |
| Secret-leak grep + Gitleaks pre-commit/CI | V1 | partial | **over-claimed** | partial | no | code-only | hooksPath=.husky/_ — gitleaks hook not wired; no CI step. |
| Branch protection on main | V1 | missing | missing | no | n/a | unverified | Server-side setting; not in repo. |
| Enable Supabase PITR on prod | V1 | missing | missing | no | n/a | n/a | Doc recommendation only. |
| Daily physical Supabase backups (7-day) | V1 | exists | built-unverified | partial | n/a | unverified | Documented; live-platform assertion. |
| Scheduled backup health-check in CI | V1 | partial | partial | partial | no | code-only | Script exists; not scheduled. |
| Health endpoint as deploy/DR smoke target | V1 | exists | partial | yes | partial | code-only | Endpoint correct; no post-deploy smoke wiring. |
| Weekly Deepsec security scan | V1 | partial | partial | partial | partial | code-only | Scheduled workflow opens issue; not a blocking PR check. |
| AI review board PR gate | V1 | exists | built-unverified | yes | yes | unverified | review-board.yml + chief-reviewer; blocking depends on branch protection. |
| Pure-logic unit tier (CRM engines) | V1 | exists | **working** | yes | yes | verified | 4 suites exist and run in CI. |
| DB-backed dedupe unique-index test (Tier 3) | V1 | missing | missing | no | n/a | n/a | Index non-unique; no database-branch-backed test. |
| Branch-apply migration smoke test (Tier 3) | V1 | partial | partial | partial | no | code-only | Only string-assert test; no live apply on a Supabase database branch. |
| pre-commit lint-staged + related-tests hook | V1 | missing | missing | no | n/a | n/a | No .husky/pre-commit; no lint-staged dep. |
| Playwright smoke harness (e2e) | V1 | missing | missing | no | n/a | n/a | No playwright dep/config. |
| Unified error envelope (errorClass+retryable) (P25) | V1 | partial | partial | partial | partial | code-only | DR route uses different enum; contacts/opps emit none. |
| Idempotency-Key header + crm_idempotency table (P12) | V1 | missing | missing | no | n/a | n/a | No table, no handling. |
| Optimistic-locking If-Match on PATCH (P24) | V1 | missing | missing | no | n/a | broken | Last-write-wins; no precondition. |
| Soft-delete/archive contract + GET pagination (P24) | V1 | missing | missing | no | n/a | n/a | No archive path; no pagination params. |
| Composio inbound webhook sig verify + idempotency (P24) | V1 | missing | missing | no | n/a | n/a | Composio is outbound poller; no inbound receiver. |
| auth-before-config route-convention rule | V1 | missing | missing | no | n/a | broken | daily-digest 503s before requireAdmin (config leak). |
| jest-axe WCAG AA contrast assertion (P14) | V1 | missing | missing | no | n/a | n/a | No jest-axe; --cc-ink-hush #3d4654 used for text. |
| Migration rollback runbook + down-migrations (P23) | V1 | missing | missing | no | n/a | n/a | No runbook; wizard has no down path. |
| Mutating-surface state coverage for CRM UIs (P-UX) | V1 | missing | missing | no | n/a | n/a | No loading/success/error/focus tests. |
| Quarterly DR restore-to-branch drill | V2 | partial | partial | partial | n/a | unverified | DR runbook DRAFT v0.2; no recorded drill. Restore to a Supabase database branch / fresh project, never to prod. |
| Multi-region failover doc/toggle | V2 | missing | missing | no | n/a | n/a | regions:["syd1"] only. |
| Cron stall alerting + Supavisor pooling | V2 | missing | missing | no | n/a | n/a | No stall alert; no Supavisor. |
| Post-deploy smoke + uptime heartbeat | V2 | missing | missing | no | n/a | n/a | No smoke workflow/heartbeat. |
| One-route-one-test naming guard | V2 | missing | missing | no | n/a | n/a | No CI naming guard. |
| Retention sweeper | V2 | missing | missing | no | n/a | n/a | retention_policy column unused. |
| Backups/DR runbook off DRAFT | V3+ | missing | partial | partial | n/a | unverified | Runbook materially started (DRAFT v0.2); no validated drill. |

---

*Ledger built from a per-task audit of all 148 matrix rows against the working tree at `/Users/phillmcgurk/Unite-Group`, branch `mesh/mission-control-2026-06-11`, on 2026-06-16. The governing fact: `types/supabase.ts` (the only machine-readable prod oracle) is dated `May 22 19:03` and contains none of the CRM/integration tables, so every DB-dependent "working" verdict is downgraded to built-unverified until prod state is regenerated (B1).*
