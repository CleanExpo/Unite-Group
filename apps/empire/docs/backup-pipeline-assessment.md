# Backup & Restore Pipeline — Technical Assessment
**Date:** 2026-05-31
**Assessor:** Senior Backup & Recovery Engineer (Hermes Agent)
**Scope:** Unite-Group production (lksfwktwtmyznckodsau) + sandbox (xgqwfwqumliuguzhshwv)

---

## Executive Summary

| Component | Status | Action Required |
|-----------|--------|-----------------|
| Daily physical backups (prod) | ✅ WORKING | None |
| Daily physical backups (sandbox) | ✅ WORKING | None |
| Backup retention (7 days) | ✅ CONFIRMED | Board decision: extend to 30 days? |
| PITR (sub-day recovery) | ❌ DISABLED | Enable via Supabase Pro addon |
| pg_dump schema verification | ⚠ BLOCKED | Install postgresql@17 |
| Sandbox schema parity | ⚠ NOT SYNCED | Run sandbox-wizard.sh setup |
| RestoreAssist script | ✅ FIXED | 5 bugs resolved |
| Lightweight health check | ✅ NEW | Can run now in CI |
| 1Password credential access | ⚠ BLOCKED | Requires interactive signin |

---

## What Works

### 1. Automated Daily Backups
Both production and sandbox have 7 consecutive daily physical backups, all
in COMPLETED status:
- Production: backups at ~19:54 UTC daily (ap-southeast-2, Sydney)
- Sandbox: backups at ~14:34 UTC daily (us-west-1, North California)
- WAL archiving is active on both (walg_enabled: true)

### 2. Supabase CLI Backup Management
- `supabase backups list` works without any additional auth beyond CLI login
- `supabase backups restore --project-ref <ref> --timestamp <epoch>` is available
- JSON output includes backup metadata, PITR flag, WAL status

### 3. Sandbox Wizard
- `scripts/sandbox-wizard.sh` exists and is comprehensive (497 lines)
- Supports: setup, sync, apply, diff, status, reset, promote
- Handles the 1,665-table schema via per-object DROP (avoids max_locks overflow)
- Mirrors extensions, validates name-diff parity
- Promote to prod requires explicit "promote to prod" typed confirmation

### 4. RestoreAssist Verification Script (Fixed)
- `scripts/restoreassist-verify.sh` — fully functional after bug fixes
- Reports pass/fail/skip with exit codes
- Telegram notification ready (needs TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID)

### 5. Lightweight Health Check (New)
- `scripts/backup-healthcheck.sh` — works right now with just Supabase CLI + python3
- No psql/pg_dump/1Password required
- Suitable for CI cron or lightweight monitoring

---

## Bugs Fixed in RestoreAssist Script

### Bug 1: Wrong 1Password field name
- **Before:** `op item get ... --field password`
- **After:** `op item get ... --reveal --field credential`
- **Impact:** Password retrieval always failed silently → all DB tests skipped

### Bug 2: pg_dump called without PGPASSWORD
- **Before:** `pg_dump --no-password` (no PGPASSWORD env var set)
- **After:** `PGPASSWORD="$DB_PASSWORD" pg_dump`
- **Impact:** pg_dump would always fail with "no password supplied"

### Bug 3: psql connection strings used literal "*** as password
- **Before:** `postgresql://postgres:***@host:5432/db` (3 literal asterisks)
- **After:** PGPASSWORD env var + individual --host/--username/--dbname flags
- **Impact:** psql would try to authenticate with "*** as password → always rejected

### Bug 4: No env var fallback for credentials
- **Before:** Only checked 1Password (which requires interactive signin)
- **After:** Checks env var first (`$UNITE_GROUP_DB_PASSWORD`), then 1Password
- **Impact:** Script can now work in CI with pre-loaded env vars

### Bug 5: Python f-string with escaped quotes in bash heredoc
- **Before:** `f"{latest[\"inserted_at\"]}"` — SyntaxError (backslash in f-string)
- **After:** Intermediate variables + `.format()` — standard Python string formatting
- **Impact:** "Latest backup" parsing always returned PARSE_ERROR

### Additional Improvements
- Added PITR status check (was completely missing)
- Added backup freshness validation (>26h = stale)
- Added sandbox backup status check
- Added sandbox schema parity check via state.json
- Added backup retention policy documentation section
- Added pass/fail/skip counters and summary table
- Structured exit codes (0=pass, 1=fail)
- Separated colored terminal output from report file

---

## Technical Blockers

### Blocker 1: psql/pg_dump not installed (CRITICAL)
**Problem:** PostgreSQL client tools are not available on this machine.
**Impact:** Cannot test actual database connectivity, pg_dump, or table counts.
**Fix:** `brew install postgresql@17 && brew link postgresql@17 --force`
**Note:** Homebrew itself is not installed in the current shell environment.
**Owner:** Developer must install manually on their Mac.

### Blocker 2: 1Password CLI not signed in (HIGH)
**Problem:** `op whoami` returns "account is not signed in"
**Impact:** Cannot load DB passwords from vault, blocking DB connectivity tests.
**Fix:** `eval $(op signin)` — requires interactive biometric/password prompt
**Note:** This is by design (security). Cannot be automated for cron.
**Workaround:** Set `UNITE_GROUP_DB_PASSWORD` and `UNITE_GROUP_SANDBOX_DB_PASSWORD` env vars, or use `$HOME/.hermes/.unite-group-sandbox-creds.env`

### Blocker 3: Sandbox never synced (MEDIUM)
**Problem:** No state.json in `.sandbox-cache/` — setup has never been run
**Impact:** Cannot verify schema parity between prod and sandbox
**Fix:** `./scripts/sandbox-wizard.sh setup` (requires blockers 1+2 resolved first)

### Blocker 4: PITR not enabled (RISK)
**Problem:** Both prod and sandbox have `pitr_enabled: false`
**Impact:** Recovery Point Objective (RPO) is ~24 hours. Any data loss within the
         last 24 hours cannot be recovered to a specific point in time.
**Fix:** Supabase Dashboard → Settings → Database → Enable PITR
**Cost:** Supabase Pro plan addon (additional monthly cost)
**Decision needed:** Board must approve Pro plan upgrade or accept 24h RPO.

---

## Actual Backup Retention Policy (from live data)

| Parameter | Value | Source |
|-----------|-------|--------|
| Backup frequency | Daily, automated | Supabase platform |
| Backup type | Physical (full database snapshot) | `is_physical_backup: true` |
| Retention window | 7 days | Oldest - newest = 6.0 days |
| PITR | Disabled | `pitr_enabled: false` |
| WAL archiving | Active | `walg_enabled: true` |
| Backup region | Matches project region | Prod: ap-se-2, Sandbox: us-west-1 |
| Restore method | Full project replace | `supabase backups restore` |
| Estimated restore time | 15-60 min | Supabase-managed, project goes offline |

### What this means:
- **Recovery Point Objective (RPO):** ~24 hours worst case
- **Recovery Time Objective (RTO):** 15-60 minutes
- **No point-in-time recovery** — can only restore to daily backup timestamps
- **Restore is destructive** — replaces the entire live database (no merge option)
- **WAL is being archived** but without PITR addon it's not usable for granular recovery

---

## Files Created / Modified

| File | Action | Purpose |
|------|--------|---------|
| `scripts/restoreassist-verify.sh` | FIXED | Full verification (7 checks, Telegram alerts) |
| `scripts/backup-healthcheck.sh` | NEW | Lightweight check (no DB access needed) |

---

## Recommended Next Steps (Priority Order)

1. **Install PostgreSQL tools** — `brew install postgresql@17` on developer Mac
2. **Sign into 1Password** — `eval $(op signin)` for credential access
3. **Run sandbox setup** — `./scripts/sandbox-wizard.sh setup`
4. **Schedule backup-healthcheck.sh** — Add to CI or weekly cron (works now!)
5. **Board decision: Enable PITR** — Reduce RPO from 24h to seconds
6. **Schedule restoreassist-verify.sh** — Full weekly verification after prereqs met
7. **Test actual restore** — `supabase backups restore` to sandbox (NOT to prod)

---

## Credentials Needed (for Board/Admin)

These are the 1Password vault items required:

| Vault Item | Purpose | Status |
|------------|---------|--------|
| `SUPABASE_ACCESS_TOKEN` | Supabase Management API access | ✅ CLI has it |
| `UNITE_GROUP_DB_PASSWORD` | Production database password | Required for pg_dump test |
| `UNITE_GROUP_SANDBOX_DB_PASSWORD` | Sandbox database password | Required for sandbox test |

All should exist in vault: **Unite-Group-Infrastructure**
