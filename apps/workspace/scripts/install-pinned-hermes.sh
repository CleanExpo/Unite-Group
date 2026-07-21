#!/usr/bin/env bash
# Download and execute the canonical Nous Hermes installer only after verifying
# the exact immutable artifact, then attest the installed checkout commit.

set -euo pipefail

readonly NOUS_INSTALLER_COMMIT="7b5ba2054721dde998ed47fd4a0f031955278e99"
readonly NOUS_INSTALLER_SHA256="c2e4326c1660bd45f64321996eb15bda35e7a4649e32a310495a61972a2804c8"
readonly NOUS_INSTALLER_URL="https://raw.githubusercontent.com/NousResearch/hermes-agent/${NOUS_INSTALLER_COMMIT}/scripts/install.sh"
readonly SYSTEM_PATH="/usr/bin:/bin:/usr/sbin:/sbin"
export PATH="$SYSTEM_PATH"

fail() {
  printf 'Hermes installer: %s\n' "$1" >&2
  exit 1
}

sha256_file() {
  local file="$1"
  if [[ -x /usr/bin/shasum ]]; then
    /usr/bin/shasum -a 256 "$file" | /usr/bin/awk '{print $1}'
  elif [[ -x /usr/bin/sha256sum ]]; then
    /usr/bin/sha256sum "$file" | /usr/bin/awk '{print $1}'
  else
    fail 'shasum or sha256sum is required'
  fi
}

assert_existing_checkouts_clean() {
  local candidate status
  for candidate in "$HOME/.hermes/hermes-agent" /usr/local/lib/hermes-agent; do
    [[ -d "$candidate/.git" ]] || continue
    status="$(/usr/bin/git -C "$candidate" status --porcelain=v1 --untracked-files=all --ignore-submodules=none 2>/dev/null)" \
      || fail "cannot inspect existing checkout at $candidate"
    [[ -z "$status" ]] || fail "dirty existing checkout at $candidate"
  done
}

verify_installed_commit() {
  local candidate actual status
  ATTESTED_CHECKOUT=""
  for candidate in "$HOME/.hermes/hermes-agent" /usr/local/lib/hermes-agent; do
    [[ -d "$candidate/.git" ]] || continue
    actual="$(/usr/bin/git -C "$candidate" rev-parse HEAD 2>/dev/null || true)"
    [[ "$actual" == "$NOUS_INSTALLER_COMMIT" ]] || continue
    status="$(/usr/bin/git -C "$candidate" status --porcelain=v1 --untracked-files=all --ignore-submodules=none 2>/dev/null)" \
      || fail "cannot attest installed checkout at $candidate"
    [[ -z "$status" ]] || fail "installed checkout is dirty at $candidate"
    ATTESTED_CHECKOUT="$candidate"
    return 0
  done
  fail "installed checkout does not attest commit $NOUS_INSTALLER_COMMIT"
}

verify_installed_launcher() {
  local candidate launcher="" entrypoint expected_entrypoint actual_entrypoint
  local python_link python_real upstream_launcher expected_launcher actual_launcher
  entrypoint="$ATTESTED_CHECKOUT/venv/bin/hermes"
  [[ -f "$entrypoint" && ! -L "$entrypoint" && -x "$entrypoint" ]] \
    || fail 'attested Hermes entry point is not a regular executable'
  expected_entrypoint="$(printf '%s\n' \
    "#!$ATTESTED_CHECKOUT/venv/bin/python3" \
    '# -*- coding: utf-8 -*-' \
    'import sys' \
    'from hermes_cli.main import main' \
    'if __name__ == "__main__":' \
    '    if sys.argv[0].endswith("-script.pyw"):' \
    '        sys.argv[0] = sys.argv[0][:-11]' \
    '    elif sys.argv[0].endswith(".exe"):' \
    '        sys.argv[0] = sys.argv[0][:-4]' \
    '    sys.exit(main())')"
  actual_entrypoint="$(/bin/cat "$entrypoint")"
  [[ "$actual_entrypoint" == "$expected_entrypoint" ]] \
    || fail 'Hermes entry point does not match the expected console template'

  python_link="$ATTESTED_CHECKOUT/venv/bin/python3"
  python_real="$(/usr/bin/perl -MCwd=realpath -e 'print realpath($ARGV[0])' "$python_link" 2>/dev/null || true)"
  [[ -n "$python_real" && -f "$python_real" && ! -L "$python_real" && -x "$python_real" ]] \
    || fail 'Hermes Python interpreter does not resolve to a regular executable'
  case "$python_real" in
    "$HOME/.local/share/uv/python/"*|/usr/local/share/uv/python/*) ;;
    *) fail 'Hermes Python interpreter escaped the reviewed uv-managed roots' ;;
  esac
  /usr/bin/perl -e '
    @s = stat($ARGV[0]);
    exit 1 unless @s && $s[3] == 1 && $s[4] == $ARGV[1] && (($s[2] & 0022) == 0);
  ' "$python_real" "$(/usr/bin/id -u)" \
    || fail 'Hermes Python interpreter ownership, link count, or mode is unsafe'
  /usr/bin/env -i HOME="$HOME" PATH="$SYSTEM_PATH" "$python_real" -c \
    'import sys; raise SystemExit(0 if sys.version_info[:2] == (3, 11) else 1)' \
    || fail 'Hermes Python interpreter is not the reviewed Python 3.11 runtime'

  for candidate in "$HOME/.local/bin/hermes" /usr/local/bin/hermes; do
    if [[ -f "$candidate" && ! -L "$candidate" ]]; then
      launcher="$candidate"
      break
    fi
  done
  [[ -n "$launcher" ]] || fail 'installed Hermes launcher is missing or is a symlink'
  upstream_launcher="$(printf '%s\n' \
    '#!/usr/bin/env bash' \
    'unset PYTHONPATH' \
    'unset PYTHONHOME' \
    "exec \"$entrypoint\" \"\$@\"")"
  actual_launcher="$(/bin/cat "$launcher")"
  [[ "$actual_launcher" == "$upstream_launcher" ]] \
    || fail 'upstream Hermes launcher does not exactly match its pinned template'

  # Replace the PATH-resolved env/bash shebang with a fully absolute launcher.
  # The final user command cannot be redirected through ~/.local/bin/bash.
  expected_launcher="$(printf '%s\n' \
    '#!/bin/bash' \
    'unset PYTHONPATH' \
    'unset PYTHONHOME' \
    "exec \"$python_real\" \"$entrypoint\" \"\$@\"")"
  launcher_tmp="$(/usr/bin/mktemp "${launcher}.nexus.XXXXXX")"
  printf '%s\n' "$expected_launcher" > "$launcher_tmp"
  /bin/chmod 0755 "$launcher_tmp"
  /bin/mv "$launcher_tmp" "$launcher"
  launcher_tmp=""
  actual_launcher="$(/bin/cat "$launcher")"
  [[ "$actual_launcher" == "$expected_launcher" ]] \
    || fail 'final Hermes launcher does not exactly match the absolute template'
}

assert_existing_checkouts_clean

installer_tmp="$(/usr/bin/mktemp)"
launcher_tmp=""
trap '/bin/rm -f "${installer_tmp:-}" "${launcher_tmp:-}"' EXIT

if [[ "${NEXUS_HERMES_INSTALLER_TEST_TAMPER:-}" == "1" ]]; then
  # Deliberately fail-only test seam: it can never supply a passing payload.
  printf 'tampered installer fixture' > "$installer_tmp"
else
  /usr/bin/curl --proto '=https' --tlsv1.2 -fsSL "$NOUS_INSTALLER_URL" -o "$installer_tmp" \
    || fail 'download failed'
fi

actual_sha256="$(sha256_file "$installer_tmp")"
[[ "$actual_sha256" == "$NOUS_INSTALLER_SHA256" ]] \
  || fail 'integrity check failed; refusing to execute the downloaded file'

# The upstream installer receives only non-secret process context and the
# immutable checkout request. It cannot inherit provider, database, or CRM
# credentials from the calling shell.
/usr/bin/env -i \
  HOME="$HOME" \
  PATH="$SYSTEM_PATH" \
  USER="${USER:-operator}" \
  LOGNAME="${LOGNAME:-${USER:-operator}}" \
  SHELL="${SHELL:-/bin/bash}" \
  TERM="${TERM:-dumb}" \
  TMPDIR="${TMPDIR:-/tmp}" \
  LANG="${LANG:-C}" \
  /bin/bash "$installer_tmp" --commit "$NOUS_INSTALLER_COMMIT"

verify_installed_commit
verify_installed_launcher
