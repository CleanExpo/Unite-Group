#!/usr/bin/env bash
set -euo pipefail

# Resolve the repo root relative to this script so the launcher runs from any
# shell / cwd, then run the worker directly with node. The previous
# `npm run mission-control:linear-loop` failed here because that script lives in
# apps/empire/package.json, not the repo root — from the root npm reported
# "Missing script". Running node from the repo root keeps cwd correct for the
# worker's git + runner-command operations; the worker self-loads .env.local
# for LINEAR_API_KEY regardless of cwd. [UNI-2151]
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
cd "$REPO_ROOT"

: "${MISSION_CONTROL_RUNNER_CMD:=claude -p \"\$(cat {prompt})\"}"
: "${MISSION_CONTROL_LOOP:=1}"
: "${MISSION_CONTROL_PUSH:=1}"
: "${MISSION_CONTROL_COMPLETE_ON_SUCCESS:=1}"

export MISSION_CONTROL_RUNNER_CMD
export MISSION_CONTROL_LOOP
export MISSION_CONTROL_PUSH
export MISSION_CONTROL_COMPLETE_ON_SUCCESS

exec node apps/empire/scripts/mission-control-linear-loop.mjs
