# CRM V1 — Verified Status (2026-06-21)

> **Purpose.** An evidence-tagged re-verification of the root `spec.md` "Authority-Site
> In-House CRM" V1 finish-line against **actual prod + code state**, requested by Phill
> ("how far from 100%, is spec.md being updated"). This file **does not edit `spec.md`** —
> it reports what is true today.
>
> **Evidence rule.** `[VERIFIED]` = I ran the tool / read the line this session.
> `[UNCONFIRMED]` = could not verify. Prod reads are read-only `SELECT`s against the
> shared prod project `lksfwktwtmyznckodsau` (Phill-authorized re-verify), `information_schema`
> + `count`/column introspection only — never DDL/DML.

---

## Headline: there are TWO CRM data models, and `spec.md` describes the one that didn't ship

`spec.md` is built entirely around a `crm_leads` / `crm_contacts` / `crm_opportunities`
spine, an approval-lifecycle execution engine, a `crm_convert_lead_to_contact()` RPC, and an
opportunity-forecast surface. **In prod, that spine does not exist.** What actually shipped is
a different, simpler founder CRM (`contacts` / `leads` / `pipeline_stages` …) that `spec.md`
never describes. So the spec has drifted from reality not just in framing (Unite-Hub /
Authority-Site) but at the **data-model level**. `[VERIFIED — see below]`

This is the honest answer to "is spec.md being updated": **no** — and the gap is now deep
enough that the spec's V1 gates can't be read as a progress bar for what's live.

---

## Prod DB state (`lksfwktwtmyznckodsau`, public schema) `[VERIFIED]`

**Present (relevant to the spec's FK targets):**

| Table | Cols | Note |
|---|---|---|
| `agent_actions` | 12 | audit/timeline trail — live |
| `nexus_clients` | 16 | "Nexus paying retainer clients … auto-provisioned on Stripe webhook" |
| `ai_file_transcripts` | 14 | "Durable transcript results for founder-owned ai_file_cache rows" |

**Absent — the entire `spec.md` CRM spine:**

| Table the spec promotes | In prod? |
|---|---|
| `crm_leads` | **No** |
| `crm_contacts` | **No** |
| `crm_opportunities` | **No** |
| `crm_idempotency` | **No** |

*(Two independent `SELECT`s over `information_schema.tables` — none of the `crm_*` tables
returned; an `ilike '%crm%'` sweep returned zero `crm_`-prefixed tables.)* `[VERIFIED]`

**The founder CRM that DID ship (live in prod):**

| Table | Scoping | Shape (abridged) |
|---|---|---|
| `contacts` (34 cols) | **`founder_id`** + `business_id` | email, company, status, buying_intent, decision_stage, ai_analysis, embedding, custom_fields, first/last_name, tags |
| `leads` | `workspace_id` | email, source, lead_status, score, `converted_to_contact_id` |
| `lead_scores` | `workspace_id` + `contact_id` | tiered scoring (engagement/firmographic/…/temporal), model_confidence |
| `pipeline_stages` | `workspace_id` | name, position, is_won, is_lost |
| `contact_interactions` | `contact_id` | interaction_type, ai_sentiment, engagement_score |

> **Model-coherence note `[INFERENCE]`:** `contacts` is `founder_id`-scoped (matches the
> apps/web NorthStar rule), but `leads` / `lead_scores` / `pipeline_stages` are
> `workspace_id`-scoped — i.e. the live CRM is itself two lineages stitched together, not a
> single clean spine. Worth a decision (see below).

---

## `spec.md` V1 finish-line — gate by gate (against reality) `[VERIFIED]`

| Spec V1 gate (from `spec.md` §1/§15) | Reality today | Verdict |
|---|---|---|
| **G1** — `crm_contacts` + `crm_opportunities` promoted to prod with CRUD/dedupe/convert | `crm_*` tables **absent from prod**; migration files exist (`20260612020000_crm_leads.sql`, `20260612021000_crm_contacts_opportunities.sql`) but **unpromoted**. A live `contacts` table serves the actual CRM instead. | **NOT met as written** (superseded by `contacts`) |
| **G2** — approval workflow wired (engine → execute route → audit) | Engine `src/lib/crm/approval-lifecycle.ts` exists, but **no `/api/crm/approvals/[id]/execute` route**; only `telegram/approval-callback/route.ts` (a 501 stub). Engine is **orphaned**. | **NOT met** |
| **G3** — pipeline + forecast READ dashboard on `crm_opportunities` | `src/lib/crm/opportunity-forecast.ts` exists but its **only caller is its own test** — unwired, and it targets a table that isn't in prod. No forecast dashboard UI. | **NOT met** (dead path) |
| **G4** — advisory AI (lead score + NBA) in the daily digest | `lead_scores` table is live in prod and `contacts` carries `ai_analysis`/scoring columns — so scoring exists on the **shipped** model, not the spec's. Digest join `[UNCONFIRMED]`. | **Partially real, off-spec** |
| **G5** — email/calendar 2-way sync OR read-only fallback | `src/lib/integrations/gmail.ts` + `calendar.ts` + `google-oauth.ts` do **real OAuth reads**; **no 2-way write** path; Composio replaced by direct Google integration. | **Read-only fallback met; 2-way NOT** |

**Supporting gaps the spec calls V1-blocking, confirmed absent:** `crm_convert_lead_to_contact()`
RPC — **not present**; `crm_idempotency` table — **not present**; partial-UNIQUE dedupe index +
`set_updated_at` trigger on the `crm_*` tables — **moot** (tables unpromoted). `[VERIFIED]`

---

## "Noise-removal" tooling — what's actually wired `[VERIFIED]`

| Gate | Reality |
|---|---|
| CI lint → type-check → test → build | **Real**, runs per PR (`.github/workflows/ci.yml`). |
| Root `verify` / `verify:web` aggregate | **Real** (`package.json`: `verify:web` = install+type-check+lint+test+build; `verify` chains web/workspace/mcp/spec-board). |
| `security:routes-check` | **Absent** — not a script in root or `apps/web/package.json`, not in CI. (Referenced by `spec.md` as a gate.) |
| `check:schema-drift` | **Absent** — same. This is the gate that would have *caught* the spec-vs-prod model drift above. |
| Supabase branch-first DB discipline | Policy intact; but the live CRM tables were clearly applied outside the `crm_*` migration files, so prod ≠ repo migrations for the CRM surface. `[INFERENCE]` |

---

## So, "how far from 100%?" — the honest read

There is **no single 100% line**, and measuring against `spec.md`'s V1 gates is misleading
because the team shipped a *different* CRM than the spec describes:

- **Against `spec.md` V1 literally:** roughly **1 of 5 gates** even partially met (read-only
  email fallback; the `crm_*` spine, approval execution, forecast dashboard, and convert RPC
  are not in prod). `[VERIFIED]`
- **Against "is there a working CRM?":** **yes** — a founder-scoped `contacts` CRM with a UI,
  API, lead scoring, and pipeline stages is live in prod. It's just **un-spec'd**. `[VERIFIED]`

The real "noise" Phill asked about is this fork: a 875-line spec pointing at `crm_*` tables that
don't exist, while the actual CRM grows under different names with no spec and no schema-drift
gate to flag the divergence.

## Recommended decision (for Phill — not actioned here)

One of two reconciliations, then delete the ambiguity:
1. **Adopt reality:** retire/rewrite `spec.md` to describe the shipped `contacts`/`leads`/
   `pipeline_stages` model; unify the `founder_id` vs `workspace_id` scoping; delete the
   unwired `crm_*` migrations + `opportunity-forecast.ts` + the orphaned approval engine, or
   wire them. **Recommended** — least surprise, matches what's live.
2. **Honor the spec:** promote the `crm_*` spine branch-first and migrate `contacts` → `crm_contacts`.
   Larger, riskier, and throws away working code.

Either way: **add `check:schema-drift` to CI** so prod-vs-repo divergence can't recur silently.

---

### Sources (this session)
- Prod `SELECT`s over `information_schema` on `lksfwktwtmyznckodsau` (3 queries, read-only).
- `apps/web/src/app/api/contacts/route.ts` → `.from('contacts')`.
- `apps/web/supabase/migrations/2026061202{0000,1000}_*.sql` (files present, unpromoted).
- `apps/web/src/lib/crm/{approval-lifecycle,opportunity-forecast}.ts` (present; callers = tests only).
- root `package.json` (`verify:web`, `verify`); no `routes-check`/`schema-drift` scripts.
