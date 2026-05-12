# Unite-Group Integration Mesh — Operator Runbook

The empire dashboard ingests state from nine external services into the
`integration_*` tables in Supabase prod. This document is the on-call
reference: cadence, env vars, verification queries, and how to add a tenth.

All cron routes live under `/api/cron/integrations/<svc>` and are gated by
`Authorization: Bearer $CRON_SECRET`. Reads flow through `/api/empire/integrations`
(JWT-gated) into `src/app/[locale]/empire/integrations/page.tsx`.

## Cadence

From `vercel.json` (Sydney region, all UTC). Crons are deliberately
staggered across the five-minute window to avoid concurrent cold-starts.

| Integration | Schedule | Endpoint | maxDuration |
| --- | --- | --- | --- |
| GitHub | `*/5 * * * *` | `/api/cron/integrations/github` | 60s |
| Vercel | `1-59/5 * * * *` | `/api/cron/integrations/vercel` | 60s |
| Railway | `2-59/5 * * * *` | `/api/cron/integrations/railway` | 60s |
| Linear | `3-59/5 * * * *` | `/api/cron/integrations/linear` | 60s |
| DigitalOcean | `*/15 * * * *` | `/api/cron/integrations/digitalocean` | 300s |
| Stripe | `5-59/15 * * * *` | `/api/cron/integrations/stripe` | 60s |
| Supabase | `0 * * * *` | `/api/cron/integrations/supabase` | 60s |
| Composio | `30 * * * *` | `/api/cron/integrations/composio` | 60s |
| 1Password | (not in vercel.json — runs from Hermes) | — | — |

## 1Password — special case

The route `/api/cron/integrations/onepassword` exists and works locally, but
is **intentionally not wired into `vercel.json`**. The `op` CLI is not
available in the Vercel serverless runtime, and the Connect-server fallback
adds infra we don't want to run.

1P metadata syncs from Hermes (the Mac mini) instead:

- Script: `~/.hermes/scripts/sync_1password_to_supabase.py` (TODO — not yet written)
- Cron: Hermes launchd job, daily 04:00 AEST
- Writes to `integration_onepassword_index` via Supabase service role

The Vercel route is kept so a future Connect deployment can be enabled
without code changes — set `OP_CONNECT_HOST` + `OP_CONNECT_TOKEN` and add
the cron entry.

## Required env vars

Sourced from each `src/lib/integrations/<svc>/client.ts` (or `sync.ts`
where the client is inlined). Verified against Vercel prod env on
2026-05-12.

| Env var | Used by | On prod? |
| --- | --- | --- |
| `CRON_SECRET` | every cron route (auth gate) | yes |
| `NEXT_PUBLIC_SUPABASE_URL` | `getAdminClient` | yes |
| `SUPABASE_SERVICE_ROLE_KEY` | `getAdminClient` (writes to `integration_*`) | yes |
| `GITHUB_INTEGRATION_TOKEN` | `github/client.ts` — PAT, scopes `repo`/`read:org`/`workflow` | yes |
| `VERCEL_INTEGRATION_TOKEN` | `vercel/client.ts` | yes |
| `VERCEL_TEAM_ID` | `vercel/client.ts` | yes |
| `LINEAR_API_KEY` | `linear/sync.ts` | yes |
| `STRIPE_SECRET_KEY` | `stripe/sync.ts` | yes |
| `SUPABASE_ACCESS_TOKEN` | `supabase/client.ts` (Management API token, var named `SUPABASE_MANAGEMENT_TOKEN` in code — alias) | yes (as access token) |
| `RAILWAY_INTEGRATION_TOKEN` | `railway/client.ts` | **missing** |
| `RAILWAY_PROJECT_IDS` | `railway/sync.ts` — comma-separated UUIDs | **missing** |
| `DIGITALOCEAN_INTEGRATION_TOKEN` | `digitalocean/client.ts` — `Read` scope, all resources | **missing** |
| `COMPOSIO_API_KEY` | `composio/client.ts` | **missing** |
| `OP_CONNECT_HOST`, `OP_CONNECT_TOKEN`, `OP_VAULTS` | `onepassword/client.ts` (1P Connect — optional, see above) | n/a |

Until the four missing vars are populated, those four integrations will
log `last_sync_status='error'` with `last_error` indicating an empty token.
The cron routes themselves still 200 and seed `integration_sync_state`.

## Verifying health

Single overview query — run in Supabase SQL editor:

```sql
SELECT integration,
       last_sync_status,
       rows_upserted,
       last_sync_completed_at,
       last_error
  FROM integration_sync_state
 ORDER BY integration;
```

Expected: every row `last_sync_status='ok'`, `last_sync_completed_at`
within (cadence × 2). Anything older indicates the cron has stopped firing
or is timing out.

Per-integration row sanity:

```sql
SELECT count(*) FROM integration_github_repos;
SELECT count(*) FROM integration_github_commits;
SELECT count(*) FROM integration_github_prs;
SELECT count(*) FROM integration_github_actions_runs;
SELECT count(*) FROM integration_github_secrets_index;
SELECT count(*) FROM integration_vercel_projects;
SELECT count(*) FROM integration_vercel_deployments;
SELECT count(*) FROM integration_vercel_env_index;
SELECT count(*) FROM integration_railway_services;
SELECT count(*) FROM integration_railway_deployments;
SELECT count(*) FROM integration_linear_teams;
SELECT count(*) FROM integration_linear_projects;
SELECT count(*) FROM integration_linear_issues;
SELECT count(*) FROM integration_do_droplets;
SELECT count(*) FROM integration_do_apps;
SELECT count(*) FROM integration_do_databases;
SELECT count(*) FROM integration_stripe_subscriptions;
SELECT count(*) FROM integration_stripe_invoices_mtd;
SELECT count(*) FROM integration_supabase_projects;
SELECT count(*) FROM integration_supabase_advisor_findings;
SELECT count(*) FROM integration_composio_connections;
SELECT count(*) FROM integration_onepassword_index;
```

Manual cron fire (replace `$CRON_SECRET`):

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  https://unite-group.vercel.app/api/cron/integrations/github
```

## Adding a tenth integration

1. Implement `src/lib/integrations/<svc>/client.ts` + `sync.ts`. Reuse the
   `IntegrationClient` interface in `src/lib/integrations/types.ts`.
2. Add `integration_<svc>_*` table(s) in a new SQL migration under
   `supabase/migrations/`. Apply to prod via `MCP apply_migration`.
3. Add `src/app/api/cron/integrations/<svc>/route.ts`. Pattern: verify
   `CRON_SECRET`, call sync, return JSON with status + counts.
4. Seed `integration_sync_state` row in the migration so the dashboard
   shows the integration before its first run.
5. Wire `vercel.json` cron entry. Pick a stagger offset that doesn't
   collide with existing 5/15/60-minute slots.
6. Add the env var to Vercel prod **before merging** — otherwise the cron
   logs `last_sync_status='error'` on first fire.
7. Update both tables in this README.

## Architecture decisions

These are non-obvious choices made during build cycles 1-2. Don't undo
without reading the linked plan post-mortems first.

- **Migrations applied to prod via `MCP apply_migration`** — not the
  schema-wizard's promote flow. The typed-confirm path was blocked by a
  wizard bug (since fixed); MCP is the simpler primitive and remains the
  default for integration-mesh migrations.
- **`onConflict` explicit on every `.upsert()`** — cycle-2 lesson.
  PostgREST will silently insert duplicates without it when the target
  table has multiple unique constraints.
- **Seed-then-update for `integration_sync_state`** — cycle-1 lesson. The
  dashboard reads `sync_state` to render the matrix; if a row doesn't
  exist before the first cron run, the integration shows as "unknown"
  rather than "syncing".
- **Per-entity `try/catch` inside each sync** — cycle-1 lesson. One bad
  repo/project must not abort the whole batch. Errors are counted into
  `rows_failed` and surfaced via `last_error`.
- **Insert-then-sweep for full-refresh paths** (e.g. Vercel env index,
  1P index) — cycle-2 lesson. The old DELETE-then-INSERT pattern left a
  visible empty window where the dashboard rendered zero rows; sweep by
  `last_sync_run_id` mismatch after the upsert instead.
- **`maxDuration: 60s` default, `300s` for DigitalOcean** — DO paginates
  three endpoints (droplets, apps, databases) and routinely runs 80-120s
  on full account scans.

## Troubleshooting

- **`last_sync_status='error'`, `last_error` mentions empty token** — env
  var missing on Vercel. Add via `vercel env add <NAME> production`,
  redeploy.
- **`last_sync_completed_at` older than cadence × 2** — cron not firing.
  Check Vercel → Settings → Cron Jobs for last-run status and 4xx/5xx.
- **`rows_failed > 0` and `rows_upserted > 0`** — partial failure, sync
  is working but a subset of entities errored. Inspect `last_error` for
  the first failure; full failure log is in Vercel function logs.
- **Dashboard shows "unknown" for a service** — `integration_sync_state`
  row missing. Apply the seed migration or `INSERT … ON CONFLICT DO NOTHING`
  a baseline row.

## File map

- Cron routes: `src/app/api/cron/integrations/<svc>/route.ts`
- Clients: `src/lib/integrations/<svc>/client.ts`
- Sync logic: `src/lib/integrations/<svc>/sync.ts`
- Shared types: `src/lib/integrations/types.ts`
- Read endpoint: `src/app/api/empire/integrations/route.ts`
- Dashboard: `src/app/[locale]/empire/integrations/page.tsx`
- Plan: `docs/superpowers/plans/2026-05-12-unite-group-integration-mesh.md`
