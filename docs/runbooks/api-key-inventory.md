# API Key Inventory

**Project:** Unite-Group
**Last Updated:** 2026-05-31
**Owner:** Nexus Security & DR Lead

---

## Active API Keys

| Provider | Key Name | Environment | Purpose | Status | Rotation Due |
|----------|----------|-------------|---------|--------|--------------|
| Supabase | Anon Key | Production | Client-side auth | ACTIVE | On compromise |
| Supabase | Service Role | Production | Server-side ops | ACTIVE | On compromise |
| Supabase | Management Token | Production | Management API | ACTIVE | 2026-08-31 |
| Stripe | Publishable Key | Production | Client-side payments | ACTIVE | N/A |
| Stripe | Secret Key | Production | Server-side payments | ACTIVE | On compromise |
| Stripe | Webhook Secret | Production | Webhook verification | ACTIVE | On compromise |
| ElevenLabs | API Key | Production | Voice generation | ACTIVE | On compromise |
| Telegram | Bot Token | Production | Notifications | ACTIVE | On compromise |
| Linear | API Key | Production | Task management | ACTIVE | On compromise |
| Vercel | OIDC Token | Production | Deployment auth | ACTIVE | On compromise |
| OpenAI | API Key | Production | AI gateway primary | ACTIVE | On compromise |
| Anthropic | API Key | Production | AI gateway fallback | ACTIVE | On compromise |

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

---

**Document Status:** ACTIVE
**Next Review:** Monthly
