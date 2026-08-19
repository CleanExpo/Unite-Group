#!/usr/bin/env bash
# Proves the load-bearing claim behind ship-board item 6 and FOUNDER-QUEUE F9:
#
#   Postgres checks function EXECUTE against the QUERYING role when it evaluates
#   an RLS policy expression. SECURITY DEFINER on the callee does NOT exempt it.
#
# Consequence: revoking `authenticated` EXECUTE on get_my_org_ids() makes every
# authenticated read of an org-membership-scoped table fail outright. That is why
# 2026-08-19-privileged-function-exposure-lock.sql deliberately RETAINS
# `authenticated` on that one function, and why the exposure gate cannot exit 0
# while its query 3 flags any definer executable by `authenticated`.
#
# Usage: scripts/ship-gates/prove-rls-execute-coupling.sh "<postgres-uri>"
#
# Exits 0 only if BOTH halves are observed:
#   - before the revoke, the authenticated read returns exactly 1 row
#   - after the revoke, the same read fails with "permission denied for function"
#
# Everything runs inside one transaction and is ROLLBACK'd; nothing persists.

set -euo pipefail

URI="${1:-}"
if [[ -z "$URI" ]]; then
  echo "usage: $0 \"<postgres-uri>\"" >&2
  exit 2
fi

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SQL="$HERE/prove-rls-execute-coupling.sql"

if [[ ! -f "$SQL" ]]; then
  echo "FAIL: missing $SQL" >&2
  exit 2
fi

OUT="$(psql "$URI" -v ON_ERROR_STOP=0 -f "$SQL" 2>&1)" || true

fail() {
  echo "FAIL  prove-rls-execute-coupling: $1"
  echo "── psql output ──"
  echo "$OUT"
  exit 1
}

# Half 1 — the read works while EXECUTE is held. If this does not appear, the
# harness never established the baseline and the second half proves nothing.
grep -q 'BEFORE_REVOKE_ROWS=1' <<<"$OUT" \
  || fail "baseline missing: expected BEFORE_REVOKE_ROWS=1 (the authenticated read must succeed BEFORE the revoke, or this proves nothing)"

# Half 2 — the same read breaks once EXECUTE is revoked, naming the function.
grep -q 'permission denied for function get_my_org_ids' <<<"$OUT" \
  || fail "claim NOT reproduced: expected 'permission denied for function get_my_org_ids' after the revoke"

# The transaction must have rolled back — this script may never leave state.
grep -q 'ROLLBACK' <<<"$OUT" \
  || fail "transaction did not roll back; refusing to report success"

echo "PASS  prove-rls-execute-coupling"
echo "  before revoke: authenticated read returned 1 row"
echo "  after  revoke: permission denied for function get_my_org_ids"
echo "  transaction rolled back; no state persisted"
