# Disaster Recovery Runbook

**Project:** Unite-Group
**Version:** 0.2 (Enhanced DRAFT)
**Last Updated:** 2026-05-31
**Owner:** Nexus Security & DR Lead
**Board Approval Required:** Yes

> **Related Documents:** [Environment Inventory](environment-inventory.md) | [API Key Inventory](api-key-inventory.md) | [Infrastructure Inventory](infrastructure-inventory.md) | [Mac Mini Recovery](mac-mini-recovery.md) | [P0 Quick Reference](p0-quick-reference.md)

---

## Quick Reference: Emergency Contacts

| Role | Contact | Method |
|------|---------|--------|
| Board / Decision Maker | Phill McGurk | Telegram @phillmcgurk |
| Vercel Status | https://status.vercel.com | Web |
| Supabase Status | https://status.supabase.com | Web |
| Stripe Status | https://status.stripe.com | Web |
| ElevenLabs Status | https://status.elevenlabs.io | Web |
| Railway Status | https://railway.app/status | Web |
| DigitalOcean Status | https://status.digitalocean.com | Web |
| Cloudflare Status | https://www.cloudflarestatus.com | Web |
| GitHub Status | https://www.githubstatus.com | Web |
| OpenAI Status | https://status.openai.com | Web |
| Anthropic Status | https://status.anthropic.com | Web |
| 1Password Status | https://status.1password.com | Web |
| 1Password Emergency | https://1password.com/recovery | Web |

---

## Scenario 1: Database Corruption or Loss

### Detection
- Supabase dashboard shows anomalies
- Application returning 500s on data reads
- Row counts dramatically different from expected
- Data integrity checks failing

### Immediate Response (0-15 min)
1. **DO NOT PANIC.** Supabase maintains automatic daily backups.
2. Check Supabase status page: https://status.supabase.com
3. If Supabase is green, check application logs for error patterns
4. Classify severity:
   - Partial corruption (some tables) → P1
   - Complete data loss → P0
   - Accidental deletion → P1

### Recovery Steps

#### Option A: Point-in-Time Recovery (Preferred for recent issues)
1. Log into Supabase Dashboard: https://supabase.com/dashboard
2. Navigate to project `lksfwktwtmyznckodsau`
3. Go to Database → Backups
4. Select "Point-in-Time Recovery" (if available on plan)
5. Choose recovery point (before incident)
6. Confirm recovery → wait for restoration
7. Verify data integrity (see validation checklist below)

#### Option B: Full Backup Restore
1. Log into Supabase Dashboard
2. Navigate to project `lksfwktwtmyznckodsau`
3. Go to Database → Backups
4. Select most recent valid backup
5. Initiate restore
6. **WARNING:** This will overwrite current data. Ensure this is intentional.
7. Verify data integrity

#### Option C: Manual pg_dump Restore (If dashboard unavailable)
```bash
# From local machine with credentials
cd /Users/phillmcgurk/Unite-Group

# If you have a recent pg_dump file
pg_restore --clean --if-exists \
  --host=db.lksfwktwtmyznckodsau.supabase.co \
  --port=5432 \
  --username=postgres \
  --dbname=postgres \
  backup-file.dump

# Verify connection
psql "postgresql://postgres:[password]@db.lksfwktwtmyznckodsau.supabase.co:5432/postgres" \
  -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';"
```

### Data Integrity Validation
After any restore, run these checks:

```bash
# 1. Table count check
psql $DATABASE_URL -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';"
# Expected: ~1,665 (check against last known good count)

# 2. Row count sampling
psql $DATABASE_URL -c "SELECT 'users' as table, count(*) FROM auth.users UNION ALL SELECT 'profiles', count(*) FROM public.profiles;"

# 3. Recent data check
psql $DATABASE_URL -c "SELECT max(created_at) FROM public.agent_actions;"
# Should be within last 24 hours for active systems

# 4. Connection test from application
curl -s https://unite-group.vercel.app/api/health
# Should return 200 with all green checks
```

### Post-Recovery
1. Verify all services are responding
2. Check error logs for 30 minutes
3. Notify Board of recovery completion
4. Schedule post-mortem within 24 hours

---

## Scenario 2: Vercel Deployment Failure

### Detection
- Site returning 404/500 after deployment
- Vercel dashboard shows failed build
- GitHub PR merged but site not updating

### Immediate Response
1. Check Vercel status: https://status.vercel.com
2. Check build logs in Vercel dashboard
3. If build failed:
   ```bash
   # Quick rollback via Vercel CLI
   vercel --version  # confirm logged in
   vercel rollback [deployment-url]
   ```
4. If CLI unavailable, use Vercel dashboard:
   - Project → Deployments
   - Find last known good deployment
   - Click "Promote to Production"

### Recovery Steps
1. Identify failing commit via build logs
2. Revert failing commit:
   ```bash
   cd /Users/phillmcgurk/Unite-Group
   git revert [bad-commit-hash]
   git push origin main
   ```
3. Wait for auto-deployment of revert
4. Verify site is healthy
5. Fix issue in feature branch, test in preview, then merge

---

## Scenario 3: Credential Leak or Compromise

### Detection
- Unauthorized API usage detected
- Secret found in logs or public repo
- Suspicious activity in provider dashboards
- 1Password security alert

### Immediate Response (0-15 min)
1. **Assume worst case.** Rotate everything.
2. Revoke compromised keys at provider:
   - Supabase: Dashboard → Project Settings → API → Regenerate keys
   - Stripe: Dashboard → Developers → API Keys → Revoke
   - ElevenLabs: Dashboard → API Keys → Revoke
   - Linear: Settings → API → Revoke
   - Telegram: @BotFather → /revoke
3. Update all environment variables in Vercel:
   ```bash
   vercel env add [VAR_NAME] production
   # Enter new value
   vercel --prod  # redeploy
   ```
4. Update local .env.local
5. Update 1Password vault entries

### Verification
1. Test all API endpoints:
   ```bash
   curl -s https://unite-group.vercel.app/api/health
   curl -s https://unite-group.vercel.app/api/pi-ceo/margot-voice/signed-url
   ```
2. Check provider dashboards for unauthorized usage
3. Monitor error rates for 1 hour

---

## Scenario 4: Local Development Environment Loss

### Detection
- MacBook failure, theft, or loss
- .env.local corrupted or deleted
- Cannot build or run locally

### Recovery Steps
1. Clone repository on new machine:
   ```bash
   git clone https://github.com/CleanExpo/Unite-Group.git
   cd Unite-Group
   npm install
   ```
2. Reconstruct environment:
   - Retrieve credentials from 1Password (Unite-Group-Infrastructure vault)
   - Create new .env.local
   - Copy required values from 1Password
3. Verify sandbox access:
   ```bash
   ./scripts/sandbox-wizard.sh status
   ```
4. Run build:
   ```bash
   npm run build
   ```
5. Run tests:
   ```bash
   npm test
   ```

### Prevention
- Keep .env.local backed up in encrypted form
- Document all required env vars (see `docs/runbooks/environment-inventory.md`)
- Use 1Password as source of truth for all secrets

---

## Scenario 5: AI Gateway Provider Outage

### Detection
- AI features returning errors
- OpenAI/Claude status page shows incident
- Error logs show provider-specific failures

### Immediate Response
1. Check provider status pages:
   - OpenAI: https://status.openai.com
   - Anthropic: https://status.anthropic.com
2. If primary provider down:
   - Switch to fallback provider in Vercel env vars
   - Redeploy if necessary
3. If all providers affected:
   - Enable graceful degradation (AI features show "temporarily unavailable")
   - Notify users via status page or in-app message

### Recovery
1. Monitor provider status
2. When primary provider recovers:
   - Switch back to primary
   - Verify AI features working
   - Check for any data loss or inconsistency

---

## Scenario 6: Security Incident (Suspected Breach)

### Detection
- Unusual traffic patterns
- Unauthorized access logs
- Data exfiltration indicators
- Ransomware or defacement

### Immediate Response (0-15 min)
1. **CONTAIN.** Stop the bleeding.
   - If web defacement: put site in maintenance mode
   - If data breach: isolate database (restrict network access)
   - If ransomware: disconnect affected systems
2. **PRESERVE EVIDENCE.**
   - Screenshot everything
   - Export logs before they rotate
   - Do not delete anything
3. **NOTIFY.**
   - Board (Phill) immediately via Telegram
   - If client data affected: legal counsel for breach notification requirements

### Recovery Steps
1. Rotate ALL credentials (see Scenario 3)
2. Review access logs for unauthorized activity
3. Check for backdoors or persistence mechanisms
4. Restore from known-good backup if system compromised
5. Patch vulnerabilities
6. Re-enable services gradually
7. Monitor closely for 72 hours

### Post-Incident
1. File incident report within 24 hours
2. Notify affected clients if required by law
3. Engage external security firm if needed
4. Update security procedures based on lessons learned

---

## Scenario 7: Mac Mini Permanent Loss

> **See Also:** [Mac Mini Recovery Alternatives](mac-mini-recovery.md) for detailed options and decision tree.

### Context
The Mac Mini (phills-mac-mini.local) contains historical Margot files and potentially other development artifacts. Recovery via SSH and SMB is currently blocked.

### Decision Tree
1. **Can we get physical access?**
   - Yes → Extract files directly → Copy to MacBook → Verify
   - No → Proceed to option 2

2. **Can we enable remote access?**
   - Enable Screen Sharing / Remote Management on Mac Mini
   - Connect via VNC / Apple Remote Desktop
   - Extract files
   - If not possible → Proceed to option 3

3. **Reconstruct from available sources**
   - MARGOT-COMMAND-CENTER.md: Reconstruct from current repo state + session history
   - RESTOREASSIST-CONTENT-INDEX.md: Reconstruct from public/videos/help/ and YouTube
   - Any other files: Check GitHub history, Linear issues, local backups
   - Document what was lost and what was reconstructed

### Prevention
- All critical files should live in Git or cloud storage
- Local machines are not backup devices
- Enable Time Machine or equivalent automatic backup

---

## Scenario 8: Railway Outage / Pi-CEO Service Down

**Severity:** P1 | **RTO:** 1 hour | **RPO:** 5 minutes (stateless service)

### Detection
- Pi-CEO dashboard polling stale (`poll_ago` > 5 minutes)
- Integration cron `/api/cron/integrations/railway` returning errors
- Railway status page shows incident
- `curl $PI_CEO_API_URL/health` returning non-200

### Immediate Response (0-15 min)
1. Check Railway status: https://railway.app/status
2. Test Pi-CEO health endpoint:
   ```bash
   curl -s -H "Authorization: Bearer $PI_CEO_API_KEY" "$PI_CEO_API_URL/health"
   ```
3. Check Railway dashboard for deployment status
4. If Railway-wide outage → monitor status page, no action possible
5. If service-specific crash → attempt restart:
   ```bash
   # Via Railway CLI (if installed)
   railway service restart --service pi-dev-ops
   # Or via Railway Dashboard > Service > Deployments > Redeploy
   ```

### Recovery Steps
1. If Railway is down for extended period (>2 hours):
   - Notify Board via Telegram
   - Pi-CEO dashboard shows last-known state
   - Manual intervention possible via Vercel API routes directly
2. When Railway recovers:
   - Verify service health endpoint
   - Check that integration cron resumes syncing
   - Verify no data gap in Pi-CEO decision history
3. Post-incident: review whether Pi-CEO should have a second hosting provider

### Prevention
- Consider running Pi-CEO on Vercel Edge Functions as fallback
- Document Railway CLI setup: `npm install -g @railway/cli && railway login`

---

## Scenario 9: Cron Job Cascade Failure

**Severity:** P1 | **RTO:** 2 hours | **RPO:** Last successful run

### Context
11 cron jobs run on Vercel (defined in `vercel.json`). All authenticated via `CRON_SECRET` bearer token. If the secret leaks or Vercel's cron system fails, ALL integration monitors go dark simultaneously.

### Current Cron Schedule (from vercel.json)

| Path | Schedule | Purpose |
|------|----------|---------|
| `/api/cron/geo-citation-monitor` | Sat 17:00 UTC | Weekly geo/citation audit |
| `/api/cron/integrations/github` | Every 5 min | GitHub metrics sync |
| `/api/cron/integrations/vercel` | Every 5 min (offset +1) | Vercel deployment sync |
| `/api/cron/integrations/railway` | Every 5 min (offset +2) | Railway service sync |
| `/api/cron/integrations/linear` | Every 5 min (offset +3) | Linear issues sync |
| `/api/cron/integrations/digitalocean` | Every 15 min | DO apps/droplets/DB sync |
| `/api/cron/integrations/stripe` | Every 15 min (offset +5) | Stripe revenue sync |
| `/api/cron/integrations/supabase` | Hourly | Supabase project health |
| `/api/cron/integrations/composio` | Hourly (:30) | Composio connections sync |
| `/api/cron/process-scan-requests` | Every 5 min | Security scan queue |
| `/api/cron/data-room/regenerate` | Daily 17:00 UTC | Data room regeneration |

### Detection
- Integration dashboard shows stale data (>15 min for 5-min crons, >2 hours for hourly)
- No 200 responses on `/api/cron/*` routes in Vercel logs
- `sync_state` table entries all showing `error` status
- Vercel Dashboard > Logs shows 401 on cron routes (CRON_SECRET mismatch)

### Recovery Steps
1. **If CRON_SECRET leaked:**
   - Rotate CRON_SECRET in Vercel Dashboard immediately
   - Redeploy: `vercel --prod`
   - Verify cron jobs resume (check Vercel logs for 200s)

2. **If Vercel cron system is down:**
   - Check Vercel status page
   - Trigger manual sync via curl with CRON_SECRET:
     ```bash
     curl -H "Authorization: Bearer $CRON_SECRET" \
       https://unite-group.vercel.app/api/cron/integrations/github
     curl -H "Authorization: Bearer $CRON_SECRET" \
       https://unite-group.vercel.app/api/cron/integrations/vercel
     curl -H "Authorization: Bearer $CRON_SECRET" \
       https://unite-group.vercel.app/api/cron/integrations/railway
     # Repeat for each integration that is stale
     ```

3. **If vercel.json cron config is lost:**
   - `vercel.json` is in Git history — restore from repo
   - After redeploy, Vercel re-parses cron config from vercel.json
   - All 11 cron paths and schedules are defined above for manual recreation

### Prevention
- `vercel.json` is in Git (good) — serves as backup of cron config
- Consider external heartbeat monitor (e.g., Better Uptime, Cronitor) for each cron
- Add alert when `sync_state.last_success` > 30 minutes ago for 5-min crons

---

## Scenario 10: Stripe Webhook Delivery Failure

**Severity:** P1 | **RTO:** 2 hours | **RPO:** 3 days (Stripe retries for 3 days)

### Detection
- Stripe Dashboard > Events > Delivery attempts shows failures
- Payment completed but order/fulfillment not recorded in system
- Stripe webhook endpoint returns 5xx or timeout

### Immediate Response
1. Check site health: `curl -s https://unite-group.vercel.app/api/health`
2. If site is down, follow Scenario 2 (Vercel Deployment Failure) first
3. If site is up but webhook is failing:
   - Check Vercel logs for `/api/webhooks/stripe` errors
   - Verify `STRIPE_WEBHOOK_SECRET` is correct (Scenario 3 if rotated)

### Recovery Steps
1. Stripe retries failed events for up to 3 days automatically
2. For events older than retry window:
   - Stripe Dashboard > Events > Select specific event > "Send again"
   - Or use Stripe CLI to replay:
     ```bash
     stripe events resend evt_xxxxx --webhook-endpoint we_xxxxx
     ```
3. Verify payments are reconciled:
   ```bash
   # Check recent Stripe events vs local records
   psql $DATABASE_URL -c "SELECT * FROM public.payments WHERE created_at > NOW() - INTERVAL '3 days' ORDER BY created_at DESC LIMIT 20;"
   ```

### Prevention
- Monitor Stripe webhook delivery success rate
- Add Vercel log alert on 5xx for `/api/webhooks/stripe`
- Consider webhook idempotency (check event ID before processing)

---

## Scenario 11: Database Connection Pool Exhaustion

**Severity:** P2 | **RTO:** 30 minutes | **RPO:** N/A (no data loss)

### Context
11 cron jobs (5-min cycles) + user traffic + background functions all share the Supabase Postgres connection pool. Supabase free/pro plans have limited connections (20-50 direct, 200 via Supavisor).

### Detection
- Application returning 500 errors with "connection pool exhausted" or "too many clients"
- Cron jobs failing silently (returned 500, status set to `error`)
- Supabase Dashboard > Database > Connection Pooling shows high usage

### Immediate Response
1. Check connection count:
   ```bash
   psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"
   ```
2. Kill idle connections if needed:
   ```bash
   psql $DATABASE_URL -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'idle' AND query_start < NOW() - INTERVAL '10 minutes';"
   ```
3. If recurring, enable Supavisor connection pooling:
   - Supabase Dashboard > Settings > Database > Connection Pooling > Enable
   - Switch `DATABASE_URL` to Supavisor pooler URL

### Prevention
- Use Supavisor (connection pooler) for all cron job connections
- Set `max_connections` per cron route to avoid burst
- Monitor connection utilization weekly

---

## Scenario 12: DNS / Domain Compromise

**Severity:** P0 | **RTO:** 4 hours | **RPO:** N/A

### Detection
- `dig unite-group.vercel.app` returns unexpected CNAME/A records
- SSL certificate warnings for users
- Users report being redirected to wrong site

### Immediate Response (0-15 min)
1. Verify current DNS resolution:
   ```bash
   dig unite-group.vercel.app
   dig unite-group.vercel.app CNAME
   ```
2. Check domain registrar account for unauthorized changes
3. If domain hijacked:
   - Contact registrar immediately (domain lock/recovery)
   - Notify Board via Telegram
4. If DNS records modified:
   - Restore correct CNAME to `cname.vercel-dns.com`
   - Enable DNSSEC if not already enabled
   - Enable domain transfer lock

### Recovery Steps
1. Restore DNS record: `unite-group.vercel.app CNAME cname.vercel-dns.com`
2. Verify SSL certificate:
   ```bash
   curl -vI https://unite-group.vercel.app 2>&1 | grep 'subject\|issuer'
   ```
3. If malicious site was active:
   - Check if any credentials were phished
   - Notify users via social/Telegram
   - Consider password reset for all users

### Prevention
- Enable registrar lock on domain
- Enable 2FA on domain registrar account
- Use DNSSEC
- Document registrar: (TO BE DETERMINED — who manages the domain?)
- Monitor DNS changes via external service

---

## Scenario 13: GitHub Supply Chain Attack

**Severity:** P0 | **RTO:** 2 hours | **RPO:** Last known-good commit

### Detection
- Unexpected commit on `main` branch
- Vercel deployed code that wasn't reviewed
- GitHub webhook notifications for unknown PRs/commits
- Dependency alert from `npm audit` for known-good packages

### Immediate Response (0-15 min)
1. **STOP.** If malicious deployment is live:
   - Immediately rollback: `vercel rollback [last-good-deployment]`
   - Or via Vercel Dashboard: Deployments > Promote to Production (last good)
2. Check recent commits:
   ```bash
   cd /Users/phillmcgurk/Unite-Group
   git log --oneline -10
   ```
3. If unauthorized commit found:
   ```bash
   git revert [malicious-commit-hash]
   git push origin main
   ```
4. Rotate GitHub token: `GITHUB_INTEGRATION_TOKEN`
5. Change GitHub account password; revoke all sessions

### Recovery Steps
1. Audit all commits since last known good:
   ```bash
   git diff [known-good-hash]..HEAD --stat
   git diff [known-good-hash]..HEAD -- '*.env*' '*secret*' '*key*'
   ```
2. Check for credential exfiltration in commit diff
3. Rotate ALL secrets that might have been read (see Scenario 3)
4. Review branch protection rules:
   - Require PR reviews (min 1 reviewer)
   - Require status checks before merge
   - Restrict who can push to main
5. Scan for backdoors in deployed code

### Prevention
- Enable branch protection on `main` (require reviews)
- Enable 2FA on GitHub with hardware key
- Set up GitHub webhooks to notify on direct pushes to main
- Pin dependency versions in package-lock.json
- Enable Dependabot for vulnerability alerts

---

## Scenario 14: 1Password Vault Breach

**Severity:** P0 | **RTO:** 4 hours | **RPO:** N/A (rotation required)

### Detection
- 1Password security notification (new device login)
- Unusual vault access patterns
- Credentials being used from unknown IPs
- 1Password account locked/unusual activity

### Immediate Response (0-15 min)
1. **Assume ALL credentials in vault are compromised**
2. Secure 1Password account:
   - Change master password
   - Revoke all active sessions
   - Enable/re-check hardware 2FA
3. Begin priority credential rotation (see list below)

### Priority Rotation Order (time-critical first)

| Priority | Credential | Why | Time to Rotate |
|----------|-----------|-----|----------------|
| 1 | `SUPABASE_SERVICE_ROLE_KEY` | Full database R/W access | 5 min |
| 2 | `DATABASE_URL` password | Direct DB access | 5 min |
| 3 | `STRIPE_SECRET_KEY` | Financial access | 5 min |
| 4 | `CRON_SECRET` | Can trigger any cron job | 2 min |
| 5 | `PI_CEO_API_KEY` | Autonomous agent access | 2 min |
| 6 | `OPENAI_API_KEY` | Cost exposure (bill shock) | 5 min |
| 7 | All remaining keys | Per api-key-inventory.md | 30 min |

### Recovery Steps
1. Rotate each credential in priority order
2. Update Vercel env vars and redeploy:
   ```bash
   vercel env add [VAR] production  # enter new value
   vercel --prod                     # redeploy after all rotations
   ```
3. Update .env.local
4. Verify all services after rotation (Validation Checklist)
5. Consider splitting vaults: put high-risk credentials in separate vault with stricter access

### Prevention
- Use hardware security key for 1Password 2FA
- Split credentials across multiple vaults (limit blast radius)
- Enable 1Password Watchtower for breach monitoring
- Quarterly audit of who has vault access

---

## Scenario 15: Vercel Region Outage (syd1)

**Severity:** P1 | **RTO:** Provider dependent | **RPO:** N/A

### Context
All serverless functions run in `ap-southeast-1` (Sydney) only, per `vercel.json`. There is no failover region.

### Detection
- All API routes returning 503 or timing out
- Vercel status page shows Sydney region incident
- AWS status page shows `ap-southeast-1` incident

### Immediate Response
1. Check Vercel status: https://status.vercel.com
2. Check AWS Sydney: https://health.aws.amazon.com/health/status
3. If confirmed region outage:
   - **Short-term:** Nothing can be done (Vercel manages routing)
   - Post on status page / notify users
4. **Emergency multi-region (if pre-configured):**
   - Remove `"regions": ["syd1"]` from vercel.json (lets Vercel auto-route)
   - Push to main, wait for deploy
   - Vercel will route to nearest available region

### Recovery
1. When Sydney recovers, functions resume automatically
2. Verify data consistency (no duplicate processing from partial failures)
3. Review if multi-region should be permanent

### Prevention
- Evaluate adding `iad1` or `sfo1` as secondary region in vercel.json:
  ```json
  "regions": ["syd1", "iad1"]
  ```
- All functions must be stateless (they already are — good)
- Cron jobs will run in primary region regardless

---

## Scenario 16: Supabase Edge Function Failure

**Severity:** P2 | **RTO:** 4 hours | **RPO:** Last deployed version

### Context
3 Supabase Edge Functions exist (deployed separately from main Vercel app):
1. `score-client` — Client scoring logic
2. `process-publish-queue` — Publish queue processing
3. `generate-calendar` — Calendar content generation

### Detection
- Edge function returns 500 or timeout
- Client scoring absent/stale in dashboard
- Publish queue backed up
- Calendar events not generating

### Recovery Steps
1. Check Supabase Dashboard > Edge Functions > Logs
2. If secrets expired/missing:
   ```bash
   # Redeploy with current secrets
   supabase functions deploy score-client --project-ref lksfwktwtmyznckodsau
   supabase functions deploy process-publish-queue --project-ref lksfwktwtmyznckodsau
   supabase functions deploy generate-calendar --project-ref lksfwktwtmyznckodsau
   ```
3. If code error:
   - Edge functions source should be in Git (check `supabase/functions/` directory)
   - Fix bug, redeploy
4. Verify by calling function endpoint:
   ```bash
   curl -X POST https://lksfwktwtmyznckodsau.supabase.co/functions/v1/score-client \
     -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
     -H "Content-Type: application/json" \
     -d '{"test": true}'
   ```

### Prevention
- Keep edge function source in Git
- Document edge function secrets in environment-inventory.md
- Include edge function deployment in CI/CD

---

## Decision Matrix: Activate DR vs. Wait for Provider Fix

Use this matrix to decide whether to take action or wait when a provider incident occurs.

| Scenario | Provider Status | Estimated Duration | Action |
|----------|----------------|-------------------|--------|
| Supabase down | Confirmed outage | < 1 hour | **WAIT.** Monitor status page. Users see degraded service. |
| Supabase down | Confirmed outage | > 2 hours | **ACTIVATE DR.** Notify Board. Prepare for extended outage comms. |
| Vercel down | Confirmed outage | < 30 min | **WAIT.** Vercel has auto-recovery. |
| Vercel down | Project deleted / corrupted | N/A | **ACTIVATE DR.** Recreate from Git. See vercel.json backup in repo. |
| Railway down | Confirmed outage | < 2 hours | **WAIT.** Pi-CEO dashboard shows last-known state. |
| Railway down | Service deleted | N/A | **ACTIVATE DR.** Redeploy Pi-CEO from repo. |
| Stripe down | Confirmed outage | < 4 hours | **WAIT.** Stripe retries webhooks for 3 days. |
| Stripe down | Account suspended | N/A | **ACTIVATE DR.** Contact Stripe support + prepare manual payment process. |
| AI provider down | One provider down | N/A | **FAIL OVER.** Switch to alternate provider (code has fallback built-in). |
| AI provider down | Both providers down | N/A | **GRACEFUL DEGRADE.** Disable AI features. Show "temporarily unavailable." |
| DNS compromised | Domain hijacked | N/A | **ACTIVATE DR IMMEDIATELY.** P0. Contact registrar, rotate all creds. |
| GitHub compromised | Malicious merge | N/A | **ACTIVATE DR IMMEDIATELY.** P0. Rollback, revoke, rotate. |
| 1Password breach | Credentials exposed | N/A | **ACTIVATE DR IMMEDIATELY.** P0. Mass-rotate all secrets. |
| Cron jobs stopped | CRON_SECRET leaked | N/A | **ACTIVATE DR.** Rotate secret, redeploy, verify all integrations. |
| Vercel region down | syd1 unavailable | Unknown | **WAIT** if < 1 hour. **ADD FALLBACK REGION** if > 2 hours. |

### Escalation Triggers (Always Activate DR)

- Any scenario where customer data is exposed or exfiltrated
- Any scenario where financial transactions are affected
- Any scenario lasting > 4 hours during business hours (AEST)
- Any scenario involving credential compromise (assume worst case)
- Any scenario where autonomous systems (Pi-CEO) behave unexpectedly

---

## Validation Checklist (Post-Any-Recovery)

After any recovery operation, verify:

- [ ] Website loads at https://unite-group.vercel.app
- [ ] Homepage renders without errors
- [ ] Login/authentication works
- [ ] Contact forms submit successfully
- [ ] CRM data is accessible and accurate
- [ ] AI features respond correctly
- [ ] Voice (Margot) panel loads
- [ ] Stripe payment flow works (test mode)
- [ ] No 500 errors in logs for 30 minutes
- [ ] All monitoring dashboards green
- [ ] Pi-CEO dashboard polling is active (Railway health check)
- [ ] All 11 integration cron jobs showing `ok` in sync_state
- [ ] Cloudflare Turnstile CAPTCHA working on forms
- [ ] Board notified of recovery status

### Quick Automated Smoke Test
```bash
# Run this after any recovery event
curl -sf https://unite-group.vercel.app/api/health && echo "✓ Health OK" || echo "✗ Health FAILED"
curl -sf https://unite-group.vercel.app/ > /dev/null && echo "✓ Homepage OK" || echo "✗ Homepage FAILED"
```

---

## Runbook Index (All DR Documents)

| Document | Purpose | When to Use |
|----------|---------|-------------|
| [disaster-recovery.md](disaster-recovery.md) | Master runbook — all scenarios | Any incident |
| [p0-quick-reference.md](p0-quick-reference.md) | One-page P0 cheat sheet | Critical incidents (print this!) |
| [infrastructure-inventory.md](infrastructure-inventory.md) | All systems, RTOs, and components | Understand what exists |
| [environment-inventory.md](environment-inventory.md) | All env vars and how to reconstruct | Lost .env.local or credential rotation |
| [api-key-inventory.md](api-key-inventory.md) | All API keys with rotation procedures | Credential leak or scheduled rotation |
| [mac-mini-recovery.md](mac-mini-recovery.md) | Mac Mini file recovery options | Physical device data retrieval |

---

## Runbook Maintenance

- **Review frequency:** Monthly
- **Update triggers:**
  - After any incident (within 48 hours)
  - When infrastructure changes
  - When new services are added
  - After quarterly DR drill
- **Approval:** Board sign-off on major changes

---

**Document Status:** DRAFT v0.2
**Next Review:** 2026-06-30
**Board Approval Required:** Yes
