# Prod apply runbook — 18/06/2026 (the gated DB + provider work)

> One ordered checklist for everything the autonomous session produced that needs
> **your** hands (direct DDL + provider reconnect). Branch-promote is broken for this
> project, so all SQL is applied as **direct DDL** to prod `lksfwktwtmyznckodsau`
> (the way `pi_run_queue` was). Every script is idempotent and ends with a
> verification `SELECT`. **Order matters** — dependencies are noted.

---

## A. DB scripts — apply IN THIS ORDER

All live in `apps/web/supabase/manual-applies/`. Paste each into the Supabase SQL
editor (pointed at the Unite-Group prod project), run, and confirm its final
`SELECT` returns non-null for every table.

| # | Script | Creates / does | Depends on |
|---|---|---|---|
| **1** | `2026-06-18_apply_missing_tables_prod.sql` | 10 missing tables (`user_settings`, `brand_profiles`, `email_triage_results`, `ai_memories`, `board_meetings`/`_notes`, `ceo_decisions`, `video_jobs`, `syntax_publish_queue`, `weekly_reviews`) | — |
| **2** | `2026-06-18_campaigns_reconciliation.sql` ⚠️ rename | renames legacy workspace `campaigns` → `campaigns_legacy_workspace`; creates founder-scoped `campaigns` + `campaign_assets` | **#1** (needs `brand_profiles`) |
| **3** | `2026-06-18_drip_reconciliation.sql` ⚠️ rename | renames legacy `drip_campaigns` → `drip_campaigns_legacy_workspace`; creates founder-scoped `drip_campaigns` + `drip_steps`/`enrollments`/`events` | `contacts` (already on prod) |
| **4** | `20260618020000_appsweb_force_rls_and_founder_indexes.sql` (migrations/) | `FORCE RLS` on the 57 existing apps/web tables + 10 `founder_id` indexes | best **last** |

**⚠️ The two renames (2, 3)** are destructive DDL on **empty** legacy tables (0 rows,
reversible). They're the only gated-by-approval steps. Rollback is in each script's
header (`ALTER TABLE …_legacy_workspace RENAME TO …`).

**Note on FORCE RLS (4):** it targets the 57 *pre-existing* tables. The tables created
in 1–3 already ship with RLS + policies; if you want `FORCE` on them too, say so and
I'll add a short follow-up.

After each script, optionally confirm via `GET /api/health` →
`integrations.{google,xero,...}` and the per-script `SELECT`.

---

## B. Provider reconnect (browser — credentials/consent are yours)

1. **Google** — already configured (`GOOGLE_CLIENT_ID` set; `/api/health/google` →
   `configured:true`) with 6 stored accounts, but the tokens are **stale** (last used
   08/05). **Reconnect** each at `/founder/email` (or
   `/api/auth/google/authorize?email=<addr>`). The new `drive.readonly` scope (#321)
   also lights up Notes. Guide: `docs/GOOGLE-OAUTH-SETUP.md`.
2. **Xero** — 3 orgs have (never-used) tokens. Confirm `XERO_CLIENT_*`/`DR_CLIENT_*`
   are set (`GET /api/health` → `integrations.xero`), then connect at `/founder/xero`.
   Guide: `docs/XERO-OAUTH-SETUP.md`.
3. **Social** — set provider creds + connect per `docs/SOCIAL-OAUTH-SETUP.md`; verify
   via `/api/social/status`.

---

## C. Project-level (your call)

- Enable **Leaked Password Protection** (Supabase → Authentication → Policies). Flagged
  by the security advisors; it's a shared-project auth setting so it's not an
  autonomous change.

---

## D. PRs to merge

Open at time of writing: **#315** (operator sandbox), **#326** (nexus owner_id) — plus
the script PRs above (#314/#319/#320/#325) and the provider/docs PRs (#321/#322/#323/#324).

---

## E. After you apply — I can verify (read-only)

Ping me once you've run a script or reconnected a provider and I'll confirm:
- the new tables exist + RLS/policies landed (`to_regclass`, `pg_policies`),
- `credentials_vault` has fresh `service='google'`/`'xero'` rows,
- `/api/health` integration flags flipped.

That closes the loop end-to-end.
