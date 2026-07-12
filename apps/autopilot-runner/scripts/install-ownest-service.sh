#!/bin/bash
# Build and install the bounded OWNEST worker as a macOS LaunchAgent.
# The installed service is always forced live-off; arming the one-task canary
# is a separate, evidence-gated runtime operation.

set -euo pipefail
umask 077

LABEL="in.unite-group.ownest"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RUNNER_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_ROOT="$(cd "$RUNNER_DIR/../.." && pwd)"
EXPECTED_RUNTIME_ROOT="$HOME/Unite-Group-OWNEST"
WRAPPER="$SCRIPT_DIR/ownest-launchd.sh"
NODE_BIN="$(command -v node)"
NODE_DIR="$(dirname "$NODE_BIN")"
LOG="$HOME/Library/Logs/unite-ownest.log"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
DOMAIN="gui/$(id -u)"
DRY_RUN=0

if [ "${1:-}" = "--dry-run" ]; then
  DRY_RUN=1
elif [ "$#" -ne 0 ]; then
  printf 'Usage: %s [--dry-run]\n' "$0" >&2
  exit 64
fi

if [ "$DRY_RUN" -ne 1 ]; then
  if [ "$REPO_ROOT" != "$EXPECTED_RUNTIME_ROOT" ]; then
    printf 'Refusing non-durable launchd target: expected %s\n' "$EXPECTED_RUNTIME_ROOT" >&2
    exit 78
  fi
  if [ -n "$(git -C "$REPO_ROOT" status --porcelain)" ]; then
    printf '%s\n' 'Refusing to install from a dirty runtime checkout.' >&2
    exit 78
  fi
  if [ ! -f "$REPO_ROOT/.env.local" ]; then
    printf '%s\n' 'Runtime .env.local is required; refusing an error-looping service.' >&2
    exit 78
  fi
fi

( cd "$RUNNER_DIR" && npm run build >/dev/null )

temporary_plist="$(mktemp "${TMPDIR:-/tmp}/ownest-plist.XXXXXX")"
trap 'rm -f "$temporary_plist"' EXIT

cat > "$temporary_plist" <<PLIST_EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$LABEL</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>$WRAPPER</string>
  </array>
  <key>RunAtLoad</key><true/>
  <key>StartInterval</key><integer>60</integer>
  <key>ProcessType</key><string>Background</string>
  <key>StandardOutPath</key><string>$LOG</string>
  <key>StandardErrorPath</key><string>$LOG</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key><string>$NODE_DIR:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
    <key>CC_OWNEST_FORCE_LIVE_OFF</key><string>1</string>
  </dict>
</dict>
</plist>
PLIST_EOF

/usr/bin/plutil -lint "$temporary_plist" >/dev/null

if [ "$DRY_RUN" -eq 1 ]; then
  cat "$temporary_plist"
  exit 0
fi

mkdir -p "$HOME/Library/LaunchAgents" "$HOME/Library/Logs"
/usr/bin/install -m 600 "$temporary_plist" "$PLIST"

launchctl bootout "$DOMAIN/$LABEL" 2>/dev/null || true
launchctl bootstrap "$DOMAIN" "$PLIST"

printf 'Loaded live-off LaunchAgent: %s\n' "$LABEL"
printf 'Logs: %s\n' "$LOG"
printf 'Status: launchctl print %s/%s\n' "$DOMAIN" "$LABEL"
