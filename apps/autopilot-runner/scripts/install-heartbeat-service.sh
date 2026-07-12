#!/bin/bash
# Uninstall-only boundary for the retired service-role presence LaunchAgent.

set -euo pipefail
umask 077

readonly LABEL='in.unite-group.hermes-heartbeat'
readonly DOMAIN="gui/$(id -u)"
readonly PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
readonly LOG="$HOME/Library/Logs/hermes-heartbeat.log"

if [ "${1:-}" != '--uninstall' ] || [ "$#" -ne 1 ]; then
  printf '%s\n' 'Hermes heartbeat installation is unavailable: use --uninstall only.' >&2
  printf '%s\n' 'Required replacement: a brokered least-privilege heartbeat that never exposes a CRM service-role key to an agent process.' >&2
  exit 78
fi

/bin/launchctl bootout "$DOMAIN/$LABEL" 2>/dev/null || true
if /bin/launchctl print "$DOMAIN/$LABEL" >/dev/null 2>&1; then
  printf '%s\n' 'Hermes heartbeat LaunchAgent is still loaded; plist was not archived.' >&2
  exit 1
fi

if [ -f "$PLIST" ]; then
  archive_dir="$HOME/Library/LaunchAgents.disabled-$(date -u +%Y%m%dT%H%M%SZ)-hermes-heartbeat"
  mkdir -p "$archive_dir"
  chmod 700 "$archive_dir"
  mv "$PLIST" "$archive_dir/"
  printf 'Unloaded and archived: %s\n' "$archive_dir/$LABEL.plist"
else
  printf 'LaunchAgent already absent: %s\n' "$LABEL"
fi
printf 'Log retained: %s\n' "$LOG"
