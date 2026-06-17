# Schema / SQL Audit — `apps/web` vs prod `lksfwktwtmyznckodsau`

> **Date**: 18/06/2026 · Locale: en-AU · Evidence Standard tags apply.
> Triggered by: "check the entire SQL files — cleanup, enhancement, what's missing."
> All prod facts below are `[VERIFIED]` via read-only `execute_sql` against the prod
> project on 18/06/2026.

---

## 0. Headline

`lksfwktwtmyznckodsau` is **not an apps/web-only database**. It is a **shared,
heavily-accreted mega-DB** (1,728 public tables) whose schema is managed by a
**separate migration history** from this repo. apps/web is a small tenant in it
(~73 tables). The repo's `supabase/migrations/` is **not** prod's source of truth.

The practical risk this creates: apps/web ships code that `.from()`s tables which
were never applied to this shared DB — silent drift landmines (the `pi_run_queue`
incident, #311, was one).

---

## 1. Sprawl / drift (thread: investigate) `[VERIFIED]`

| Metric | Value |
|---|---|
| Public tables on prod | **1,728** |
| Tables declared by apps/web active migrations | ~73 |
| Migrations prod's own history tracks (`supabase_migrations.schema_migrations`) | **96** (versions `001` → `20260615051458`) |
| RLS enabled across all 1,728 tables | **Yes (0 disabled)** ✅ |

**Table-name clusters (top prefixes):** `synthex_` **409**, `guardian_` **132**,
`founder_` 85, `unite_` 77, `client_` 28, `agent_` 26, `ai_` 25, `integration_`
24, `convex_` 18, `seo_` 11, `domain_` 10, `content_` 10 …

`[INFERENCE]` These clusters map to **other products** (Synthex publishing engine,
Guardian, Unite, SEO tooling, a Convex bridge) — i.e. this Supabase project has
been shared across the portfolio over time. The 96-entry prod migration history
(distinct versioning, incl. a `001` baseline) is managed **outside** apps/web's
repo. A prior repo audit (`.claude/audits/migrations-audit.md`) records destructive
`021_NUCLEAR_RESET.sql` / `022_FORCE_CLEAN.sql` migrations — the schema was
re-baselined at least twice.

**Recommendation:** treat prod as a shared, externally-managed DB. apps/web should
only ever apply **additive, `IF NOT EXISTS`, founder-scoped** migrations here, and
should namespace its tables clearly. Do **not** attempt to reconcile apps/web's
migration history with prod's — they are different lineages by design.

---

## 2. What's missing (thread: what's missing) `[VERIFIED]`

16 tables the apps/web code `.from()`s do **not** exist on prod. Verified absent
(control tables `contacts` / `campaigns` / `credentials_vault` confirmed present).

### 2a. Has a repo migration, never applied to prod (12 → 8 files)
Apply these on a Supabase branch → prod (gated). See §3 runbook.

| Table | Migration file |
|---|---|
| `user_settings` | `20260312000000_user_settings_table.sql` |
| `ai_memories` | `20260325000000_ai_memories.sql` |
| `board_meetings`, `board_meeting_notes`, `ceo_decisions` | `20260326000001_ceo_boardroom.sql` |
| `brand_profiles` | `20260316000005_brand_profiles.sql` |
| `campaign_assets` | `20260316000006_campaigns.sql` |
| `drip_enrollments`, `drip_events`, `drip_steps` | `20260608000000_drip_lifecycle_schema.sql` |
| `email_triage_results` | `20260318000001_email_triage.sql` |
| `video_jobs` | `20260603000001_video_jobs_schema.sql` |

### 2b. No migration anywhere — analysed individually
| Table | Verdict |
|---|---|
| `weekly_reviews` | **AUTHORED** this cycle — `20260618010000_weekly_reviews.sql`. The weekly-review cron actively upserts it (currently swallowed by a "table may not exist" try/catch). Founder-scoped, additive. |
| `operator_jobs`, `operator_events` | **Do NOT author for prod.** `operator-gateway/jobs.ts` writes these **only** to an approved sandbox project (`OPERATOR_GATEWAY_SANDBOX_PROJECT_REF = 'xgqwfwqumliuguzhshwv'`) and returns 503 "no production fallback exists." That sandbox project was **deleted 15/06/2026** — so the operator gateway is wired to a dead project. *Separate fix needed: update or retire the hardcoded sandbox ref; not a prod-table gap.* |
| `agent_executions` | **Do NOT author blindly.** Nothing in apps/web writes it — it's read-only telemetry the weekly-review cron expects from an external system. Either wire a writer (pi-ceo) or drop the read. Flagged, not authored. |

---

## 3. Apply runbook for the 12 unapplied (thread: bundle) — GATED

> Sandbox-first per CLAUDE.md: validate on a Supabase **database branch**, then
> promote to prod via a merged/approved branch. Never apply to prod autonomously.
> All eight files are additive `CREATE TABLE IF NOT EXISTS` with RLS — safe to
> co-exist on the shared DB.

Suggested order (dependency-free; chronological is fine):

1. `20260312000000_user_settings_table.sql` — `user_settings` (settings POST currently 500s in prod)
2. `20260316000005_brand_profiles.sql` — `brand_profiles`
3. `20260316000006_campaigns.sql` — `campaign_assets` (+ campaigns family)
4. `20260318000001_email_triage.sql` — `email_triage_results`
5. `20260325000000_ai_memories.sql` — `ai_memories`
6. `20260326000001_ceo_boardroom.sql` — `board_meetings`, `board_meeting_notes`, `ceo_decisions`
7. `20260603000001_video_jobs_schema.sql` — `video_jobs`
8. `20260608000000_drip_lifecycle_schema.sql` — `drip_enrollments`, `drip_events`, `drip_steps`
9. `20260618010000_weekly_reviews.sql` — `weekly_reviews` (new, this cycle)

**Before applying each:** confirm the table truly does not exist on prod
(`select to_regclass('public.<table>')`) — these are `IF NOT EXISTS` so a re-run is
safe, but verifying avoids surprises on the shared DB.

---

## 4. Security (thread: enhancement) `[VERIFIED]`

- **RLS enabled on all 1,728 tables** ✅.
- **2 founder/user-scoped tables have RLS-on but 0 policies** → deny-all (not a
  leak, but unreachable via the normal client):
  - `admin_access_audit` (`user_id`)
  - `domain_memory_alerts_archive` (`founder_id`)
  These are not apps/web tables; flagged for whichever product owns them.
- 48 tables total have 0 policies (mostly `guardian_*` / SEO / marketing — other
  products).
- **Enhancement (apps/web tables):** add `ALTER TABLE … FORCE ROW LEVEL SECURITY`
  to founder-scoped tables per `.claude/rules/database/supabase.md` (defence-in-depth
  so even the table owner is RLS-bound). Scope this to apps/web-owned tables only —
  do not touch other products' tables on the shared DB.

---

## 5. Cleanup (thread: tidy the tree)

- `supabase/migrations/` carries **455 archived `.sql` files** in subdirs
  (`_archive/` 417, `_archived_migrations/` 38) plus `_proposed/` 1. The Supabase
  CLI only reads top-level timestamped files, so these are inert — but they bloat
  the tree. **Action (separate mechanical PR):** consolidate them out of the active
  migrations path. Note: `.claude/audits/migrations-audit.md`,
  `.claude/agents/database-architect/agent.md`, and a dated plan doc reference these
  paths — those are historical and may go stale; that's acceptable.
- 4 unapplied **and** code-unused migration tables (`crm_contacts`, `crm_leads`,
  `crm_opportunities`, `syntax_publish_queue`) — dead or pending; do not apply
  without a consumer.

---

## 6. Action summary

| # | Action | Owner | Status |
|---|---|---|---|
| 1 | Author `weekly_reviews` migration (files-only) | agent | ✅ this PR |
| 2 | Apply the 9-file runbook (§3) on a Supabase branch → prod | **Phill** | gated |
| 3 | Fix operator-gateway dead-sandbox ref (`xgqwfwqumliuguzhshwv` deleted) | agent (follow-up) | open |
| 4 | Decide `agent_executions` writer vs. drop the read | **Phill** / agent | open |
| 5 | `FORCE RLS` on apps/web founder tables | agent (follow-up) | open |
| 6 | Consolidate 455 archived `.sql` out of `migrations/` | agent (separate PR) | open |
