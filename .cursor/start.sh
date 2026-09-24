#!/usr/bin/env bash
# Per-boot init for the Unite-Group Cloud Agent environment.
#
# Ensures apps/web has an .env.local so the dev server boots. Real
# Supabase/integration credentials live on the Vercel/prod plane (see CLAUDE.md)
# and are intentionally NOT baked in here — add real values via the Cloud Agent
# Secrets panel, where they take precedence over these non-secret placeholders.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$REPO_ROOT/apps/web/.env.local"

if [ -f "$ENV_FILE" ]; then
  echo "$ENV_FILE already present — leaving it untouched."
  exit 0
fi

cat > "$ENV_FILE" <<'EOF'
# Auto-generated non-secret, valid-FORMAT placeholders so the dev server boots
# and the UI renders. Add real credentials via the Cloud Agent Secrets panel;
# process env set there takes precedence over these values.

# --- Supabase (valid format; not a live project) ---
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=local-dev-anon-key-placeholder-0000000000000000000000000000
SUPABASE_SERVICE_ROLE_KEY=local-dev-service-role-key-placeholder-00000000000000000000000000

# --- Required (feature-gating) ---
ANTHROPIC_API_KEY=sk-ant-local-dev-placeholder-0000000000000000000000000000
VAULT_ENCRYPTION_KEY=0000000000000000000000000000000000000000000000000000000000000000
CRON_SECRET=local-dev-cron-secret-placeholder
FOUNDER_USER_ID=00000000-0000-0000-0000-000000000000

# --- App URLs ---
NEXT_PUBLIC_APP_URL=http://localhost:3008
NEXT_PUBLIC_URL=http://localhost:3008
EOF

echo "Created $ENV_FILE with non-secret placeholders."
