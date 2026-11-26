#!/usr/bin/env bash
# Prints the ledger-only `supabase migration repair` commands needed to reconcile the production
# migration history (UNI-2757). It PRINTS ONLY. It never runs a repair, never connects to a database.
#
# Usage:
#   supabase migration list --linked --workdir apps/web > /tmp/prod-ledger.txt
#   scripts/db/repair-plan.sh /tmp/prod-ledger.txt
#
# The plan comes from the live ledger you pass in, because the commands to run depend on what the
# ledger holds today. All the logic lives in migration-drift.mjs and migration-ledger-map.json.
set -euo pipefail

if [ "$#" -ne 1 ] || [ ! -s "$1" ]; then
  echo "usage: scripts/db/repair-plan.sh <ledger-file>   (from: supabase migration list --linked --workdir apps/web)" >&2
  echo "refusing to print a plan without a non-empty ledger file." >&2
  exit 2
fi

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec node "$here/migration-drift.mjs" --ledger "$1" --repair-plan
