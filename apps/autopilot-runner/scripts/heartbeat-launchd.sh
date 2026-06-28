#!/bin/bash
# Hermes presence heartbeat — launchd/runtime wrapper.
#
# Sources secrets from the repo-root .env.local and runs the built daemon, so
# NO secret ever lives in the (user-readable) LaunchAgent plist. Paths are
# derived from this script's location, so it is portable across machines.
#
# Used by install-heartbeat-service.sh, but also runnable by hand:
#   bash apps/autopilot-runner/scripts/heartbeat-launchd.sh

set -a  # export everything sourced from .env.local

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RUNNER_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"   # apps/autopilot-runner
REPO_ROOT="$(cd "$RUNNER_DIR/../.." && pwd)" # monorepo root

if [ -f "$REPO_ROOT/.env.local" ]; then
  # shellcheck disable=SC1091
  . "$REPO_ROOT/.env.local"
fi
set +a

# Default to the prod project URL if .env.local didn't set one.
export SUPABASE_URL="${SUPABASE_URL:-https://lksfwktwtmyznckodsau.supabase.co}"

cd "$RUNNER_DIR" || exit 1
exec node dist/heartbeat.js
