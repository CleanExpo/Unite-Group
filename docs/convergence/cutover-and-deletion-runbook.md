# Cutover & Deletion Runbook

> The only document authorised to retire external infrastructure. Executed by a
> human (or an agent WITH Phill present), step by step, in order. **No agent
> ever executes a DELETE step autonomously.** Policy per Phill 12/06/2026:
> hard delete once verified — so every delete step here is real, but gated.

Status: **NOT STARTED** — blocked until the convergence PR is merged to `main`
and the migration map is CLOSED.

---

## Gate 0 — Preconditions (all must be true before ANY step below)

- [ ] Convergence PR merged to `main`; monorepo CI green on `main`
- [ ] `docs/convergence/migration-map.md` status: CLOSED (zero unclassified paths)
- [ ] `apps/authority-legacy/` deleted from the tree
- [ ] CRM + Stripe migrations validated on a Supabase database branch (ephemeral per-branch DB; never against prod)

## Step 1 — Vercel: repoint the product (reversible)

> **Known CI state until this step is done:** the `unite-group` and
> `unite-group-sandbox` Vercel checks fail RED on every PR, because their Root
> Directory still points at the monorepo root (no buildable Next app there since
> the #224 convergence). This is expected and unrelated to PR content. The
> **GitHub Actions "Monorepo CI" workflow is the merge arbiter** (per-package
> type-check/test/build, incl. `apps/spec-board`); a green Actions run with red
> Vercel is mergeable. The Vercel red clears the moment Root Directory below is
> set to `apps/web`.

1. Vercel team `team_KMZACI5rIltoCRhAtGCXlxUf`, project `unite-group`
   (`prj_IfUuJNLjXTE8VXqEGwLAleIGhiA0`):
   - Git repo stays `CleanExpo/Unite-Group`; set **Root Directory = `apps/web`**,
     framework Next.js, Node 24, install command `pnpm install --frozen-lockfile`.
2. Copy env vars BY NAME from project `unite-hub` (`prj_y8hsRwhZHe6ewe6wCbwMbBYx20yp`)
   into `unite-group` (values from the Vercel UI / 1Password — never from this repo):
   `ANTHROPIC_API_KEY, VAULT_ENCRYPTION_KEY, SUPABASE_SERVICE_ROLE_KEY,
   NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, CRON_SECRET,
   FOUNDER_USER_ID, XERO_CLIENT_ID/SECRET, GOOGLE_CLIENT_ID/SECRET,
   LINEAR_API_KEY, FACEBOOK_APP_ID/SECRET, LINKEDIN_CLIENT_ID/SECRET,
   TIKTOK_CLIENT_KEY/SECRET` + Stripe + Telegram keys from the old project.
3. Deploy a PREVIEW first; click through founder login, CRM pages,
   command-centre, billing page. Production domain untouched so far.
4. Promote. `unite-group.in` already lives on this Vercel project, so the
   domain does not move — verify it serves the new app.
   **Rollback:** revert Root Directory; redeploy previous build (instant).

## Step 2 — Supabase: one database

Canonical DB: **`lksfwktwtmyznckodsau`** (the CRM's data — richest live data).
Authority-Site's `uqfgdezadpkiadugufbs` holds the old app's data.

1. Export from `uqfgdezadpkiadugufbs` any tables with live business data the
   command-centre/billing port needs (audit list: stripe_events, client
   approvals, businesses/organisations, data-room documents). `pg_dump --data-only`
   per table.
2. Write the new migrations (stripe_events, crm_leads, crm_contacts_opportunities,
   any command-centre delta) in `apps/web/supabase/migrations/` and validate them
   on a **Supabase database branch first** (ephemeral per-branch DB; never validate
   against prod), then promote to prod `lksfwktwtmyznckodsau` ONLY by merging an
   approved branch — never apply to prod directly or autonomously.
3. Import the exported data with founder_id mapping.
4. Point ALL env vars at the canonical project only.
   **Rollback:** old project untouched until Step 6.

## Step 3 — Stripe (verify with a real test payment) — **Owner: Rana**

> Per Phill 12/06/2026: Rana addresses all external Stripe + webhook
> configuration. The code side (webhook handlers, billing routes, signature
> verification) ships in the convergence PR; Rana's work is dashboards only.

1. Stripe dashboard → Webhooks: list every endpoint targeting
   `unite-group.in` or `*.vercel.app`. Update any pointing at retired hosts to
   `https://unite-group.in/api/webhooks/stripe`. Note signing secrets →
   update `STRIPE_WEBHOOK_SECRET` env var.
2. Run one LIVE test payment (smallest product) → confirm webhook received,
   `stripe_events` row written, receipt email sent.
   **Gate: do not proceed until the test payment round-trips.**

## Step 4 — OAuth consoles (counted checklist) — **Owner: Rana**

For each provider, update redirect URIs from `unite-hub*.vercel.app` to
`https://unite-group.in/...` (keep both during soak):
Google, Microsoft, LinkedIn, Meta, TikTok, YouTube, Reddit, IMAP (+ Xero).
**Gate: one real login per major provider succeeds on unite-group.in.**

## Step 5 — Re-aim every automation

- [ ] Pi-CEO / margot agents → `CleanExpo/Unite-Group` only
- [ ] Hermes Agent configs + crons → monorepo paths
- [ ] Any GitHub Actions/webhooks in former repos: disable
- [ ] `docs/brain` sync scripts (kd-sync) → new path
- [ ] Linear/Telegram integrations → new endpoints

## Step 6 — Soak (minimum 5 days)

Watch payments, logins, error logs, cron outcomes on the unified app. The old
Vercel projects and Supabase project stay alive but idle as instant fallback.

## Step 7 — HARD DELETE (Phill's typed approval required PER ITEM)

Before each deletion: take the final backup (git bundle per repo:
`git bundle create <repo>.bundle --all`; `pg_dump` full for the old Supabase
project; export Vercel env vars to 1Password). Store bundles in the
`Unite-Group-Infrastructure` vault or offline drive. Then, only with a typed
"DELETE <item>" from Phill, per item:

| # | Item | Command/console |
|---|---|---|
| D1 | repo `CleanExpo/Unite-Hub` | GitHub → Settings → Delete |
| D2 | repo `CleanExpo/Unite-Group-Spine` | (spine code lives in packages/spine) |
| D3 | repo `CleanExpo/brain-1` | (vault lives in docs/brain) |
| D4 | repo `CleanExpo/pi-ceo-operator-mcp` | (lives in packages/) |
| D5 | repo `outsourc-e/hermes-workspace` | (lives in apps/workspace) |
| D6 | Vercel `unite-hub` + `unite-hub-sandbox` projects | Vercel → Settings → Delete |
| D7 | Vercel `unite-group-sandbox` (if replaced by monorepo preview flow) | Vercel |
| D8 | Supabase `uqfgdezadpkiadugufbs` | Supabase → Settings → Delete project |

After D1–D8: update `.portfolio/PORTFOLIO.yaml` (statuses → `deleted`, with
backup-bundle locations), and append the decision log.

## Abort criteria

Any failed gate → stop, fix forward or roll back; never skip a gate to keep
the schedule. A missed Stripe webhook or broken OAuth login during soak resets
the soak clock.
