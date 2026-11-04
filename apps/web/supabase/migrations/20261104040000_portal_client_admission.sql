-- Portal client admission (BRII first client).
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
--      is unchanged.
--   3. The 10 security-definer views (all privileges, so no read or write-through) and 2
--      maintenance functions that bypass row security are withdrawn from anon/authenticated.
--      None is referenced by apps/web. The migration refuses to run if any public table has
--      row security switched off, because the gate would silently do nothing there.
--   4. Auth hooks also admit an email that holds an open, email-bound portal invite, and keep
--      admitting it once it is a portal tenant member. Unbound invites cannot create accounts.
--   5. Staff get a founder_notifications row whenever a portal change request is created or
--      changes status, so client requests land in the command centre instead of an unwatched table.
--
-- Rollback: supabase/manual-applies/2026-11-04_portal_client_admission_rollback.sql (restores every
-- prior definition). Revoke the client's invites and portal membership BEFORE rolling back.
-- Proof: scripts/portal-client-admission-db-proof.sh (throwaway Postgres; planted-defect controls).
-- Known limit: tables created AFTER this migration do not get the gate automatically. Any new
-- non-portal table must add `staff_only_gate` in its own migration (the proof script's
-- "every table gated" check shows the pattern).

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
-- Fail closed: a policy does nothing on a table whose row security is off, so refuse to run if
-- any public table (partitions included) has it off. Production had none on 04/11/2026.
do $$
declare
  v_open text;
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
end
$$;

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
      and c.relname not like 'portal\_%'
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

-- 3. Row-security bypasses withdrawn from client-reachable roles ------------------------------
-- ALL, not just SELECT: on production anon and authenticated hold every privilege (arwdDxtm) on
-- these views, and a simple view is auto-updatable, so a write through it would run with the
-- owner's rights and skip row security on the base table.
revoke all on
  public.circuit_ab_test_summary,
  public.container_status_view,
  public.dashboard_mode_analytics,
  public.metrics_attribution_health,
  public.metrics_rollup_latest,
  public.onboarding_analytics,
  public.rate_limit_analytics,
  public.recent_deployments_view,
  public.suburb_authority_substrate,
  public.xero_accounts_summary
from anon, authenticated;

revoke execute on function public.prune_integration_history() from public, anon, authenticated;
revoke execute on function public.set_app_tenant(text) from public, anon, authenticated;

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
