#!/usr/bin/env bash
# backup-healthcheck.sh — Lightweight backup health check (no psql/pg_dump required)
#
# Uses only the Supabase CLI to verify backup availability.
# Designed to run in CI or as a lightweight cron job.
#
# Usage:
#   ./scripts/backup-healthcheck.sh
#
# Exit codes:
#   0 = All checks passed
#   1 = One or more checks failed
#
# Requires:
#   - supabase CLI installed and authenticated

set -euo pipefail

readonly PROD_REF="lksfwktwtmyznckodsau"
readonly SANDBOX_REF="xgqwfwqumliuguzhshwv"
readonly MAX_BACKUP_AGE_HOURS=26  # 24h + 2h grace

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
ok()   { printf "${GREEN}[✓]${NC} %s\n" "$*"; }
warn() { printf "${YELLOW}[!]${NC} %s\n" "$*"; }
fail() { printf "${RED}[✗]${NC} %s\n" "$*" >&2; }

FAILURES=0

check_project_backups() {
  local ref="$1"
  local label="$2"

  echo "── $label ($ref) ──"
  
  local json
  json=$(supabase backups list --project-ref "$ref" -o json 2>/dev/null) || {
    fail "$label: Could not retrieve backup list"
    ((FAILURES++)) || true
    echo ""
    return
  }

  python3 -c "
import json, sys
from datetime import datetime, timezone

data = json.loads('''$json''')
backups = data.get('backups', [])
pitr = data.get('pitr_enabled', False)
walg = data.get('walg_enabled', True)

print(f'  Backups available: {len(backups)}')
print(f'  PITR:             {pitr}')
print(f'  WAL archiving:    {walg}')

if not backups:
    print('  STATUS: FAILED — No backups found')
    sys.exit(2)

latest = backups[0]
ts = datetime.fromisoformat(latest['inserted_at'].replace('Z', '+00:00'))
age_hours = (datetime.now(timezone.utc) - ts).total_seconds() / 3600
oldest = backups[-1]
ots = datetime.fromisoformat(oldest['inserted_at'].replace('Z', '+00:00'))
retention_days = (ts - ots).total_seconds() / 86400

print(f'  Latest:           {latest[\"inserted_at\"]} ({age_hours:.1f}h ago)')
print(f'  Oldest:           {oldest[\"inserted_at\"]} ({retention_days:.1f} days retention)')

failed = [b for b in backups if b['status'] != 'COMPLETED']
if failed:
    print(f'  WARNING: {len(failed)} backup(s) not in COMPLETED state')
    sys.exit(1)

if age_hours > $MAX_BACKUP_AGE_HOURS:
    print(f'  STATUS: STALE — Latest backup is {age_hours:.1f}h old (max: ${MAX_BACKUP_AGE_HOURS}h)')
    sys.exit(1)

print(f'  STATUS: OK')
" 2>/dev/null

  local rc=$?
  if [[ $rc -ne 0 ]]; then
    ((FAILURES++)) || true
  fi
  echo ""
}

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║   Unite-Group Backup Health Check            ║"
echo "║   $(date -u +%Y-%m-%dT%H:%M:%SZ)                      ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

# Check CLI availability
if ! command -v supabase &> /dev/null; then
  fail "supabase CLI not installed"
  exit 1
fi

if ! command -v python3 &> /dev/null; then
  fail "python3 not installed (needed for JSON parsing)"
  exit 1
fi

ok "Prerequisites: supabase CLI + python3"
echo ""

# Check both projects
check_project_backups "$PROD_REF" "Production"
check_project_backups "$SANDBOX_REF" "Sandbox"

# Final verdict
if [[ $FAILURES -eq 0 ]]; then
  ok "All backup checks passed"
  exit 0
else
  fail "$FAILURES check(s) failed"
  exit 1
fi
