# Infrastructure Inventory

**Project:** Unite-Group
**Last Updated:** 2026-05-31
**Owner:** Nexus Security & DR Lead

> **Cross-references:** [Master DR Runbook](disaster-recovery.md) | [Environment Inventory](environment-inventory.md) | [API Key Inventory](api-key-inventory.md)

---

## System Architecture Overview

```
                    ┌─────────────────────────────────┐
                    │         Cloudflare DNS           │
                    │   unite-group.vercel.app         │
                    └───────────────┬─────────────────┘
                                    │ CNAME → cname.vercel-dns.com
                    ┌───────────────▼─────────────────┐
                    │      Vercel (syd1 region)        │
                    │  Next.js 15 App + 11 Cron Jobs   │
                    │  70+ API Routes                  │
                    └───┬──────────┬──────────┬───────┘
                        │          │          │
              ┌─────────▼──┐  ┌───▼────┐  ┌──▼──────────┐
              │  Supabase   │  │Railway │  │ ElevenLabs  │
              │  (prod DB)  │  │(Pi-CEO)│  │ (Voice/Margot)│
              │  + 3 Edge   │  │        │  │             │
              │  Functions  │  └────────┘  └─────────────┘
              └─────────────┘
```

---

## Tier 1: CRITICAL (Business-Down Without These)

### Vercel — Primary Hosting Platform

| Attribute | Value |
|-----------|-------|
| **Provider** | Vercel (AWS-backed) |
| **Region** | `syd1` (Sydney, Australia) — SINGLE REGION, NO FAILOVER |
| **Framework** | Next.js 15 (v15.5.15) |
| **Project Name** | unite-group |
| **Production URL** | https://unite-group.vercel.app |
| **Build Command** | `npm run build` |
| **Output Directory** | `.next` |
| **GitHub Repo** | CleanExpo/Unite-Group |
| **Auto-Deploy** | Yes — every push to `main` |
| **Cron Jobs** | 11 scheduled jobs (see below) |
| **RTO** | 1 hour |
| **RPO** | 0 (code in Git, instant redeploy) |
| **DR Scenario** | Scenario 2, 3, 13, 15 in master runbook |
| **Backup Strategy** | `vercel.json` in Git; env vars in 1Password |

**Known Risk:** Single-region (syd1). Any AWS Sydney outage = total backend outage.

---

### Supabase — Primary Database + Auth + Storage

| Attribute | Value |
|-----------|-------|
| **Provider** | Supabase (AWS-backed) |
| **Production Project Ref** | `lksfwktwtmyznckodsau` — *see [Supabase Master Registry](supabase-master-registry.md)* |
| **DB-Safety Model** | Supabase database branching — validate every migration on an ephemeral per-branch DB; promote to prod ONLY via a merged + approved branch (never apply to prod directly/autonomously). See [CLAUDE.md](../../CLAUDE.md). |
| **Sandbox Project Ref** | ~~`xgqwfwqumliuguzhshwv`~~ — **DELETED 2026-06-15, not replaced.** The mirror sandbox and `sandbox-wizard.sh`/`sandbox-bootstrap.sh` are gone; use Supabase database branching (above). |
| **Third Project Ref (legacy?)** | `uqfgdezadpkiadugufbs` — **STALE — DELETE PER REGISTRY** |
| **Database** | PostgreSQL (managed) |
| **Table Count** | ~1,665 |
| **Auth** | Supabase Auth (GoTrue) |
| **Storage** | Supabase Storage buckets |
| **Edge Functions** | 3 deployed (see below) |
| **Backup** | Auto-daily (UNVERIFIED — needs confirmation) |
| **RTO** | 4 hours (full restore from backup) |
| **RPO** | 24 hours (daily backup) — NEEDS IMPROVEMENT to ≤1 hour via PITR |
| **DR Scenario** | Scenario 1, 11, 16 in master runbook |

**Edge Functions (deployed to Supabase):**

| Function | Purpose | Deployment |
|----------|---------|------------|
| `score-client` | Client scoring logic | `supabase/functions/score-client/` |
| `process-publish-queue` | Publish queue processing | `supabase/functions/process-publish-queue/` |
| `generate-calendar` | Calendar content generation | `supabase/functions/generate-calendar/` |

---

### Stripe — Payment Processing

| Attribute | Value |
|-----------|-------|
| **Provider** | Stripe |
| **Integration** | Stripe Checkout + Webhooks |
| **Webhook Endpoint** | `https://unite-group.vercel.app/api/webhooks/stripe` |
| **PCI Compliance** | SAQ-A (Stripe-hosted checkout, no card data on our servers) |
| **RTO** | 2 hours |
| **RPO** | 3 days (Stripe retries webhooks for 3 days) |
| **DR Scenario** | Scenario 3, 10 in master runbook |

---

## Tier 2: HIGH (Significant Degradation Without These)

### Railway — Pi-CEO Autonomous Agent

| Attribute | Value |
|-----------|-------|
| **Provider** | Railway |
| **Service** | Pi-CEO (autonomous dev-ops agent) |
| **Production URL** | `pi-dev-ops-production.up.railway.app` |
| **Monitoring** | Polled Every 5 min via `/api/cron/integrations/railway` |
| **Auth** | Bearer token (`PI_CEO_API_KEY`) |
| **RTO** | 1 hour |
| **RPO** | 5 minutes (stateless — no persistent data) |
| **DR Scenario** | Scenario 8 in master runbook |

---

### Cloudflare — DNS + CAPTCHA

| Attribute | Value |
|-----------|-------|
| **Provider** | Cloudflare |
| **DNS** | `unite-group.vercel.app` → CNAME `cname.vercel-dns.com` |
| **CAPTCHA** | Turnstile (server-side verification via `CF_TURNSTILE_SECRET_KEY`) |
| **RTO** | 4 hours (DNS) / 1 hour (CAPTCHA degraded mode) |
| **DR Scenario** | Scenario 12 in master runbook |

---

### GitHub — Source Control + CI/CD Trigger

| Attribute | Value |
|-----------|-------|
| **Provider** | GitHub |
| **Organization** | CleanExpo |
| **Repository** | CleanExpo/Unite-Group |
| **Default Branch** | `main` |
| **Auto-deploy** | Push to main triggers Vercel deployment |
| **Integration** | `/api/cron/integrations/github` polls every 5 min |
| **RTO** | 2 hours (code in local clone) |
| **RPO** | Last push (code distributed) |
| **DR Scenario** | Scenario 13 in master runbook |

---

### AI Gateway — OpenAI + Anthropic

| Attribute | Value |
|-----------|-------|
| **Primary Provider** | OpenAI (`OPENAI_API_KEY`) |
| **Fallback Provider** | Anthropic (`ANTHROPIC_API_KEY`) |
| **Primary Usage** | Personalization engine, embeddings, backfill scripts |
| **Fallback Usage** | BrandIQ next-steps, caption generation |
| **Failover** | Built into code (automatic fallback on primary failure) |
| **RTO** | 15 minutes (automatic failover) |
| **RPO** | N/A (no state) |
| **DR Scenario** | Scenario 5 in master runbook |

---

## Tier 3: MODERATE (Degraded Features Without These)

### DigitalOcean — Infrastructure Monitoring

| Attribute | Value |
|-----------|-------|
| **Provider** | DigitalOcean |
| **Integration** | API v2 monitoring (apps, droplets, databases) |
| **Monitoring** | `/api/cron/integrations/digitalocean` polls every 15 min |
| **Auth** | Bearer token (`DIGITALOCEAN_INTEGRATION_TOKEN`) |
| **RTO** | 4 hours |
| **RPO** | Last sync |

---

### Composio — Third-Party Integration Platform

| Attribute | Value |
|-----------|-------|
| **Provider** | Composio |
| **Integration** | Connected accounts sync |
| **Monitoring** | `/api/cron/integrations/composio` polls hourly (:30) |
| **Auth** | X-API-KEY header (`COMPOSIO_API_KEY`) |
| **API Base** | `https://backend.composio.dev/api/v1` |
| **RTO** | 4 hours |
| **RPO** | Last sync (hourly) |

---

### ElevenLabs — Voice / Margot

| Attribute | Value |
|-----------|-------|
| **Provider** | ElevenLabs |
| **Purpose** | Voice generation for Margot AI assistant |
| **Agent ID** | `ELEVENLABS_MARGOT_AGENT_ID` |
| **RTO** | 2 hours |
| **RPO** | N/A (stateless generation) |

---

### Linear — Task Management

| Attribute | Value |
|-----------|-------|
| **Provider** | Linear |
| **Integration** | `/api/cron/integrations/linear` polls every 5 min |
| **Auth** | API key (`LINEAR_API_KEY`) |
| **RTO** | 4 hours |
| **RPO** | Last sync |

---

### Telegram — Notifications

| Attribute | Value |
|-----------|-------|
| **Provider** | Telegram Bot API |
| **Purpose** | Board notifications, alerting, DR status updates |
| **Bot** | Configured via `TELEGRAM_BOT_TOKEN` |
| **RTO** | Non-critical (degraded comms only) |
| **RPO** | N/A |

---

### 1Password — Credential Management + Vault Sync

| Attribute | Value |
|-----------|-------|
| **Provider** | 1Password |
| **Primary Vault** | Unite-Group-Infrastructure |
| **Additional Vaults** | RestoreAssist, Carsi, CCW-CRM, Synthex, Email-Accounts, Personal |
| **Integration** | Vault index sync via `/api/cron/integrations/onepassword` |
| **Connect** | Optional (OP_CONNECT_HOST + OP_CONNECT_TOKEN) |
| **CLI Fallback** | `op` CLI via execFileSync (names-only, no secret values) |
| **RTO** | 4 hours (rotate all credentials) |

---

### Email (SMTP)

| Attribute | Value |
|-----------|-------|
| **Provider** | Configurable (SMTP_HOST, SMTP_PORT) |
| **Purpose** | Administrative and user-facing emails |
| **RTO** | 4 hours (non-critical) |

---

## Vercel Cron Jobs — Complete Schedule

All cron jobs are defined in `vercel.json` and authenticated with `CRON_SECRET` bearer token.

| # | Path | Schedule (cron) | Human-Readable | Integration |
|---|------|-----------------|----------------|-------------|
| 1 | `/api/cron/geo-citation-monitor` | `0 17 * * 6` | Saturday 17:00 UTC | Audit |
| 2 | `/api/cron/integrations/github` | `*/5 * * * *` | Every 5 minutes | GitHub |
| 3 | `/api/cron/integrations/vercel` | `1-59/5 * * * *` | Every 5 min (offset +1) | Vercel |
| 4 | `/api/cron/integrations/railway` | `2-59/5 * * * *` | Every 5 min (offset +2) | Railway |
| 5 | `/api/cron/integrations/linear` | `3-59/5 * * * *` | Every 5 min (offset +3) | Linear |
| 6 | `/api/cron/integrations/digitalocean` | `*/15 * * * *` | Every 15 minutes | DigitalOcean |
| 7 | `/api/cron/integrations/stripe` | `5-59/15 * * * *` | Every 15 min (offset +5) | Stripe |
| 8 | `/api/cron/integrations/supabase` | `0 * * * *` | Every hour | Supabase |
| 9 | `/api/cron/integrations/composio` | `30 * * * *` | Every hour at :30 | Composio |
| 10 | `/api/cron/process-scan-requests` | `*/5 * * * *` | Every 5 minutes | Security scans |
| 11 | `/api/cron/data-room/regenerate` | `0 17 * * *` | Daily 17:00 UTC | Data room |

**Note:** Cron offsets (1-59/5, 2-59/5, 3-59/5, 5-59/15) are intentional to stagger database load across the 5-minute cron cycle.

---

## RTO/RPO Summary

| Component | Tier | RTO | RPO | Notes |
|-----------|------|-----|-----|-------|
| Vercel (code) | Critical | 1 hour | 0 (Git) | Redeploy from last good commit |
| Supabase (database) | Critical | 4 hours | 24 hours ⚠️ | NEEDS IMPROVEMENT — enable PITR |
| Stripe (payments) | Critical | 2 hours | 3 days | Webhook retry buffer |
| Railway (Pi-CEO) | High | 1 hour | 5 min | Stateless service |
| AI Gateway | High | 15 min | N/A | Automatic failover built-in |
| Cron Jobs | High | 2 hours | Last run | Restore CRON_SECRET + vercel.json |
| DNS/Domain | High | 4 hours | N/A | Registrar recovery time |
| DigitalOcean | Moderate | 4 hours | Last sync | Monitoring only |
| Composio | Moderate | 4 hours | Last sync | Integration platform |
| Edge Functions | Moderate | 4 hours | Last deploy | Supabase-managed |
| ElevenLabs | Moderate | 2 hours | N/A | Stateless |
| Linear | Moderate | 4 hours | Last sync | Task mgmt |
| Telegram | Low | N/A | N/A | Non-functional, not business-critical |

---

## Known Risks & Single Points of Failure

1. **Single region (syd1):** All Vercel functions run in Sydney only. No failover.
2. **24-hour RPO on database:** Client/financial data could lose up to 24 hours.
3. **Third Supabase project (`uqfgdezadpkiadugufbs`):** Referenced in type generation and drift checks — purpose unclear. MAY BE STALE.
4. **No automated backup verification:** RestoreAssist script has known bugs (connection string issue).

---

**Document Status:** ACTIVE
**Next Review:** Monthly
**Related:** [DR Runbook](disaster-recovery.md) | [Environment Inventory](environment-inventory.md) | [P0 Quick Reference](p0-quick-reference.md)
