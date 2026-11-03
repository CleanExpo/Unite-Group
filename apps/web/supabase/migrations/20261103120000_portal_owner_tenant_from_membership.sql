-- FOUNDER-GATED: NOT applied to any database. Apply only through a reviewed, approved branch, after
-- 20261102180000_portal_change_requests.sql (S3, UNI-3168) and 20261102190000_portal_entitlements.sql (S2, UNI-3167).
-- Proven on a throwaway Postgres only: scripts/portal-owner-db-proof.sh (supabase/tests/portal_s3_rls.sql and
-- supabase/tests/portal_owner_journey.sql).
--
-- Joins S3's row rules to the real portal owner (UNI-3174 / UNI-3168). public.portal_owner_tenant_slug() read
-- app_metadata.portal_tenant_slug, which nothing writes, so an owner who claimed a portal by invite could use
-- neither /portal/changes nor /portal/setup. It now returns the tenant of the caller's own portal_tenant_members row,
-- the row the invite redeem (portal_redeem_invite) writes, and only on a second-factor (aal2) session.
--   * Same name, arguments and return type, so every S3 policy and function that calls it is unchanged.
--   * An app_metadata claim alone no longer grants anything.
--   * One tenant per owner: the oldest membership (created_at, then tenant_slug), the same pick as the app
--     (apps/web/src/lib/portal/owner.ts), so the pages and the row rules never disagree.
--   * security invoker: it reads portal_tenant_members through that table's own row rule (user_id = auth.uid()).
-- Additive in effect: one `create or replace function`, no table touched.
-- Rollback (a reviewed forward migration): re-create the function from 20261102180000_portal_change_requests.sql.

create or replace function public.portal_owner_tenant_slug()
returns text
language sql stable set search_path = '' as $$
  select m.tenant_slug
  from public.portal_tenant_members m
  where public.portal_session_is_aal2()
    and m.user_id = (select auth.uid())
  order by m.created_at, m.tenant_slug
  limit 1
$$;
revoke all on function public.portal_owner_tenant_slug() from public, anon;
grant execute on function public.portal_owner_tenant_slug() to authenticated, service_role;
