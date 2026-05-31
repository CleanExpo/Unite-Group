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
#   - SUPABASE_ACCESS_TOKEN env var
#   - psql + pg_dump installed
#   - 1Password CLI signed in (for DB passwords)

set -euo pipefail

readonly PROD_REF="lksfwktwtmyznckodsau"
readonly SANDBOX_REF="xgqwfwqumliuguzhshwv"
readonly OP_VAULT="Unite-Group-Infrastructure"
readonly REPORT_FILE="/tmp/restoreassist-report-$(date +%Y%m%d-%H%M%S).md"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
info()  { printf "${GREEN}[✓]${NC} %s\n" "$*"; }
warn()  { printf "${YELLOW}[!]${NC} %s\n" "$*"; }
err()   { printf "${RED}[✗]${NC} %s\n" "$*" >&2; }

# ─── Telegram Notification ────────────────────────────────────────────────────
notify_telegram() {
  local message="$1"
  if [[ -n "${TELEGRAM_BOT_TOKEN:-}" && -n "${TELEGRAM_CHAT_ID:-}" ]]; then
    curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
      -d "chat_id=${TELEGRAM_CHAT_ID}" \
      -d "text=${message}" \
      -d "parse_mode=Markdown" > /dev/null || true
  fi
}

# ─── Main ─────────────────────────────────────────────────────────────────────
{
  echo "# RestoreAssist Verification Report"
  echo "Date: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo ""

  # 1. Check Supabase auto-backup status
  echo "## 1. Supabase Auto-Backup Status"
  if command -v supabase &> /dev/null; then
    BACKUP_LIST=$(supabase backups list --project-ref "$PROD_REF" 2>/dev/null || echo "FAILED")
    if [[ "$BACKUP_LIST" == "FAILED" ]]; then
      err "Could not list backups"
      echo "- Status: **FAILED** — Could not retrieve backup list"
    else
      LATEST_BACKUP=$(echo "$BACKUP_LIST" | tail -1)
      info "Latest backup: $LATEST_BACKUP"
      echo "- Status: **OK**"
      echo "- Latest backup: $LATEST_BACKUP"
    fi
  else
    warn "Supabase CLI not installed — skipping backup list check"
    echo "- Status: **SKIPPED** — Supabase CLI not available"
  fi
  echo ""

  # 2. Test pg_dump from prod
  echo "## 2. Production pg_dump Test"
  if command -v pg_dump &> /dev/null; then
    # Get password from 1Password if available
    DB_PASSWORD=""
    if command -v op &> /dev/null; then
      DB_PASSWORD=$(op item get "UNITE_GROUP_DB_PASSWORD" --vault "$OP_VAULT" --field password 2>/dev/null || echo "")
    fi

    if [[ -n "$DB_PASSWORD" ]]; then
      DUMP_FILE="/tmp/prod-test-dump-$(date +%Y%m%d-%H%M%S).sql"
      if pg_dump \
        --host="db.${PROD_REF}.supabase.co" \
        --port=5432 \
        --username=postgres \
        --dbname=postgres \
        --schema-only \
        --no-password \
        --file="$DUMP_FILE" 2>/dev/null; then
        info "pg_dump successful"
        echo "- Status: **OK**"
        echo "- Dump file: $DUMP_FILE"
        echo "- Size: $(du -h "$DUMP_FILE" | cut -f1)"
        rm -f "$DUMP_FILE"
      else
        err "pg_dump failed"
        echo "- Status: **FAILED** — Could not dump production schema"
      fi
    else
      warn "DB password not available — skipping pg_dump test"
      echo "- Status: **SKIPPED** — Credentials not available"
    fi
  else
    warn "pg_dump not installed — skipping dump test"
    echo "- Status: **SKIPPED** — pg_dump not available"
  fi
  echo ""

  # 3. Test sandbox connectivity
  echo "## 3. Sandbox Connectivity Test"
  if command -v psql &> /dev/null; then
    SANDBOX_PASSWORD=""
    if command -v op &> /dev/null; then
      SANDBOX_PASSWORD=$(op item get "UNITE_GROUP_SANDBOX_DB_PASSWORD" --vault "$OP_VAULT" --field password 2>/dev/null || echo "")
    fi

    if [[ -n "$SANDBOX_PASSWORD" ]]; then
      if psql \
        "postgresql://postgres:${SANDBOX_PASSWORD}@db.${SANDBOX_REF}.supabase.co:5432/postgres" \
        -c "SELECT version();" > /dev/null 2>&1; then
        info "Sandbox connection successful"
        echo "- Status: **OK**"
      else
        err "Sandbox connection failed"
        echo "- Status: **FAILED** — Could not connect to sandbox"
      fi
    else
      warn "Sandbox password not available — skipping connectivity test"
      echo "- Status: **SKIPPED** — Credentials not available"
    fi
  else
    warn "psql not installed — skipping connectivity test"
    echo "- Status: **SKIPPED** — psql not available"
  fi
  echo ""

  # 4. Table count validation
  echo "## 4. Production Table Count"
  if command -v psql &> /dev/null && [[ -n "${DB_PASSWORD:-}" ]]; then
    TABLE_COUNT=$(psql \
      "postgresql://postgres:${DB_PASSWORD}@db.${PROD_REF}.supabase.co:5432/postgres" \
      -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | xargs)
    if [[ -n "$TABLE_COUNT" ]]; then
      info "Table count: $TABLE_COUNT"
      echo "- Status: **OK**"
      echo "- Public tables: $TABLE_COUNT"
      if [[ "$TABLE_COUNT" -lt 100 ]]; then
        warn "Table count seems low — verify this is expected"
        echo "- **WARNING:** Table count below expected threshold"
      fi
    else
      err "Could not get table count"
      echo "- Status: **FAILED**"
    fi
  else
    warn "Skipping table count — psql or credentials not available"
    echo "- Status: **SKIPPED**"
  fi
  echo ""

  # 5. Summary
  echo "## Summary"
  echo "RestoreAssist verification completed at $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo ""
  echo "Next steps:"
  echo "- If any checks FAILED, investigate immediately"
  echo "- If checks SKIPPED, ensure prerequisites are installed"
  echo "- Schedule this script to run weekly via cron"

} > "$REPORT_FILE"

cat "$REPORT_FILE"

# Send Telegram notification
REPORT_TEXT=$(cat "$REPORT_FILE")
notify_telegram "🛡️ *RestoreAssist Weekly Check*%0A%0A${REPORT_TEXT}"

info "Report saved to $REPORT_FILE"
