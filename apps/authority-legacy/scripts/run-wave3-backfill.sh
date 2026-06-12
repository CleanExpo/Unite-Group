#!/bin/zsh
# Robust Wave 3 backfill launcher

# Extract keys cleanly (handles both quoted and unquoted values)
OPENAI_API_KEY=$(awk -F= '/^OPENAI_API_KEY=/ {gsub(/"/, "", $2); print $2}' .env.local)
SUPABASE_URL=$(awk -F= '/^NEXT_PUBLIC_SUPABASE_URL=/ {gsub(/"/, "", $2); print $2}' .env.local)
SUPABASE_SERVICE_ROLE_KEY=$(awk -F= '/^SUPABASE_SERVICE_ROLE_KEY=/ {gsub(/"/, "", $2); print $2}' .env.local)

export OPENAI_API_KEY SUPABASE_URL NEXT_PUBLIC_SUPABASE_URL="$SUPABASE_URL" SUPABASE_SERVICE_ROLE_KEY

echo "✅ Clean environment prepared for Wave 3"
echo "  OPENAI: ${#OPENAI_API_KEY} chars"
echo "  SUPABASE: $SUPABASE_URL"
echo "  SERVICE: ${#SUPABASE_SERVICE_ROLE_KEY} chars"

exec npx tsx scripts/run-wave3-backfill.ts "$@"
