#!/bin/bash
# Install the Hermes presence heartbeat as a macOS LaunchAgent so it auto-starts
# on login, restarts if it dies (KeepAlive), and survives reboots / terminal exit.
#
#   bash apps/autopilot-runner/scripts/install-heartbeat-service.sh
#
# Idempotent: re-running rewrites + reloads the plist. Uninstall:
#   launchctl unload ~/Library/LaunchAgents/in.unite-group.hermes-heartbeat.plist
#   rm ~/Library/LaunchAgents/in.unite-group.hermes-heartbeat.plist
#
# No secrets are written to the plist — the wrapper sources them from .env.local.
set -euo pipefail

LABEL="in.unite-group.hermes-heartbeat"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RUNNER_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
WRAPPER="$SCRIPT_DIR/heartbeat-launchd.sh"
NODE_BIN="$(command -v node)"
NODE_DIR="$(dirname "$NODE_BIN")"
LOG="$HOME/Library/Logs/hermes-heartbeat.log"
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
  <key>KeepAlive</key><true/>
  <key>ThrottleInterval</key><integer>15</integer>
  <key>StandardOutPath</key><string>$LOG</string>
  <key>StandardErrorPath</key><string>$LOG</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key><string>$NODE_DIR:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
  </dict>
</dict>
</plist>
PLIST_EOF

echo "Wrote $PLIST"

# Reload (unload if already present, then load).
launchctl unload "$PLIST" 2>/dev/null || true
launchctl load "$PLIST"

echo "Loaded LaunchAgent: $LABEL"
echo "Logs: $LOG"
echo "Status: launchctl list | grep $LABEL"
