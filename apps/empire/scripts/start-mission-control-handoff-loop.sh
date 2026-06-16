#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
cd "$REPO_ROOT"

if [[ -z "${MISSION_CONTROL_HANDOFF_URL:-}" ]]; then
  echo "MISSION_CONTROL_HANDOFF_URL is required for the handoff loop." >&2
  echo "Example: MISSION_CONTROL_HANDOFF_URL='https://<app>/api/cron/linear-handoff' MISSION_CONTROL_CRON_SECRET='<secret>' npm run mission-control:linear-handoff-loop" >&2
  exit 1
fi

if [[ -z "${MISSION_CONTROL_CRON_SECRET:-}" && -z "${CRON_SECRET:-}" ]]; then
  echo "MISSION_CONTROL_CRON_SECRET or CRON_SECRET is required for the handoff loop." >&2
  exit 1
fi

: "${MISSION_CONTROL_RUNNER_CMD:=claude -p \"\$(cat {prompt})\"}"
: "${MISSION_CONTROL_LOOP:=1}"
: "${MISSION_CONTROL_PUSH:=1}"
: "${MISSION_CONTROL_COMPLETE_ON_SUCCESS:=1}"

export MISSION_CONTROL_HANDOFF_URL
export MISSION_CONTROL_RUNNER_CMD
export MISSION_CONTROL_LOOP
export MISSION_CONTROL_PUSH
export MISSION_CONTROL_COMPLETE_ON_SUCCESS

exec node apps/empire/scripts/mission-control-linear-loop.mjs "$@"
