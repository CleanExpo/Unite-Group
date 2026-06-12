# P0 QUICK REFERENCE — Critical Incident Cheat Sheet

**Unite-Group Disaster Recovery** | Print this page and keep accessible.

---

## EMERGENCY CONTACT

| Who | How |
|-----|-----|
| **Phill McGurk (Board)** | Telegram @phillmcgurk |

---

## IS THIS A P0? (Immediate Action Required)

✅ Customer data exposed or exfiltrated  
✅ Financial transactions affected  
✅ Domain hijacked or DNS compromised  
✅ Malicious code deployed to production  
✅ All credentials compromised (1Password breach)  
✅ Autonomous agent (Pi-CEO) acting unexpectedly  

**If YES to any → Follow the relevant scenario below IMMEDIATELY.**

---

## P0 SCENARIOS — First 15 Minutes

### 🔴 CREDENTIAL LEAK / 1Password BREACH

```
1. ROTATE in this order:
   ① SUPABASE_SERVICE_ROLE_KEY  (5 min)
   ② DATABASE_URL password      (5 min)
   ③ STRIPE_SECRET_KEY          (5 min)
   ④ CRON_SECRET                (2 min)
   ⑤ PI_CEO_API_KEY             (2 min)
   ⑥ OPENAI_API_KEY             (5 min)
   ⑦ All others (see api-key-inventory.md)

2. Update Vercel:
   vercel env add [VAR] production
   vercel --prod

3. Update .env.local from 1Password
4. Notify Phill via Telegram
5. Check provider dashboards for unauthorized usage
```

---

### 🔴 MALICIOUS CODE DEPLOYED (GitHub Supply Chain Attack)

```
1. STOP the deployment:
   vercel rollback [last-good-deployment-URL]
   — OR —
   Vercel Dashboard > Deployments > Promote last good

2. Revert the commit:
   cd /Users/phillmcgurk/Unite-Group
   git revert [malicious-hash]
   git push origin main

3. Rotate GITHUB_INTEGRATION_TOKEN
4. Change GitHub password + revoke sessions
5. Audit: git diff [good-hash]..HEAD -- '*.env*' '*secret*'
6. Assume leaked — rotate all secrets (see above)
```

---

### 🔴 DOMAIN HIJACKED / DNS COMPROMISED

```
1. Check current DNS:
   dig unite-group.vercel.app CNAME
   Expected: cname.vercel-dns.com

2. If wrong → Contact domain registrar IMMEDIATELY
3. Enable domain lock + DNSSEC
4. Change registrar password + enable 2FA
5. Notify Phill — potential phishing campaign against users
6. Check SSL:
   curl -vI https://unite-group.vercel.app 2>&1 | grep 'subject\|issuer'
```

---

### 🔴 ALL CRON JOBS STOPPED (CRON_SECRET Compromised)

```
1. Rotate CRON_SECRET in Vercel Dashboard
2. Redeploy: vercel --prod
3. Verify crons resumed:
   curl -sH "Authorization: Bearer $NEW_SECRET" \
     https://unite-group.vercel.app/api/cron/integrations/github
   # Should return 200 with sync results
4. Check all 11 integrations in Vercel logs
```

---

### 🔴 FULL DATABASE LOSS

```
1. Check Supabase status: https://status.supabase.com
2. If Supabase incident → WAIT and monitor
3. If data corruption/accidental deletion:
   Supabase Dashboard > Database > Backups >
   Point-in-Time Recovery (select time BEFORE incident)
4. Verify after restore:
   curl -sf https://unite-group.vercel.app/api/health
5. Check row counts:
   psql $DATABASE_URL -c "SELECT count(*) FROM public.agent_actions;"
```

---

## USEFUL STATUS PAGES

| Service | URL |
|---------|-----|
| Vercel | https://status.vercel.com |
| Supabase | https://status.supabase.com |
| Stripe | https://status.stripe.com |
| Railway | https://railway.app/status |
| DigitalOcean | https://status.digitalocean.com |
| Cloudflare | https://www.cloudflarestatus.com |
| GitHub | https://www.githubstatus.com |
| OpenAI | https://status.openai.com |
| 1Password | https://status.1password.com |

---

## QUICK HEALTH CHECKS

```bash
# Liveness (no auth required)
curl -sf https://unite-group.vercel.app/api/health

# Pi-CEO (needs admin key)
curl -sH "Authorization: Bearer $PI_CEO_API_KEY" "$PI_CEO_API_URL/health"

# DNS resolution
dig unite-group.vercel.app CNAME +short

# Integration freshness (any cron route)
curl -sH "Authorization: Bearer $CRON_SECRET" \
  https://unite-group.vercel.app/api/cron/integrations/github
```

---

## WHEN TO WAIT vs. ACTIVATE DR

| Duration | Action |
|----------|--------|
| Provider outage < 1 hour | WAIT. Monitor status page. |
| Provider outage > 2 hours | ACTIVATE. Notify Board. |
| Data/credentials exposed | ACTIVATE IMMEDIATELY. No waiting. |
| Service deleted/account lost | ACTIVATE IMMEDIATELY. Recreate from Git. |
| Autonomous agent misbehaving | ACTIVATE. Disable/kill switch. |

---

## DECISION: Can I wait for the provider to fix it?

- **YES** if: Confirmed provider incident, ETA < 2 hours, no data exposure
- **NO** if: Credentials compromised, data exfiltrated, > 2 hours, or unknown cause

**When in doubt → ACTIVATE DR. It's cheaper to over-react than under-react.**

---

## DOCUMENTS

| Document | Location |
|----------|----------|
| Full DR Runbook | `docs/runbooks/disaster-recovery.md` |
| Infrastructure Inventory | `docs/runbooks/infrastructure-inventory.md` |
| Environment Variables | `docs/runbooks/environment-inventory.md` |
| API Key Inventory | `docs/runbooks/api-key-inventory.md` |

---

**Last Updated:** 2026-05-31 | **Print Date:** ___________
