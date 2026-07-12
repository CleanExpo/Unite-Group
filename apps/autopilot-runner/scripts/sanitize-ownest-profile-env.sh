#!/bin/bash
# Minimise the Hermes OWNEST profile environment without exposing values.
#
# The profile is an execution boundary, not a general-purpose credential store.
# This script keeps only the provider/browser route and non-secret TAO settings
# required by the bounded OWNEST worker. It creates a permission-preserving
# backup and atomically replaces the profile file.

set -euo pipefail
umask 077

if [ "${OWNEST_SANITIZER_TEST_MODE:-0}" = "1" ]; then
  PROFILE_ENV="${OWNEST_SANITIZER_TEST_PROFILE_ENV:?test profile path required}"
  BACKUP_ROOT="${OWNEST_SANITIZER_TEST_BACKUP_ROOT:?test backup root required}"
else
  if [ "${OWNEST_SANITIZER_TEST_PROFILE_ENV+x}" = "x" ] || [ "${OWNEST_SANITIZER_TEST_BACKUP_ROOT+x}" = "x" ]; then
    printf '%s\n' 'Test path overrides require OWNEST_SANITIZER_TEST_MODE=1.' >&2
    exit 64
  fi
  PROFILE_ENV="$HOME/.hermes/profiles/ownest/.env"
  BACKUP_ROOT="$HOME/.hermes/change-backups"
fi

stat_mode() {
  if /usr/bin/stat -f '%Lp' "$1" >/dev/null 2>&1; then
    /usr/bin/stat -f '%Lp' "$1"
  else
    /usr/bin/stat -c '%a' "$1"
  fi
}

stat_owner() {
  if /usr/bin/stat -f '%u' "$1" >/dev/null 2>&1; then
    /usr/bin/stat -f '%u' "$1"
  else
    /usr/bin/stat -c '%u' "$1"
  fi
}

allowed_key() {
  case "$1" in
    OPENROUTER_API_KEY | \
    BROWSER_USE_API_KEY | BU_CDP_URL | BU_NAME | \
    API_SERVER_ENABLED | BH_DOMAIN_SKILLS | \
    TAO_BROWSER_DISABLED | TAO_CHEAP_LOCAL_MODEL | \
    TAO_MID_USE_CLAUDE_PRINT | TAO_MODEL_REALTIME_LOOKUP | \
    TAO_MODEL_RESEARCH_REALTIME | TAO_SWARM_INTERNAL_DISABLE | \
    TAO_TOP_USE_CLAUDE_PRINT)
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

if [ ! -f "$PROFILE_ENV" ] || [ -L "$PROFILE_ENV" ]; then
  printf '%s\n' 'OWNEST profile .env must be a regular, non-symlinked file.' >&2
  exit 78
fi
if [ "$(stat_owner "$PROFILE_ENV")" -ne "$(id -u)" ]; then
  printf '%s\n' 'OWNEST profile .env must be owned by the current user.' >&2
  exit 78
fi
profile_mode="$(stat_mode "$PROFILE_ENV")"
if [ $((8#$profile_mode & 8#077)) -ne 0 ]; then
  printf '%s\n' 'OWNEST profile .env must not be accessible by group or other users.' >&2
  exit 78
fi

profile_dir="$(cd "$(dirname "$PROFILE_ENV")" && pwd -P)"
candidate="$(mktemp "$profile_dir/.env.sanitize.XXXXXX")"
cleanup() { rm -f "$candidate"; }
trap cleanup EXIT

printf '%s\n' '# OWNEST runtime-only profile; sanitised by sanitize-ownest-profile-env.sh' > "$candidate"
kept=0
removed=0
openrouter_count=0
seen_keys=""

while IFS= read -r line || [ -n "$line" ]; do
  key="$(printf '%s\n' "$line" | sed -nE 's/^[[:space:]]*(export[[:space:]]+)?([A-Za-z_][A-Za-z0-9_]*)[[:space:]]*=.*/\2/p')"
  if [ -z "$key" ]; then
    continue
  fi
  if ! allowed_key "$key"; then
    removed=$((removed + 1))
    continue
  fi
  if printf '%s\n' "$seen_keys" | grep -Fqx "$key"; then
    printf '%s\n' 'Duplicate allowlisted variable found; profile was not changed.' >&2
    exit 78
  fi
  seen_keys="${seen_keys}${seen_keys:+$'\n'}${key}"
  value_part="${line#*=}"
  trimmed_value="$(printf '%s' "$value_part" | sed -E 's/^[[:space:]]*//; s/[[:space:]]*$//')"
  if [ "$key" = "OPENROUTER_API_KEY" ]; then
    openrouter_count=$((openrouter_count + 1))
    case "$trimmed_value" in
      '' | "''" | '""')
        printf '%s\n' 'OPENROUTER_API_KEY is empty; profile was not changed.' >&2
        exit 78
        ;;
    esac
  fi
  printf '%s=%s\n' "$key" "$value_part" >> "$candidate"
  kept=$((kept + 1))
done < "$PROFILE_ENV"

if [ "$openrouter_count" -ne 1 ]; then
  printf '%s\n' 'Exactly one non-empty OPENROUTER_API_KEY is required; profile was not changed.' >&2
  exit 78
fi

mkdir -p "$BACKUP_ROOT"
chmod 700 "$BACKUP_ROOT"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
backup_dir="$(mktemp -d "$BACKUP_ROOT/ownest-profile-env-$timestamp.XXXXXX")"
chmod 700 "$backup_dir"
backup_file="$backup_dir/profile.env"
cp -p "$PROFILE_ENV" "$backup_file"
chmod 600 "$backup_file"

chmod 600 "$candidate"
mv "$candidate" "$PROFILE_ENV"
trap - EXIT

printf 'OWNEST profile environment sanitised: kept=%s removed=%s\n' "$kept" "$removed"
printf 'Backup: %s\n' "$backup_file"
printf 'Rollback: cp -p %s %s\n' "$backup_file" "$PROFILE_ENV"
