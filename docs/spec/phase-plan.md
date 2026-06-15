# Phased Delivery Plan — Authority-Site In-House CRM

> **Companion artifact to [`/spec.md`](../../spec.md) §13 (Phased Delivery Plan).** Detailed V1 → V2 → V3+ scope, milestones, exit criteria, engineer-day estimates, dependencies, and the email/calendar long-pole + fast-follow fallback.
>
> **Cross-links:** [spec.md](../../spec.md) · [feature-coverage-matrix.md](./feature-coverage-matrix.md) · [data-model-erd.md](./data-model-erd.md)

## Estimation basis

- Effort in **engineer-days (ed)**: one senior (15+ yr) full-stack engineer, including implementation + tests + sandbox apply/diff + PR review.
- **Blended day-rate assumption: AUD $1,200 / engineer-day** `[INFERENCE — surfaced as Open Question OQ-1; confirm before treating costs as firm]`. Indicative cost = ed × rate; all costs scale linearly if the rate changes.
- Estimates assume the existing pure-logic engines (`qualify-lead`, `approval-lifecycle`, `daily-digest`, `activity-timeline`) are **reused, not rebuilt** `[VERIFIED they exist]`.

| Phase | Core effort (ed) | Indicative cost (AUD) |
|---|--:|--:|
| V1 (full email/cal sync) | ~40 | $48,000 |
| V1 (with read-only fallback instead of full sync) | ~30 | $36,000 |
| V2 | ~49 | $58,800 |
| V3+ | ~42 | $50,400 |
| **Program total (V1 core + V2 + V3+)** | **~131** | **$157,200** |

---

## V1 — Core CRM spine + advisory AI + email/cal (LOCKED scope)

**Goal:** Phill can capture a lead, qualify it with advisory AI, convert it to a contact + opportunity, watch it move through a forecastable pipeline, and act on a human-approved next-best-action — entirely inside the command-center, with every CRM object backed by a sandbox-promoted Supabase table, zero AI auto-writes, and Supabase/Stripe/Linear holding their respective truths.

```mermaid
gantt
    title V1 Critical Path
    dateFormat  X
    axisFormat %s
    section Schema
    Sandbox apply + promote contacts/opps   :a1, 0, 4
    section CRM
    Conversion lead->contact->opp           :a2, after a1, 5
    Dedupe (phone + name+company)           :a3, after a1, 3
    Approval execution handler              :a4, after a1, 5
    Unified activity timeline               :a5, after a2, 4
    section Read
    Pipeline + forecast dashboard           :a6, after a1, 5
    section AI
    Advisory AI in daily digest             :a7, after a5, 4
    section LONG-POLE
    Email/cal 2-way sync (OAuth+tokens)     :crit, a8, 0, 14
    Fallback read-only digest sync          :a9, 0, 4
```

| Milestone | Description | Exit criteria | Dependencies | Effort (ed) | Cost (AUD) |
|---|---|---|---|--:|--:|
| **M1.1 Schema live** | Promote `crm_contacts` + `crm_opportunities` to prod via sandbox-wizard | `diff` artifact attached; typed "promote to prod" confirm; `list_tables` shows both; RLS service-role policy verified; **hardening migration** (dedupe UNIQUE index, phone/name_company keys, updated_at trigger, agent_actions append-only trigger) applied | sandbox-wizard; prod ref `lksfwktwtmyznckodsau` | 4 | $4,800 |
| **M1.2 Conversion** | lead→contact→opportunity: extend the existing `convert` route to **materialize a contact** (+ optional opportunity), not just a client-link | Convert produces a deduped contact row, optional opportunity, paired timeline events; identity-conflict + already-converted guards (existing route has these) return 409; dryRun supported | M1.1; reuse `crm-lead-conversion.test.ts` | 5 | $6,000 |
| **M1.3 Dedupe** | Add phone + name+company dedupe keys (today only email enforced) | Duplicate by email/phone/name+company returns 409; one test per key; all four `dedupe_*` keys populated and indexed | M1.1 | 3 | $3,600 |
| **M1.4 Approval execution** | Wire `POST /api/crm/approvals` + `POST /api/crm/approvals/[id]/execute` onto `approval-lifecycle.ts` | Gated write blocked until `approved`; executes only on `may_execute`; never on `rejected`/`expired`; `safeToAutoExecute:false` preserved; idempotent (409 on re-execute); audit row written | M1.1; approval-lifecycle engine | 5 | $6,000 |
| **M1.5 Activity timeline** | Unified feed across leads/contacts/opps/approvals via `agent_actions` | Timeline renders all four object types; sanitized (PII/secret-redacted) labels; entity-filtered instance powers detail-page rails | M1.2 | 4 | $4,800 |
| **M1.6 Pipeline + forecast READ** | Command-center dashboard + `GET /api/crm/opportunities` reading `crm_opportunities` (NOT `agent_actions`) | Forecast = Σ(value × probability/100) by stage; weighted + unweighted totals; refresh < 2s; no client-side writes; source-of-truth label | M1.1; founder-UI `OpportunityCard` model | 5 | $6,000 |
| **M1.7 Advisory AI in digest** | Join `qualify-lead.ts` scoring + heuristic next-best-action into `daily-digest.ts` (recommendation-only) | Digest shows score + band + NBA per lead; AI writes nothing; "No production DB writes…" safety note preserved; required display language rendered | M1.5; both engines exist | 4 | $4,800 |
| **M1.8 Email/cal 2-way sync — LONG-POLE / CRITICAL PATH** | Net-new: OAuth, encrypted token storage/refresh, message+event read/write, thread→contact linking. Composio today is connection-status mirror ONLY | One provider 2-way; tokens encrypted at rest (never in `additional_data`); sync < 5 min; failures non-fatal to CRM persistence; outbound send approval-gated/off by default; no message bodies in CRM truth | OAuth app approval (OQ-2); token-at-rest decision (OQ-3) | 14 | $16,800 |
| **M1.8-FB Fallback (fast-follow)** | If M1.8 slips: read-only inbound digest sync (surface recent email/cal in digest, no outbound write) | Read-only thread/event surfaced in digest < 24h; clearly labelled "read-only"; ships independently of M1.8 | M1.7 | 4 | $4,800 |

**V1 effort (core, excl. fallback): ~40 ed ≈ AUD $48,000.** With fallback instead of full sync: ~30 ed ≈ $36,000.

### V1 long-pole containment (mandatory rule)

M1.8 is **time-boxed to 14 ed**. If it is not demonstrably converging by **day 8**, V1 ships with **M1.8-FB** and M1.8 moves to V1.5. This rule exists so email/cal cannot silently stretch the V1 timeline. The fallback satisfies the "activity timeline includes email/calendar" acceptance with zero send capability.

### V1 exit criteria (gate to V2)

- `crm_contacts` + `crm_opportunities` live in prod (sandbox-promoted, `diff` + typed confirm).
- Lead→contact→opportunity conversion working; identity-conflict and already-converted return 409.
- Dedupe enforced on email, phone, and name+company; duplicate returns 409 with a test per key.
- Approval workflow end-to-end via the execution handler; gated writes pass `evaluateCrmApprovalLifecycle`; `safeToAutoExecute` always false; audit row written.
- Unified activity timeline across leads/contacts/opps/approvals with PII/secret-redacted labels.
- Pipeline + forecast dashboard reads `crm_opportunities`, weighted forecast by stage, refreshes < 2s.
- Advisory AI in digest with zero auto-writes; safety note intact.
- Email/cal 2-way sync OR M1.8-FB fallback shipping.
- `npm run test:all`, `npm run type-check`, `npm run security:routes-check` all green; ≥80% coverage on `src/lib/crm/*` and CRM routes.

---

## V2 — CRM depth (accounts, comms, docs, reporting, automation)

**Goal:** turn the dashboard into a full CRM — normalized accounts, communications/sequences, documents, reporting with export, workflow automation, a Stripe billing view, the Vercel AI Gateway standup, and an e2e harness.

| Milestone | Description | Exit criteria | Effort (ed) | Cost (AUD) |
|---|---|---|--:|--:|
| M2.1 Accounts/orgs | Normalize companies into `crm_accounts`; contact→account rollup | Account object live (sandbox-promoted); contact rollup; merge w/ approval | 6 | $7,200 |
| M2.2 Email/cal full 2-way | Promote fallback → full if deferred; templates + tracking | Bidirectional; open/click tracking; scheduling | 10 | $12,000 |
| M2.3 Communications & sequences | Templated sends, nurture sequences, Telegram, notifications (Telegram approval-callback exists) | Sequence engine; all sends approval-gated | 8 | $9,600 |
| M2.4 Documents / data room | Attach proposals/files to CRM objects (data-room infra exists) | Attachments on contacts/opps; proposal versioning | 6 | $7,200 |
| M2.5 Reporting & analytics | Win/loss, activity, KPI dashboards, PDF export | Dashboards + PDF export; pipeline trend | 7 | $8,400 |
| M2.6 Workflow automation | Rules/triggers, conditional tasks, SLA timers on approvals | Rule engine; SLA breach → digest/notify | 8 | $9,600 |
| M2.7 Billing view | Stripe ARR/subscription view, receipts (Stripe = billing truth, read-only) | ARR rollup from `integration_stripe_*` mirror; no CRM billing writes | 4 | $4,800 |

Also in V2 (folded into the above where applicable): Vercel AI Gateway + AI SDK provider-string standup with legacy `src/lib/ai/gateway/*` quarantined; LLM NBA rationale / draft-email / summarization / forecast narrative (all advisory, no auto-send); CRM-corpus semantic search with privacy scopes; offline AI eval harness; `crm_approvals` dedicated table (if structured history/query needs are proven); dedicated `client_merge` executor; Playwright e2e added; quarterly DR restore-to-sandbox drill.

**V2 effort: ~49 ed ≈ AUD $58,800.**
**V2 exit:** accounts live; full email/cal 2-way; sequences + automation; reporting w/ export; Stripe billing view; e2e smoke (Playwright) added.

---

## V3+ — Governance, scale, intelligence

| Milestone | Description | Effort (ed) | Cost (AUD) |
|---|---|--:|--:|
| M3.1 Granular RBAC | Per-record/role access; team scoping; `privacy_scope` becomes an active RLS predicate | 8 | $9,600 |
| M3.2 AI layer depth | Draft emails, forecast insight, enrichment (approval-gated suggested edits), summarization, semantic search (recommendation-only) | 10 | $12,000 |
| M3.3 E-sign + proposals | Document e-signature flow | 6 | $7,200 |
| M3.4 Public API + webhooks | External `/api/v1/*` surface with API keys, webhook delivery with retries | 8 | $9,600 |
| M3.5 Privacy/consent/retention automation | Automated retention sweeper, consent ledger, DSAR support | 6 | $7,200 |
| M3.6 Backups/DR runbook | Documented DR, PITR validation, restore drill, runbook off DRAFT | 4 | $4,800 |

**V3+ effort: ~42 ed ≈ AUD $50,400.**

> **Multi-tenant note:** an external multi-tenant client portal is explicitly out of V1/V2 scope. If ever added, it requires per-row tenant-isolation RLS (`tenant_id`/`workspace_id` + predicate replacing the service-role-only posture), granular RBAC replacing the 2-email allow-list, per-tenant audit partitioning, per-tenant consent/retention + DSAR tooling, and a full re-run of the deepsec + RLS audit (clearing the deferred 71 `rls_disabled_in_public` + 84 `security_definer_view` findings) before any external tenant is admitted.

---

## Email/calendar long-pole — focused view

This is the single largest net-new build and the V1 critical path. Today Composio is a **connection-state mirror only** (`listConnections` → `integration_composio_connections`); there is no email sync, calendar sync, OAuth token storage, or per-message activity write. `[VERIFIED]`

**Full build (M1.8, 14 ed):** OAuth connect flow → encrypted token storage (1Password-backed or Supabase Vault — OQ-3) → inbound email/event → `agent_actions` activity refs (never message bodies in clear) → outbound send/schedule **approval-gated** (Margot drafts, human sends).

**Fast-follow fallback (M1.8-FB, 4 ed — MUST ship if M1.8 slips):** read-only one-way ingest first — poll Composio for recent messages/events → write activity-timeline refs only, no send, no write-back. Acceptance: the digest shows last-contact email/event timestamp from a real mailbox with zero send capability enabled.

**Contract-first testing:** the email/cal contract suite (token refresh on 401, inbound idempotency = 0 dup timeline rows on re-poll, outbound event push, per-entity `failed[]` isolation, Supabase = truth / Composio mirrors) is written **before** implementation merges, seeded from the existing `tests/integrations/sync-contract.spec.ts` empty-path shape test.

---

## Dependency graph (V1)

```mermaid
flowchart TD
    M11["M1.1 Schema live"] --> M12["M1.2 Conversion"]
    M11 --> M13["M1.3 Dedupe"]
    M11 --> M14["M1.4 Approval execution"]
    M11 --> M16["M1.6 Pipeline + forecast READ"]
    M12 --> M15["M1.5 Activity timeline"]
    M15 --> M17["M1.7 Advisory AI in digest"]
    M17 --> M18FB["M1.8-FB Fallback"]
    M18["M1.8 Email/cal 2-way (long-pole)"]
    M18 -. "day-8 no-converge → ship FB" .-> M18FB
```

---

*See [`/spec.md`](../../spec.md) §13–§15 for the narrative plan, acceptance criteria, and launch-readiness checklist, [`feature-coverage-matrix.md`](./feature-coverage-matrix.md) for the per-feature inventory, and [`data-model-erd.md`](./data-model-erd.md) for the data layer.*
