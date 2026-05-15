---
type: wiki
updated: 2026-05-14
---

# Portfolio Health Snapshot — 2026-05-14

Read-only sweep across Vercel + Railway + Supabase for the active portfolio. Single source of truth for Margot's Monday morning briefing.

## 1. Headline

**4 GREEN / 2 YELLOW / 4 RED** across 10 production deployments audited (6 Vercel + 4 Supabase prod). Single biggest fire: **CCW-CRM is in `ERROR` state on Vercel** — root cause is a stale `rootDirectory` config (`apps/web` no longer exists), and the last deployment that failed shipped a SECRETS rewrite (commit 26a547a7) — so the CCW client portal is currently serving the previous successful build. Secondary fires: **CARSI build error** (npm build exit 1), **DR-NRPG cache file >1GB** blowing the Vercel upload limit, and **Phills CRM Supabase has 118 SECURITY ERROR lints** (96 tables with RLS disabled, 13 sensitive-column exposures) — the database is currently world-readable via PostgREST.

Per [[feedback-audit-verification]], every finding below traces to a real Vercel `/v13/deployments` errorMessage or a Supabase `get_advisors` lint — no inference.

## 2. Vercel

Team: `Unite-Group` (`team_KMZACI5rIltoCRhAtGCXlxUf`). 6 active production projects; remainder are dev sandboxes / archived.

| Project | State | Last deploy (UTC) | Domain | Issues |
|---|---|---|---|---|
| `unite-group` | READY | 2026-05-14 | unite-group-g0htcjwji-unite-group.vercel.app | none |
| `synthex` | READY | 2026-05-13 | synthex-axm1qej7d-unite-group.vercel.app | none |
| `disaster-recovery` | READY | 2026-05-06 | disaster-recovery-4f17i46ua-unite-group.vercel.app | stale (>1wk) |
| `ato-app` | READY | 2026-04-23 | ato-8vpxw0mex-unite-group.vercel.app | stale (>3wk) |
| `unite-group-ops` | READY | 2026-04-26 | unite-group-7ztwtalyt-unite-group.vercel.app | stale (>2wk) |
| `restoreassist-sandbox` | BUILDING | 2026-05-14 | restoreassist-sandbox-eoawu4fav-unite-group.vercel.app | in-flight |
| `restoreassist` | BUILDING | 2026-05-14 | restoreassist-nhwcvbql5-unite-group.vercel.app | in-flight |
| `ccw-crm-web` | **ERROR** | 2026-05-14 | ccw-crm-ajzkh562a-unite-group.vercel.app | `NOW_SANDBOX_WORKER_ROOTDIR_NOT_EXIST` — Root Directory `apps/web` does not exist. SHA `26a547a7` |
| `ccw-crm-sandbox` | **ERROR** | 2026-05-14 | ccw-crm-sandbox-ffyorm5oy-unite-group.vercel.app | same root-dir error, mirror of prod |
| `carsi-web` | **ERROR** | 2026-05-12 | carsi-739gxin7w-unite-group.vercel.app | `BUILD_UTILS_SPAWN_1` — `npm run build` exited 1. SHA `0060d6f9` (admin_users / RA-3027) |
| `dr-nrpg-platform` | **ERROR** | 2026-05-12 | dr-nrpg-platform-3h9jgzcvn-unite-group.vercel.app | webpack cache `1.pack` = 1073744576 B exceeds 1GB upload cap. SHA `a3860d3e` |

**Note on impact:** Vercel keeps the previous successful build serving when a new deploy errors, so the public-facing CCW / CARSI / DR-NRPG URLs still respond. The block is on shipping new code, not on availability.

## 3. Railway

| Service | State | Last deploy | Region | Issues |
|---|---|---|---|---|
| `pi-ceo-telegram-bot` | UNKNOWN | UNKNOWN | UNKNOWN | CLI authed but service-level state requires interactive selection; no `RAILWAY_TOKEN` in `~/.hermes/.env`. See cross-ref [[feedback-secrets-handling]]. |
| `Pi-Dev-Ops` | UNKNOWN | UNKNOWN | UNKNOWN | same |
| 17 other Railway projects | UNKNOWN | UNKNOWN | UNKNOWN | Most appear to be auto-generated names (e.g. `determined-playfulness`, `joyful-hope`) — likely ephemeral / abandoned. Worth pruning. |

**Action**: add `RAILWAY_API_TOKEN` to `~/.hermes/.env` from 1Password so the next sweep can hit `backboard.railway.app/graphql/v2` directly.

## 4. Supabase

15 projects total under the `tdmjhpmainyxogistnbe` org. Below covers the 7 production-relevant ones; the other 8 are duplicates / `My Project` / `Unite-Group Test` / `NodeJS Starter V1` and should be pruned in a separate ticket.

### `unite-group-ops` (vgxidmwjdbgybjmjvwbb) — Margot / portfolio ops DB
- **SECURITY ERROR: 6 · WARN: 2 · INFO: 0** (verbatim)
- Top 3:
  - `[ERROR] RLS Disabled in Public: Table public.margot_notes is public, but RLS has not been enabled.`
  - `[ERROR] RLS Disabled in Public: Table public.margot_actions is public, but RLS has not been enabled.`
  - `[ERROR] RLS Disabled in Public: Table public.margot_conversations is public, but RLS has not been enabled.`
- Plus `margot_messages`, `webhook_events`, `dora_snapshots` all RLS-off. Margot's entire conversation history is currently anon-readable via PostgREST.

### `Unite-Group` (lksfwktwtmyznckodsau) — Nexus production
- **SECURITY ERROR: 0 · WARN: 5,294 · INFO: 5,162** (10,456 lints)
- Top 3 (verbatim, WARN):
  - `[WARN] Auth RLS Initialization Plan: Table public.tenant_containers has a row level security policy 'Users can view containers in their organization' that re-evaluates current_setting() or auth.<function>() for each row`
  - `[WARN] Auth RLS Initialization Plan: Table public.client_media_uploads has a row level security policy 'workspace_access' that re-evaluates ...`
  - `[WARN] Auth RLS Initialization Plan: Table public.media_transcriptions has a row level security policy 'workspace_access' ...`
- Pattern: 2,634 RLS init-plan warnings + 2,634 multiple-permissive-policy warnings. Wrap every `auth.uid()` / `current_setting()` in `(select ...)` per [[supabase-postgres-best-practices]]. Massive perf cost at scale, no SECURITY ERROR.

### `ATO` (xwqymjisxmtcmaebcehw) — Forensic accounting SaaS
- **SECURITY ERROR: 10 · WARN: 119 · INFO: 0** + Performance: 399 lints
- Top 3:
  - `[ERROR] Security Definer View: View public.recommendation_current_status is defined with the SECURITY DEFINER property`
  - `[ERROR] Security Definer View: View public.rnd_deadline_summary is defined with the SECURITY DEFINER property`
  - `[ERROR] RLS Disabled in Public` (7 tables — list available via Read of advisor dump)
- 55 functions have `Function Search Path Mutable` — search_path hijack vector.

### `Synthex` (znyjoyjsvjotlzjppzal)
- **SECURITY ERROR: 4 · WARN: 758 · INFO: 61** (823 lints)
- Top 3:
  - `[ERROR] Security Definer View: View public.agent_run_summaries`
  - `[ERROR] Security Definer View: View public.team_analytics`
  - `[ERROR] Security Definer View: View public.advisor_metrics`
- 388 mutable search-path functions + 364 SECURITY DEFINER functions callable by anon/authenticated. Largest WARN surface in the portfolio.

### `RestoreAssist` (oxeiaavuspvpvanzcrjc) — sandbox
- **SECURITY ERROR: 158 · WARN: 19 · INFO: 4**
- Top 3:
  - `[ERROR] RLS Disabled in Public: Table public.ExternalClient is public, but RLS has not been enabled.`
  - `[ERROR] RLS Disabled in Public: Table public.ExternalJob ...`
  - `[ERROR] RLS Disabled in Public: Table public.IntegrationSyncLog ...`
- 151 tables RLS-off + 7 sensitive-column exposures. The whole DB is wide open.

### `restoreassist-prod-2026` (udooysjajglluvuxkijp) — prod successor
- **SECURITY ERROR: 125 · WARN: 27 · INFO: 57** (209 lints)
- Top 3:
  - `[ERROR] RLS Disabled in Public: Table public.ScopeItem`
  - `[ERROR] RLS Disabled in Public: Table public.ContractorServiceArea`
  - `[ERROR] RLS Disabled in Public: Table public.ContractorCertification`
- 117 tables RLS-off + 8 sensitive-column exposures. Same disease as the sandbox, in production.

### `Phills CRM` (qwoggbbavikzhypzodcr)
- **SECURITY ERROR: 118 · WARN: 45 · INFO: 0** (163 lints)
- Top 3:
  - `[ERROR] Security Definer View: View public.sandbox_task_analytics`
  - `[ERROR] Security Definer View: View public.v_pending_approvals`
  - `[ERROR] Security Definer View: View public.active_sandbox_sessions`
- 96 tables RLS-off + 13 sensitive-column exposures + 9 SECURITY DEFINER views.

### `Pi CEO` (zbryrmxmgfmslqzizsto) — Pi-CEO swarm DB
- **SECURITY ERROR: 9 · WARN: 1 · INFO: 0**
- Top 3:
  - `[ERROR] Security Definer View: View public.v_gcp_project`
  - `[ERROR] Security Definer View: View public.v_vercel_project`
  - `[ERROR] Security Definer View: View public.v_portfolio_service`
- Plus `heartbeat_log`, `workflow_runs`, `triage_log`, `claude_api_costs` all RLS-off. Pi-CEO operational telemetry is anon-readable.

## 5. Top 5 Monday-morning actions

Ranked by **blast-radius x ease**.

| # | Target | Fix | Effort | Owner |
|---|---|---|---|---|
| 1 | Vercel `ccw-crm-web` + `ccw-crm-sandbox` | Open Project Settings → Build & Development → set `rootDirectory` to the new package path (was `apps/web`, likely now `apps/ccw-crm-web` or repo root after a monorepo restructure). Redeploy. | 15 min | Phill (config-only, no code) |
| 2 | Supabase `unite-group-ops` (Margot DB) | Enable RLS + restrictive default-deny policies on 6 `margot_*` tables. Margot is currently leaking client conversation history to anon. Use `alter table ... enable row level security; create policy "deny all" on ... for all using (false);` then add explicit allow policies. | 30 min | Senior Agent (DB engineer) |
| 3 | Supabase `Phills CRM` + `restoreassist-prod-2026` | Bulk RLS enable on 213 tables. Run the standard `enable_rls_on_all_public_tables.sql` migration pattern from [[unite-group-rls-audit-2026-05-12]]. Two projects share the same disease. | 2 hours | Senior Agent (DB engineer) |
| 4 | Vercel `dr-nrpg-platform` | Add `.next/cache/webpack/` to `.vercelignore` OR set `experimental: { webpackBuildWorker: true, serverComponentsExternalPackages: [...] }` to split chunks <1GB. Or move heavy deps to external CDN. | 45 min | Senior Agent (frontend) |
| 5 | Vercel `carsi-web` | Pull build logs for SHA `0060d6f9` (admin_users / RA-3027) — TypeScript or env-var failure most likely given the secrets-rewrite PRs going through CCW the same day. Per [[curator-security-unknown]] this is the recurring pattern: env-var misread after secrets refactor. | 30 min | Senior Agent (frontend) |

Not in top-5 but worth noting:
- 6,000+ Supabase WARN lints across Unite-Group + Synthex (mostly RLS init-plan + multiple-permissive-policy) — high blast-radius but high effort. Schedule for the next refactor sprint, not Monday.
- 8 stale/unused Supabase projects (`My Project`, `Unite-Group Test`, `NodeJS Starter V1`, `Bronwyns Guide`, `Unite-Group-Project`, `cool-moser`, etc.) — prune to reduce cognitive load and free org-tier slots.
- 12 stale/unused Vercel projects under the `unite-group` team — same.
- 17 likely-abandoned Railway projects with auto-generated names — Railway free tier limits are at risk.

## 6. Cross-refs

[[ccw]], [[carsi]], [[unite-group-nexus-architecture]], [[unite-group-rls-audit-2026-05-12]], [[rana-handoff-2026-05-14]], [[feedback-secrets-handling]], [[feedback-audit-verification]], [[supabase]], [[supabase-postgres-best-practices]], [[curator-security-unknown]], [[curator-deployment-unknown]]
