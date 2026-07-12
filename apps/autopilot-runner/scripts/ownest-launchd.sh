#!/bin/bash
# OWNEST CRM-to-Hermes reconciliation sweep.
#
# One invocation performs one bounded tick. New admission is dormant unless
# CC_OWNEST_LIVE=1, but reconciliation always remains active so cancellation,
# STOP, leases, and terminal-state repair continue to work.

set -euo pipefail
umask 077

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RUNNER_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_ROOT="$(cd "$RUNNER_DIR/../.." && pwd)"
LOCK_DIR="$HOME/Library/Caches/unite-ownest"
LOCK_FILE="$LOCK_DIR/tick.lock"

set -a
if [ -f "$REPO_ROOT/.env.local" ]; then
  # shellcheck disable=SC1091
  . "$REPO_ROOT/.env.local"
fi
set +a

export PATH="$HOME/.local/bin:$PATH"
export HERMES_CWD="${HERMES_CWD:-$REPO_ROOT}"
export CC_OWNEST_LIVE="${CC_OWNEST_LIVE:-0}"
if [ "${CC_OWNEST_FORCE_LIVE_OFF:-0}" = "1" ]; then
  export CC_OWNEST_LIVE=0
fi

mkdir -p "$LOCK_DIR"
chmod 700 "$LOCK_DIR"
cd "$RUNNER_DIR"

set +e
/usr/bin/lockf -s -t 0 -k "$LOCK_FILE" node dist/ownest-tick.js
status=$?
set -e

# EX_TEMPFAIL means another bounded sweep owns the lock. That is a healthy
# no-overlap result, not a retry storm or a second execution.
if [ "$status" -eq 75 ]; then
  printf '%s\n' '{"schema":"ownest.tick.summary.v1","outcome":"overlap_skipped"}'
  exit 0
fi

exit "$status"
