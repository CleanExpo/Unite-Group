# Disaster Recovery Runbook

**Project:** Unite-Group
**Version:** 0.1 (DRAFT)
**Last Updated:** 2026-05-31
**Owner:** Nexus Security & DR Lead
**Board Approval Required:** Yes

---

## Quick Reference: Emergency Contacts

| Role | Contact | Method |
|------|---------|--------|
| Board / Decision Maker | Phill McGurk | Telegram @phillmcgurk |
| Vercel Status | https://status.vercel.com | Web |
| Supabase Status | https://status.supabase.com | Web |
| Stripe Status | https://status.stripe.com | Web |
| ElevenLabs Status | https://status.elevenlabs.io | Web |
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
- [ ] Board notified of recovery status

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

**Document Status:** DRAFT v0.1
**Next Review:** 2026-06-30
**Board Approval Required:** Yes
