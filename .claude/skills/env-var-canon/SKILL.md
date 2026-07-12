---
name: env-var-canon
description: The authoritative environment-variable registry for the Unite-Group Nexus. Use whenever adding, reading, renaming, or debugging an env var or secret — new integration config, a `process.env.X` read, an auth/OAuth wiring, a cron secret, a "which variable holds this" question, or a "works locally but not in prod" symptom. Also use before pinning any variable name in code, and when reconciling the two credential planes (Vercel prod vs the local hermes fleet). Prevents the `APIFY_API_KEY` vs `APIFY_API_TOKEN` class of drift.
---

# Env-var canon

The Nexus reads **314 distinct environment variables** across `apps/` and
`packages/`, and there is **no central env module** — every read is a raw
`process.env.X`. That sprawl is how drift happens: a second name for the same
secret (`APIFY_API_KEY` vs `APIFY_API_TOKEN`), a client read of a server-only
secret, or a value set on one plane but not the other. This skill is the
single place a name is canonical before it is pinned anywhere.

## The canon rule

1. **One canonical name per secret.** Before introducing a variable, grep for
   an existing name — `grep -rInE "process\.env\.[A-Z0-9_]*<STEM>" apps packages`.
   If any spelling exists, reuse it. Never mint a synonym.
2. **`NEXT_PUBLIC_` means the browser can read it.** Prefix *only* values that
   are safe to ship to the client (URLs, anon keys, public app URL). A server
   secret must **never** carry `NEXT_PUBLIC_` — that leaks it into the bundle.
3. **Route new reads through one accessor.** Until a central `env` module
   exists, at minimum read each variable in one module and pass the value
   down — do not scatter `process.env.X` across route handlers. (Building the
   central typed accessor is the standing direction; see Roadmap below.)
4. **Set on the right plane, verify live.** Placement is not memorized —
   confirm against the live plane, never assume. See "Two planes".

## Two planes (never conflate)

- **Vercel production env** — everything the deployed Next.js app + crons read
  (`NEXT_PUBLIC_*`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`, OAuth client
  IDs/secrets, provider API keys, the CRM arming gates).
- **Local hermes fleet `~/.hermes/.env`** — what the Mac-side runner/daemons
  read (`HERMES_HOME`, `CLAUDE_HOME`, `LINEAR_API_KEY`,
  fleet paths). A dead value here fails silently (see `credential-triage`).

A variable can legitimately live on both planes; a variable that must be on
one and is only on the other is a classic silent-failure. Verify with the
Vercel MCP (prod) and by reading `~/.hermes/.env` (fleet) — do not trust recall.

OWNEST is a third, future **brokered host plane**, not an extension of either
plane above. Until that boundary exists, do not copy CRM service credentials
into a Hermes profile, repository `.env`, browser profile, or same-UID child
process. The user-level service remains retired.

## Registry — load-bearing variables (verified from source, grouped)

Names + role, ordered by real usage frequency in the repo. Values are never
recorded here; confirm placement live per "Two planes".

**Supabase / data**
`NEXT_PUBLIC_SUPABASE_URL` (client) · `NEXT_PUBLIC_SUPABASE_ANON_KEY` (client) ·
`SUPABASE_SERVICE_ROLE_KEY` (server, secret) · `SUPABASE_ACCESS_TOKEN` (CLI/CI).

**App / auth / session**
`NEXT_PUBLIC_APP_URL` · `NODE_ENV` · `ADMIN_JWT_SECRET` (secret) ·
`FOUNDER_USER_ID` · `TRUST_PROXY` · `CRON_SECRET` (secret — gates cron routes).

**Credential vault**
`VAULT_ENCRYPTION_KEY` (secret — AES-GCM key; a mismatch surfaces as
"Unsupported state or unable to authenticate data", NOT a token problem — see
`credential-triage`).

**CRM autonomy arming gates** (see `nexus-conventions`, `go-live-arming`)
`CRM_AUTO_EXECUTE` (admission kill-switch, unset in prod) ·
`CRM_DISPATCH_ARMED` (dispatch flag, default off) ·
`DR_NRPG_CRM_LEAD_INTEGRATION_ALLOW_PROD_WRITES`.

**OWNEST host profile (local-only, dormant and not armable)**
`SUPABASE_URL` · `SUPABASE_SERVICE_ROLE_KEY` (server-only; never passed to
Hermes) · `FOUNDER_USER_ID` · `CC_OWNEST_WORKER_ID` ·
`CC_OWNEST_HERMES_BIN` (absolute path) · `HERMES_CWD` ·
`CC_OWNEST_LIVE` (must remain `0`; `1` is rejected in code) ·
`CC_OWNEST_LOCAL_DEVELOPMENT` · `CC_OWNEST_HERMES_PROFILE` ·
`CC_OWNEST_HERMES_BOARD` · `CC_OWNEST_ROLLOUT_ID` ·
`CC_OWNEST_CANARY_TASK_ID` · `CC_OWNEST_CANARY_LIMIT` ·
`CC_OWNEST_MAX_IN_PROGRESS` · `CC_OWNEST_LEASE_MS` ·
`CC_OWNEST_DAILY_DISPATCH_LIMIT`. These names describe a future isolated
worker envelope; they are not a LaunchAgent activation recipe.

**Fleet / Linear / Anthropic**
`HERMES_HOME` · `CLAUDE_HOME` · `HERMES_API_URL` · `LINEAR_API_KEY` (secret) ·
`ANTHROPIC_API_KEY` (metered server route only) · Claude Code CLI session state
(local subscription route, never copied into `apps/web`) ·
`PI_CEO_API_KEY` · `PI_CEO_API_URL` · `CLAUDE_API_URL` · `GITHUB_TOKEN` ·
`GITHUB_OWNER`.

**Integrations (OAuth client id/secret pairs)**
`GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` · `XERO_CLIENT_ID`/`XERO_CLIENT_SECRET`/`XERO_WEBHOOK_KEY` ·
`MICROSOFT_CLIENT_ID`/`MICROSOFT_CLIENT_SECRET` · `DR_CLIENT_ID`/`DR_CLIENT_SECRET` ·
`FACEBOOK_APP_ID`/`FACEBOOK_APP_SECRET` · `LINKEDIN_CLIENT_ID`/`LINKEDIN_CLIENT_SECRET` ·
`TIKTOK_CLIENT_KEY`/`TIKTOK_CLIENT_SECRET` · `TELEGRAM_BOT_TOKEN` · `STRIPE_SECRET_KEY`.

**AI / media providers**
`OPENAI_API_KEY` · `ELEVENLABS_API_KEY` · `ELEVENLABS_MARGOT_AGENT_ID`.

**Workspace paths / feature flags**
`UNITE_CRM_WORKSPACE_ID` · `NEXUS_REPOS` · `WIKI_PATH` ·
`UNITE_EVIDENCE_LEDGER_PATH` · `UNITE_DASHBOARD_DIR` ·
`UNITE_CRM_OPPORTUNITIES_DIGEST_ENABLED` · `UNITE_CRM_DIGEST_OWNER` ·
`MCP_PRESETS_SEED_PATH`.

This lists the ~50 load-bearing variables of 314 total. When you touch one not
listed, add it here in the same PR (this registry is documentation that
executes — keep it current).

## Procedure — before you add or read a variable

1. `grep -rInE "process\.env\.[A-Z0-9_]*<STEM>" apps packages` — reuse any
   existing name; do not create a variant.
2. Decide the plane(s) and confirm the value is actually set there (Vercel MCP
   for prod, `~/.hermes/.env` for fleet). A missing value on the needed plane
   is the silent failure.
3. Client-exposed? Only then `NEXT_PUBLIC_`. Otherwise keep it server-side.
4. Record the canonical name in the registry above in the same PR.

## Red flags

- A new `process.env.SOMETHING` whose stem already exists under another name.
- A secret (`*_KEY`, `*_SECRET`, `*_TOKEN`) with a `NEXT_PUBLIC_` prefix.
- "Works locally, 500 in prod" on an integration route — usually the value is
  on the fleet plane but not on Vercel, or vice versa.
- A cron route that stopped producing data with no error — check `CRON_SECRET`
  and the provider credential (route to `credential-triage`).

## Roadmap

The fix that ends this whole class of bug is a single typed `env` accessor
(e.g. a Zod-validated `env.ts`) that fails fast at boot when a required
variable is missing or mis-prefixed. Until it lands, this registry + the
grep-before-mint rule is the guardrail.
