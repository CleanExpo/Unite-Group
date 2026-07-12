# Environment Variable Matrix — Unite-Group Monorepo

> Generated: 12/07/2026
> Source of truth: `/.env.example` (root)
> Methodology: runtime environment reads across `apps/web`, `apps/workspace`, and `packages/pi-ceo-operator-mcp`, plus design/test-only configuration reads in `apps/autopilot-runner`; cross-referenced against all `.env.example` files, `scripts/check-env.mjs`, and `apps/web/scripts/validate-env.mjs`.

---

## Tier Definitions

| Tier | Meaning |
|---|---|
| **critical** | apps/web will not boot without this |
| **required** | apps/web boots but core features (AI, cron, vault) are broken |
| **integration** | Optional — feature degrades gracefully when absent |
| **optional** | Tuning/feature-flag; safe default applies when absent |
| **workspace** | apps/workspace (Hermes) only — not deployed to Vercel |
| **design/test** | apps/autopilot-runner contract exercised by TypeScript/tests only — never provision to a host, profile, container, or service |
| **test** | CI / Playwright / Vitest only — never in Vercel production |
| **legacy** | Not referenced in any current package — candidate for Vercel deletion |

---

## Full Variable Matrix

| VAR | Used by | Tier | Value lives today | Notes |
|---|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | web | critical | old unite-hub Vercel project | Public; safe in client bundle |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | web | critical | old unite-hub Vercel project | Public; safe in client bundle |
| `SUPABASE_SERVICE_ROLE_KEY` | web; autopilot tests | critical (web); design/test (autopilot) | Vercel for web; never provision to autopilot | Server-side web credential; bypasses RLS. The autopilot adapter retains the name only as a test contract; a future executor requires a narrower brokered capability |
| `ANTHROPIC_API_KEY` | web, workspace | required | old unite-hub Vercel project | Powers Bron AI, Advisory, Strategy. Workspace also uses it as one of multiple LLM provider keys |
| `VAULT_ENCRYPTION_KEY` | web | required | old unite-hub Vercel project | AES-256-GCM; generate with `openssl rand -hex 32` |
| `CRON_SECRET` | web | required | old unite-hub Vercel project | Validates scheduled-job route calls |
| `FOUNDER_USER_ID` | web; autopilot tests | required (web); design/test (autopilot) | Vercel for web; not provisioned to autopilot | Supabase auth.users UUID; autopilot tests assert explicit founder scoping |
| `NEXT_PUBLIC_APP_URL` | web | required | old unite-hub Vercel project | Used for OAuth callbacks; `https://unite-group.in` in prod |
| `DATABASE_URL` | web | required | old unite-hub Vercel project | Direct PostgreSQL connection string |
| `ENABLE_DB_POOLER` | web | optional | local only | Default `false`; set `true` to use Supabase Pooler |
| `DB_POOL_SIZE` | web | optional | local only | Default `10` |
| `DB_POOLER_MODE` | web | optional | local only | Default `transaction` |
| `DB_IDLE_TIMEOUT` | web | optional | local only | Default `30` (seconds) |
| `DB_MAX_LIFETIME` | web | optional | local only | Default `3600` (seconds) |
| `STRIPE_SECRET_KEY` | web | integration | old unite-group Vercel project | Ported from authority-legacy; billing routes |
| `STRIPE_WEBHOOK_SECRET` | web | integration | old unite-group Vercel project | Webhook signature verification |
| `STRIPE_PRICE_ID_BASE` | web | integration | old unite-group Vercel project | Base plan price ID |
| `TELEGRAM_BOT_TOKEN` | web | integration | old unite-group Vercel project | Ported from authority-legacy |
| `TELEGRAM_CHAT_ID` | web | integration | old unite-group Vercel project | Ported from authority-legacy |
| `TELEGRAM_DECISION_SIGNING_KEY` | web | integration | old unite-group Vercel project | Ported from authority-legacy |
| `XERO_CLIENT_ID` | web | integration | old unite-hub Vercel project | Xero CARSI account OAuth |
| `XERO_CLIENT_SECRET` | web | integration | old unite-hub Vercel project | Xero CARSI account OAuth |
| `XERO_TENANT_ID_CARSI` | web | integration | old unite-hub Vercel project | Xero tenant for CARSI |
| `XERO_WEBHOOK_KEY` | web | integration | old unite-hub Vercel project | Xero webhook signing key |
| `DR_CLIENT_ID` | web | integration | old unite-hub Vercel project | Xero DR account OAuth (code uses DR_CLIENT_ID, NOT DR_XERO_CLIENT_ID) |
| `DR_CLIENT_SECRET` | web | integration | old unite-hub Vercel project | Xero DR account OAuth |
| `XERO_TENANT_ID_DR` | web | integration | old unite-hub Vercel project | Xero tenant for Disaster Recovery |
| `GOOGLE_CLIENT_ID` | web | integration | old unite-hub Vercel project | OAuth for Gmail, Calendar, Drive |
| `GOOGLE_CLIENT_SECRET` | web | integration | old unite-hub Vercel project | OAuth for Gmail, Calendar, Drive |
| `GOOGLE_DRIVE_VAULT_FOLDER_ID` | web | integration | old unite-hub Vercel project | Drive vault folder |
| `MICROSOFT_CLIENT_ID` | web | integration | old unite-hub Vercel project | Microsoft OAuth |
| `MICROSOFT_CLIENT_SECRET` | web | integration | old unite-hub Vercel project | Microsoft OAuth |
| `LINEAR_API_KEY` | web | integration | old unite-hub Vercel project | Linear project management sync |
| `GITHUB_TOKEN` | web, workspace | integration | old unite-hub Vercel project | GitHub API access |
| `GITHUB_OWNER` | web | integration | old unite-hub Vercel project | GitHub owner/org for API calls |
| `GITHUB_WEBHOOK_SECRET` | web | integration | old unite-group Vercel project | Ported from authority-legacy; GitHub webhook validation |
| `GH_TOKEN` | workspace | workspace | local only | Alias for GITHUB_TOKEN used by some workspace tooling |
| `FACEBOOK_APP_ID` | web | integration | old unite-hub Vercel project | Facebook/Meta OAuth |
| `FACEBOOK_APP_SECRET` | web | integration | old unite-hub Vercel project | Facebook/Meta OAuth |
| `LINKEDIN_CLIENT_ID` | web | integration | old unite-hub Vercel project | LinkedIn OAuth |
| `LINKEDIN_CLIENT_SECRET` | web | integration | old unite-hub Vercel project | LinkedIn OAuth |
| `TIKTOK_CLIENT_KEY` | web | integration | old unite-hub Vercel project | TikTok OAuth |
| `TIKTOK_CLIENT_SECRET` | web | integration | old unite-hub Vercel project | TikTok OAuth |
| `REDDIT_CLIENT_ID` | web | integration | old unite-hub Vercel project | Reddit OAuth (validate-env.mjs flags as stale SaaS — confirm if still needed) |
| `REDDIT_CLIENT_SECRET` | web | integration | old unite-hub Vercel project | Reddit OAuth |
| `REDDIT_USERNAME` | web | integration | old unite-hub Vercel project | Reddit script auth |
| `REDDIT_PASSWORD` | web | integration | old unite-hub Vercel project | Reddit script auth |
| `SLACK_WEBHOOK_URL` | web | integration | old unite-hub Vercel project | Incoming webhook for notifications |
| `SLACK_BOT_TOKEN` | web | integration | old unite-hub Vercel project | Bot token for Slack API calls |
| `SLACK_DEFAULT_CHANNEL` | web | optional | old unite-hub Vercel project | Default channel (e.g. `#nexus-alerts`) |
| `SENDGRID_API_KEY` | web | integration | old unite-hub Vercel project | Transactional email |
| `SENDGRID_FROM_EMAIL` | web | optional | old unite-hub Vercel project | Sender address |
| `RECEIPT_FROM_EMAIL` | web | optional | old unite-hub Vercel project | Receipt email address |
| `WHATSAPP_APP_SECRET` | web | integration | old unite-hub Vercel project | WhatsApp webhook signature |
| `WHATSAPP_VERIFY_TOKEN` | web | integration | old unite-hub Vercel project | WhatsApp webhook verify token |
| `YOUTUBE_API_KEY` | web | integration | old unite-hub Vercel project | YouTube Data API v3 (separate from Google OAuth) |
| `GA4_PROPERTY_ID` | web | integration | old unite-hub Vercel project | Google Analytics 4 property ID |
| `GSC_PROPERTY_ID` | web | integration | old unite-hub Vercel project | Google Search Console property |
| `GEMINI_API_KEY` | web | integration | old unite-hub Vercel project | Image generation + vision analysis |
| `APIFY_API_TOKEN` | web | integration | old unite-hub Vercel project | Website scraping + screenshots |
| `PAPER_BANANA_URL` | web | integration | old unite-hub Vercel project | Diagram/infographic generation; falls back to Gemini if absent |
| `HEYGEN_API_KEY` | web | integration | old unite-hub Vercel project | AI video generation |
| `NEXT_PUBLIC_SENTRY_DSN` | web | integration | old unite-hub Vercel project | Sentry client-side DSN |
| `SENTRY_AUTH_TOKEN` | web | integration | old unite-hub Vercel project | Sentry source-map upload auth |
| `GITHUB_MCP_URL` | web | optional | local only | MCP gateway override for GitHub tools |
| `SLACK_MCP_URL` | web | optional | local only | MCP gateway override for Slack tools |
| `SUPABASE_MCP_URL` | web | optional | local only | MCP gateway override for Supabase tools |
| `OPERATOR_GATEWAY_SANDBOX_SUPABASE_URL` | web | optional | old unite-hub Vercel project (sandbox) | Sandbox Supabase URL for operator gateway |
| `OPERATOR_GATEWAY_SANDBOX_SUPABASE_ANON_KEY` | web | optional | old unite-hub Vercel project (sandbox) | Sandbox Supabase anon key for operator gateway |
| `WIKI_PATH` | web | optional | local only | Path to local Hermes wiki directory |
| `HERMES_CONFIG` | web | optional | local only | Hermes config override path |
| `KNOWLEDGE_CONSOLE_PREVIEW` | web | optional | local only | Feature flag: `"true"` enables knowledge console |
| `HERMES_API_URL` | workspace | workspace | local only | Hermes Agent gateway URL |
| `HERMES_API_TOKEN` | workspace | workspace | local only | Hermes gateway auth token |
| `HERMES_PASSWORD` | workspace | workspace | local only | Workspace web UI password |
| `HERMES_HOME` | workspace | workspace | local only | Hermes home directory |
| `HERMES_AGENT_REPO` | workspace | workspace | local only | Path/URL to Hermes agent repo |
| `HERMES_CLI_BIN` | workspace | workspace | local only | Path to hermes CLI binary |
| `HERMES_WORKSPACE_DIR` | workspace | workspace | local only | Active workspace directory |
| `HERMES_SKILLS_DIR` | workspace | workspace | local only | Skills directory path |
| `HERMES_WEBUI_DEFAULT_WORKSPACE` | workspace | workspace | local only | Default workspace for web UI |
| `HERMES_WORKSPACE_DESKTOP` | workspace | workspace | local only | Desktop workspace path |
| `HERMES_WORKSPACE_DOCKER` | workspace | workspace | local only | Docker workspace path |
| `HERMES_WORKSPACE_METRICS_DISK_PATH` | workspace | workspace | local only | Metrics disk path |
| `HERMES_DASHBOARD_TOKEN` | workspace | workspace | local only | Dashboard API bearer token |
| `HERMES_DASHBOARD_URL` | workspace | workspace | local only | Dashboard URL |
| `HERMES_DEFAULT_MODEL` | workspace | workspace | local only | Default LLM model identifier |
| `HERMES_USE_RESPONSES` | workspace | workspace | local only | Enable Responses API mode |
| `HERMES_TOOL_DEBUG` | workspace | workspace | local only | Enable tool-call debug logging |
| `CLAUDE_PASSWORD` | workspace | workspace | local only | Legacy alias for HERMES_PASSWORD |
| `CLAUDE_API_TOKEN` | workspace | workspace | local only | Legacy alias for HERMES_API_TOKEN |
| `CLAUDE_API_URL` | workspace | workspace | local only | Legacy API URL |
| `CLAUDE_GATEWAY_URL` | workspace | workspace | local only | Legacy gateway URL |
| `CLAUDE_GATEWAY_TOKEN` | workspace | workspace | local only | Legacy gateway token |
| `CLAUDE_GATEWAY_PASSWORD` | workspace | workspace | local only | Legacy gateway password |
| `CLAUDE_DASHBOARD_TOKEN` | workspace | workspace | local only | Legacy dashboard token |
| `CLAUDE_DASHBOARD_URL` | workspace | workspace | local only | Legacy dashboard URL |
| `CLAUDE_DEFAULT_MODEL` | workspace | workspace | local only | Legacy default model |
| `CLAUDE_HOME` | workspace | workspace | local only | Legacy home path |
| `CLAUDE_WORKSPACE_DIR` | workspace | workspace | local only | Legacy workspace directory |
| `OPENAI_API_KEY` | workspace | workspace | local only | OpenAI provider key (multi-model support) |
| `OPENROUTER_API_KEY` | workspace | workspace | local only | OpenRouter provider key (multi-model support) |
| `MCP_HUB_CACHE_TTL_MS` | workspace | optional | local only | MCP hub cache TTL |
| `MCP_TOOLS_CACHE_TTL_MS` | workspace | optional | local only | MCP tools cache TTL |
| `MCP_PRESETS_SEED_PATH` | workspace | optional | local only | Path to MCP preset seed file |
| `KNOWLEDGE_DIR` | workspace | optional | local only | Local knowledge directory for workspace |
| `HOST` | workspace | optional | local only | Bind address (default: 127.0.0.1) |
| `PORT` | workspace | optional | local only | Server port (default: 3002) |
| `COOKIE_SECURE` | workspace | optional | local only | Force Secure cookie flag |
| `TRUST_PROXY` | workspace | optional | local only | Trust x-forwarded-for headers |
| `STREAM_ACCEPTED_TIMEOUT_MS` | workspace | optional | local only | SSE accepted-state timeout |
| `STREAM_HANDOFF_TIMEOUT_MS` | workspace | optional | local only | SSE handoff-state timeout |
| `SWARM_MAIN_SESSION_KEY` | workspace | optional | local only | Swarm main session key |
| `SWARM_ORCHESTRATOR_WORKER_ID` | workspace | optional | local only | Swarm orchestrator worker ID |
| `NEXT_PUBLIC_APP_VERSION` | workspace | optional | local only | App version string (build-time) |
| `NEXT_PUBLIC_PING_URL` | workspace | optional | local only | Health-check ping URL |
| `SUPABASE_URL` | autopilot tests | design/test | not provisioned | Test input for CRM-origin validation; not a host connection recipe |
| `CC_OWNEST_WORKER_ID` | autopilot tests | design/test | not provisioned | Stable identity contract; no worker currently runs |
| `CC_OWNEST_HERMES_BIN` | autopilot tests | design/test | not provisioned | Absolute-path validation only; the build invokes no Hermes binary |
| `HERMES_CWD` | autopilot tests | design/test | not provisioned | Cwd contract exercised by tests; no emitted host workspace exists |
| `CC_OWNEST_LIVE` | autopilot tests | design/test | not provisioned | Exact `1` is rejected; no package command or host artifact can arm execution |
| `CC_OWNEST_LOCAL_DEVELOPMENT` | autopilot tests | design/test | not provisioned | Allows localhost-origin test coverage; never arms execution |
| `CC_OWNEST_HERMES_PROFILE` | autopilot tests | design/test | not provisioned | Reserved profile identity in the historical design |
| `CC_OWNEST_HERMES_BOARD` | autopilot tests | design/test | not provisioned | Reserved projection-board identity in the historical design |
| `CC_OWNEST_ROLLOUT_ID` | autopilot tests | design/test | not provisioned | Bounded-rollout contract only |
| `CC_OWNEST_CANARY_TASK_ID` | autopilot tests | design/test | not provisioned | Single-task contract only |
| `CC_OWNEST_CANARY_LIMIT` | autopilot tests | design/test | not provisioned | Test default `1` |
| `CC_OWNEST_MAX_IN_PROGRESS` | autopilot tests | design/test | not provisioned | Test default `1` |
| `CC_OWNEST_LEASE_MS` | autopilot tests | design/test | not provisioned | Test default `300000` |
| `CC_OWNEST_DAILY_DISPATCH_LIMIT` | autopilot tests | design/test | not provisioned | Test default `1` |
| `PLAYWRIGHT_TEST_EMAIL` | web | test | local only | E2E test founder login email |
| `PLAYWRIGHT_TEST_PASSWORD` | web | test | local only | E2E test founder login password |
| `PLAYWRIGHT_TEST_BASE_URL` | web | test | local only | E2E base URL |
| `TEST_FOUNDER_EMAIL` | web | test | local only | Integration test email |
| `TEST_FOUNDER_PASSWORD` | web | test | local only | Integration test password |
| `UNITE_HUB_BASE_URL` | web | test | local only | Integration test base URL |
| `UNITE_HUB_TEST_MOCK_AI_FILES` | web | test | local only | Mock AI file responses in tests |
| `UNITE_HUB_TEST_MOCK_TRANSCRIPTION` | web | test | local only | Mock transcription in tests |
| `PI_CEO_API_URL` | — | legacy | old unite-group Vercel project | Authority-legacy only; NOT ported to apps/web. Remove from Vercel |
| `NEXTAUTH_URL` | — | legacy | old unite-hub Vercel project | NextAuth replaced by Supabase PKCE |
| `NEXTAUTH_SECRET` | — | legacy | old unite-hub Vercel project | NextAuth replaced by Supabase PKCE |
| `JWT_SECRET` | — | legacy | old unite-hub Vercel project | Authority-legacy direct-DB JWT |
| `DIRECT_CONNECT` | — | legacy | old unite-hub Vercel project | Authority-legacy alias for DATABASE_URL |
| `STRIPE_TEST_SECRET_KEY` | — | legacy | old Vercel project | Old SaaS naming |
| `STRIPE_SECRET_TOKEN` | — | legacy | old Vercel project | Old SaaS naming |
| `STRIPE_RESTRICTED_KEY_TEST` | — | legacy | old Vercel project | Old SaaS naming |
| `STRIPE_RESTRICTED_KEY_LIVE` | — | legacy | old Vercel project | Old SaaS naming |
| `STRIPE_PRICE_ID_STARTER` | — | legacy | old Vercel project | Old SaaS plan ID |
| `CONVEX_URL` | — | legacy | old Vercel project | Replaced by Supabase |
| `CONVEX_DEPLOYMENT` | — | legacy | old Vercel project | Replaced by Supabase |
| `ABACUS_API_KEY` | — | legacy | old Vercel project | Unrelated experiment |
| `ABACUS_CLI_KEY` | — | legacy | old Vercel project | Unrelated experiment |
| `DATADOG_API_KEY` | — | legacy | old Vercel project | Not used in monorepo |
| `DATADOG_SITE` | — | legacy | old Vercel project | Not used in monorepo |
| `DIGITALOCEAN_API_TOKEN` | — | legacy | old Vercel project | Not used in monorepo |
| `ELEVENLABS_API_KEY` | — | legacy | old Vercel project | Not used in monorepo |
| `FIELD_ENCRYPTION_KEY` | — | legacy | old Vercel project | Replaced by VAULT_ENCRYPTION_KEY |
| `META_APP_ID` | — | legacy | old Vercel project | Old naming; use FACEBOOK_APP_ID |
| `META_APP_SECRET` | — | legacy | old Vercel project | Old naming; use FACEBOOK_APP_SECRET |
| `DR_XERO_CLIENT_ID` | — | legacy | old Vercel project | Wrong name; code expects DR_CLIENT_ID |
| `DR_XERO_CLIENT_SECRET` | — | legacy | old Vercel project | Wrong name; code expects DR_CLIENT_SECRET |
| `GOOGLE_CALLBACK_URL` | — | legacy | old unite-hub Vercel project | NextAuth callback; not used by apps/web |
| `GMAIL_CLIENT_ID` | — | legacy | old unite-hub Vercel project | Old explicit Gmail client; apps/web uses GOOGLE_CLIENT_ID |
| `GMAIL_CLIENT_SECRET` | — | legacy | old unite-hub Vercel project | Old explicit Gmail client |
| `GMAIL_REDIRECT_URI` | — | legacy | old unite-hub Vercel project | Old NextAuth Gmail redirect |
| `SENTRY_AUTH_TOKEN` (authority-legacy) | — | legacy | old unite-group Vercel project | Authority-legacy Sentry instance; apps/web uses its own SENTRY_AUTH_TOKEN if Sentry is added |
| `WHATSAPP_PHONE_NUMBER_ID` | — | legacy | old unite-hub Vercel project | In .env.example but NOT referenced in apps/web/src |
| `WHATSAPP_ACCESS_TOKEN` | — | legacy | old unite-hub Vercel project | In .env.example but NOT referenced in apps/web/src |
| `WHATSAPP_BUSINESS_ACCOUNT_ID` | — | legacy | old unite-hub Vercel project | In .env.example but NOT referenced in apps/web/src |

---

## Counts

| Scope | Count |
|---|---|
| apps/web (all tiers, excluding test + legacy) | 72 |
| apps/workspace | 38 |
| apps/autopilot-runner OWNEST profile | 16 (all dormant; not armable) |
| packages/pi-ceo-operator-mcp | 0 (uses ambient `gh` CLI auth only) |
| Test-only vars | 8 |
| Legacy/retired vars | 28 |
| **Union (all unique names, all sections)** | **~160** |

---

## Notable Findings

### Vars referenced in code but absent from every .env.example file

These are active code references with no example file entry — they would be silently skipped in a naive env-check:

| VAR | Package | Notes |
|---|---|---|
| `MICROSOFT_CLIENT_ID` | apps/web/src | Microsoft OAuth — in code, not in .env.example |
| `MICROSOFT_CLIENT_SECRET` | apps/web/src | As above |
| `HEYGEN_API_KEY` | apps/web/src | HeyGen video — in code, not in .env.example |
| `GITHUB_WEBHOOK_SECRET` | apps/web/src | Webhook validation — not in .env.example |
| `SLACK_BOT_TOKEN` | apps/web/src | Bot token — .env.example has SLACK_WEBHOOK_URL but not SLACK_BOT_TOKEN |
| `SENDGRID_API_KEY` | apps/web/src | Transactional email — .env.example has SENDGRID_FROM_EMAIL but not the API key |
| `RECEIPT_FROM_EMAIL` | apps/web/src | Not in .env.example |
| `TELEGRAM_BOT_TOKEN` | apps/web/src | Ported from authority-legacy — not in apps/web/.env.example |
| `TELEGRAM_CHAT_ID` | apps/web/src | As above |
| `TELEGRAM_DECISION_SIGNING_KEY` | apps/web/src | As above |
| `STRIPE_PRICE_ID_BASE` | apps/web/src | Ported from authority-legacy (different name to old STRIPE_PRICE_ID_STARTER) |
| `OPERATOR_GATEWAY_SANDBOX_SUPABASE_URL` | apps/web/src | Not in .env.example |
| `OPERATOR_GATEWAY_SANDBOX_SUPABASE_ANON_KEY` | apps/web/src | Not in .env.example |
| `KNOWLEDGE_CONSOLE_PREVIEW` | apps/web/src | Feature flag — not in .env.example |
| `WIKI_PATH` | apps/web/src | Local path — not in .env.example |
| `HERMES_CONFIG` | apps/web/src | Local path — not in .env.example |
| `GITHUB_MCP_URL` | apps/web/src | MCP override — not in .env.example |
| `SLACK_MCP_URL` | apps/web/src | MCP override — not in .env.example |
| `SUPABASE_MCP_URL` | apps/web/src | MCP override — not in .env.example |

### Vars in .env.example but NOT referenced in apps/web/src

These appear in `apps/web/.env.example` or `apps/web/.env.local.example` but have no `process.env` reference in the source tree — they may be dead config or used by deployment tooling only:

| VAR | Notes |
|---|---|
| `WHATSAPP_PHONE_NUMBER_ID` | In .env.example; no src reference. Exclude from Vercel until handler is implemented |
| `WHATSAPP_ACCESS_TOKEN` | As above |
| `WHATSAPP_BUSINESS_ACCOUNT_ID` | As above |
| `NEXTAUTH_URL` | Legacy; in .env.local.example only |
| `NEXTAUTH_SECRET` | Legacy; in .env.local.example only |
| `JWT_SECRET` | Legacy; in .env.local.example only |
| `DIRECT_CONNECT` | Legacy; in .env.local.example only |
| `GOOGLE_CALLBACK_URL` | Legacy; in .env.local.example only |
| `GMAIL_CLIENT_ID` | Legacy; in .env.local.example only |
| `GMAIL_CLIENT_SECRET` | Legacy; in .env.local.example only |
| `GMAIL_REDIRECT_URI` | Legacy; in .env.local.example only |

### Naming mismatch

`validate-env.mjs` already flags this: some Vercel projects have `DR_XERO_CLIENT_ID` / `DR_XERO_CLIENT_SECRET` but the code reads `DR_CLIENT_ID` / `DR_CLIENT_SECRET`. Rename in Vercel before cutover.

---

## How to Consolidate in Vercel

Target project: `unite-group` (`prj_IfUuJNLjXTE8VXqEGwLAleIGhiA0`), team `team_KMZACI5rIltoCRhAtGCXlxUf`.

Per the cutover runbook Step 1, copy env vars **by name** (values from the Vercel UI or 1Password — never from this repo).

### Exact copy list — critical + required (copy ALL of these)

```
NEXT_PUBLIC_SUPABASE_URL          ← unite-hub project
NEXT_PUBLIC_SUPABASE_ANON_KEY     ← unite-hub project
SUPABASE_SERVICE_ROLE_KEY         ← unite-hub project
ANTHROPIC_API_KEY                 ← unite-hub project
VAULT_ENCRYPTION_KEY              ← unite-hub project
CRON_SECRET                       ← unite-hub project
FOUNDER_USER_ID                   ← unite-hub project
NEXT_PUBLIC_APP_URL               ← unite-hub project (update to https://unite-group.in)
DATABASE_URL                      ← unite-hub project
```

### Integration vars — copy the ones relevant to active features

```
# Stripe + Telegram (ported from authority-legacy / old unite-group project)
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET             ← update signing secret per runbook Step 3
STRIPE_PRICE_ID_BASE
TELEGRAM_BOT_TOKEN
TELEGRAM_CHAT_ID
TELEGRAM_DECISION_SIGNING_KEY

# Xero
XERO_CLIENT_ID
XERO_CLIENT_SECRET
XERO_TENANT_ID_CARSI
XERO_WEBHOOK_KEY
DR_CLIENT_ID                      ← rename from DR_XERO_CLIENT_ID if needed
DR_CLIENT_SECRET                  ← rename from DR_XERO_CLIENT_SECRET if needed
XERO_TENANT_ID_DR

# Google
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GOOGLE_DRIVE_VAULT_FOLDER_ID

# Linear
LINEAR_API_KEY

# GitHub
GITHUB_TOKEN
GITHUB_OWNER
GITHUB_WEBHOOK_SECRET

# Social
FACEBOOK_APP_ID
FACEBOOK_APP_SECRET
LINKEDIN_CLIENT_ID
LINKEDIN_CLIENT_SECRET
TIKTOK_CLIENT_KEY
TIKTOK_CLIENT_SECRET

# Slack
SLACK_WEBHOOK_URL
SLACK_BOT_TOKEN
SLACK_DEFAULT_CHANNEL

# Email
SENDGRID_API_KEY
SENDGRID_FROM_EMAIL
RECEIPT_FROM_EMAIL

# AI providers
GEMINI_API_KEY
APIFY_API_TOKEN
HEYGEN_API_KEY

# Monitoring
NEXT_PUBLIC_SENTRY_DSN
SENTRY_AUTH_TOKEN
```

### Do NOT copy to unite-group Vercel (legacy — delete from both projects)

```
PI_CEO_API_URL, NEXTAUTH_URL, NEXTAUTH_SECRET, JWT_SECRET, DIRECT_CONNECT,
STRIPE_TEST_SECRET_KEY, STRIPE_SECRET_TOKEN, STRIPE_RESTRICTED_KEY_TEST,
STRIPE_RESTRICTED_KEY_LIVE, STRIPE_PRICE_ID_STARTER, CONVEX_URL,
CONVEX_DEPLOYMENT, ABACUS_API_KEY, ABACUS_CLI_KEY, DATADOG_API_KEY,
DATADOG_SITE, DIGITALOCEAN_API_TOKEN, ELEVENLABS_API_KEY, FIELD_ENCRYPTION_KEY,
META_APP_ID, META_APP_SECRET, DR_XERO_CLIENT_ID, DR_XERO_CLIENT_SECRET,
GOOGLE_CALLBACK_URL, GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REDIRECT_URI,
WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_ACCESS_TOKEN, WHATSAPP_BUSINESS_ACCOUNT_ID
```
