#!/bin/bash
# UNI-3475 Done criterion: run apps/workspace's autonomy hook inside a real ubuntu:26.04
# container, where /usr/bin/cat and /usr/bin/ls are symlinks into /usr/lib/cargo/bin/coreutils.
# PASS only when the system programs are allowed (exit 0) AND a program the lane wrote is
# still blocked (exit 2), both by relative and by absolute path.
# Usage: ubuntu2604_hook_probe.sh <path to a Linux x64 node binary>
set -u
NODE_HOST=${1:?linux node binary path}
ROOT=$(cd "$(dirname "$0")/../../.." && pwd)
LANES="$ROOT/apps/workspace/src/server/lanes"
[ -f "$LANES/autonomy-hook.mjs" ] || { echo "FAIL: no hook at $LANES"; exit 2; }
[ -f "$NODE_HOST" ] || { echo "FAIL: no node at $NODE_HOST"; exit 2; }
to_mount() { if command -v cygpath >/dev/null 2>&1; then cygpath -w "$1"; else echo "$1"; fi; }
INNER='
cp /node /opt/node && chmod 755 /opt/node || exit 9
/opt/node -v >/dev/null || exit 9
readlink /usr/bin/cat | grep -q coreutils || { echo "image does not symlink cat into coreutils"; exit 8; }
mkdir -p /lane && echo hi > /lane/notes.txt
printf "#!/bin/sh\necho bypass\n" > /lane/cat && chmod 755 /lane/cat
for cmd in "ls -la" "cat notes.txt" "./cat" "/lane/cat"; do
  printf "{\"tool_name\":\"Bash\",\"tool_input\":{\"command\":\"%s\"}}" "$cmd" | (cd /lane && env -i PATH=/usr/bin:/bin NEXUS_LANE_REQUEST_ID=run-1 NEXUS_LANE_ADAPTER=codex NEXUS_LANE_WORKTREE_ROOT=/lane /opt/node /lanes/autonomy-hook.mjs >/dev/null 2>&1)
  echo "$cmd=$?"
done
'
OUT=$(MSYS_NO_PATHCONV=1 docker run --rm -v "$(to_mount "$LANES"):/lanes:ro" -v "$(to_mount "$NODE_HOST"):/node:ro" ubuntu:26.04 /bin/sh -c "$INNER" 2>&1)
RC=$?
echo "$OUT"
[ $RC -eq 0 ] || { echo "FAIL: container rc $RC"; exit 1; }
want="ls -la=0
cat notes.txt=0
./cat=2
/lane/cat=2"
if [ "$OUT" = "$want" ]; then echo PASS; exit 0; fi
echo "FAIL: expected system programs allowed (0) and lane programs blocked (2)"
exit 1
