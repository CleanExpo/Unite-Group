#!/usr/bin/env bash
# Idempotent Cloud Agent install for the Unite-Group monorepo.
# The product surface is apps/web (Next.js 16). Its package.json pins
# node >=24.14.1 <25 and pnpm@9.15.0, so we provision Node 24 via nvm and
# install apps/web dependencies against its frozen lockfile.
set -euo pipefail

NODE_VERSION="24.21.0"
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"

if [ -s "$NVM_DIR/nvm.sh" ]; then
  # shellcheck disable=SC1091
  . "$NVM_DIR/nvm.sh"
  nvm install "$NODE_VERSION" >/dev/null
  nvm alias default "$NODE_VERSION" >/dev/null
  export PATH="$NVM_DIR/versions/node/v$NODE_VERSION/bin:$PATH"
else
  echo "nvm not found at $NVM_DIR — falling back to system node ($(node --version 2>/dev/null || echo none))" >&2
fi

corepack enable >/dev/null 2>&1 || true

echo "Using node $(node --version) and pnpm $(corepack pnpm@9.15.0 --version)"

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT/apps/web"
corepack pnpm@9.15.0 install --frozen-lockfile
