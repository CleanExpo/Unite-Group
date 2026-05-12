#!/usr/bin/env bash
# sandbox-wizard.sh — Unite-Group Sandbox controller
#
# All Unite-Group schema/data work runs through here. The sandbox is an
# isolated Supabase project (Unite-Group Test, ref=xgqwfwqumliuguzhshwv)
# with prod's schema mirrored in via pg_dump --schema-only (no data).
# Prod (lksfwktwtmyznckodsau) is only touched via the `promote` subcommand
# and only after explicit confirmation.
#
# Subcommands:
#   setup     — first-time setup (verify creds, mirror prod schema, write .env.sandbox)
#   sync      — re-mirror prod schema to sandbox (drops + recreates public schema)
#   apply <sql>  — apply a migration to sandbox only
#   diff      — list schema differences between prod and sandbox
#   status    — show sandbox health, last sync time, advisor counts
#   reset     — wipe sandbox and re-mirror from prod
#   promote <sql>  — apply migration to prod (requires "yes" confirmation)
#
# Requires:
#   - 1Password CLI signed in (`eval $(op signin)`)
#   - psql + pg_dump installed (brew install postgresql@17)
#   - SUPABASE_ACCESS_TOKEN env var
#
# Conventions used by every subcommand:
#   - Reads creds from 1Password vault "Unite-Group-Infrastructure"
#   - Writes nothing to the repo except .env.sandbox (gitignored)
#   - Never writes data to prod without `promote` + explicit "yes"

set -euo pipefail

# ─── Constants ────────────────────────────────────────────────────────────────
readonly PROD_REF="lksfwktwtmyznckodsau"
readonly SANDBOX_REF="xgqwfwqumliuguzhshwv"
readonly PROD_REGION="ap-southeast-2"
readonly SANDBOX_REGION="us-west-1"
readonly OP_VAULT="Unite-Group-Infrastructure"
readonly REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
readonly ENV_SANDBOX="$REPO_ROOT/.env.sandbox"
readonly SCHEMA_DUMP_DIR="$REPO_ROOT/.sandbox-cache"
readonly SCHEMA_DUMP="$SCHEMA_DUMP_DIR/prod-schema.sql"
readonly STATE_FILE="$SCHEMA_DUMP_DIR/state.json"

# ─── Colours ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; CYAN='\033[0;36m'; NC='\033[0m'
info()  { printf "${BLUE}[i]${NC} %s\n" "$*"; }
ok()    { printf "${GREEN}[✓]${NC} %s\n" "$*"; }
warn()  { printf "${YELLOW}[!]${NC} %s\n" "$*"; }
err()   { printf "${RED}[✗]${NC} %s\n" "$*" >&2; }
step()  { printf "\n${CYAN}── %s ──${NC}\n" "$*"; }

# ─── Prereq checks ────────────────────────────────────────────────────────────
require_op() {
  if ! command -v op >/dev/null 2>&1; then
    err "1Password CLI not installed. Run: brew install 1password-cli"
    exit 1
  fi
  if ! op whoami >/dev/null 2>&1; then
    err "1Password CLI not signed in."
    echo "    Run this first:  eval \$(op signin)"
    exit 1
  fi
  ok "1Password CLI signed in as $(op whoami --format json | python3 -c 'import json,sys;print(json.load(sys.stdin)["email"])')"
}

require_psql() {
  if ! command -v psql >/dev/null 2>&1 || ! command -v pg_dump >/dev/null 2>&1; then
    err "psql + pg_dump not installed."
    echo "    Run: brew install postgresql@17 && brew link postgresql@17 --force"
    exit 1
  fi
  ok "psql $(psql --version | awk '{print $3}') available"
}

require_supabase_token() {
  if [[ -z "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
    # Try pulling from 1Password
    local token
    token=$(op item get "SUPABASE_ACCESS_TOKEN" --vault "$OP_VAULT" --reveal --field credential 2>/dev/null || true)
    if [[ -z "$token" ]]; then
      warn "SUPABASE_ACCESS_TOKEN missing — get one at https://supabase.com/dashboard/account/tokens"
      echo "    Then: op item create --vault $OP_VAULT --category 'API Credential' --title SUPABASE_ACCESS_TOKEN credential=<token>"
      exit 1
    fi
    export SUPABASE_ACCESS_TOKEN="$token"
  fi
  ok "Supabase access token loaded"
}

# ─── Credential loading ───────────────────────────────────────────────────────
load_creds() {
  step "Loading credentials from 1Password vault: $OP_VAULT"

  # Prod DB password
  PROD_DB_PASSWORD=$(op item get "UNITE_GROUP_DB_PASSWORD" --vault "$OP_VAULT" --reveal --field credential 2>/dev/null || true)
  if [[ -z "$PROD_DB_PASSWORD" ]]; then
    err "1P item 'UNITE_GROUP_DB_PASSWORD' missing in vault $OP_VAULT"
    echo "    Get the prod DB password from:"
    echo "    https://supabase.com/dashboard/project/$PROD_REF/settings/database"
    echo "    Save it as: op item create --vault $OP_VAULT --category 'API Credential' --title UNITE_GROUP_DB_PASSWORD credential=<password>"
    exit 1
  fi

  # Sandbox DB password
  SANDBOX_DB_PASSWORD=$(op item get "UNITE_GROUP_SANDBOX_DB_PASSWORD" --vault "$OP_VAULT" --reveal --field credential 2>/dev/null || true)
  if [[ -z "$SANDBOX_DB_PASSWORD" ]]; then
    err "1P item 'UNITE_GROUP_SANDBOX_DB_PASSWORD' missing"
    echo "    Reset at: https://supabase.com/dashboard/project/$SANDBOX_REF/settings/database"
    echo "    Save:     op item create --vault $OP_VAULT --category 'API Credential' --title UNITE_GROUP_SANDBOX_DB_PASSWORD credential=<password>"
    exit 1
  fi

  # Sandbox anon + service keys (pulled from Supabase API)
  SANDBOX_ANON_KEY=$(curl -s -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
    "https://api.supabase.com/v1/projects/$SANDBOX_REF/api-keys?reveal=true" \
    | python3 -c 'import json,sys; ks=json.load(sys.stdin); print(next(k["api_key"] for k in ks if k["name"]=="anon"))' 2>/dev/null || true)
  SANDBOX_SERVICE_KEY=$(curl -s -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
    "https://api.supabase.com/v1/projects/$SANDBOX_REF/api-keys?reveal=true" \
    | python3 -c 'import json,sys; ks=json.load(sys.stdin); print(next(k["api_key"] for k in ks if k["name"]=="service_role"))' 2>/dev/null || true)

  if [[ -z "$SANDBOX_ANON_KEY" || -z "$SANDBOX_SERVICE_KEY" ]]; then
    err "Could not fetch sandbox API keys via Supabase Management API."
    echo "    Check SUPABASE_ACCESS_TOKEN scope."
    exit 1
  fi

  # Use direct connection (not pooler). Pooler tenant routing fails for some
  # projects; direct connection is the canonical pg_dump path.
  PROD_DB_HOST="db.${PROD_REF}.supabase.co"
  SANDBOX_DB_HOST="db.${SANDBOX_REF}.supabase.co"
  PROD_DB_URL="postgresql://postgres:${PROD_DB_PASSWORD}@${PROD_DB_HOST}:5432/postgres"
  SANDBOX_DB_URL="postgresql://postgres:${SANDBOX_DB_PASSWORD}@${SANDBOX_DB_HOST}:5432/postgres"
  SANDBOX_REST_URL="https://${SANDBOX_REF}.supabase.co"

  ok "Prod + sandbox creds loaded"
}

# ─── Write .env.sandbox into the repo ─────────────────────────────────────────
write_env_sandbox() {
  step "Writing $ENV_SANDBOX"
  cat > "$ENV_SANDBOX" <<EOF
# Unite-Group Sandbox env — managed by scripts/sandbox-wizard.sh
# Last refresh: $(date -u +%Y-%m-%dT%H:%M:%SZ)
# Source these into your shell:  set -a; source .env.sandbox; set +a

NEXT_PUBLIC_SUPABASE_URL=${SANDBOX_REST_URL}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${SANDBOX_ANON_KEY}
SUPABASE_SERVICE_ROLE_KEY=${SANDBOX_SERVICE_KEY}
SUPABASE_DB_URL=${SANDBOX_DB_URL}
SUPABASE_PROJECT_REF=${SANDBOX_REF}
EOF
  chmod 600 "$ENV_SANDBOX"
  ok "$ENV_SANDBOX written (mode 600, gitignored)"
}

# ─── Schema mirror: prod → sandbox ────────────────────────────────────────────
mirror_schema() {
  step "Dumping prod schema (pg_dump --schema-only)"
  mkdir -p "$SCHEMA_DUMP_DIR"

  # Schema only — never copies row data
  PGPASSWORD="$PROD_DB_PASSWORD" pg_dump \
    --host="db.${PROD_REF}.supabase.co" \
    --port=5432 \
    --username="postgres" \
    --dbname=postgres \
    --schema-only \
    --no-owner --no-privileges \
    --schema=public \
    --file="$SCHEMA_DUMP"

  local lines
  lines=$(wc -l <"$SCHEMA_DUMP" | tr -d ' ')
  ok "Dumped prod public schema → $SCHEMA_DUMP ($lines lines)"

  step "Wiping sandbox public schema"
  PGPASSWORD="$SANDBOX_DB_PASSWORD" psql \
    --host="db.${SANDBOX_REF}.supabase.co" \
    --port=5432 \
    --username="postgres" \
    --dbname=postgres \
    --quiet \
    -c "DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;"
  ok "Sandbox public schema wiped"

  step "Applying prod schema to sandbox"
  PGPASSWORD="$SANDBOX_DB_PASSWORD" psql \
    --host="db.${SANDBOX_REF}.supabase.co" \
    --port=5432 \
    --username="postgres" \
    --dbname=postgres \
    --quiet \
    --file="$SCHEMA_DUMP" 2>&1 | tail -20 || true

  # Verify table parity
  local prod_tables sandbox_tables
  prod_tables=$(PGPASSWORD="$PROD_DB_PASSWORD" psql --host="db.${PROD_REF}.supabase.co" \
    --username="postgres" --dbname=postgres --quiet -tAc \
    "SELECT count(*) FROM information_schema.tables WHERE table_schema='public'")
  sandbox_tables=$(PGPASSWORD="$SANDBOX_DB_PASSWORD" psql --host="db.${SANDBOX_REF}.supabase.co" \
    --username="postgres" --dbname=postgres --quiet -tAc \
    "SELECT count(*) FROM information_schema.tables WHERE table_schema='public'")

  if [[ "$prod_tables" == "$sandbox_tables" ]]; then
    ok "Table parity confirmed: $sandbox_tables public tables"
  else
    warn "Table count drift: prod=$prod_tables sandbox=$sandbox_tables (some objects may have failed to restore — check output above)"
  fi

  # Persist state
  cat > "$STATE_FILE" <<EOF
{
  "last_sync_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "prod_table_count": $prod_tables,
  "sandbox_table_count": $sandbox_tables,
  "schema_dump_path": "$SCHEMA_DUMP",
  "schema_dump_sha256": "$(shasum -a 256 "$SCHEMA_DUMP" | awk '{print $1}')"
}
EOF
}

# ─── Subcommands ──────────────────────────────────────────────────────────────
cmd_setup() {
  step "Unite-Group Sandbox — first-time setup"
  require_op
  require_psql
  require_supabase_token
  load_creds
  mirror_schema
  write_env_sandbox

  step "Setup complete"
  echo ""
  echo "  Sandbox project:   https://supabase.com/dashboard/project/$SANDBOX_REF"
  echo "  Sandbox DB URL:    (in $ENV_SANDBOX)"
  echo ""
  echo "  Next: every migration goes to sandbox first."
  echo "    ./scripts/sandbox-wizard.sh apply path/to/migration.sql"
  echo "  Promote to prod after verification:"
  echo "    ./scripts/sandbox-wizard.sh promote path/to/migration.sql"
  echo ""
}

cmd_sync() {
  require_op
  require_psql
  require_supabase_token
  load_creds
  mirror_schema
  ok "Sandbox schema re-mirrored from prod"
}

cmd_apply() {
  local file="${1:-}"
  if [[ -z "$file" || ! -f "$file" ]]; then
    err "Usage: $0 apply <migration.sql>"
    exit 1
  fi
  require_op
  require_psql
  load_creds

  step "Applying $file to sandbox"
  PGPASSWORD="$SANDBOX_DB_PASSWORD" psql \
    --host="db.${SANDBOX_REF}.supabase.co" \
    --port=5432 \
    --username="postgres" \
    --dbname=postgres \
    --quiet \
    --file="$file" \
    --single-transaction \
    --set ON_ERROR_STOP=on
  ok "Applied to sandbox without errors"

  step "Sandbox advisor (security)"
  require_supabase_token
  curl -s -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
    "https://api.supabase.com/v1/projects/$SANDBOX_REF/advisors?type=security" \
    | python3 -c 'import json,sys; data=json.load(sys.stdin); lints=data.get("lints",[]); from collections import Counter; c=Counter(l["level"] for l in lints); print(" ", dict(c) or "no findings")'
}

cmd_diff() {
  require_op
  require_psql
  load_creds

  step "Schema diff (prod vs sandbox)"
  local tmp_prod tmp_sandbox
  tmp_prod=$(mktemp); tmp_sandbox=$(mktemp)
  PGPASSWORD="$PROD_DB_PASSWORD" pg_dump --host="db.${PROD_REF}.supabase.co" \
    --username="postgres" --dbname=postgres --schema-only --no-owner --no-privileges --schema=public > "$tmp_prod"
  PGPASSWORD="$SANDBOX_DB_PASSWORD" pg_dump --host="db.${SANDBOX_REF}.supabase.co" \
    --username="postgres" --dbname=postgres --schema-only --no-owner --no-privileges --schema=public > "$tmp_sandbox"
  diff -u "$tmp_prod" "$tmp_sandbox" | head -100 || true
  rm -f "$tmp_prod" "$tmp_sandbox"
}

cmd_status() {
  require_op
  require_supabase_token
  load_creds

  step "Sandbox status"
  echo "  Project:         $SANDBOX_REF (us-west-1)"
  echo "  REST URL:        $SANDBOX_REST_URL"

  if [[ -f "$STATE_FILE" ]]; then
    echo "  Last sync:       $(python3 -c "import json; print(json.load(open('$STATE_FILE'))['last_sync_at'])")"
    echo "  Tables (cached): $(python3 -c "import json; print(json.load(open('$STATE_FILE'))['sandbox_table_count'])")"
  else
    echo "  Last sync:       (never — run setup or sync)"
  fi

  step "Live counts"
  PGPASSWORD="$SANDBOX_DB_PASSWORD" psql \
    --host="db.${SANDBOX_REF}.supabase.co" \
    --username="postgres" --dbname=postgres --quiet -c \
    "SELECT
       (SELECT count(*) FROM information_schema.tables WHERE table_schema='public') AS tables,
       (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public') AS functions,
       (SELECT count(*) FROM pg_policies WHERE schemaname='public') AS policies;"
}

cmd_reset() {
  cmd_sync
}

cmd_promote() {
  local file="${1:-}"
  if [[ -z "$file" || ! -f "$file" ]]; then
    err "Usage: $0 promote <migration.sql>"
    exit 1
  fi

  warn "PROMOTE — this writes to PROD ($PROD_REF)"
  echo "  Migration file: $file"
  echo "  Lines:          $(wc -l <"$file" | tr -d ' ')"
  echo ""
  echo "  Required: this migration must have been applied to sandbox first."
  echo ""
  read -r -p "  Type 'promote to prod' to continue: " CONFIRM
  if [[ "$CONFIRM" != "promote to prod" ]]; then
    info "Aborted. No changes made to prod."
    exit 0
  fi

  require_op
  require_psql
  load_creds

  step "Applying $file to PROD"
  PGPASSWORD="$PROD_DB_PASSWORD" psql \
    --host="db.${PROD_REF}.supabase.co" \
    --port=5432 \
    --username="postgres" \
    --dbname=postgres \
    --quiet \
    --file="$file" \
    --single-transaction \
    --set ON_ERROR_STOP=on
  ok "Applied to prod"
}

# ─── Dispatch ─────────────────────────────────────────────────────────────────
case "${1:-}" in
  setup)    shift; cmd_setup    "$@" ;;
  sync)     shift; cmd_sync     "$@" ;;
  apply)    shift; cmd_apply    "$@" ;;
  diff)     shift; cmd_diff     "$@" ;;
  status)   shift; cmd_status   "$@" ;;
  reset)    shift; cmd_reset    "$@" ;;
  promote)  shift; cmd_promote  "$@" ;;
  ""|help|-h|--help)
    cat <<USAGE
Unite-Group Sandbox Wizard

  ./scripts/sandbox-wizard.sh <subcommand>

  setup              First-time setup: mirror prod schema → sandbox, write .env.sandbox
  sync               Re-mirror prod schema to sandbox (idempotent)
  apply <sql>        Apply a migration to sandbox only
  diff               Show schema diff between prod and sandbox
  status             Show sandbox health + last sync time + advisor count
  reset              Alias for sync
  promote <sql>      Apply migration to PROD (requires "promote to prod" typed)

  Project refs:
    prod      $PROD_REF  (ap-southeast-2)
    sandbox   $SANDBOX_REF  (us-west-1)
USAGE
    ;;
  *)
    err "Unknown subcommand: $1"
    "$0" help
    exit 1
    ;;
esac
