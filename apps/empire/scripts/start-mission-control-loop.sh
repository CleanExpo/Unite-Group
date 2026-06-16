#!/usr/bin/env bash
set -euo pipefail

cd /Users/phillmcgurk/Unite-Group

: "${MISSION_CONTROL_RUNNER_CMD:=claude -p \"\$(cat {prompt})\"}"
: "${MISSION_CONTROL_LOOP:=1}"
: "${MISSION_CONTROL_PUSH:=1}"
: "${MISSION_CONTROL_COMPLETE_ON_SUCCESS:=1}"

export MISSION_CONTROL_RUNNER_CMD
export MISSION_CONTROL_LOOP
export MISSION_CONTROL_PUSH
export MISSION_CONTROL_COMPLETE_ON_SUCCESS

npm run mission-control:linear-loop
