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
LOG="$HOME/Library/Logs/unite-ownest.log"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
DOMAIN="gui/$(id -u)"
MODE=install
VERIFIED_COMMIT=""

service_is_loaded() {
  /bin/launchctl print "$DOMAIN/$LABEL" >/dev/null 2>&1
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --dry-run)
      MODE=dry-run
      shift
      ;;
    --uninstall)
      MODE=uninstall
      shift
      ;;
    --verified-commit)
      if [ "$#" -lt 2 ]; then
        printf '%s\n' '--verified-commit requires a full commit SHA.' >&2
        exit 64
      fi
      VERIFIED_COMMIT="$2"
      shift 2
      ;;
    *)
      printf 'Usage: %s [--dry-run | --uninstall | --verified-commit <sha>]\n' "$0" >&2
      exit 64
      ;;
  esac
done

if [ "$MODE" = uninstall ]; then
  archive_dir="$HOME/Library/LaunchAgents.disabled-$(date -u +%Y%m%dT%H%M%SZ)-ownest"
  /bin/launchctl bootout "$DOMAIN/$LABEL" 2>/dev/null || true
  if service_is_loaded; then
    printf '%s\n' 'OWNEST LaunchAgent is still loaded; plist was not archived.' >&2
    exit 1
  fi
  if [ -f "$PLIST" ]; then
    mkdir -p "$archive_dir"
    chmod 700 "$archive_dir"
    mv "$PLIST" "$archive_dir/"
    printf 'Unloaded and archived: %s\n' "$archive_dir/$LABEL.plist"
  else
    printf 'LaunchAgent already absent: %s\n' "$LABEL"
  fi
  printf 'Log retained: %s\n' "$LOG"
  exit 0
fi

if [ "$MODE" = install ]; then
  if [ "$REPO_ROOT" != "$EXPECTED_RUNTIME_ROOT" ]; then
    printf 'Refusing non-durable launchd target: expected %s\n' "$EXPECTED_RUNTIME_ROOT" >&2
    exit 78
  fi
  case "$(git -C "$REPO_ROOT" remote get-url origin 2>/dev/null || true)" in
    https://github.com/CleanExpo/Unite-Group|https://github.com/CleanExpo/Unite-Group.git|git@github.com:CleanExpo/Unite-Group.git) ;;
    *)
      printf '%s\n' 'Refusing a runtime checkout with an unrecognised origin.' >&2
      exit 78
      ;;
  esac
  if ! [[ "$VERIFIED_COMMIT" =~ ^[0-9a-f]{40}$ ]]; then
    printf '%s\n' 'A full lowercase --verified-commit SHA is required for installation.' >&2
    exit 78
  fi
  if ! git -C "$REPO_ROOT" fetch --quiet --prune origin; then
    printf '%s\n' 'Unable to refresh origin before verified-commit attestation.' >&2
    exit 78
  fi
  runtime_head="$(git -C "$REPO_ROOT" rev-parse HEAD)"
  if [ "$runtime_head" != "$VERIFIED_COMMIT" ]; then
    printf '%s\n' 'Runtime HEAD does not match the verified commit.' >&2
    exit 78
  fi
  if [ -z "$(git -C "$REPO_ROOT" for-each-ref --contains "$runtime_head" --format='%(refname)' refs/remotes/origin)" ]; then
    printf '%s\n' 'Verified runtime commit is not present on an origin remote-tracking ref.' >&2
    exit 78
  fi
  if [ -n "$(git -C "$REPO_ROOT" status --porcelain)" ]; then
    printf '%s\n' 'Refusing to install from a dirty runtime checkout.' >&2
    exit 78
  fi
  if [ ! -f "$REPO_ROOT/.env.local" ] || [ -L "$REPO_ROOT/.env.local" ]; then
    printf '%s\n' 'Runtime .env.local is required; refusing an error-looping service.' >&2
    exit 78
  fi
  env_mode="$(/usr/bin/stat -f '%Lp' "$REPO_ROOT/.env.local")"
  if [ $((8#$env_mode & 8#077)) -ne 0 ]; then
    printf '%s\n' 'Runtime .env.local must not be accessible by group or other users.' >&2
    exit 78
  fi
  if [ "$(/usr/bin/stat -f '%u' "$REPO_ROOT/.env.local")" -ne "$(id -u)" ]; then
    printf '%s\n' 'Runtime .env.local must be owned by the current user.' >&2
    exit 78
  fi
fi

NODE_BIN="${OWNEST_NODE_BIN:-$(command -v node)}"
if [ "${NODE_BIN#/}" = "$NODE_BIN" ] || [ ! -x "$NODE_BIN" ]; then
  printf '%s\n' 'OWNEST_NODE_BIN must be an absolute executable path.' >&2
  exit 78
fi
NODE_DIR="$(dirname "$NODE_BIN")"
NPM_BIN="$NODE_DIR/npm"
if [ ! -x "$NPM_BIN" ] || [ "$("$NODE_BIN" -p 'process.versions.node.split(".")[0]')" != 22 ]; then
  printf '%s\n' 'OWNEST requires a Node 22 runtime with npm beside the pinned executable.' >&2
  exit 78
fi

( cd "$RUNNER_DIR" && npm_config_update_notifier=false npm_config_fund=false "$NPM_BIN" run build >/dev/null )

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
    <key>OWNEST_NODE_BIN</key><string>$NODE_BIN</string>
    <key>CC_OWNEST_FORCE_LIVE_OFF</key><string>1</string>
  </dict>
</dict>
</plist>
PLIST_EOF

/usr/bin/plutil -lint "$temporary_plist" >/dev/null

if [ "$MODE" = dry-run ]; then
  cat "$temporary_plist"
  exit 0
fi

mkdir -p "$HOME/Library/LaunchAgents" "$HOME/Library/Logs"
backup_dir="$HOME/Library/LaunchAgents/Backups/$LABEL"
mkdir -p "$backup_dir"
chmod 700 "$backup_dir"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
previous_plist=""
if [ -f "$PLIST" ]; then
  previous_plist="$backup_dir/$timestamp.plist"
  cp -p "$PLIST" "$previous_plist"
fi
/usr/bin/install -m 600 "$temporary_plist" "$PLIST"

/bin/launchctl bootout "$DOMAIN/$LABEL" 2>/dev/null || true
if service_is_loaded; then
  failed_plist="$backup_dir/$timestamp.failed.plist"
  mv "$PLIST" "$failed_plist"
  if [ -n "$previous_plist" ]; then /usr/bin/install -m 600 "$previous_plist" "$PLIST"; fi
  printf 'Existing service could not be unloaded; new plist archived at %s\n' "$failed_plist" >&2
  exit 1
fi
if ! /bin/launchctl bootstrap "$DOMAIN" "$PLIST" || ! service_is_loaded; then
  failed_plist="$backup_dir/$timestamp.failed.plist"
  mv "$PLIST" "$failed_plist"
  if [ -n "$previous_plist" ]; then
    /usr/bin/install -m 600 "$previous_plist" "$PLIST"
    /bin/launchctl bootstrap "$DOMAIN" "$PLIST" || true
  fi
  printf 'Bootstrap failed; new plist archived at %s\n' "$failed_plist" >&2
  exit 1
fi

printf 'Loaded live-off LaunchAgent: %s\n' "$LABEL"
printf 'Verified commit: %s\n' "$VERIFIED_COMMIT"
if [ -n "$previous_plist" ]; then printf 'Previous plist backup: %s\n' "$previous_plist"; fi
printf 'Logs: %s\n' "$LOG"
printf 'Status: launchctl print %s/%s\n' "$DOMAIN" "$LABEL"
