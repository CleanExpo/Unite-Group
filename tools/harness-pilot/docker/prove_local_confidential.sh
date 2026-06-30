#!/usr/bin/env bash
# Confidential-lane proof (spec §9; UNI-2213 Role 2+3 assembled).
# Proves an EGRESS-DENIED agent container can still do LOCAL inference while the
# internet stays unreachable — the lane for client/proprietary data:
#   app on a Docker --internal network, forced through a squid proxy that
#   allowlists ONLY model-runner.docker.internal (HTTP):
#     * a chat-completion to the local model  -> ALLOWED (real local inference)
#     * openrouter.ai / api.anthropic.com      -> DENIED (no internet egress)
#
# Prereq: Docker Model Runner enabled with a small model pulled, e.g.
#   docker desktop enable model-runner && docker model pull ai/smollm2
# Exits 0 only if local inference succeeds AND both internet probes are blocked.
set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
MODEL="${MODEL:-ai/smollm2}"
NET="harness_conf_net"
PROXY="harness_conf_squid"
LOG="$HERE/../out/confidential.log"
mkdir -p "$HERE/../out"

cleanup() { docker rm -f "$PROXY" >/dev/null 2>&1; docker network rm "$NET" >/dev/null 2>&1; }
trap cleanup EXIT
cleanup

docker network create --internal "$NET" >/dev/null 2>&1 || true
# proxy reaches the model host via the default bridge; the APP is on $NET (internal) only.
docker run -d --name "$PROXY" \
  -v "$HERE/squid-confidential.conf:/etc/squid/squid.conf:ro" \
  ubuntu/squid:latest >/dev/null 2>&1
sleep 4
docker network connect "$NET" "$PROXY" >/dev/null 2>&1 || true

echo "[confidential proof] (a) egress-denied app -> proxy -> local model (expect ALLOW)"
A=$(docker run --rm --network "$NET" -e http_proxy="http://$PROXY:3128" \
      curlimages/curl:latest -s --max-time 90 \
      http://model-runner.docker.internal/engines/v1/chat/completions \
      -H 'Content-Type: application/json' \
      -d "{\"model\":\"$MODEL\",\"messages\":[{\"role\":\"user\",\"content\":\"Reply with exactly: CONFIDENTIAL_LOCAL_OK\"}],\"max_tokens\":20,\"temperature\":0}" 2>&1)
echo "  response: $(echo "$A" | head -c 200)"

probe_internet() {  # host
  docker run --rm --network "$NET" \
    -e http_proxy="http://$PROXY:3128" -e https_proxy="http://$PROXY:3128" \
    curlimages/curl:latest -s -o /dev/null -w "%{http_code}" --max-time 12 "https://$1/" 2>&1
}
echo "[confidential proof] (b) same app -> internet (expect DENY)"
OR=$(probe_internet "openrouter.ai");     echo "  openrouter.ai -> code=$OR (want: 000)"
AN=$(probe_internet "api.anthropic.com"); echo "  api.anthropic.com -> code=$AN (want: 000)"

docker logs "$PROXY" > "$LOG" 2>&1 || true
echo "[confidential proof] proxy access log -> $LOG"

# code "000" = curl made no successful HTTP exchange (connection blocked by proxy deny).
fail=0
echo "$A" | grep -q '"choices"' || { echo "FAIL: local inference did not return a completion"; fail=1; }
case "$OR" in 000) ;; *) echo "FAIL: openrouter.ai was reachable (code=$OR)"; fail=1;; esac
case "$AN" in 000) ;; *) echo "FAIL: anthropic was reachable (code=$AN)"; fail=1;; esac
[ "$fail" -eq 0 ] && echo "PASS: local inference allowed, internet egress denied"
exit $fail
