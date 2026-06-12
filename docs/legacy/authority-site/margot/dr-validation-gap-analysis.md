# DR Assessment & Runbook Validation — Gap Analysis

**Project:** Unite-Group  
**Date:** 2026-05-31  
**Reviewed by:** Senior DR Assessor (Hermes Sub-Agent)  
**Scope:** Validation of DR assessment + all runbooks against NIST SP 800-34, ISO 22301, and ISO 27001 controls  
**Verdict:** SIGNIFICANT GAPS — 47 findings across 6 categories

---

## SUMMARY

| Category | Critical | High | Medium | Total |
|----------|----------|------|--------|-------|
| Factual Errors | 4 | 2 | 0 | 6 |
| Missing Infrastructure | 3 | 5 | 1 | 9 |
| Missing Risk Scenarios | 2 | 6 | 4 | 12 |
| Compliance Gaps | 2 | 3 | 2 | 7 |
| Test/Validation Gaps | 2 | 4 | 2 | 8 |
| RTO/RPO Issues | 1 | 3 | 1 | 5 |
| **TOTAL** | **14** | **23** | **10** | **47** |

---

## 1. FACTUAL ERRORS (6 findings)

### F-01 [CRITICAL] Next.js Version is Wrong
- **Document states:** "Next.js 14 (v14.0)" and "production-ready enterprise platform (v14.0)"
- **Actual:** package.json line 70: `"next": "^15.5.15"` — this is **Next.js 15**, not 14
- **Impact:** Wrong framework version affects troubleshooting, compatibility assumptions, deployment behavior
- **Fix:** Update all references to "Next.js 15 (v15.5.15)"

### F-02 [CRITICAL] Project Version is Wrong
- **Document states:** "v14.0"
- **Actual:** package.json line 3: `"version": "1.0.0"`
- **Fix:** Use `1.0.0` or clarify that "v14.0" refers to something else

### F-03 [CRITICAL] Undocumented Third Supabase Project
- **DR docs mention:** `lksfwktwtmyznckodsau` (prod) and `xgqwfwqumliuguzhshwv` (sandbox)
- **Found:** A third Supabase project ID `uqfgdezadpkiadugufbs` referenced in:
  - `package.json` line 108 (`gen:types` script)
  - `package.json` line 109 (`check:schema-drift` script)
  - `lib/database.types.ts` line 2
  - `scripts/safe-migrate.sh` line 31
- **Impact:** Type generation and schema drift checks point to a different (possibly decommissioned?) project. Critical tooling is broken or targeting wrong environment.
- **Fix:** Investigate which project `uqfgdezadpkiadugufbs` is. If legacy, fix all references to use `lksfwktwtmyznckodsau`. Document in infrastructure inventory.

### F-04 [CRITICAL] RestoreAssist Script Has Non-Functional Database Connection
- **File:** `scripts/restoreassist-verify.sh` line 111
- **Issue:** Connection string uses literal `***` as password: `"postgresql://postgres:***@db.${SANDBOX_REF}.supabase.co:5432/postgres"`
- **Reality:** The script fetches the password from 1Password into `$SANDBOX_PASSWORD` but never interpolates it into the connection string. The test will always fail with invalid credentials.
- **Fix:** Use `PGPASSWORD="$SANDBOX_PASSWORD" psql ...` or construct the URL with the actual variable.

### F-05 [HIGH] Pi-CEO Health Endpoint Requires Admin Auth
- **Runbook states:** `curl -s https://unite-group.vercel.app/api/health` as a validation check
- **Actual:** `/api/health` exists and works (no auth required — it's a liveness probe), but `/api/pi-ceo/health` (referenced in Scenario 3) requires admin authentication (`requireAdmin` middleware)
- **Impact:** Credential leak recovery verification step will return 401/403 without valid admin JWT
- **Fix:** Clarify that `/api/health` is the unauthenticated liveness probe; `/api/pi-ceo/health` needs `Authorization: Bearer <admin-jwt>` header

### F-06 [HIGH] RestoreAssist Validates Schema Only — Not Data
- **File:** `scripts/restoreassist-verify.sh` line 80
- **Issue:** `pg_dump --schema-only` validates schema structure but NEVER validates that actual data can be restored
- **Impact:** You can have a perfectly valid schema backup while ALL data is corrupted or lost. This provides false confidence.
- **Fix:** Add a `--data-only --table=public.businesses --rows=10` test dump with restore validation

---

## 2. MISSING INFRASTRUCTURE COMPONENTS (9 findings)

### I-01 [CRITICAL] Railway Not Documented
- **Reality:** Railway hosts Pi-CEO autonomous agent (`pi-dev-ops-production.up.railway.app`)
- **Evidence:** `PI_CEO_API_URL`, `PI_CEO_API_KEY` env vars; dedicated integration at `src/lib/integrations/railway/`; cron job every 5 min
- **Impact:** Autonomous CEO system running on undocumented infrastructure with no DR plan
- **Fix:** Add Railway to infrastructure inventory (CRITICAL tier), add env vars to inventory, add Railway outage scenario

### I-02 [CRITICAL] Missing Environment Variables — 7 Critical Keys
The `environment-inventory.md` is missing these actively-used env vars:

| Variable | Purpose | Source | Discovery |
|----------|---------|--------|-----------|
| `OPENAI_API_KEY` | AI gateway primary | OpenAI Dashboard | `scripts/run-wave3-backfill.ts`, `scripts/backfill-nexus-embeddings.ts` |
| `ANTHROPIC_API_KEY` | AI gateway fallback | Anthropic Dashboard | `src/lib/calendar/captionGenerator.ts` |
| `GITHUB_TOKEN` | GitHub API metrics | GitHub Settings | `src/lib/scanner/fetchGithubMetrics.ts` |
| `CRON_SECRET` | Vercel cron auth | Vercel Dashboard | `src/lib/runtime/sync-lifecycle.ts`, multiple cron routes |
| `RAILWAY_INTEGRATION_TOKEN` | Railway API | Railway Dashboard | `src/lib/integrations/railway/client.ts` |
| `RAILWAY_PROJECT_IDS` | Railway project filter | Railway Dashboard | `src/lib/integrations/railway/sync.ts` |
| `DIGITALOCEAN_INTEGRATION_TOKEN` | DigitalOcean API | DO Dashboard | `src/lib/integrations/digitalocean/client.ts` |
| `COMPOSIO_API_KEY` | Composio integration | Composio Dashboard | `src/lib/integrations/composio/client.ts` |
| `PI_CEO_API_URL` | Pi-CEO API endpoint | Railway / Internal | `src/app/api/pi-ceo/health/route.ts` |
| `PI_CEO_API_KEY` | Pi-CEO admin auth | Internal | `src/lib/auth/check-admin-token.ts` |

- **Impact:** If .env.local is lost, these critical variables cannot be reconstructed from documentation
- **Fix:** Add all 10 variables to environment-inventory.md and api-key-inventory.md

### I-03 [CRITICAL] Vercel Cron Jobs Not Documented
- **Reality:** 12 scheduled cron jobs run on Vercel:
  - `geo-citation-monitor` (weekly Sat 17:00)
  - `integrations/github` (every 5 min)
  - `integrations/vercel` (every 5 min)
  - `integrations/railway` (every 5 min)
  - `integrations/linear` (every 5 min)
  - `integrations/digitalocean` (every 15 min)
  - `integrations/stripe` (every 15 min)
  - `integrations/supabase` (hourly)
  - `integrations/composio` (hourly at :30)
  - `process-scan-requests` (every 5 min)
  - `data-room/regenerate` (daily 17:00)
- **Impact:** These are mission-critical operational systems. If cron config is lost during Vercel project restore, all integration monitoring goes dark silently.
- **Fix:** Document all cron schedules in a runbook. Backup `vercel.json` cron config separately.

### I-04 [HIGH] Supabase Edge Functions Not Documented
- **Reality:** 3 Edge Functions exist:
  1. `supabase/functions/score-client/` — Client scoring
  2. `supabase/functions/process-publish-queue/` — Publish queue processing
  3. `supabase/functions/generate-calendar/` — Calendar generation (references `synthex.social`)
- **Impact:** Edge functions have separate deployment, secrets, and failure modes from the main app
- **Fix:** Add to infrastructure inventory with separate RTO/RPO. Document Edge Function deployment and secret management.

### I-05 [HIGH] Single-Region Deployment Not Acknowledged
- **vercel.json line 7:** `"regions": ["syd1"]` — ALL serverless functions run in Sydney only
- **Impact:** Any Sydney-region outage (AWS/Vercel) takes down the entire backend. No failover.
- **Fix:** Document as known risk. Evaluate multi-region (e.g., add `iad1` or `sfo1` as fallback).

### I-06 [HIGH] DigitalOcean Not in Infrastructure Inventory
- **Reality:** DigitalOcean integration exists with dedicated sync module and cron job
- **Fix:** Add to infrastructure inventory, determine what DO hosts

### I-07 [HIGH] Composio Not in Infrastructure Inventory
- **Reality:** Composio integration platform is used with dedicated sync module
- **Fix:** Add to infrastructure inventory, document purpose

### I-08 [MEDIUM] Perplexity and Paperclip Referenced in Gitleaks But Not Documented
- **Evidence:** `.gitleaks.toml` has detection rules for `pplx-*` (Perplexity) and `pcp_*` (Paperclip/Papercut) keys
- **Impact:** If these exist but aren't documented, they could be stale keys posing security risk. If removed, the gitleaks rules are unnecessary.
- **Fix:** Investigate and either document or remove detection rules

### I-09 [MEDIUM] 1Password Integration Module Not Documented
- **Evidence:** `src/lib/integrations/onepassword/sync.ts` and `client.ts` exist
- **Impact:** The system appears to sync data FROM 1Password programmatically — this is an integration beyond just "credential storage"
- **Fix:** Document in infrastructure inventory

---

## 3. MISSING RISK SCENARIOS (12 findings)

### R-01 [CRITICAL] Railway Outage / Pi-CEO Service Down
- **Scenario:** Railway experiences outage or Pi-CEO service crashes
- **Business Impact:** Autonomous CEO agent goes offline; dashboard polling stops after 5 min
- **Current Coverage:** NONE
- **Fix:** Add scenario to runbook with detection (stale poll_ago), recovery (restart Railway service), and fallback

### R-02 [CRITICAL] Cron Job Cascade Failure
- **Scenario:** CRON_SECRET leaked or Vercel cron system fails
- **Business Impact:** ALL 12 integration monitors go silent simultaneously; data staleness across GitHub, Vercel, Railway, Linear, DO, Stripe, Supabase, Composio
- **Current Coverage:** NONE
- **Fix:** Add scenario. Monitor cron execution via separate heartbeat. Alert on stale integration data.

### R-03 [HIGH] Vercel Project Deletion / Account Compromise
- **Scenario:** Vercel account accessed maliciously; project deleted or config destroyed
- **Business Impact:** Complete outage; DNS pointing to dead project; all cron jobs lost; all env vars lost
- **Current Coverage:** Only "deployment failure" covered — not full project/account loss
- **Fix:** Backup `vercel.json` to Git (already tracked — good). Document full project recreation from scratch. Enable 2FA on Vercel account.

### R-04 [HIGH] Stripe Webhook Delivery Failure
- **Scenario:** Stripe webhook endpoint unreachable (site down, DNS issue)
- **Business Impact:** Payment events silently dropped after retry exhaustion; orders unfulfilled
- **Current Coverage:** Only "Stripe account disruption" mentioned — not webhook-specific failure
- **Fix:** Add webhook monitoring. Document Stripe Dashboard → Events → manual replay procedure.

### R-05 [HIGH] Database Connection Pool Exhaustion
- **Scenario:** 12+ cron jobs + user traffic simultaneously hitting Supabase
- **Business Impact:** Cascading 500 errors; cron jobs fail silently
- **Current Coverage:** NONE
- **Fix:** Document Supabase connection limits. Add connection pooling (Supavisor). Monitor pool usage.

### R-06 [HIGH] GitHub Repository Compromise
- **Scenario:** GitHub account compromised; malicious code merged to main; auto-deploys to production
- **Business Impact:** Supply chain attack; customer data theft; credential harvesting
- **Current Coverage:** "Vercel deployment failure" only; no malicious deployment scenario
- **Fix:** Add branch protection rules documentation. Enable required reviews. Document `git revert` + forced redeploy from known-good commit.

### R-07 [HIGH] DNS / Registrar Compromise
- **Scenario:** Domain hijacking or DNS poisoning
- **Business Impact:** Users redirected to malicious site; reputation destroyed
- **Current Coverage:** NONE
- **Fix:** Document registrar (who manages `unite-group.vercel.app` custom domain?), DNS provider, enable domain lock, document recovery.

### R-08 [MEDIUM] Supabase Storage Bucket Corruption
- **Scenario:** User uploads/files corrupted or accidentally deleted from storage
- **Business Impact:** Client-facing documents, images, assets lost
- **Current Coverage:** "Same as DB" is vague — storage has different failure modes
- **Fix:** Document storage backup procedure separately. Test file restore.

### R-09 [MEDIUM] Supabase Edge Function Deployment Failure
- **Scenario:** Edge function corrupted or secrets lost
- **Business Impact:** Client scoring, publish queue, calendar generation broken
- **Current Coverage:** NONE
- **Fix:** Document Edge Function deployment procedure and secret management.

### R-10 [MEDIUM] 1Password Vault Compromise
- **Scenario:** 1Password account accessed; all infrastructure credentials exposed
- **Business Impact:** Every system credential exposed simultaneously; mass rotation required
- **Current Coverage:** Only "1Password recovery" in contact sheet; no credential mass-rotation procedure
- **Fix:** Add scenario. Document priority ordered rotation of ALL credentials. Consider splitting vaults.

### R-11 [MEDIUM] Vercel Region (syd1) Outage
- **Scenario:** AWS Sydney region experiences outage
- **Business Impact:** All serverless functions unavailable; API returns 503
- **Current Coverage:** NONE
- **Fix:** Document as known single-point-of-failure. Add region failover to implementation plan.

### R-12 [MEDIUM] Dependency Supply Chain Attack
- **Scenario:** Malicious npm package version published (e.g., `@supabase/supabase-js` compromised)
- **Business Impact:** Code execution in build pipeline and production
- **Current Coverage:** Only "Dependency vulnerability (npm)" at P2 with partial mitigation
- **Fix:** Pin exact versions in package-lock. Enable `npm audit` in CI. Consider lockfile integrity check.

---

## 4. COMPLIANCE GAPS (7 findings)

### C-01 [CRITICAL] No Data Residency / GDPR Consideration
- **Issue:** System handles client CRM data but no mention of data residency requirements
- **Relevant:** GDPR (EU), Privacy Act 1988 (Australia — syd1 deployment), CCPA
- **Impact:** Client data may be subject to cross-border transfer restrictions
- **Fix:** Document data residency. Verify Supabase region matches requirements. Add to risk register.

### C-02 [CRITICAL] No Breach Notification Procedure with Timelines
- **Issue:** Runbook Scenario 6 says "notify affected clients if required by law" with no specifics
- **Relevant:** GDPR (72 hours), Australian NDB scheme (as soon as practicable), various US state laws
- **Fix:** Create jurisdiction-specific notification matrix with timelines, contacts, and templates

### C-03 [HIGH] No PCI DSS Self-Assessment for Stripe Integration
- **Issue:** Handles payment processing but no PCI compliance documentation
- **Fix:** Document PCI DSS SAQ-A status (Stripe-hosted checkout). Verify no card data touches your servers.

### C-04 [HIGH] No Log Retention / Archival Policy
- **Issue:** Vercel logs have limited retention (typically 3 days for Hobby, 14 days for Pro)
- **Impact:** Post-incident forensics impossible after log rotation
- **Fix:** Ship logs to external storage (e.g., Axiom, Datadog, S3) with defined retention periods.

### C-05 [HIGH] No Access Control Matrix Documented
- **Issue:** No document describes who has access to what systems, at what privilege level
- **Relevant:** ISO 27001 A.9 (Access Control), NIST AC-2 (Account Management)
- **Fix:** Create access control matrix: person → system → privilege level → review date

### C-06 [MEDIUM] No Data Retention Schedule
- **Issue:** Data classification exists (T1-T4) but no specific retention periods or disposal procedures
- **Fix:** Define retention: e.g., CRM data 7 years, logs 90 days, Stripe events 5 years, etc.

### C-07 [MEDIUM] No Business Continuity Plan (BCP)
- **Issue:** DR plan covers technical recovery but no BCP for business operations
- **Missing:** How does the business operate during extended outage? Client communication plan? Revenue continuity?
- **Fix:** Create abbreviated BCP covering: client communication templates, manual workarounds, SLA pause procedures

---

## 5. TEST / VALIDATION GAPS (8 findings)

### T-01 [CRITICAL] No End-to-End Recovery Drill Has Been Performed
- **Issue:** Assessment acknowledges this (Level 1 maturity) but no drill is scheduled
- **NIST SP 800-34:** Requires annual testing minimum
- **Fix:** Schedule first tabletop exercise within 2 weeks. First live drill within 30 days.

### T-02 [CRITICAL] RestoreAssist Script Cannot Actually Connect to Database
- **Issue:** See F-04. The connection string bug means the script will ALWAYS report sandbox as FAILED/SKIPPED
- **Fix:** Fix the bug, run the script, verify actual results.

### T-03 [HIGH] No Automated Post-Recovery Smoke Test
- **Issue:** Validation checklist (disaster-recovery.md lines 312-324) is entirely manual
- **Fix:** Create automated smoke test script:
  ```bash
  # /scripts/dr-smoke-test.sh
  curl -f https://unite-group.vercel.app/api/health
  curl -f https://unite-group.vercel.app/  # homepage
  # authenticated endpoints with test credentials
  ```

### T-04 [HIGH] No Failover Testing for AI Gateway
- **Issue:** Assessment says "fallback exists in code" but no test confirms it works
- **Fix:** Monthly failover test: disable primary key, verify fallback activates, measure latency.

### T-05 [HIGH] No Rollback Testing for Vercel Deployment
- **Issue:** Rollback procedure documented but never tested
- **Fix:** Test `vercel rollback` and "Promote to Production" dashboard flow. Document actual results.

### T-06 [HIGH] No Verification That Supabase Daily Backups Actually Exist
- **Issue:** Assessment says "Auto-daily (unverified)" — this is the single most critical DR assumption
- **Fix:** Run RestoreAssist script (after bug fix). Screenshot Supabase Dashboard backup list. Confirm retention.

### T-07 [MEDIUM] No Telegram Notification Delivery Test
- **Issue:** RestoreAssist script sends Telegram notification but no mechanism to verify delivery
- **Fix:** Add delivery confirmation. Add test mode that requires acknowledgment.

### T-08 [MEDIUM] No Load Testing Post-Recovery
- **Issue:** After database restore, no verification that the system can handle production load
- **Fix:** Add simple load test or at least connection pool saturation check post-restore.

---

## 6. RTO/RPO ISSUES (5 findings)

### RT-01 [CRITICAL] 24-Hour RPO is Unacceptable for Client/Financial Data
- **Current:** Database RPO = 24 hours (daily backup)
- **Problem:** Up to 24 hours of client CRM data, payment records, and business transactions could be permanently lost
- **Industry Standard:** Financial data should target ≤1 hour RPO
- **Fix:** Implement Supabase WAL archiving or continuous logical replication to secondary. Consider Supabase PITR (available on Pro plan).

### RT-02 [HIGH] No RTO/RPO for Railway / Pi-CEO
- **Current:** Not defined
- **Impact:** Autonomous agent with kill switch and swarm capabilities has no recovery objective
- **Fix:** Define: Railway RTO ≤ 1 hour, RPO ≤ 5 min (stateless service)

### RT-03 [HIGH] No RTO/RPO for Cron Jobs
- **Current:** Not defined
- **Impact:** 12 integration monitors with no recovery targets
- **Fix:** Define: Cron restoration RTO ≤ 2 hours (restore vercel.json + CRON_SECRET)

### RT-04 [HIGH] Stripe Payments RTO of 8 Hours is Too Long
- **Current:** 8 hours
- **Problem:** Payment processing is revenue-critical; 8-hour outage during business hours = significant revenue loss
- **Fix:** Reduce to ≤ 2 hours. Primary recovery: verify Stripe dashboard access + webhook endpoint. Secondary: manual payment processing via Stripe Dashboard.

### RT-05 [MEDIUM] No RTO/RPO for Edge Functions
- **Current:** Not defined
- **Fix:** Define: Edge Function RTO ≤ 4 hours, RPO = last deployed version

---

## 7. SCRIPT-SPECIFIC ISSUES

### restoreassist-verify.sh

| # | Issue | Severity | Fix |
|---|-------|----------|-----|
| 1 | `--schema-only` doesn't test data | CRITICAL | Add `--data-only` test with sample tables |
| 2 | Connection string uses literal `***` | CRITICAL | Fix: `PGPASSWORD="$SANDBOX_PASSWORD" psql ...` |
| 3 | No row count baseline stored | HIGH | Store expected counts in a config file or fetch from Supabase management API |
| 4 | Telegram message may exceed 4096 chars | MEDIUM | Truncate or send summary only |
| 5 | No exit code reflects failures | HIGH | Add `exit 1` when any check fails (for CI/cron integration) |
| 6 | No cleanup on error path | LOW | Add trap for temp file cleanup |

---

## 8. STRUCTURED REMEDIATION LIST (Priority Order)

### IMMEDIATE (Days 1-7)

| # | Item | Effort | Blocker For |
|---|------|--------|-------------|
| 1 | Fix Next.js version (15, not 14) in DR assessment | 10 min | Accuracy |
| 2 | Fix RestoreAssist connection string bug | 30 min | Validation |
| 3 | Investigate third Supabase project ID `uqfgdezadpkiadugufbs` | 1 hour | Infrastructure clarity |
| 4 | Add 10 missing env vars to environment-inventory.md | 1 hour | Recovery capability |
| 5 | Add Railway/Pi-CEO to infrastructure inventory | 30 min | Coverage |
| 6 | Verify Supabase daily backups actually exist | 30 min | Core DR assumption |
| 7 | Document cron job schedule in runbook | 30 min | Recovery completeness |

### SHORT-TERM (Days 8-30)

| # | Item | Effort | Blocker For |
|---|------|--------|-------------|
| 8 | Add Railway outage, cron failure, webhook failure scenarios | 3 hours | Risk coverage |
| 9 | Create automated smoke test script | 2 hours | Validation |
| 10 | Plan and execute first tabletop DR exercise | 4 hours | Compliance (NIST) |
| 11 | Improve RestoreAssist to test data (not just schema) | 3 hours | Validation |
| 12 | Create access control matrix | 2 hours | ISO 27001 |
| 13 | Add log archival strategy | 2 hours | Forensics |
| 14 | Reduce database RPO (PITR or WAL archiving) | 4 hours | Data protection |
| 15 | Document domain registrar and DNS recovery | 1 hour | Risk coverage |
| 16 | Create breach notification matrix by jurisdiction | 3 hours | Compliance |

### MEDIUM-TERM (Days 31-90)

| # | Item | Effort | Blocker For |
|---|------|--------|-------------|
| 17 | Multi-region evaluation (add fallback region to Vercel) | 8 hours | Resilience |
| 18 | First live recovery drill | 8 hours | Maturity Level 2+ |
| 19 | PCI DSS self-assessment documentation | 4 hours | Compliance |
| 20 | Business Continuity Plan (abbreviated) | 4 hours | Operations |
| 21 | AI gateway failover test | 2 hours | Validation |
| 22 | Vercel project recreation procedure from scratch | 4 hours | Worst-case DR |
| 23 | External log shipping setup | 4 hours | Forensics |

---

## 9. OVERALL ASSESSMENT

**The DR documentation is a solid v0.1 foundation** but has significant gaps that would prevent successful recovery in many realistic scenarios:

1. **The infrastructure is more complex than documented** — Railway, DigitalOcean, Composio, 12 cron jobs, and 3 Edge Functions are all operational components with zero DR coverage.

2. **The environment variable inventory is incomplete** — 10 active secrets are undocumented. If .env.local is lost, reconstruction would require code archaeology.

3. **The validation script is broken** — It cannot actually connect to the database due to a credential interpolation bug, meaning it has never provided real validation.

4. **Single-region deployment (syd1) is an undocumented single point of failure** that affects the entire backend.

5. **24-hour RPO for financial/CRM data does not meet industry standards** for a system handling client money and business records.

**Recommendation:** Prioritize the 7 IMMEDIATE items (total effort: ~5 hours) to bring the documentation to accurate baseline, then execute the SHORT-TERM items to achieve NIST SP 800-34 minimum compliance.
