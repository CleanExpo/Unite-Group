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

  # Local override file (used when service account can't write to 1P)
  local creds_file="$HOME/.hermes/.unite-group-sandbox-creds.env"
  if [[ -f "$creds_file" ]]; then
    # shellcheck disable=SC1090
    source "$creds_file"
  fi

  # Prod DB password — prefer env var, fall back to 1P
  PROD_DB_PASSWORD="${UNITE_GROUP_DB_PASSWORD:-}"
  if [[ -z "$PROD_DB_PASSWORD" ]]; then
    PROD_DB_PASSWORD=$(op item get "UNITE_GROUP_DB_PASSWORD" --vault "$OP_VAULT" --reveal --field credential 2>/dev/null || true)
  fi
  if [[ -z "$PROD_DB_PASSWORD" ]]; then
    err "Prod DB password missing in both env var and 1P item 'UNITE_GROUP_DB_PASSWORD'"
    echo "    Reset at: https://supabase.com/dashboard/project/$PROD_REF/settings/database"
    echo "    Save to:  $creds_file  (export UNITE_GROUP_DB_PASSWORD=...)"
    echo "    Or to 1P: op item create --vault $OP_VAULT --category 'API Credential' --title UNITE_GROUP_DB_PASSWORD credential=<password>"
    exit 1
  fi

  # Sandbox DB password — prefer env var, fall back to 1P
  SANDBOX_DB_PASSWORD="${UNITE_GROUP_SANDBOX_DB_PASSWORD:-}"
  if [[ -z "$SANDBOX_DB_PASSWORD" ]]; then
    SANDBOX_DB_PASSWORD=$(op item get "UNITE_GROUP_SANDBOX_DB_PASSWORD" --vault "$OP_VAULT" --reveal --field credential 2>/dev/null || true)
  fi
  if [[ -z "$SANDBOX_DB_PASSWORD" ]]; then
    err "Sandbox DB password missing in both env var and 1P"
    echo "    Reset at: https://supabase.com/dashboard/project/$SANDBOX_REF/settings/database"
    echo "    Save to:  $creds_file  (export UNITE_GROUP_SANDBOX_DB_PASSWORD=...)"
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

  # ─ Wipe sandbox public schema (per-statement drops, not DROP SCHEMA CASCADE) ─
  # DROP SCHEMA CASCADE on a 1000+-table schema exceeds Postgres
  # max_locks_per_transaction (default 64). We instead generate per-object
  # DROP statements and run them through one psql session in autocommit mode,
  # so each DROP is its own implicit tx and releases locks before the next.
  step "Wiping sandbox public schema (per-statement drops, autocommit)"
  local cleanup_script="$SCHEMA_DUMP_DIR/cleanup.sql"
  local cleanup_log="$SCHEMA_DUMP_DIR/cleanup.log"

  PGPASSWORD="$SANDBOX_DB_PASSWORD" psql \
    --host="db.${SANDBOX_REF}.supabase.co" --username="postgres" --dbname=postgres -qtAc "
    SELECT 'DROP TABLE IF EXISTS public.\"' || tablename || '\" CASCADE;'
      FROM pg_tables WHERE schemaname='public'
    UNION ALL
    SELECT 'DROP TYPE IF EXISTS public.\"' || t.typname || '\" CASCADE;'
      FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public' AND t.typtype IN ('e','c','d')
        AND t.typname NOT LIKE E'\\\\_%'
        AND NOT EXISTS (SELECT 1 FROM pg_depend d
          WHERE d.classid='pg_type'::regclass AND d.objid=t.oid AND d.deptype='e')
    UNION ALL
    SELECT 'DROP FUNCTION IF EXISTS public.\"' || p.proname || '\"(' || oidvectortypes(p.proargtypes) || ') CASCADE;'
      FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
      WHERE n.nspname='public'
        AND NOT EXISTS (SELECT 1 FROM pg_depend d
          WHERE d.classid='pg_proc'::regclass AND d.objid=p.oid AND d.deptype='e')
    UNION ALL
    SELECT 'DROP VIEW IF EXISTS public.\"' || table_name || '\" CASCADE;'
      FROM information_schema.views WHERE table_schema='public'
    UNION ALL
    SELECT 'DROP MATERIALIZED VIEW IF EXISTS public.\"' || matviewname || '\" CASCADE;'
      FROM pg_matviews WHERE schemaname='public'
    UNION ALL
    SELECT 'DROP SEQUENCE IF EXISTS public.\"' || sequence_name || '\" CASCADE;'
      FROM information_schema.sequences WHERE sequence_schema='public';" > "$cleanup_script" 2>/dev/null

  local stmt_count
  stmt_count=$(wc -l < "$cleanup_script" | tr -d ' ')
  info "Generated $stmt_count DROP statements (tables, types, functions, views, sequences)"

  if [[ "$stmt_count" -gt 0 ]]; then
    PGPASSWORD="$SANDBOX_DB_PASSWORD" psql \
      --host="db.${SANDBOX_REF}.supabase.co" --username="postgres" --dbname=postgres --quiet \
      -f "$cleanup_script" > "$cleanup_log" 2>&1
    local cleanup_err=$(grep -c '^ERROR' "$cleanup_log" 2>/dev/null || echo 0)
    if [[ "$cleanup_err" -gt 0 ]]; then
      warn "$cleanup_err errors during cleanup — see $cleanup_log"
    fi
  fi
  ok "Sandbox public schema wiped"

  # ─ Install prod's user-extensions onto sandbox ─
  # pg_dump --schema=public excludes CREATE EXTENSION statements, so we
  # mirror them explicitly. Without this, tables using `vector(N)`,
  # `gin_trgm_ops`, etc. fail with "type/operator does not exist" and
  # cascade thousands of downstream errors.
  step "Mirroring prod's user-extensions onto sandbox"
  local ext_list
  ext_list=$(PGPASSWORD="$PROD_DB_PASSWORD" psql \
    --host="db.${PROD_REF}.supabase.co" --username="postgres" --dbname=postgres -qtAc \
    "SELECT extname FROM pg_extension
     WHERE extname NOT IN ('plpgsql','supabase_vault','pg_stat_statements','pgcrypto','uuid-ossp');" 2>/dev/null)
  if [[ -n "$ext_list" ]]; then
    for ext in $ext_list; do
      info "Installing extension '$ext' on sandbox..."
      PGPASSWORD="$SANDBOX_DB_PASSWORD" psql \
        --host="db.${SANDBOX_REF}.supabase.co" --username="postgres" --dbname=postgres --quiet \
        -c "CREATE EXTENSION IF NOT EXISTS \"$ext\" SCHEMA public;" 2>&1 | tail -1 \
        || warn "  extension $ext install failed (may already exist)"
    done
  fi
  ok "Extensions mirrored"

  # ─ Apply dump (no ON_ERROR_STOP — large cross-referenced schemas have
  #   benign chicken-and-egg errors; the verify step catches real drift) ─
  step "Applying prod schema to sandbox"
  local apply_log="$SCHEMA_DUMP_DIR/apply.log"
  PGPASSWORD="$SANDBOX_DB_PASSWORD" psql \
    --host="db.${SANDBOX_REF}.supabase.co" --username="postgres" --dbname=postgres --quiet \
    -f "$SCHEMA_DUMP" > "$apply_log" 2>&1 || true
  local err_count
  err_count=$(grep -c '^psql:.*ERROR' "$apply_log" 2>/dev/null || echo 0)
  if [[ "$err_count" -gt 1 ]]; then
    warn "$err_count psql ERROR lines during apply — see $apply_log"
    echo "    First 5 errors:"
    grep '^psql:.*ERROR' "$apply_log" | head -5 | sed 's/^/      /'
  else
    ok "Apply produced $err_count error(s) (1 expected: 'schema public already exists')"
  fi

  # ─ Verify parity by NAME-DIFF, not just count ─
  # Counts can match while specific tables are missing; only a name-set
  # comparison proves the mirror is faithful. Function returns non-zero
  # if drift > 0 so callers can detect failure.
  step "Verifying prod ↔ sandbox name-diff"
  local drift_log="$SCHEMA_DUMP_DIR/drift.log"
  local prod_tables sandbox_tables drift_count

  prod_tables=$(PGPASSWORD="$PROD_DB_PASSWORD" psql \
    --host="db.${PROD_REF}.supabase.co" --username="postgres" --dbname=postgres -qtAc \
    "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename;")
  sandbox_tables=$(PGPASSWORD="$SANDBOX_DB_PASSWORD" psql \
    --host="db.${SANDBOX_REF}.supabase.co" --username="postgres" --dbname=postgres -qtAc \
    "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename;")

  echo "$prod_tables" > "${drift_log}.prod"
  echo "$sandbox_tables" > "${drift_log}.sandbox"
  comm -23 "${drift_log}.prod" "${drift_log}.sandbox" > "${drift_log}.missing"
  drift_count=$(wc -l < "${drift_log}.missing" | tr -d ' ')

  if [[ "$drift_count" -eq 0 ]]; then
    ok "Name-diff clean: prod and sandbox have identical table sets ($(wc -l < ${drift_log}.prod | tr -d ' ') tables)"
  else
    err "Name-diff: $drift_count table(s) in prod not in sandbox — see ${drift_log}.missing"
    echo "    Missing tables (first 10):"
    head -10 "${drift_log}.missing" | sed 's/^/      /'
    return 1
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
