#!/usr/bin/env bash
# Hermes Workspace — verified installer
#
# Usage:
#   git clone https://github.com/outsourc-e/hermes-workspace.git
#   bash hermes-workspace/install.sh
#
# What it does:
#   1. Verifies Node >=24.14.1 <25, git, pnpm
#   2. Installs hermes-agent via Nous's official upstream installer
#   3. Clones hermes-workspace
#   4. Sets up .env, enables the Hermes API server, installs deps,
#      and links bundled skills
#
# Re-runnable. Will skip anything already installed.

set -euo pipefail

SCRIPT_PATH="$(/usr/bin/perl -MCwd=realpath -e 'print realpath($ARGV[0])' "${BASH_SOURCE[0]}")"
SCRIPT_DIR="${SCRIPT_PATH%/*}"
PINNED_HELPER="$SCRIPT_DIR/scripts/install-pinned-hermes.sh"
PINNED_HELPER_REAL="$(/usr/bin/perl -MCwd=realpath -e 'print realpath($ARGV[0])' "$PINNED_HELPER" 2>/dev/null || true)"
if [[ -z "$PINNED_HELPER_REAL" || "$PINNED_HELPER_REAL" != "$PINNED_HELPER" || ! -f "$PINNED_HELPER" ]]; then
  printf 'Trusted pinned Hermes installer helper could not be resolved.\n' >&2
  exit 1
fi
REPO_URL="${REPO_URL:-https://github.com/outsourc-e/hermes-workspace.git}"
INSTALL_DIR="${INSTALL_DIR:-$HOME/hermes-workspace}"
GATEWAY_PORT="${GATEWAY_PORT:-8642}"
REQUIRED_NODE_RANGE=">=24.14.1 <25"
PNPM_VERSION="9.15.0"

# ─── helpers ──────────────────────────────────────────────────────────────

cyan()   { printf "\033[36m%s\033[0m\n" "$*"; }
green()  { printf "\033[32m%s\033[0m\n" "$*"; }
yellow() { printf "\033[33m%s\033[0m\n" "$*"; }
red()    { printf "\033[31m%s\033[0m\n" "$*"; }
bold()   { printf "\033[1m%s\033[0m\n" "$*"; }

need() { command -v "$1" &>/dev/null || { red "Missing: $1"; red "$2"; exit 1; }; }

check_node_range() {
  node -e '
    const [major, minor, patch] = process.versions.node.split(".").map(Number)
    if (major !== 24 || minor < 14 || (minor === 14 && patch < 1)) process.exit(1)
  '
}

ensure_pnpm() {
  local installed=""
  if command -v pnpm &>/dev/null; then
    installed="$(pnpm --version 2>/dev/null || true)"
  fi
  [[ "$installed" == "$PNPM_VERSION" ]] && return 0

  if command -v corepack &>/dev/null; then
    corepack enable >/dev/null 2>&1 || true
    corepack prepare "pnpm@$PNPM_VERSION" --activate >/dev/null
    hash -r
    installed="$(pnpm --version 2>/dev/null || true)"
    [[ "$installed" == "$PNPM_VERSION" ]] && return 0
  fi

  need npm "Install npm with Node $REQUIRED_NODE_RANGE: https://nodejs.org/"
  npm install -g "pnpm@$PNPM_VERSION"
  hash -r
  [[ "$(pnpm --version 2>/dev/null || true)" == "$PNPM_VERSION" ]]
}

banner() {
  cat <<'EOF'

   ╭────────────────────────────────────────────╮
   │  HERMES WORKSPACE — zero-fork installer   │
   │  outsourc-e/hermes-workspace               │
   ╰────────────────────────────────────────────╯

EOF
}

ensure_env_key() {
  local file="$1"
  local key="$2"
  local value="$3"
  local tmp

  mkdir -p "$(dirname "$file")"
  tmp="$(mktemp)"

  if [[ -f "$file" ]]; then
    awk -v key="$key" -v value="$value" '
      BEGIN { found = 0 }
      index($0, key "=") == 1 {
        print key "=" value
        found = 1
        next
      }
      { print }
      END {
        if (!found) {
          if (NR > 0) print ""
          print key "=" value
        }
      }
    ' "$file" > "$tmp"
  else
    printf '%s=%s\n' "$key" "$value" > "$tmp"
  fi

  mv "$tmp" "$file"
}

# ─── preflight ────────────────────────────────────────────────────────────

banner
cyan "→ Checking prerequisites…"

need node "Install Node $REQUIRED_NODE_RANGE: https://nodejs.org/"
if ! check_node_range; then
  red "Node $(node -v) detected; need $REQUIRED_NODE_RANGE."
  exit 1
fi
green "  Node $(node -v) ✓"

need git "Install git: https://git-scm.com/"
green "  git $(git --version | awk '{print $3}') ✓"

need curl "Install curl (usually: apt install curl / brew install curl)"
green "  curl ✓"

if ! ensure_pnpm; then
  red "Unable to activate pnpm $PNPM_VERSION."
  exit 1
fi
green "  pnpm $(pnpm --version) ✓ (pinned)"

# ─── install hermes-agent (delegate to Nous upstream installer) ──────────
# hermes-agent is NOT on PyPI. It installs from source via Nous's own
# script, which handles PEP 668, uv, Python toolchain, Termux, etc. We
# only need to ensure `hermes` ends up on PATH before continuing.

cyan "→ Installing hermes-agent (via Nous upstream installer)…"
if ! /bin/bash "$PINNED_HELPER"; then
  red "  Verified Nous installer failed. See its output above for details."
  exit 1
fi
# Correlate the command this script will use with the exact regular launcher
# attested by install-pinned-hermes.sh; never accept an earlier PATH alias.
if [[ -f "$HOME/.local/bin/hermes" && ! -L "$HOME/.local/bin/hermes" ]]; then
  EXPECTED_HERMES_LAUNCHER="$HOME/.local/bin/hermes"
elif [[ -f /usr/local/bin/hermes && ! -L /usr/local/bin/hermes ]]; then
  EXPECTED_HERMES_LAUNCHER="/usr/local/bin/hermes"
else
  red "  Attested Hermes launcher is unavailable."
  exit 1
fi
export PATH="${EXPECTED_HERMES_LAUNCHER%/*}:$PATH"
hash -r
resolved_hermes="$(command -v hermes 2>/dev/null || true)"
if [[ "$resolved_hermes" != "$EXPECTED_HERMES_LAUNCHER" ]]; then
  red "  Hermes command does not match the attested launcher."
  exit 1
fi
green "  hermes-agent installed and commit-attested ✓ ($resolved_hermes)"

# ─── clone workspace ──────────────────────────────────────────────────────

cyan "→ Cloning hermes-workspace…"
if [[ -d "$INSTALL_DIR/.git" ]]; then
  yellow "  $INSTALL_DIR exists; pulling latest"
  git -C "$INSTALL_DIR" pull --ff-only
elif [[ -e "$INSTALL_DIR" ]]; then
  red "Path exists but is not a git repo: $INSTALL_DIR"
  red "Move/remove it or set INSTALL_DIR=..."
  exit 1
else
  git clone "$REPO_URL" "$INSTALL_DIR"
fi
cd "$INSTALL_DIR"
green "  Workspace ready at $INSTALL_DIR ✓"

# ─── env + install ────────────────────────────────────────────────────────

cyan "→ Configuring .env…"
if [[ ! -f .env ]]; then
  cp .env.example .env
fi
ensure_env_key "$INSTALL_DIR/.env" "HERMES_API_URL" "http://127.0.0.1:${GATEWAY_PORT}"
green "  .env ready ✓"

cyan "→ Enabling Hermes API server…"
# The pinned helper installs with the canonical user-scoped HERMES_HOME. Avoid
# executing even the attested CLI during installation; write only its canonical
# environment file and leave runtime execution to the operator.
HERMES_ENV_PATH="$HOME/.hermes/.env"
ensure_env_key "$HERMES_ENV_PATH" "API_SERVER_ENABLED" "true"
green "  Hermes env updated: $HERMES_ENV_PATH ✓"

# Guard against a common foot-gun: users editing ~/.hermes/.env by hand and
# writing env var names without underscores (APISERVERENABLED vs
# API_SERVER_ENABLED). The gateway reads exact names — typos are silently
# ignored, which produces a "gateway starts but API server never binds"
# failure that's hard to diagnose from the UI.
if [[ -f "$HERMES_ENV_PATH" ]]; then
  SUSPICIOUS_KEYS=$(grep -E "^(API[A-Z]+|HERMES[A-Z]+)=" "$HERMES_ENV_PATH" 2>/dev/null \
    | grep -vE "^(API_|HERMES_)" | cut -d= -f1 || true)
  if [[ -n "$SUSPICIOUS_KEYS" ]]; then
    yellow ""
    yellow "⚠  Found env var names missing underscores in $HERMES_ENV_PATH:"
    printf '%s\n' "$SUSPICIOUS_KEYS" | sed 's/^/      /'
    yellow "   The gateway reads names with underscores (API_SERVER_ENABLED,"
    yellow "   not APISERVERENABLED). These lines will be silently ignored."
    yellow "   Fix them and run: hermes gateway run --replace"
    yellow ""
  fi
fi

cyan "→ Installing npm deps (pnpm install --frozen-lockfile)…"
pnpm install --frozen-lockfile --silent
green "  deps installed ✓"

# ─── seed Hermes skills (Conductor needs workspace-dispatch) ─────────────

cyan "→ Linking bundled skills into ~/.hermes/skills…"
HERMES_SKILLS_DIR="$HOME/.hermes/skills"
mkdir -p "$HERMES_SKILLS_DIR"
if [[ -d "$INSTALL_DIR/skills" ]]; then
  for skill_path in "$INSTALL_DIR/skills"/*/; do
    skill_name=$(basename "$skill_path")
    target="$HERMES_SKILLS_DIR/$skill_name"
    if [[ -e "$target" || -L "$target" ]]; then
      continue
    fi
    ln -sf "$skill_path" "$target" 2>/dev/null && \
      green "  linked $skill_name ✓" || true
  done
fi

# ─── done ─────────────────────────────────────────────────────────────────

bold ""
bold "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
green "  Install complete!"
bold "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
cat <<EOF

Next steps (two terminals):

  1) Start the Hermes Agent gateway:
       hermes gateway run
     (first run may prompt for hermes setup)

  2) Start the workspace UI:
       cd $INSTALL_DIR && pnpm dev

  3) Open http://localhost:3000

If the gateway was already running before this install,
restart it so API_SERVER_ENABLED=true takes effect.

EOF

cyan "Happy building. 🚀"
