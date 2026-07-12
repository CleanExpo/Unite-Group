#!/bin/bash
# OWNEST CRM-to-Hermes reconciliation sweep.
#
# One invocation performs one bounded tick. New admission is dormant unless
# CC_OWNEST_LIVE=1, but reconciliation always remains active so cancellation,
# STOP, leases, and terminal-state repair continue to work.

set -euo pipefail
umask 077

readonly OWNEST_INTERNAL_HOME="$HOME"
readonly OWNEST_INTERNAL_PATH="$PATH"
readonly OWNEST_INTERNAL_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly OWNEST_INTERNAL_RUNNER_DIR="$(cd "$OWNEST_INTERNAL_SCRIPT_DIR/.." && pwd)"
readonly OWNEST_INTERNAL_REPO_ROOT="$(cd "$OWNEST_INTERNAL_RUNNER_DIR/../.." && pwd)"
readonly OWNEST_INTERNAL_LOCK_DIR="$OWNEST_INTERNAL_HOME/Library/Caches/unite-ownest"
readonly OWNEST_INTERNAL_LOCK_FILE="$OWNEST_INTERNAL_LOCK_DIR/tick.lock"
readonly OWNEST_INTERNAL_NODE="${OWNEST_NODE_BIN:-$(command -v node)}"
readonly OWNEST_INTERNAL_FORCE_LIVE_OFF="${CC_OWNEST_FORCE_LIVE_OFF:-0}"
readonly OWNEST_INTERNAL_ENV_FILE="${OWNEST_ENV_FILE:-$OWNEST_INTERNAL_REPO_ROOT/.env.local}"

set -a
if [ -f "$OWNEST_INTERNAL_ENV_FILE" ]; then
  # shellcheck disable=SC1091
  . "$OWNEST_INTERNAL_ENV_FILE"
fi
set +a

export PATH="$OWNEST_INTERNAL_HOME/.local/bin:$OWNEST_INTERNAL_PATH"
export HERMES_CWD="$OWNEST_INTERNAL_REPO_ROOT"
export CC_OWNEST_HERMES_PROFILE=ownest
export CC_OWNEST_HERMES_BOARD=unite-group-ownest
export CC_OWNEST_LIVE="${CC_OWNEST_LIVE:-0}"
if [ "$OWNEST_INTERNAL_FORCE_LIVE_OFF" = "1" ]; then
  export CC_OWNEST_LIVE=0
fi

if [ -L "$OWNEST_INTERNAL_LOCK_DIR" ]; then
  printf '%s\n' 'Refusing a symlinked OWNEST lock directory.' >&2
  exit 78
fi
if [ ! -x "$OWNEST_INTERNAL_NODE" ]; then
  printf '%s\n' 'Configured OWNEST Node executable is unavailable.' >&2
  exit 78
fi
mkdir -p "$OWNEST_INTERNAL_LOCK_DIR"
chmod 700 "$OWNEST_INTERNAL_LOCK_DIR"
cd "$OWNEST_INTERNAL_RUNNER_DIR"

child_environment=(
  "HOME=$OWNEST_INTERNAL_HOME"
  "PATH=$PATH"
  "HERMES_CWD=$HERMES_CWD"
  "CC_OWNEST_HERMES_PROFILE=$CC_OWNEST_HERMES_PROFILE"
  "CC_OWNEST_HERMES_BOARD=$CC_OWNEST_HERMES_BOARD"
  "CC_OWNEST_LIVE=$CC_OWNEST_LIVE"
)

append_child_environment() {
  local name="$1"
  if [ "${!name+x}" = "x" ]; then
    child_environment+=("$name=${!name}")
  fi
}

for name in \
  TMPDIR LANG LC_ALL LC_CTYPE TZ USER LOGNAME SHELL \
  XDG_CONFIG_HOME XDG_CACHE_HOME SSL_CERT_FILE SSL_CERT_DIR NODE_EXTRA_CA_CERTS \
  HERMES_HOME HERMES_AGENT_ID HERMES_KANBAN_BOARD \
  SUPABASE_URL NEXT_PUBLIC_SUPABASE_URL SUPABASE_SERVICE_ROLE_KEY FOUNDER_USER_ID \
  CC_OWNEST_WORKER_ID CC_OWNEST_ROLLOUT_ID CC_OWNEST_CANARY_TASK_ID \
  CC_OWNEST_CANARY_LIMIT CC_OWNEST_MAX_IN_PROGRESS CC_OWNEST_LEASE_MS \
  CC_OWNEST_DAILY_DISPATCH_LIMIT
do
  append_child_environment "$name"
done

set +e
/usr/bin/lockf -s -t 0 -k "$OWNEST_INTERNAL_LOCK_FILE" \
  /usr/bin/env -i "${child_environment[@]}" \
  "$OWNEST_INTERNAL_NODE" dist/ownest-tick.js
status=$?
set -e

# EX_TEMPFAIL means another bounded sweep owns the lock. That is a healthy
# no-overlap result, not a retry storm or a second execution.
if [ "$status" -eq 75 ]; then
  printf '%s\n' '{"schema":"ownest.tick.summary.v1","outcome":"overlap_skipped"}'
  exit 0
fi

exit "$status"
