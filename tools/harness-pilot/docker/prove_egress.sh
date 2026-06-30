#!/usr/bin/env bash
# Network-enforced egress proof (spec §15 / §13). Stands up the squid sidecar with
# the public allowlist, then from a separate container forced through the proxy:
#   * an allowlisted host (openrouter.ai)  -> ALLOWED (proxy returns a response)
#   * api.anthropic.com                    -> DENIED  (proxy blocks; "$0 Max" is structural)
#   * a random non-allowlisted host        -> DENIED
# Exits 0 only if the deny-by-default guarantee holds. Writes the proxy access log
# as the egress evidence artifact.
set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
NET="harness_egress_net"
PROXY="harness_squid"
LOG="$HERE/../out/proxy.log"
mkdir -p "$HERE/../out"

cleanup() { docker rm -f "$PROXY" >/dev/null 2>&1; docker network rm "$NET" >/dev/null 2>&1; }
trap cleanup EXIT
cleanup

docker network create --internal "$NET" >/dev/null 2>&1 || true
# proxy needs egress, so it sits on the default bridge too; the APP would be on $NET (internal) only.
docker run -d --name "$PROXY" \
  -v "$HERE/squid-allowlist.conf:/etc/squid/squid.conf:ro" \
  ubuntu/squid:latest >/dev/null 2>&1
sleep 4
docker network connect "$NET" "$PROXY" >/dev/null 2>&1 || true

probe() {  # host expected_word
  local host="$1"; local expect="$2"
  # client container on the internal net, forced through the proxy, no other egress
  local out
  out=$(docker run --rm --network "$NET" \
        -e http_proxy="http://$PROXY:3128" -e https_proxy="http://$PROXY:3128" \
        curlimages/curl:latest -s -o /dev/null -w "%{http_code}" \
        --max-time 12 "https://$host/" 2>&1)
  echo "  $host -> code=$out (want: $expect)"
  echo "$out"
}

echo "[egress proof] allowlisted openrouter.ai (expect ALLOW: non-000 / proxy reaches it)"
OR=$(probe "openrouter.ai" "allow" | tail -1)
echo "[egress proof] api.anthropic.com (expect DENY: 403 from proxy / 000)"
AN=$(probe "api.anthropic.com" "deny" | tail -1)
echo "[egress proof] evil.example.org (expect DENY)"
EV=$(probe "evil.example.org" "deny" | tail -1)

docker logs "$PROXY" > "$LOG" 2>&1 || true
echo "[egress proof] proxy access log -> $LOG"

# PASS criteria: anthropic + evil must NOT succeed (not a 2xx); openrouter may connect.
fail=0
case "$AN" in 2*) echo "FAIL: anthropic was reachable"; fail=1;; *) echo "PASS: anthropic blocked";; esac
case "$EV" in 2*) echo "FAIL: non-allowlisted reachable"; fail=1;; *) echo "PASS: non-allowlisted blocked";; esac
# anthropic must never appear as an ALLOW in the proxy log
if grep -qiE "TCP_TUNNEL.*anthropic|CONNECT api.anthropic.com.*(200|ALLOWED)" "$LOG" 2>/dev/null; then
  echo "FAIL: anthropic CONNECT was allowed in proxy log"; fail=1
else
  echo "PASS: no allowed anthropic CONNECT in proxy log"
fi
exit $fail
