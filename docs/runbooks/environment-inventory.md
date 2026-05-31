# Environment Variable Inventory

**Project:** Unite-Group
**Last Updated:** 2026-05-31
**Source of Truth:** 1Password vault "Unite-Group-Infrastructure"
**Local File:** .env.local (gitignored — NEVER COMMIT)

---

## Required Variables

### Supabase (Database + Auth + Storage)

| Variable | Purpose | Source | Rotation Frequency | Last Rotated |
|----------|---------|--------|-------------------|--------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Public Supabase project URL | Supabase Dashboard | Never (URL) | N/A |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key for client-side | Supabase Dashboard | On compromise | Unknown |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role for server-side ops | Supabase Dashboard | On compromise | Unknown |
| `SUPABASE_MANAGEMENT_TOKEN` | Management API access | Supabase Dashboard | Quarterly | Unknown |
| `DATABASE_URL` | Direct Postgres connection | Supabase Dashboard (Connection String) | On compromise | Unknown |

### Vercel (Hosting + Deployment)

| Variable | Purpose | Source | Rotation Frequency | Last Rotated |
|----------|---------|--------|-------------------|--------------|
| `VERCEL_OIDC_TOKEN` | OIDC authentication for Vercel | Vercel Dashboard | On compromise | Unknown |

### Stripe (Payments)

| Variable | Purpose | Source | Rotation Frequency | Last Rotated |
|----------|---------|--------|-------------------|--------------|
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Client-side Stripe key | Stripe Dashboard | Never (publishable) | N/A |
| `STRIPE_SECRET_KEY` | Server-side Stripe operations | Stripe Dashboard | On compromise | Unknown |
| `STRIPE_WEBHOOK_SECRET` | Webhook signature verification | Stripe Dashboard | On compromise | Unknown |

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

### CRM Ingest (Custom)

| Variable | Purpose | Source | Rotation Frequency | Last Rotated |
|----------|---------|--------|-------------------|--------------|
| `UNITE_CRM_INGEST_TOKEN` | Bearer token for voice→CRM API | Generated internally | On compromise | Unknown |
| `UNITE_CRM_ORG_ID` | Organization identifier | Internal config | Never (ID) | N/A |
| `UNITE_CRM_WORKSPACE_ID` | Workspace identifier | Internal config | Never (ID) | N/A |

### 1Password (Credential Management)

| Variable | Purpose | Source | Rotation Frequency | Last Rotated |
|----------|---------|--------|-------------------|--------------|
| `OP_VAULT` | Vault name for infrastructure | 1Password | Never (name) | N/A |

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
