-- Rollback for 20261104040000_portal_client_admission.sql. Restores every prior definition and grant.
-- NOT a migration (kept out of supabase/migrations so it is never auto-applied). Apply only through a
-- reviewed, approved branch, like any production change.
-- Withdrawing the forward migration while any portal client account exists re-opens the CRM to that
-- account: revoke the client's invites and delete their portal_tenant_members row FIRST, then WAIT at
-- least one access-token lifetime (Auth > JWT expiry, 3600s by default) before applying this file.
-- Deleting the membership stops NEW tokens; an access token already issued stays valid until it
-- expires, and with the gate gone it would read the CRM.
-- Proven by scripts/portal-client-admission-db-proof.sh: after this file, a full catalogue fingerprint
-- (policies, function bodies, EXECUTE matrix, table/view privilege matrix, triggers) equals the pre-migration one.
-- Its policy loop needs the applying role to own every public table (the forward migration checked
-- this at apply time); a table added later under another owner makes this file stop with
-- "must be owner", which is the safe failure. 20261104035900_document_rls_parity.sql is NOT undone:
-- production already had row security on for those two tables.
-- The file opens and commits one transaction itself (begin; ... commit;), so a failure at any step leaves
-- the forward migration fully in place rather than half withdrawn.

begin;

set local lock_timeout = '5s';

drop trigger if exists portal_change_request_notify_staff on public.portal_change_requests;
drop function if exists public.portal_notify_staff_change_request();

-- Hook bodies copied byte-for-byte from 20260620010000_auth_signup_allowlist.sql: production's
-- md5(prosrc) for both hooks equals that file's text (read-only catalogue query, 04/11/2026).
CREATE OR REPLACE FUNCTION public.before_user_created_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _email TEXT;
BEGIN
  _email := lower(trim(coalesce(event->'user'->>'email', '')));
  IF _email = '' OR NOT EXISTS (
    SELECT 1 FROM public.auth_allowlist WHERE email = _email
  ) THEN
    RAISE EXCEPTION 'This application is private. Email % is not authorised.', _email;
  END IF;
  RETURN event;
END;
$$;

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_email TEXT;
BEGIN
  SELECT email INTO _user_email
  FROM auth.users
  WHERE id = (event->>'user_id')::uuid;

  _user_email := lower(trim(coalesce(_user_email, '')));

  IF _user_email = '' OR NOT EXISTS (
    SELECT 1 FROM public.auth_allowlist WHERE email = _user_email
  ) THEN
    RETURN jsonb_build_object(
      'error', jsonb_build_object(
        'http_code', 403,
        'message', 'This application is private. Access denied.'
      )
    );
  END IF;

  RETURN event;
END;
$$;

-- Prior ACLs, read from production pg_proc.proacl on 04/11/2026:
--   hooks: anon, authenticated, service_role, supabase_auth_admin (no PUBLIC)
--   prune_integration_history: PUBLIC, anon, authenticated, service_role
--   set_app_tenant: authenticated, service_role (no PUBLIC)
-- The two maintenance functions exist only on production (no repo migration), so their grants are
-- restored only where they exist, mirroring the forward migration.
grant execute on function public.before_user_created_hook(jsonb) to anon, authenticated;
grant execute on function public.custom_access_token_hook(jsonb) to anon, authenticated;

do $$
begin
  if to_regprocedure('public.prune_integration_history()') is not null then
    grant execute on function public.prune_integration_history() to public, anon, authenticated;
  end if;
  if to_regprocedure('public.set_app_tenant(text)') is not null then
    grant execute on function public.set_app_tenant(text) to authenticated;
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
  loop
    execute format('drop policy if exists staff_only_gate on public.%I', r.relname);
  end loop;
end
$$;

-- Only the forward migration's own predicate. Production's older role-based is_staff() is not this
-- migration's and must survive a rollback, so it is never named here.
drop function if exists public.is_allowlisted_staff();

commit;
