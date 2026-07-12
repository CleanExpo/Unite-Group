#!/bin/bash
# Operator-jobs queue sweep — launchd/runtime wrapper.
#
# Sources secrets from the repo-root .env.local and runs one bounded sweep of
# the operator_jobs queue (operator-jobs-tick), so NO secret ever lives in the
# (user-readable) LaunchAgent plist. Paths derive from this script's location.
#
# Used by install-operator-jobs-service.sh, but also runnable by hand:
#   bash apps/autopilot-runner/scripts/operator-jobs-launchd.sh
#
# Fail-closed: the sweep drains unless CC_OPERATOR_JOBS_LIVE=1 (set it in
# .env.local to arm the runner; the claude CLI must also be on PATH for the
# Tier 2 wiki_enhance executor).

set -a  # export everything sourced from .env.local

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RUNNER_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"   # apps/autopilot-runner
REPO_ROOT="$(cd "$RUNNER_DIR/../.." && pwd)" # monorepo root

if [ -f "$REPO_ROOT/.env.local" ]; then
  # shellcheck disable=SC1091
  . "$REPO_ROOT/.env.local"
fi
set +a

if [ -z "${SUPABASE_URL:-}" ]; then
  printf '%s\n' 'SUPABASE_URL is required; refusing to infer a production target.' >&2
  exit 78
fi
export SUPABASE_URL
# The claude CLI installs to ~/.local/bin by default — launchd PATH won't have it.
export PATH="$HOME/.local/bin:$PATH"

cd "$RUNNER_DIR" || exit 1
exec node dist/operator-jobs-tick.js
