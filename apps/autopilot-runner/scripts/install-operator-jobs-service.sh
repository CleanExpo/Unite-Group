#!/bin/bash
# Install the operator-jobs queue sweep as a macOS LaunchAgent that runs one
# bounded reconciliation sweep every 15 minutes (StartInterval — the tick exits after each
# sweep by design, so no KeepAlive).
#
#   bash apps/autopilot-runner/scripts/install-operator-jobs-service.sh
#
# Idempotent: re-running rewrites + reloads the plist. Uninstall:
#   launchctl unload ~/Library/LaunchAgents/in.unite-group.operator-jobs.plist
#   rm ~/Library/LaunchAgents/in.unite-group.operator-jobs.plist
#
# No secrets are written to the plist — the wrapper sources them from .env.local.
# Fail-closed: sweeps drain until CC_OPERATOR_JOBS_LIVE=1 is set in .env.local.
set -euo pipefail

LABEL="in.unite-group.operator-jobs"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RUNNER_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
WRAPPER="$SCRIPT_DIR/operator-jobs-launchd.sh"
NODE_BIN="$(command -v node)"
NODE_DIR="$(dirname "$NODE_BIN")"
LOG="$HOME/Library/Logs/operator-jobs.log"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"

echo "Building the runner…"
( cd "$RUNNER_DIR" && npm run build >/dev/null )

mkdir -p "$HOME/Library/LaunchAgents" "$HOME/Library/Logs"

cat > "$PLIST" <<PLIST_EOF
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
  <key>StartInterval</key><integer>900</integer>
  <key>StandardOutPath</key><string>$LOG</string>
  <key>StandardErrorPath</key><string>$LOG</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key><string>$NODE_DIR:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
  </dict>
</dict>
</plist>
PLIST_EOF

/usr/bin/plutil -lint "$PLIST" >/dev/null
echo "Wrote and validated $PLIST"

# Reload (unload if already present, then load).
launchctl unload "$PLIST" 2>/dev/null || true
launchctl load "$PLIST"

echo "Loaded LaunchAgent: $LABEL"
echo "Logs: $LOG"
echo "Status: launchctl list | grep $LABEL"
