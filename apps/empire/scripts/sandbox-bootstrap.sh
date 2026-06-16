#!/usr/bin/env bash
# sandbox-bootstrap.sh — one-shot prereq setup for sandbox-wizard.sh
#
# Run this once. It:
#   1. Verifies 1Password CLI is signed in
#   2. Prompts you for a Supabase Management API token (one paste)
#   3. Saves it to 1P
#   4. Resets sandbox DB password (safe — nothing else uses it) → saves to 1P
#   5. For prod DB password: checks 1P first; only resets if you say yes
#   6. Hands off to sandbox-wizard.sh setup
#
# After this runs once, future `./scripts/sandbox-wizard.sh setup|sync|apply|promote`
# work without any further prompts.

set -euo pipefail

readonly PROD_REF="lksfwktwtmyznckodsau"
readonly SANDBOX_REF="xgqwfwqumliuguzhshwv"
readonly OP_VAULT="Unite-Group-Infrastructure"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; CYAN='\033[0;36m'; NC='\033[0m'
info()  { printf "${BLUE}[i]${NC} %s\n" "$*"; }
ok()    { printf "${GREEN}[✓]${NC} %s\n" "$*"; }
warn()  { printf "${YELLOW}[!]${NC} %s\n" "$*"; }
err()   { printf "${RED}[✗]${NC} %s\n" "$*" >&2; }
step()  { printf "\n${CYAN}── %s ──${NC}\n" "$*"; }

# ─── Step 0: prereqs ──────────────────────────────────────────────────────────
step "Verifying prereqs"
if ! command -v op >/dev/null; then err "1Password CLI missing — brew install 1password-cli"; exit 1; fi
if ! op whoami >/dev/null 2>&1; then err "1P not signed in — run: eval \$(op signin)"; exit 1; fi
ok "1Password: $(op whoami --format json | python3 -c 'import json,sys;print(json.load(sys.stdin)["email"])')"

if ! op vault get "$OP_VAULT" >/dev/null 2>&1; then
  warn "Vault '$OP_VAULT' doesn't exist — creating it"
  op vault create "$OP_VAULT" >/dev/null
  ok "Vault created"
else
  ok "Vault '$OP_VAULT' exists"
fi

# ─── Helper: idempotent 1P item create / update ───────────────────────────────
# Usage: save_to_1p ITEM_TITLE VALUE
save_to_1p() {
  local title="$1" value="$2"
  if op item get "$title" --vault "$OP_VAULT" >/dev/null 2>&1; then
    op item edit "$title" --vault "$OP_VAULT" credential="$value" >/dev/null
    ok "1P: updated existing '$title'"
  else
    op item create --vault "$OP_VAULT" --category "API Credential" --title "$title" credential="$value" >/dev/null
    ok "1P: created '$title'"
  fi
}

# ─── Step 1: Supabase Management API token ────────────────────────────────────
step "Supabase Management API token"

EXISTING_TOKEN=$(op item get SUPABASE_ACCESS_TOKEN --vault "$OP_VAULT" --reveal --field credential 2>/dev/null || true)
if [[ -n "$EXISTING_TOKEN" ]] && [[ "$EXISTING_TOKEN" == sbp_* ]]; then
  ok "Found existing SUPABASE_ACCESS_TOKEN in 1P (${#EXISTING_TOKEN} chars)"
  SUPABASE_ACCESS_TOKEN="$EXISTING_TOKEN"
else
  echo ""
  echo "  Open this URL, click 'Generate new token', copy it:"
  echo "    https://supabase.com/dashboard/account/tokens"
  echo ""
  echo -n "  Paste token here (starts with sbp_), then press Enter: "
  read -rs SUPABASE_ACCESS_TOKEN
  echo ""
  if [[ ! "$SUPABASE_ACCESS_TOKEN" =~ ^sbp_ ]]; then
    err "Token doesn't start with sbp_. Aborting."
    exit 1
  fi
  save_to_1p SUPABASE_ACCESS_TOKEN "$SUPABASE_ACCESS_TOKEN"
fi
export SUPABASE_ACCESS_TOKEN

# Validate the token by hitting the Management API
info "Validating token against Management API..."
http_code=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  "https://api.supabase.com/v1/projects/$PROD_REF")
if [[ "$http_code" != "200" ]]; then
  err "Token rejected by Supabase (HTTP $http_code). Re-run and paste a valid token."
  exit 1
fi
ok "Token validated"

# ─── Helper: prompt for a DB password ─────────────────────────────────────────
# Reset is dashboard-only (Supabase Management API exposes no password-reset
# endpoint). We prompt for paste-in.
# Usage: prompt_db_password ITEM_TITLE DASHBOARD_URL FRIENDLY_NAME
prompt_db_password() {
  local title="$1" url="$2" name="$3"
  local existing
  existing=$(op item get "$title" --vault "$OP_VAULT" --reveal --field credential 2>/dev/null || true)
  if [[ -n "$existing" ]]; then
    ok "Found existing $title in 1P (${#existing} chars) — using as-is"
    return 0
  fi

  echo ""
  echo "  $name DB password not in 1P."
  echo "  If you don't already know it, reset it once at:"
  echo "    $url"
  echo "  Copy the password, then paste below (input hidden)."
  echo ""
  echo -n "  Paste $name DB password: "
  read -rs INPUT
  echo ""
  if [[ -z "$INPUT" ]]; then
    err "Empty input. Aborting."
    exit 1
  fi
  if [[ ${#INPUT} -lt 8 ]]; then
    err "That looks too short to be a real password (${#INPUT} chars). Aborting."
    exit 1
  fi
  save_to_1p "$title" "$INPUT"
}

# ─── Step 2: Sandbox DB password ──────────────────────────────────────────────
step "Sandbox DB password"
prompt_db_password \
  "UNITE_GROUP_SANDBOX_DB_PASSWORD" \
  "https://supabase.com/dashboard/project/$SANDBOX_REF/settings/database" \
  "Sandbox"

# ─── Step 3: Prod DB password ─────────────────────────────────────────────────
step "Prod DB password"
prompt_db_password \
  "UNITE_GROUP_DB_PASSWORD" \
  "https://supabase.com/dashboard/project/$PROD_REF/settings/database" \
  "Prod"

# ─── Step 4: Hand off to sandbox-wizard.sh setup ──────────────────────────────
step "Handing off to sandbox-wizard.sh setup"
exec "$(dirname "$0")/sandbox-wizard.sh" setup
