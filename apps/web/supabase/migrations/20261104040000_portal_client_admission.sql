-- Portal client admission (BRII first client). UNI-3247.
--
-- Why: the CRM was built single-operator. About 760 row-level policies across ~690 public tables
-- grant access to ANY logged-in account (`true`, `auth.role() = 'authenticated'`,
-- `auth.uid() IS NOT NULL`). That was safe only because the auth hooks let three staff emails
-- sign in. Admitting a portal client without this migration would let that client read (and on
-- some tables write) the whole CRM through the database API with their own login.
--
-- What this does, in order:
--   1. public.is_staff(): true when the caller's JWT email is on public.auth_allowlist.
--   2. One RESTRICTIVE policy `staff_only_gate` on every public table except portal_*:
--      logged-in non-staff see and change nothing outside the portal. Anon and service_role are
--      untouched (the policy targets the authenticated role only), and staff are unaffected
--      because is_staff() is true for them. Behaviour for every account that can sign in TODAY
--      is unchanged. Views on production all run with the caller's rights (security_invoker=on,
--      measured 04/11/2026), so the gate covers them too.
--      Fails closed: refuses to run if any public table has row security off or is not owned by
--      the applying role (production: 0 and 0 on 04/11/2026), because the gate would be missing there.
--   3. Two maintenance functions that run with owner rights (prune_integration_history deletes
--      rows; set_app_tenant sets a tenant setting) are withdrawn from anon/authenticated. Neither
--      is referenced by apps/web. They exist on production but in no repo migration, so the revoke
--      is skipped (with a notice) where they are absent, e.g. on a branch built from migrations.
--   4. Auth hooks also admit an email that holds an open, email-bound portal invite, and keep
--      admitting it once it is a portal tenant member. Unbound invites cannot create accounts.
--   5. Staff get a founder_notifications row whenever a portal change request is created or
--      changes status, so client requests land in the command centre instead of an unwatched table.
--      Deliberately coupled: if that insert ever fails, the client's submission fails loudly
--      rather than landing unseen.
--
-- Offboarding a client: delete their portal_tenant_members row (and revoke any open invite). The
-- token hook then refuses them at the next token refresh. Revoking a REDEEMED invite does nothing.
-- Rollback: supabase/manual-applies/2026-11-04_portal_client_admission_rollback.sql (restores every
-- prior definition). Offboard every portal client BEFORE rolling back.
-- Proof: scripts/portal-client-admission-db-proof.sh (throwaway Postgres; planted-defect controls;
-- a 1,800-table run at production's lock settings).
-- Apply in a quiet moment: CREATE POLICY takes a brief exclusive lock on each of ~1,800 tables in one
-- transaction. lock_timeout below makes it fail fast instead of stalling; it is safe to re-run.
-- Known limit: tables, views and SECURITY DEFINER functions created AFTER this migration are not
-- checked automatically. Any new non-portal table must add `staff_only_gate` in its own migration
-- (the proof script's "every table gated" check shows the pattern); any new view must be
-- security_invoker; any new definer function callable by authenticated must check its caller.
-- Needs 20261104035900_document_rls_parity.sql first on a branch replayed from migrations.

set lock_timeout = '5s';

-- 0. Fail-closed guards (run first, so a refusal changes nothing in any apply mode) -----------
-- Fail closed: a policy does nothing on a table whose row security is off, and cannot be created on
-- a table the applying role does not own, so refuse to run if any public table (partitions
-- included) is either. Production had none of either on 04/11/2026.
do $$
declare
  v_open text;
  v_foreign text;
  v_owner_views text;
begin
  select string_agg(c.relname, ', ' order by c.relname) into v_open
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind in ('r', 'p')
    and not c.relrowsecurity;
  if v_open is not null then
    raise exception 'portal_client_admission: row security is off on public table(s): %. Enable it first.', v_open;
  end if;
  select string_agg(c.relname, ', ' order by c.relname) into v_foreign
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind in ('r', 'p')
    and c.relname !~ '^portal_'
    and pg_get_userbyid(c.relowner) <> current_user;
  if v_foreign is not null then
    raise exception 'portal_client_admission: public table(s) not owned by %: %. Gate them by hand first.', current_user, v_foreign;
  end if;
  -- A view that runs with its owner's rights would read past the gate. Production's 10 views are
  -- all security_invoker=on and its 2 materialised views are not readable by anon/authenticated.
  select string_agg(c.relname, ', ' order by c.relname) into v_owner_views
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind in ('v', 'm')
    and (has_table_privilege('authenticated', c.oid, 'select') or has_table_privilege('anon', c.oid, 'select'))
    and not (c.relkind = 'v' and coalesce(c.reloptions::text[] && array['security_invoker=on', 'security_invoker=true', 'security_invoker=1'], false));
  if v_owner_views is not null then
    raise exception 'portal_client_admission: view(s) readable by API roles run with owner rights: %. Set security_invoker or revoke first.', v_owner_views;
  end if;
end
$$;

-- 1. Staff predicate -------------------------------------------------------------------------
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.auth_allowlist a
    where a.email = lower(trim(coalesce(auth.jwt() ->> 'email', '')))
  );
$$;

revoke all on function public.is_staff() from public, anon;
grant execute on function public.is_staff() to authenticated, service_role;

-- 2. Restrictive staff gate on every non-portal public table ----------------------------------
do $$
declare
  r record;
begin
  for r in
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind in ('r', 'p')
      and c.relname !~ '^portal_'
  loop
    execute format('drop policy if exists staff_only_gate on public.%I', r.relname);
    execute format(
      'create policy staff_only_gate on public.%I as restrictive for all to authenticated '
      -- (select …) lets Postgres evaluate is_staff() once per statement, not once per row.
      'using ((select public.is_staff())) with check ((select public.is_staff()))',
      r.relname
    );
  end loop;
end
$$;

-- 3. Owner-rights maintenance functions withdrawn from client-reachable roles ----------------
do $$
declare
  f text;
begin
  foreach f in array array['public.prune_integration_history()', 'public.set_app_tenant(text)'] loop
    if to_regprocedure(f) is null then
      raise notice 'portal_client_admission: % absent here, revoke skipped', f;
    else
      execute format('revoke execute on function %s from public, anon, authenticated', f);
    end if;
  end loop;
end
$$;

-- 4. Auth hooks admit invited portal clients -------------------------------------------------
create or replace function public.before_user_created_hook(event jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
declare
  _email text;
begin
  _email := lower(trim(coalesce(event->'user'->>'email', '')));
  if _email = '' or not (
    exists (select 1 from public.auth_allowlist where email = _email)
    or exists (
      select 1
      from public.portal_invite_codes c
      where lower(trim(c.bound_email)) = _email
        and c.revoked_at is null
        and c.expires_at > now()
        and not exists (select 1 from public.portal_invite_redemptions r where r.code_id = c.id)
    )
  ) then
    raise exception 'This application is private. Email % is not authorised.', _email;
  end if;
  return event;
end;
$function$;

create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
declare
  _user_id uuid;
  _user_email text;
begin
  _user_id := (event->>'user_id')::uuid;

  select email into _user_email
  from auth.users
  where id = _user_id;

  _user_email := lower(trim(coalesce(_user_email, '')));

  if _user_email = '' or not (
    exists (select 1 from public.auth_allowlist where email = _user_email)
    or exists (select 1 from public.portal_tenant_members m where m.user_id = _user_id)
    or exists (
      select 1
      from public.portal_invite_codes c
      where lower(trim(c.bound_email)) = _user_email
        and c.revoked_at is null
        and c.expires_at > now()
        and not exists (select 1 from public.portal_invite_redemptions r where r.code_id = c.id)
    )
  ) then
    return jsonb_build_object(
      'error', jsonb_build_object(
        'http_code', 403,
        'message', 'This application is private. Access denied.'
      )
    );
  end if;

  return event;
end;
$function$;

revoke execute on function public.before_user_created_hook(jsonb) from public, anon, authenticated;
revoke execute on function public.custom_access_token_hook(jsonb) from public, anon, authenticated;
grant execute on function public.before_user_created_hook(jsonb) to supabase_auth_admin;
grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;

-- 5. Staff notification for client change requests -------------------------------------------
create or replace function public.portal_notify_staff_change_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and new.status is not distinct from old.status then
    return new;
  end if;

  insert into public.founder_notifications (founder_id, type, payload)
  select
    u.id,
    'portal_change_request',
    jsonb_build_object(
      'request_id', new.id,
      'tenant_slug', new.tenant_slug,
      'page', new.page,
      'status', new.status,
      'event', lower(tg_op),
      'request_text', left(new.request_text, 500)
    )
  from auth.users u
  join public.auth_allowlist a on a.email = lower(u.email);

  return new;
end;
$$;

revoke all on function public.portal_notify_staff_change_request() from public, anon, authenticated;

drop trigger if exists portal_change_request_notify_staff on public.portal_change_requests;
create trigger portal_change_request_notify_staff
  after insert or update of status on public.portal_change_requests
  for each row
  execute function public.portal_notify_staff_change_request();

reset lock_timeout;
