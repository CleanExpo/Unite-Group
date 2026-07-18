#!/bin/zsh
set -euo pipefail

if [[ $# -ne 1 ]]; then
  print -u2 "Usage: $0 https://<founder-app>/api/agents/machine-activity"
  exit 2
fi

endpoint="$1"
if [[ "$endpoint" != https://*/api/agents/machine-activity ]]; then
  print -u2 "Endpoint must be HTTPS and end with /api/agents/machine-activity"
  exit 2
fi

read -r -s "device_token?Device token (input hidden): "
print
if (( ${#device_token} < 32 )); then
  print -u2 "Device token must contain at least 32 characters"
  exit 2
fi

script_dir="${0:A:h}"
install_dir="$HOME/Library/Application Support/UniteGroup/MachineActivity"
plist="$HOME/Library/LaunchAgents/com.unitegroup.machine-activity.plist"
log_dir="$HOME/Library/Logs/UniteGroup"
python_bin="$(command -v python3 || true)"
hermes_bin="$(command -v hermes || true)"

if [[ -z "$python_bin" || -z "$hermes_bin" ]]; then
  print -u2 "python3 and hermes must both be installed and on PATH"
  exit 1
fi

mkdir -p "$install_dir" "$log_dir" "${plist:h}"
install -m 700 "$script_dir/collector.py" "$install_dir/collector.py"

# Hermes writes its content-free active-session lease registry only when this
# bounded concurrency setting is enabled. This does not grant new permissions.
"$hermes_bin" config set max_concurrent_sessions 16 >/dev/null

ENDPOINT="$endpoint" DEVICE_TOKEN="$device_token" PYTHON_BIN="$python_bin" \
COLLECTOR_PATH="$install_dir/collector.py" LOG_DIR="$log_dir" PLIST_PATH="$plist" \
python3 - <<'PY'
import os
import plistlib
from pathlib import Path

payload = {
    "Label": "com.unitegroup.machine-activity",
    "ProgramArguments": [os.environ["PYTHON_BIN"], os.environ["COLLECTOR_PATH"]],
    "EnvironmentVariables": {
        "MACHINE_ACTIVITY_ENDPOINT": os.environ["ENDPOINT"],
        "MACHINE_ACTIVITY_DEVICE_TOKEN": os.environ["DEVICE_TOKEN"],
    },
    "RunAtLoad": True,
    "KeepAlive": True,
    "ThrottleInterval": 15,
    "StandardOutPath": str(Path(os.environ["LOG_DIR"]) / "machine-activity.log"),
    "StandardErrorPath": str(Path(os.environ["LOG_DIR"]) / "machine-activity-error.log"),
}
path = Path(os.environ["PLIST_PATH"])
with path.open("wb") as handle:
    plistlib.dump(payload, handle)
os.chmod(path, 0o600)
PY

unset device_token
launchctl bootout "gui/$(id -u)" "$plist" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$plist"
launchctl kickstart -k "gui/$(id -u)/com.unitegroup.machine-activity"

print "Installed com.unitegroup.machine-activity"
print "Verify: launchctl print gui/$(id -u)/com.unitegroup.machine-activity"
print "Logs: $log_dir/machine-activity-error.log"
