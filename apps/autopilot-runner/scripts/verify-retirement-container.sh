#!/bin/bash
# Build and prove the legacy hosted-runner image is only a refusal tombstone.

set -euo pipefail

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly RUNNER_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
readonly IMAGE="${AUTOPILOT_TOMBSTONE_IMAGE:-unite-autopilot-tombstone:verify-${GITHUB_SHA:-local}-$$}"
readonly OUTPUT_DIR="$(mktemp -d "${TMPDIR:-/tmp}/autopilot-tombstone.XXXXXX")"

cleanup() {
  docker image rm -f "$IMAGE" >/dev/null 2>&1 || true
  rm -rf "$OUTPUT_DIR"
}
trap cleanup EXIT INT TERM

if ! command -v docker >/dev/null 2>&1; then
  printf '%s\n' 'Docker is required to verify the retirement tombstone.' >&2
  exit 78
fi

docker build --pull=false --tag "$IMAGE" "$RUNNER_DIR"

test "$(docker image inspect --format '{{.Config.User}}' "$IMAGE")" = 'node'
test "$(docker image inspect --format '{{json .Config.Entrypoint}}' "$IMAGE")" = '["node","/app/index.js"]'

runtime_args=(
  --rm
  --network none
  --read-only
  --cap-drop ALL
  --security-opt no-new-privileges:true
  --pids-limit 32
  --memory 128m
  --cpus 1
  --tmpfs /tmp:rw,noexec,nosuid,size=32m
)

contents="$(docker run "${runtime_args[@]}" --entrypoint /bin/sh "$IMAGE" -c \
  'find /app -mindepth 1 -maxdepth 1 -type f -printf "%f\n" | sort')"
test "$contents" = 'index.js'

docker run "${runtime_args[@]}" --entrypoint /bin/sh "$IMAGE" -c \
  'for executable in git claude hermes; do ! command -v "$executable"; done'

docker run "${runtime_args[@]}" "$IMAGE" >"$OUTPUT_DIR/drain.log" 2>&1
test "$(cat "$OUTPUT_DIR/drain.log")" = \
  '[autopilot-runner] legacy Linear author/publisher retired; draining with no work claimed.'

set +e
docker run "${runtime_args[@]}" \
  -e CC_LINEAR_LIVE=1 \
  -e ANTHROPIC_API_KEY=poison-anthropic-secret \
  -e SUPABASE_SERVICE_ROLE_KEY=poison-supabase-secret \
  "$IMAGE" >"$OUTPUT_DIR/retired.log" 2>&1
status=$?
set -e

test "$status" -eq 2
test "$(cat "$OUTPUT_DIR/retired.log")" = \
  '[autopilot-runner] CC_LINEAR_LIVE is permanently retired; no credentials, work, Git, or network were accessed.'
if grep -Eq 'poison-(anthropic|supabase)-secret' "$OUTPUT_DIR/retired.log"; then
  printf '%s\n' 'A sentinel credential appeared in retirement output.' >&2
  exit 1
fi

printf '%s\n' '[retirement-container] one-file, non-root, networkless tombstone verified'
