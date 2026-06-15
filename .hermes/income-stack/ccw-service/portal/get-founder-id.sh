#!/usr/bin/env bash
# One-shot helper: find the founder UUID in the prod Supabase project and print it.
# Pre-requisite: the shell that runs this has SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
# pointing at the PROD project (ref=lksfwktwtmyznckodsau).
# No writes. Read-only. Print-only.
#
# Usage:
#   ./get-founder-id.sh                  # uses env vars you set
#   ./get-founder-id.sh --from-env-local # loads .env.local automatically (strips Vercel quote-wraps)
#   ./get-founder-id.sh --check          # dry-run self-check, no listUsers call

set -euo pipefail

USE_ENV_LOCAL=false
CHECK_ONLY=false
for arg in "$@"; do
  case "$arg" in
    --from-env-local) USE_ENV_LOCAL=true ;;
    --check) CHECK_ONLY=true ;;
  esac
done

if [[ "$USE_ENV_LOCAL" == "true" ]]; then
  if [[ ! -f ~/Unite-Group/.env.local ]]; then
    echo "[x] ~/Unite-Group/.env.local not found." >&2
    exit 1
  fi
  # Vercel CLI's `vercel env pull` wraps values in double-quotes; strip them via awk
  # then source in the current shell so the vars persist.
  tmp_env=$(mktemp)
  awk -F= '
    /^(SUPABASE_URL|NEXT_PUBLIC_SUPABASE_URL|SUPABASE_SERVICE_ROLE_KEY|FOUNDER_USER_ID)="?/ {
      key=$1
      val=substr($0, length(key)+2)
      gsub(/^"/, "", val); gsub(/"$/, "", val)
      printf "%s=%s\n", key, val
    }
  ' ~/Unite-Group/.env.local > "$tmp_env"
  set -a
  # shellcheck disable=SC1090
  source "$tmp_env"
  set +a
  rm -f "$tmp_env"
  echo "[i] Loaded .env.local (quote-wrap stripped)"
fi

if [[ -z "${SUPABASE_URL:-}" && -n "${NEXT_PUBLIC_SUPABASE_URL:-}" ]]; then
  export SUPABASE_URL="$NEXT_PUBLIC_SUPABASE_URL"
fi
if [[ -z "${SUPABASE_URL:-}" || -z "${SUPABASE_SERVICE_ROLE_KEY:-}" ]]; then
  echo "[x] Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY first." >&2
  echo "    The vault's SUPABASE_URL points at zbryrmxmgfmslqzizsto.supabase.co which is NOT the prod project." >&2
  echo "    Prod ref is lksfwktwtmyznckodsau. The prod URL is in your Vercel env or your local .env.local." >&2
  echo "    Or run: $0 --from-env-local" >&2
  exit 1
fi

# Sanity: confirm the env points at the right project, not the vault's Pi-CEO project.
if [[ "$SUPABASE_URL" == *"zbryrmxmgfmslqzizsto.supabase.co"* ]]; then
  echo "[x] SUPABASE_URL is the Pi-CEO project (zbry), not the CRM (lksf). Aborting." >&2
  echo "    This is the bug we've been chasing. Fix .env.local or unset the vault and re-source." >&2
  exit 4
fi

# Show what we're using (with secrets masked).
echo "SUPABASE_URL:  $SUPABASE_URL"
KEY_LEN=${#SUPABASE_SERVICE_ROLE_KEY}
echo "service key:   ${SUPABASE_SERVICE_ROLE_KEY:0:8}...${SUPABASE_SERVICE_ROLE_KEY: -6}  (len $KEY_LEN)"

if [[ "$CHECK_ONLY" == "true" ]]; then
  echo "[i] --check set, not calling listUsers. Env looks usable."
  exit 0
fi

cd ~/Unite-Group
node -e "
import('@supabase/supabase-js').then(async ({ createClient }) => {
  const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await sb.auth.admin.listUsers({ page: 1, perPage: 10 });
  if (error) { console.error('listUsers error:', error.message); process.exit(2); }
  if (!data.users.length) { console.error('No users in auth. Wrong project?'); process.exit(3); }
  console.log(JSON.stringify(data.users.map(u => ({ id: u.id, email: u.email, last_sign_in: u.last_sign_in_at })), null, 2));
});
"
