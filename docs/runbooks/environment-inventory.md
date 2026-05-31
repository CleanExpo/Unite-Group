# Environment Variable Inventory

**Project:** Unite-Group
**Last Updated:** 2026-05-31 (Enhanced)
**Source of Truth:** 1Password vault "Unite-Group-Infrastructure"
**Local File:** .env.local (gitignored — NEVER COMMIT)

> **Cross-references:** [Master DR Runbook](disaster-recovery.md) | [API Key Inventory](api-key-inventory.md) | [Infrastructure Inventory](infrastructure-inventory.md)

---

## Required Variables

### Supabase (Database + Auth + Storage)

| Variable | Purpose | Source | Rotation Frequency | Last Rotated |
|----------|---------|--------|-------------------|--------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Public Supabase project URL | Supabase Dashboard | Never (URL) | N/A |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key for client-side | Supabase Dashboard | On compromise | Unknown |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role for server-side ops (admin auth, RBAC, CRM) | Supabase Dashboard | On compromise | Unknown |
| `SUPABASE_MANAGEMENT_TOKEN` | Management API access | Supabase Dashboard | Quarterly | Unknown |
| `SUPABASE_ACCESS_TOKEN` | Supabase management API (fallback for MANAGEMENT_TOKEN) | Supabase Dashboard > Account > Tokens | Quarterly | Unknown |
| `DATABASE_URL` | Direct Postgres connection | Supabase Dashboard (Connection String) | On compromise | Unknown |

### Vercel (Hosting + Deployment)

| Variable | Purpose | Source | Rotation Frequency | Last Rotated |
|----------|---------|--------|-------------------|--------------|
| `VERCEL_OIDC_TOKEN` | OIDC authentication for Vercel | Vercel Dashboard | On compromise | Unknown |
| `CRON_SECRET` | Bearer token authenticating all 11 Vercel cron jobs | Vercel Dashboard > Settings > Environment Variables | On compromise | Unknown |

### Stripe (Payments)

| Variable | Purpose | Source | Rotation Frequency | Last Rotated |
|----------|---------|--------|-------------------|--------------|
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Client-side Stripe key | Stripe Dashboard | Never (publishable) | N/A |
| `STRIPE_SECRET_KEY` | Server-side Stripe operations | Stripe Dashboard | On compromise | Unknown |
| `STRIPE_WEBHOOK_SECRET` | Webhook signature verification | Stripe Dashboard | On compromise | Unknown |

### AI Gateway (OpenAI + Anthropic)

| Variable | Purpose | Source | Rotation Frequency | Last Rotated |
|----------|---------|--------|-------------------|--------------|
| `OPENAI_API_KEY` | Primary AI provider (personalization engine, embeddings, backfill scripts) | OpenAI Dashboard | On compromise | Unknown |
| `ANTHROPIC_API_KEY` | Fallback AI provider (BrandIQ next-steps, caption generation) | Anthropic Dashboard | On compromise | Unknown |

### ElevenLabs (Voice / Margot)

| Variable | Purpose | Source | Rotation Frequency | Last Rotated |
|----------|---------|--------|-------------------|--------------|
| `ELEVENLABS_API_KEY` | API access for voice generation | ElevenLabs Dashboard | On compromise | Unknown |
| `ELEVENLABS_MARGOT_AGENT_ID` | Margot voice agent identifier | ElevenLabs Dashboard | Never (ID) | N/A |

### Telegram (Notifications)

| Variable | Purpose | Source | Rotation Frequency | Last Rotated |
|----------|---------|--------|-------------------|--------------|
| `TELEGRAM_BOT_TOKEN` | Bot authentication | @BotFather | On compromise | Unknown |
| `TELEGRAM_CHAT_ID` | Target chat for notifications | Telegram app | Never (ID) | N/A |

### Linear (Task Management)

| Variable | Purpose | Source | Rotation Frequency | Last Rotated |
|----------|---------|--------|-------------------|--------------|
| `LINEAR_API_KEY` | API access for issues/teams | Linear Settings | On compromise | Unknown |

### GitHub (Integration Metrics)

| Variable | Purpose | Source | Rotation Frequency | Last Rotated |
|----------|---------|--------|-------------------|--------------|
| `GITHUB_INTEGRATION_TOKEN` | GitHub API access for repository metrics (used by /api/cron/integrations/github) | GitHub Settings > Developer > Personal Access Tokens | On compromise | Unknown |

### Railway (Pi-CEO Hosting + Monitoring)

| Variable | Purpose | Source | Rotation Frequency | Last Rotated |
|----------|---------|--------|-------------------|--------------|
| `RAILWAY_INTEGRATION_TOKEN` | Railway GraphQL API access (monitoring deployments) | Railway Dashboard > Tokens | On compromise | Unknown |
| `RAILWAY_PROJECT_IDS` | Comma-separated project IDs to monitor | Railway Dashboard | Never (IDs) | N/A |
| `PI_CEO_API_URL` | Pi-CEO autonomous agent endpoint (e.g. pi-dev-ops-production.up.railway.app) | Railway service URL | On redeploy | Unknown |
| `PI_CEO_API_KEY` | Pi-CEO admin bearer token (used by /api/pi-ceo/health and require-admin) | Internal (generate manually) | On compromise | Unknown |

### DigitalOcean (Infrastructure Monitoring)

| Variable | Purpose | Source | Rotation Frequency | Last Rotated |
|----------|---------|--------|-------------------|--------------|
| `DIGITALOCEAN_INTEGRATION_TOKEN` | DO API v2 access (apps, droplets, databases sync) | DigitalOcean Dashboard > API > Tokens/Keys | On compromise | Unknown |

### Composio (Third-Party Integration Platform)

| Variable | Purpose | Source | Rotation Frequency | Last Rotated |
|----------|---------|--------|-------------------|--------------|
| `COMPOSIO_API_KEY` | Composio REST API (connected accounts sync, uses X-API-KEY header) | Composio Dashboard > API Keys | On compromise | Unknown |

### Cloudflare Turnstile (CAPTCHA)

| Variable | Purpose | Source | Rotation Frequency | Last Rotated |
|----------|---------|--------|-------------------|--------------|
| `CF_TURNSTILE_SECRET_KEY` | Server-side Turnstile verification (failing closed if unset) | Cloudflare Dashboard > Turnstile | On compromise | Unknown |

### 1Password (Vault Indexing + Connect)

| Variable | Purpose | Source | Rotation Frequency | Last Rotated |
|----------|---------|--------|-------------------|--------------|
| `OP_VAULT` | Default vault name for infrastructure | 1Password | Never (name) | N/A |
| `OP_VAULTS` | Comma-separated vault list for sync (overrides defaults) | Internal config | Never | N/A |
| `OP_CONNECT_HOST` | 1Password Connect server URL (optional, server-side only) | 1Password Connect setup | On redeploy | Unknown |
| `OP_CONNECT_TOKEN` | 1Password Connect API token (optional) | 1Password Connect setup | On compromise | Unknown |

### CRM Ingest (Custom)

| Variable | Purpose | Source | Rotation Frequency | Last Rotated |
|----------|---------|--------|-------------------|--------------|
| `UNITE_CRM_INGEST_TOKEN` | Bearer token for voice->CRM API | Generated internally | On compromise | Unknown |
| `UNITE_CRM_ORG_ID` | Organization identifier | Internal config | Never (ID) | N/A |
| `UNITE_CRM_WORKSPACE_ID` | Workspace identifier | Internal config | Never (ID) | N/A |
| `UNITE_CRM_OPPORTUNITIES_DIGEST_ENABLED` | Feature flag for opportunities digest | Internal config | N/A | N/A |
| `UNITE_CRM_DIGEST_OWNER` | Name shown as digest owner (default: "Margot") | Internal config | N/A | N/A |

### Email (SMTP)

| Variable | Purpose | Source | Rotation Frequency | Last Rotated |
|----------|---------|--------|-------------------|--------------|
| `SMTP_HOST` | SMTP server hostname | Email provider | On provider change | Unknown |
| `SMTP_PORT` | SMTP server port (default: 587) | Email provider | On provider change | Unknown |
| `SMTP_USER` | SMTP authentication username | Email provider | On compromise | Unknown |
| `SMTP_PASSWORD` | SMTP authentication password | Email provider | On compromise | Unknown |
| `DEFAULT_FROM` | Default sender email address | Internal config | N/A | N/A |
| `ADMIN_EMAIL` | Admin notification recipient | Internal config | N/A | N/A |

### Analytics & PWA

| Variable | Purpose | Source | Rotation Frequency | Last Rotated |
|----------|---------|--------|-------------------|--------------|
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | Google Analytics measurement ID | Google Analytics Dashboard | Never (ID) | N/A |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Web Push VAPID public key | Generated via web-push | Never (key pair) | N/A |

---

## Environment Recovery Priority Order

If .env.local is lost, reconstruct in this order (most critical first):

1. **Database:** `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`
2. **Auth/Cron:** `CRON_SECRET` (all 11 cron jobs will 401 without this)
3. **Payments:** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
4. **AI Features:** `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`
5. **Integrations:** `GITHUB_INTEGRATION_TOKEN`, `RAILWAY_INTEGRATION_TOKEN`, `DIGITALOCEAN_INTEGRATION_TOKEN`, `COMPOSIO_API_KEY`
6. **Pi-CEO:** `PI_CEO_API_URL`, `PI_CEO_API_KEY`
7. **Voice:** `ELEVENLABS_API_KEY`
8. **Security:** `CF_TURNSTILE_SECRET_KEY`
9. **Notifications:** `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`
10. **Remaining:** Email, Analytics, Linear, 1Password Connect

---

## Backup Procedure

1. **Primary:** All values stored in 1Password vault "Unite-Group-Infrastructure"
2. **Secondary:** Encrypted backup created monthly:
   ```bash
   cd /Users/phillmcgurk/Unite-Group
   gpg --symmetric --cipher-algo AES256 --output .env.backup.gpg .env.local
   # Store .env.backup.gpg in secure cloud storage
   ```
3. **Recovery:**
   ```bash
   gpg --decrypt .env.backup.gpg > .env.local
   ```

---

## Rotation Log

| Date | Variable | Reason | Performed By |
|------|----------|--------|--------------|
| — | — | — | — |

---

**Document Status:** ACTIVE
**Next Review:** Monthly
**Related:** [API Key Inventory](api-key-inventory.md) | [DR Runbook](disaster-recovery.md)
