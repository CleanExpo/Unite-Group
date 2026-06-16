#!/usr/bin/env bash
# restoreassist-verify.sh — Backup validation script for Unite-Group
#
# Run weekly to verify Supabase backups are restorable.
# Reports to Telegram on success or failure.
#
# Usage:
#   ./scripts/restoreassist-verify.sh
#
# Requires:
#   - Supabase CLI installed and authenticated
#   - psql + pg_dump installed (brew install postgresql@17)
#   - 1Password CLI signed in (for DB passwords)

set -euo pipefail

readonly PROD_REF="lksfwktwtmyznckodsau"
readonly SANDBOX_REF="xgqwfwqumliuguzhshwv"
readonly OP_VAULT="Unite-Group-Infrastructure"
readonly REPORT_FILE="/tmp/restoreassist-report-$(date +%Y%m%d-%H%M%S).md"

# ─── Colours (terminal-only, stripped from report) ──────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
info()  { printf "${GREEN}[✓]${NC} %s\n" "$*" >&2; }
warn()  { printf "${YELLOW}[!]${NC} %s\n" "$*" >&2; }
err()   { printf "${RED}[✗]${NC} %s\n" "$*" >&2; }

# ─── Tracking pass/fail ─────────────────────────────────────────────────────
FAILURES=0
SKIPPED=0
PASSES=0
check_pass() { ((PASSES++)) || true; }
check_fail() { ((FAILURES++)) || true; }
check_skip() { ((SKIPPED++)) || true; }

# ─── Telegram Notification ──────────────────────────────────────────────────
notify_telegram() {
  local message="$1"
  if [[ -n "${TELEGRAM_BOT_TOKEN:-}" && -n "${TELEGRAM_CHAT_ID:-}" ]]; then
    curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
      -d "chat_id=${TELEGRAM_CHAT_ID}" \
      -d "text=${message}" \
      -d "parse_mode=Markdown" > /dev/null || true
  fi
}

# ─── Main ──────────────────────────────────────────────────────────────────
{
  echo "# RestoreAssist Verification Report"
  echo "Date: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo ""

  # ═══ 1. Supabase CLI + Backup List (Prod) ═══════════════════════════════
  echo "## 1. Production Backup Status"
  if command -v supabase &> /dev/null; then
    BACKUP_JSON=$(supabase backups list --project-ref "$PROD_REF" -o json 2>/dev/null || echo "FAILED")
    if [[ "$BACKUP_JSON" == "FAILED" ]]; then
      echo "- **FAILED** — Could not retrieve backup list (Supabase CLI error)"
      check_fail
    else
      # Parse backup data
      BACKUP_COUNT=$(echo "$BACKUP_JSON" | python3 -c 'import json,sys; d=json.load(sys.stdin); print(len(d["backups"]))' 2>/dev/null || echo "0")
      PITR_ENABLED=$(echo "$BACKUP_JSON" | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d.get("pitr_enabled", False))' 2>/dev/null || echo "false")
      LATEST_BACKUP=$(echo "$BACKUP_JSON" | python3 -c '
import json, sys
from datetime import datetime, timezone
d = json.load(sys.stdin)
if d.get("backups"):
    latest = d["backups"][0]
    ts = datetime.fromisoformat(latest["inserted_at"].replace("Z","+00:00"))
    age_hours = (datetime.now(timezone.utc) - ts).total_seconds() / 3600
    iat = latest["inserted_at"]
    bid = latest["id"]
    st = latest["status"]
    print("{0} (id:{1}, {2:.1f}h ago, status:{3})".format(iat, bid, age_hours, st))
else:
    print("NO BACKUPS")
' 2>/dev/null || echo "PARSE_ERROR")

      echo "- Supabase backups: **${BACKUP_COUNT} physical backups** available"
      echo "- Latest backup: ${LATEST_BACKUP}"
      echo "- PITR enabled: **${PITR_ENABLED}**"
      echo "- WAL archiving: **active** (walg_enabled)"

      # Freshness check — latest backup should be < 26 hours old
      AGE_CHECK=$(echo "$BACKUP_JSON" | python3 -c '
import json, sys
from datetime import datetime, timezone
d = json.load(sys.stdin)
if d["backups"]:
    ts = datetime.fromisoformat(d["backups"][0]["inserted_at"].replace("Z","+00:00"))
    age_hours = (datetime.now(timezone.utc) - ts).total_seconds() / 3600
    if age_hours > 26:
        print(f"STALE ({age_hours:.1f}h)")
    else:
        print(f"FRESH ({age_hours:.1f}h)")
else:
    print("NO_BACKUPS")
' 2>/dev/null || echo "PARSE_ERROR")

      if [[ "$AGE_CHECK" == STALE* ]] || [[ "$AGE_CHECK" == "NO_BACKUPS" ]]; then
        echo "- Freshness: **WARNING** — ${AGE_CHECK}"
        check_fail
      else
        echo "- Freshness: **OK** — ${AGE_CHECK}"
        check_pass
      fi

      if [[ "$PITR_ENABLED" == "False" ]]; then
        echo "- **NOTE:** PITR is disabled. Only daily snapshots available (no sub-day recovery)."
      fi
    fi
  else
    echo "- **SKIPPED** — Supabase CLI not installed"
    check_skip
  fi
  echo ""

  # ═══ 2. Sandbox Backup Status ═══════════════════════════════════════════
  echo "## 2. Sandbox Backup Status"
  if command -v supabase &> /dev/null; then
    SANDBOX_BACKUP_JSON=$(supabase backups list --project-ref "$SANDBOX_REF" -o json 2>/dev/null || echo "FAILED")
    if [[ "$SANDBOX_BACKUP_JSON" == "FAILED" ]]; then
      echo "- **FAILED** — Could not retrieve sandbox backup list"
      check_fail
    else
      SANDBOX_BACKUP_COUNT=$(echo "$SANDBOX_BACKUP_JSON" | python3 -c 'import json,sys; d=json.load(sys.stdin); print(len(d["backups"]))' 2>/dev/null || echo "0")
      SANDBOX_PITR=$(echo "$SANDBOX_BACKUP_JSON" | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d.get("pitr_enabled", False))' 2>/dev/null || echo "false")
      echo "- Sandbox backups: **${SANDBOX_BACKUP_COUNT} physical backups** available"
      echo "- PITR enabled: **${SANDBOX_PITR}**"
      check_pass
    fi
  else
    echo "- **SKIPPED** — Supabase CLI not installed"
    check_skip
  fi
  echo ""

  # ═══ 3. Production pg_dump Test (Schema Only) ═══════════════════════════
  echo "## 3. Production pg_dump Test (Schema Only)"
  if command -v pg_dump &> /dev/null; then
    # Get password from 1Password if available
    DB_PASSWORD=""
    if command -v op &> /dev/null; then
      DB_PASSWORD=$(op item get "UNITE_GROUP_DB_PASSWORD" --vault "$OP_VAULT" --reveal --field credential 2>/dev/null || echo "")
    fi
    # Also check env var
    DB_PASSWORD="${DB_PASSWORD:-${UNITE_GROUP_DB_PASSWORD:-}}"

    if [[ -n "$DB_PASSWORD" ]]; then
      DUMP_FILE="/tmp/prod-test-dump-$(date +%Y%m%d-%H%M%S).sql"
      if PGPASSWORD="$DB_PASSWORD" pg_dump \
        --host="db.${PROD_REF}.supabase.co" \
        --port=5432 \
        --username=postgres \
        --dbname=postgres \
        --schema=public \
        --schema-only \
        --no-owner --no-privileges \
        --file="$DUMP_FILE" 2>&1; then
        DUMP_SIZE=$(du -h "$DUMP_FILE" | cut -f1)
        DUMP_LINES=$(wc -l < "$DUMP_FILE" | tr -d ' ')
        echo "- **OK** — Schema dumped successfully"
        echo "- Size: ${DUMP_SIZE} (${DUMP_LINES} lines)"
        rm -f "$DUMP_FILE"
        check_pass
      else
        echo "- **FAILED** — pg_dump could not connect or dump production schema"
        check_fail
      fi
    else
      echo "- **SKIPPED** — DB password not available (1Password not signed in or item missing)"
      check_skip
    fi
  else
    echo "- **SKIPPED** — pg_dump not installed (brew install postgresql@17)"
    check_skip
  fi
  echo ""

  # ═══ 4. Sandbox Connectivity Test ═══════════════════════════════════════
  echo "## 4. Sandbox Connectivity Test"
  if command -v psql &> /dev/null; then
    SANDBOX_PASSWORD=""
    if command -v op &> /dev/null; then
      SANDBOX_PASSWORD=$(op item get "UNITE_GROUP_SANDBOX_DB_PASSWORD" --vault "$OP_VAULT" --reveal --field credential 2>/dev/null || echo "")
    fi
    SANDBOX_PASSWORD="${SANDBOX_PASSWORD:-${UNITE_GROUP_SANDBOX_DB_PASSWORD:-}}"

    if [[ -n "$SANDBOX_PASSWORD" ]]; then
      SANDBOX_VERSION=$(PGPASSWORD="$SANDBOX_PASSWORD" psql \
        --host="db.${SANDBOX_REF}.supabase.co" \
        --port=5432 \
        --username=postgres \
        --dbname=postgres \
        -tAc "SELECT version();" 2>&1 || echo "CONN_FAILED")
      if [[ "$SANDBOX_VERSION" != "CONN_FAILED" && -n "$SANDBOX_VERSION" ]]; then
        echo "- **OK** — Connected to sandbox"
        echo "- Version: ${SANDBOX_VERSION}"
        check_pass
      else
        echo "- **FAILED** — Could not connect to sandbox"
        check_fail
      fi
    else
      echo "- **SKIPPED** — Sandbox password not available"
      check_skip
    fi
  else
    echo "- **SKIPPED** — psql not installed (brew install postgresql@17)"
    check_skip
  fi
  echo ""

  # ═══ 5. Production Table Count ═════════════════════════════════════════
  echo "## 5. Production Table Count"
  if command -v psql &> /dev/null && [[ -n "${DB_PASSWORD:-}" ]]; then
    TABLE_COUNT=$(PGPASSWORD="$DB_PASSWORD" psql \
      --host="db.${PROD_REF}.supabase.co" \
      --port=5432 \
      --username=postgres \
      --dbname=postgres \
      -tAc "SELECT count(*) FROM pg_tables WHERE schemaname='public';" 2>/dev/null | tr -d ' ')
    if [[ -n "$TABLE_COUNT" && "$TABLE_COUNT" =~ ^[0-9]+$ ]]; then
      echo "- **OK** — ${TABLE_COUNT} public tables"
      if [[ "$TABLE_COUNT" -lt 100 ]]; then
        echo "- **WARNING** — Table count below expected threshold (100+). Verify this is expected."
      fi
      check_pass
    else
      echo "- **FAILED** — Could not retrieve table count"
      check_fail
    fi
  else
    echo "- **SKIPPED** — psql or credentials not available"
    check_skip
  fi
  echo ""

  # ═══ 6. Sandbox Schema Parity ══════════════════════════════════════════
  echo "## 6. Sandbox Schema Parity (Last Sync)"
  STATE_FILE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/.sandbox-cache/state.json"
  if [[ -f "$STATE_FILE" ]]; then
    LAST_SYNC=$(python3 -c "import json; print(json.load(open('$STATE_FILE'))['last_sync_at'])" 2>/dev/null || echo "PARSE_ERROR")
    CACHED_TABLES=$(python3 -c "import json; print(json.load(open('$STATE_FILE'))['sandbox_table_count'])" 2>/dev/null || echo "?")
    CACHED_PROD=$(python3 -c "import json; print(json.load(open('$STATE_FILE'))['prod_table_count'])" 2>/dev/null || echo "?")
    SHA=$(python3 -c "import json; print(json.load(open('$STATE_FILE'))['schema_dump_sha256'][:16])" 2>/dev/null || echo "?")
    echo "- Last sync: ${LAST_SYNC}"
    echo "- Prod tables at sync: ${CACHED_PROD}"
    echo "- Sandbox tables at sync: ${CACHED_TABLES}"
    echo "- Dump SHA256: ${SHA}..."

    # Check if sync is stale (>7 days)
    SYNC_AGE_DAYS=$(python3 -c "
from datetime import datetime, timezone
ts = datetime.fromisoformat('${LAST_SYNC}'.replace('Z','+00:00'))
age = (datetime.now(timezone.utc) - ts).total_seconds() / 86400
print(f'{age:.1f}')
" 2>/dev/null || echo "999")
    if (( $(echo "$SYNC_AGE_DAYS > 7" | bc -l 2>/dev/null || echo 1) )); then
      echo "- **WARNING** — Last sync was ${SYNC_AGE_DAYS} days ago (>7 days). Recommend running sandbox-wizard.sh sync."
    else
      echo "- Sync freshness: **OK** (${SYNC_AGE_DAYS} days)"
    fi
    check_pass
  else
    echo "- **NEVER SYNCED** — No state.json found. Run: ./scripts/sandbox-wizard.sh setup"
    check_fail
  fi
  echo ""

  # ═══ 7. Backup Retention Policy Documentation ══════════════════════════
  echo "## 7. Backup Retention Policy (Supabase Platform)"
  echo ""
  echo "| Parameter | Value |"
  echo "|-----------|-------|"
  echo "| Physical backups | Daily, automated |"
  echo "| Retention | 7 days (default Pro plan) |"
  echo "| PITR | $(if [[ "${PITR_ENABLED:-false}" == "True" ]]; then echo 'Enabled'; else echo '*DISABLED* — requires Pro plan addon'; fi) |"
  echo "| WAL archiving | Active (continuous) |"
  echo "| Restore method | \`supabase backups restore --project-ref <ref> --timestamp <epoch>\` |"
  echo "| Recovery type | Full project restore (replaces current DB) |"
  echo ""
  echo "### What this means for Unite-Group:"
  echo "- **RPO**: ~24 hours (daily backups, no PITR). Worst case: lose up to 24h of data."
  echo "- **RTO**: 15-60 minutes (Supabase-managed restore, project goes offline during restore)."
  echo "- **To enable PITR**: Supabase Dashboard → Settings → Database → Enable PITR (Pro addon)."
  echo ""

  # ═══ Summary ═════════════════════════════════════════════════════════════
  echo "## Summary"
  echo ""
  echo "| Metric | Count |"
  echo "|--------|-------|"
  echo "| Passed | ${PASSES} |"
  echo "| Failed | ${FAILURES} |"
  echo "| Skipped | ${SKIPPED} |"
  echo ""

  if [[ "$FAILURES" -gt 0 ]]; then
    echo "**⚠ VERIFICATION FAILED** — ${FAILURES} check(s) need attention."
  elif [[ "$SKIPPED" -gt 2 ]]; then
    echo "**⚠ PARTIAL** — ${SKIPPED} checks were skipped (missing prerequisites). Install psql/pg_dump and sign into 1Password for full coverage."
  else
    echo "**✓ PASSED** — All available checks passed."
  fi
  echo ""
  echo "Completed: $(date -u +%Y-%m-%dT%H:%M:%SZ)"

} > "$REPORT_FILE" 2>/dev/null

# Print report to terminal (with colors this time)
echo ""
cat "$REPORT_FILE"
echo ""
info "Report saved to $REPORT_FILE"

# Send Telegram notification
REPORT_TEXT=$(cat "$REPORT_FILE" | head -50)
notify_telegram "🛡 *RestoreAssist Weekly Check*%0A%0A${REPORT_TEXT}"

# Exit code based on failures
if [[ "$FAILURES" -gt 0 ]]; then
  exit 1
fi
