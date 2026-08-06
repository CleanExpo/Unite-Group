#!/bin/bash
# Claude Desktop keep-alive pulse (estate-native).
# Does NOT claim full GUI control of Anthropic's "Archived" UI.
# What it does:
#   1) Logs a pulse so Hermes/launchd prove the session watchdog is alive
#   2) If Claude Desktop is running, activates it (requires Accessibility once)
#   3) Optionally nudges the frontmost Claude window with a no-op Cmd+Shift+.
#      (harmless in most contexts) — DISABLED by default; set NUDGE=1 to enable
# Phill one-time: System Settings → Privacy & Security → Accessibility → allow
#   `osascript` / Terminal / this script's host. If a chat is already Archived,
#   click it once in Desktop to reopen — this pulse cannot un-archive via API.

set -euo pipefail
LOG_DIR="${HOME}/Library/Logs/claude-desktop-keepalive"
mkdir -p "$LOG_DIR"
LOG="$LOG_DIR/pulse.log"
STAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
HOST=$(hostname -s 2>/dev/null || echo unknown)

# 1) Always write pulse
echo "$STAMP host=$HOST pulse=ok" >> "$LOG"
# Keep log bounded (~500 lines)
if [[ $(wc -l < "$LOG" | tr -d ' ') -gt 500 ]]; then
  tail -n 300 "$LOG" > "$LOG.tmp" && mv "$LOG.tmp" "$LOG"
fi

# 2) Activate Claude if running (no launch — idle launch would be noisy)
if pgrep -xq "Claude" 2>/dev/null || pgrep -xq "Claude Desktop" 2>/dev/null; then
  if osascript <<'APPLESCRIPT' >/dev/null 2>&1; then
    tell application "System Events"
      set claudeProcs to (every process whose name contains "Claude")
      if (count of claudeProcs) > 0 then
        set frontmost of item 1 of claudeProcs to true
      end if
    end tell
APPLESCRIPT
    echo "$STAMP host=$HOST activate=ok" >> "$LOG"
  else
    echo "$STAMP host=$HOST activate=needs_accessibility" >> "$LOG"
  fi

  if [[ "${NUDGE:-0}" == "1" ]]; then
    osascript <<'APPLESCRIPT' >/dev/null 2>&1 || true
      tell application "System Events"
        keystroke "." using {command down, shift down}
      end tell
APPLESCRIPT
    echo "$STAMP host=$HOST nudge=attempted" >> "$LOG"
  fi
else
  echo "$STAMP host=$HOST claude=not_running" >> "$LOG"
fi

# 3) Touch estate North Star pulse marker (Cursor/Hermes can read)
MARKER="${HOME}/.claude/desktop-gauntlet-pulse.json"
mkdir -p "$(dirname "$MARKER")"
cat > "$MARKER" << JSON
{"pulsed_at":"$STAMP","host":"$HOST","north_star":"ship-readiness Class P producers until closed; bar=live Unite-Group founder wiki_pages + green merge conveyor","source":"desktop-keepalive/pulse.sh"}
JSON
