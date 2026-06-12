# API Key Inventory

**Project:** Unite-Group
**Last Updated:** 2026-05-31 (Enhanced)
**Owner:** Nexus Security & DR Lead

> **Cross-references:** [Master DR Runbook](disaster-recovery.md) | [Environment Inventory](environment-inventory.md) | [Infrastructure Inventory](infrastructure-inventory.md)

---

## Active API Keys

| Provider | Key Name | Environment | Purpose | Status | Rotation Due |
|----------|----------|-------------|---------|--------|--------------|
| Supabase | Anon Key | Production | Client-side auth | ACTIVE | On compromise |
| Supabase | Service Role | Production | Server-side ops (admin auth, RBAC) | ACTIVE | On compromise |
| Supabase | Management Token | Production | Management API | ACTIVE | 2026-08-31 |
| Supabase | Access Token | Production | Management API (alternate) | ACTIVE | 2026-08-31 |
| Stripe | Publishable Key | Production | Client-side payments | ACTIVE | N/A |
| Stripe | Secret Key | Production | Server-side payments | ACTIVE | On compromise |
| Stripe | Webhook Secret | Production | Webhook verification | ACTIVE | On compromise |
| OpenAI | API Key | Production | AI gateway primary (personalization, embeddings) | ACTIVE | On compromise |
| Anthropic | API Key | Production | AI gateway fallback (BrandIQ, captions) | ACTIVE | On compromise |
| ElevenLabs | API Key | Production | Voice generation | ACTIVE | On compromise |
| ElevenLabs | Agent ID | Production | Margot voice agent (not a secret) | ACTIVE | N/A |
| Telegram | Bot Token | Production | Notifications | ACTIVE | On compromise |
| Linear | API Key | Production | Task management | ACTIVE | On compromise |
| Vercel | OIDC Token | Production | Deployment auth | ACTIVE | On compromise |
| Vercel | Cron Secret | Production | Authenticates all 11 cron jobs | ACTIVE | On compromise |
| GitHub | Integration Token | Production | Repository metrics (cron sync) | ACTIVE | On compromise |
| Railway | Integration Token | Production | Railway GraphQL (deployment monitoring) | ACTIVE | On compromise |
| Railway | Pi-CEO API Key | Production | Pi-CEO admin auth (admin endpoints) | ACTIVE | On compromise |
| DigitalOcean | Integration Token | Production | DO API (apps, droplets, databases sync) | ACTIVE | On compromise |
| Composio | API Key | Production | Connected accounts sync (X-API-KEY header) | ACTIVE | On compromise |
| Cloudflare | Turnstile Secret | Production | CAPTCHA server-side verification | ACTIVE | On compromise |
| 1Password | Connect Token | Production | Vault indexing via Connect API (optional) | ACTIVE | On compromise |

## Stale / Revoked Keys

| Provider | Key Name | Revoked Date | Reason |
|----------|----------|-------------|--------|
| — | — | — | — |

## Key Rotation Procedure

### Supabase
1. Dashboard → Project Settings → API
2. Click "Regenerate" on affected key
3. Update Vercel env vars: `vercel env add [VAR] production`
4. Update .env.local
5. Update 1Password
6. Redeploy: `vercel --prod`
7. Verify application works

### Stripe
1. Dashboard → Developers → API Keys
2. Revoke old key
3. Create new key
4. Update Vercel env vars
5. Update webhooks with new secret
6. Update .env.local and 1Password
7. Redeploy and verify

### ElevenLabs
1. Dashboard → API Keys
2. Revoke old key
3. Create new key
4. Update Vercel env vars
5. Update .env.local and 1Password
6. Redeploy and test voice

### Telegram
1. Message @BotFather
2. /revoke
3. Update Vercel env vars
4. Update .env.local and 1Password
5. Redeploy and test notifications

### Linear
1. Settings → API
2. Revoke old key
3. Create new key
4. Update Vercel env vars
5. Update .env.local and 1Password
6. Redeploy and verify

### OpenAI
1. Dashboard → API Keys: https://platform.openai.com/api-keys
2. Revoke compromised key
3. Create new key
4. Update Vercel env vars: `vercel env add OPENAI_API_KEY production`
5. Update .env.local and 1Password
6. Redeploy and test AI features

### Anthropic
1. Dashboard → API Keys: https://console.anthropic.com/settings/keys
2. Revoke compromised key
3. Create new key
4. Update Vercel env vars: `vercel env add ANTHROPIC_API_KEY production`
5. Update .env.local and 1Password
6. Redeploy and test fallback AI

### GitHub
1. Settings → Developer settings → Personal access tokens
2. Revoke old token
3. Generate new token (scopes: `repo`, `read:org`)
4. Update Vercel env vars: `vercel env add GITHUB_INTEGRATION_TOKEN production`
5. Update .env.local and 1Password
6. Redeploy and verify `/api/cron/integrations/github`

### Railway
1. Dashboard → Tokens: https://railway.app/account/tokens
2. Revoke old token
3. Create new integration token
4. Update Vercel env vars: `vercel env add RAILWAY_INTEGRATION_TOKEN production`
5. Update .env.local and 1Password
6. Redeploy and verify `/api/cron/integrations/railway`

### DigitalOcean
1. Dashboard → API → Tokens/Keys: https://cloud.digitalocean.com/account/api/tokens
2. Revoke old token
3. Generate new token (read access sufficient)
4. Update Vercel env vars: `vercel env add DIGITALOCEAN_INTEGRATION_TOKEN production`
5. Update .env.local and 1Password
6. Redeploy and verify `/api/cron/integrations/digitalocean`

### Composio
1. Dashboard → API Keys: https://app.composio.dev/settings/api-keys
2. Revoke old key
3. Generate new key
4. Update Vercel env vars: `vercel env add COMPOSIO_API_KEY production`
5. Update .env.local and 1Password
6. Redeploy and verify `/api/cron/integrations/composio`

### Cloudflare Turnstile
1. Dashboard → Turnstile: https://dash.cloudflare.com/?to=/:account/turnstile
2. Regenerate secret key
3. Update Vercel env vars: `vercel env add CF_TURNSTILE_SECRET_KEY production`
4. Update .env.local and 1Password
5. Redeploy and test form submission (CAPTCHA)

### Vercel Cron Secret
1. Generate new secret: `openssl rand -hex 32`
2. Update Vercel env vars: `vercel env add CRON_SECRET production`
3. Update .env.local
4. Redeploy: `vercel --prod`
5. Verify all cron jobs return 200 (not 401):
   ```bash
   curl -sH "Authorization: Bearer $NEW_CRON_SECRET" \
     https://unite-group.vercel.app/api/cron/integrations/github
   ```

### Pi-CEO API Key
1. Generate new key: `openssl rand -hex 32`
2. Update Railway service env vars (for Pi-CEO to accept the new key)
3. Update Vercel env vars: `vercel env add PI_CEO_API_KEY production`
4. Update .env.local
5. Redeploy and verify: `curl -sH "Authorization: Bearer *** "$PI_CEO_API_URL/health"`

---

**Document Status:** ACTIVE
**Next Review:** Monthly
**Related:** [Environment Inventory](environment-inventory.md) | [DR Runbook](disaster-recovery.md)
