#!/bin/bash
# Client project loop database proof (20261119090000_portal_projects.sql) on a THROWAWAY Postgres 15 container. Never
# touches any real project: the container has no network, its data lives only inside it, and it is removed on exit.
#   scripts/portal-project-db-proof.sh all    the portal migrations plus the project migration, twice; the two-tenant
#                                             project proof; then planted defects that must each turn the proof red
# Needs docker and the postgres:15 image. Prints PORTAL_PROJECT_DB_PROOF_ALL_PASS and exits 0 only when every step held.
set -u
APP="$(cd "$(dirname "$0")/.." && pwd)"
M="$APP/supabase/migrations"
MIGS=(
  "$M/20261102180000_portal_change_requests.sql"
  "$M/20261102180100_portal_change_photos_bucket.sql"
  "$M/20261102180200_portal_connections.sql"
  "$M/20261102190000_portal_entitlements.sql"
  "$M/20261102190100_portal_invite_codes.sql"
  "$M/20261103120000_portal_owner_tenant_from_membership.sql"
  "$M/20261119090000_portal_projects.sql"
)
SUBJECT="$M/20261119090000_portal_projects.sql"
PROOF="$APP/supabase/tests/portal_projects_proof.sql"
IMAGE="${PORTAL_PROOF_IMAGE:-postgres:15}"
WORK="$(mktemp -d "${TMPDIR:-/tmp}/portal-project-proof.XXXXXX")"
CTR="portal-project-proof-$$-$RANDOM"
cleanup() { rc=$?; docker rm -f "$CTR" >/dev/null 2>&1; rm -rf "$WORK"; exit $rc; }
trap cleanup EXIT

[ "${1:-}" = all ] || { echo "usage: $0 all"; exit 2; }
for f in "${MIGS[@]}" "$PROOF"; do [ -f "$f" ] || { echo "FAIL  missing $f"; exit 1; }; done
docker run -d --rm --name "$CTR" --network none -e POSTGRES_HOST_AUTH_METHOD=trust "$IMAGE" >/dev/null \
  || { echo "FAIL  could not start $IMAGE"; exit 2; }
for _ in $(seq 1 60); do docker exec "$CTR" pg_isready -U postgres -q 2>/dev/null && break; sleep 1; done
for _ in $(seq 1 60); do
  docker exec "$CTR" psql -h localhost -U postgres -tAc 'select 1' >/dev/null 2>&1 && sleep 1 \
    && docker exec "$CTR" psql -h localhost -U postgres -tAc 'select 1' >/dev/null 2>&1 && break
  sleep 1
done
echo "throwaway postgres container $CTR ($IMAGE, no network)"

# Every call names -h localhost (the server inside the container itself), so a reader, and the estate's database
# write gate, can see at each call site that no other database is reached.
PSQL() { docker exec -i "$CTR" psql -h localhost -X -q -v ON_ERROR_STOP=1 -U postgres "$@"; }
ROLES_MADE=0
fresh_db() { # $1 = name; stubs the Supabase surface the migrations use: roles, auth, and a minimal storage
  PSQL -h localhost -d postgres -c "create database $1" >/dev/null || return 1
  if [ $ROLES_MADE -eq 0 ]; then
    PSQL -h localhost -d postgres -c "create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;" >/dev/null || return 1
    ROLES_MADE=1
  fi
  PSQL -h localhost -d "$1" >/dev/null <<'SQL'
create schema auth;
create table auth.users (id uuid primary key, email text);
create function auth.uid() returns uuid language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claim.sub', true), ''),
                  (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'))::uuid $$;
create function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
create schema storage;
create table storage.buckets (id text primary key, name text not null, public boolean not null default false,
  file_size_limit bigint, allowed_mime_types text[]);
create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets(id),
  name text not null);
alter table storage.objects enable row level security;
create function storage.foldername(name text) returns text[] language sql immutable as $$
  select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;
grant usage on schema public, auth, storage to anon, authenticated, service_role;
grant execute on function auth.uid(), auth.jwt(), storage.foldername(text) to anon, authenticated, service_role;
grant select on storage.buckets to authenticated, service_role;
grant select, insert on storage.objects to authenticated;
grant all on storage.objects to service_role;
SQL
}

FAILS=0
apply() { PSQL -h localhost -d "$1" < "$2" >/dev/null 2>"$WORK/apply.err" || { echo "FAIL  apply $(basename "$2") to $1"; cat "$WORK/apply.err"; FAILS=$((FAILS+1)); return 1; }; }
apply_all() { # $1 = db, $2 = subject migration to use (the real one or a mutant)
  local f
  for f in "${MIGS[@]}"; do
    [ "$f" = "$SUBJECT" ] && f="$2"
    apply "$1" "$f" || return 1
  done
}
proof_ok() { local out; out="$(PSQL -h localhost -d "$1" < "$PROOF" 2>&1)" && echo "$out" | grep -q PORTAL_PROJECT_PROOF_PASS; }

# 1. every migration applies, and re-applies, on a fresh database; then the proof on its own fresh database
fresh_db twice || exit 2
apply_all twice "$SUBJECT" && apply_all twice "$SUBJECT" && echo "PASS  seven portal migrations apply twice"
fresh_db proof || exit 2
apply_all proof "$SUBJECT"
if proof_ok proof; then echo "PASS  two-tenant client project proof"
else echo "FAIL  two-tenant client project proof"; PSQL -h localhost -d proof < "$PROOF" 2>&1 | grep -E 'ERROR|VALUE|ALLOWED|WRONG' | head -5; FAILS=$((FAILS+1)); fi

# 2. planted defects in the subject migration: each must turn the proof red (a check that cannot fail is no control)
mutant() { # label, sed expression applied to the subject migration
  local name="mut$RANDOM"
  sed -e "$2" "$SUBJECT" > "$WORK/mutant.sql"
  if cmp -s "$SUBJECT" "$WORK/mutant.sql"; then echo "FAIL  mutant did not change the migration: $1"; FAILS=$((FAILS+1)); return; fi
  fresh_db "$name" || { FAILS=$((FAILS+1)); return; }
  if ! apply_all "$name" "$WORK/mutant.sql"; then echo "FAIL  mutant did not apply (no verdict): $1"; FAILS=$((FAILS+1)); return; fi
  if proof_ok "$name"; then echo "FAIL  proof stayed green on mutant: $1"; FAILS=$((FAILS+1))
  else echo "RED-AS-EXPECTED  $1"; fi
}
mutant "client may act in any state" "s/if v_to is null then raise exception 'portal_wrong_status'; end if;/if v_to is null then v_to := 'client_accepted'; end if;/"
mutant "client may answer when the team asked nothing" "s/and v_waiting = 'client' and p_verdict = 'answer'/and p_verdict = 'answer'/"
mutant "client action leaves the item waiting on the client" "s/set state = v_to, waiting_on = 'unite', client_note = v_note/set state = v_to, client_note = v_note/"
mutant "owner select policy open to every tenant" "s/for select to authenticated using (tenant_slug = (select public.portal_owner_tenant_slug()))/for select to authenticated using (true)/"
mutant "verified states need no evidence" "s/or jsonb_array_length(evidence) > 0)/or true)/"
mutant "team may set client_accepted" "s/then p_to_state in ('awaiting_client_review', 'in_development', 'blocked')/then p_to_state in ('awaiting_client_review', 'client_accepted', 'in_development', 'blocked')/"
mutant "client accept grants release" "s/and p_verdict = 'accept' then 'client_accepted'/and p_verdict = 'accept' then 'approved_for_release'/"
mutant "original text may be rewritten" "s/raise exception 'portal_source_immutable'/return new/"
mutant "release approval without a named approver" "s/if p_to_state = 'approved_for_release' and v_note is null then raise exception 'portal_bad_input'; end if;//"
mutant "submit ignores aal / tenant" "s/if v_tenant is null or v_uid is null then raise exception 'portal_not_owner'; end if;/if v_uid is null then raise exception 'portal_not_owner'; end if;/"
mutant "client reads internal columns and events" "s/^grant select on table public.portal_projects to authenticated;/grant select on table public.portal_projects, public.portal_project_items, public.portal_project_item_events to authenticated;/"
mutant "production hold ignored by the database" "s/where i.id = p_item_id and p.production_hold) then/where i.id = p_item_id and false) then/"
mutant "release steps reuse the review evidence" "s/if p_to_state in ('deployed', 'production_verified', 'done') and p_evidence is null then/if false then/"
mutant "replay with different text accepted" "s/raise exception 'portal_idempotency_conflict'/return v_id/"
mutant "two items may share one task" "s/create unique index if not exists portal_project_items_cc_task_key/create index if not exists portal_project_items_cc_task_key/"

if [ $FAILS -eq 0 ]; then echo "PORTAL_PROJECT_DB_PROOF_ALL_PASS"; exit 0; fi
echo "PORTAL_PROJECT_DB_PROOF_FAILURES=$FAILS"; exit 1
