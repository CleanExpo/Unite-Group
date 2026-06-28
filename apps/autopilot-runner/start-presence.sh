#!/usr/bin/env bash
# Web CC ↔ gateway bridge — run the presence heartbeat writer.
#
# It dials OUT to the PROD Supabase and upserts operator_agent_presence every
# ~15s, folding the live gateway (:8642) state into capabilities.gateway. The
# deployed Command Centre (unite-group.in) reads these heartbeats and shows the
# operator agent + gateway as connected. No inbound exposure of the gateway.
#
# Requires (founder-provided, prod):
#   SUPABASE_URL                 prod project URL (lksfwktwtmyznckodsau)
#   SUPABASE_SERVICE_ROLE_KEY    prod service role key (RLS write to presence)
#   FOUNDER_USER_ID              founder's Supabase auth uuid
# Optional:
#   HERMES_API_URL               gateway base (default http://127.0.0.1:8642)
#   HERMES_AGENT_ID              stable agent id (default hostname)
#
# Reads the three required values from ~/.hermes/.env if present.
set -euo pipefail

if [ -d "$HOME/.nvm/versions/node/v24.14.1/bin" ]; then
  export PATH="$HOME/.nvm/versions/node/v24.14.1/bin:$PATH"
fi

ENVF="$HOME/.hermes/.env"
get() { grep -E "^$1=" "$ENVF" 2>/dev/null | head -1 | cut -d= -f2- | tr -d '"'"'"' '; }
: "${SUPABASE_URL:=$(get SUPABASE_URL)}"
: "${SUPABASE_SERVICE_ROLE_KEY:=$(get SUPABASE_SERVICE_ROLE_KEY)}"
: "${FOUNDER_USER_ID:=$(get FOUNDER_USER_ID)}"
: "${HERMES_API_URL:=http://127.0.0.1:8642}"

for v in SUPABASE_URL SUPABASE_SERVICE_ROLE_KEY FOUNDER_USER_ID; do
  if [ -z "${!v:-}" ]; then
    echo "[presence] missing $v — set it in ~/.hermes/.env (prod values). Bridge not started." >&2
    exit 1
  fi
done

cd "$(dirname "$0")"
[ -f dist/heartbeat.js ] || npm run build
exec env \
  SUPABASE_URL="$SUPABASE_URL" \
  SUPABASE_SERVICE_ROLE_KEY="$SUPABASE_SERVICE_ROLE_KEY" \
  FOUNDER_USER_ID="$FOUNDER_USER_ID" \
  HERMES_API_URL="$HERMES_API_URL" \
  node dist/heartbeat.js
