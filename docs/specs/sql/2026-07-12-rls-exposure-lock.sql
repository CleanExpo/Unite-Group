-- ============================================================================
-- Unite-Group — RLS/PostgREST exposure lock (reverses the 2026-06-27 b5 deferral)
-- Generated 2026-07-12 from a read-only, live-verified audit of prod (lksfwktwtmyznckodsau).
-- FOUNDER-GATED. Paste into the Supabase SQL editor (prod) AFTER review; runs in a
-- transaction. Then align history:  supabase migration repair <version> --status applied --linked
-- DO NOT `supabase db push` (57 local-only vs 95 prod-only migration drift over the shared DB).
--
-- WHY (what changed since b5): 2026-06-27-b5-rls-remediation.sql found 331 "always-true"
-- policies on non-founder config/integration tables and DEFERRED them as "acceptable for a
-- single-founder app". That premise is now FALSE — the DB co-tenants 722 foreign-product
-- tables and auth.users holds 4 accounts (3 non-founder), and account issuance is open
-- (empire /api/auth/register was self-service). Live role-sim (rolled back) proves:
--   • anon (NO login) reads kill_switch_flags(15), rbac_permissions(22), feature_flags(15) via
--     public USING(tenant_id IS NULL ...) policies — leaks operational control + the authz model.
--   • ANY authenticated JWT reads wiki_pages(620), integration_onepassword_index(174),
--     integration_vercel_env_index(1165) via authenticated USING(true) — the map of where every
--     credential lives.
-- The founder crown-jewel tables (crm_contacts, credentials_vault [rls_forced], ai_memories) are
-- correctly founder_id=auth.uid()-scoped — DO NOT touch them.
--
-- Gates applied per table: (1) REVOKE grants from anon+authenticated (no-grant beats RLS in
-- PostgREST), AND (2) DROP the permissive policy. service_role (server) keeps full access.
-- ============================================================================

BEGIN;

-- ── Section 1: LOCK the confirmed sensitive exposed tables ───────────────────
-- Secret-index catalogs + internal wiki (were: authenticated USING(true)).
REVOKE ALL PRIVILEGES ON public.integration_onepassword_index FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON public.integration_vercel_env_index  FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON public.wiki_pages                    FROM anon, authenticated;
DROP POLICY IF EXISTS "authenticated_read"              ON public.integration_onepassword_index;
DROP POLICY IF EXISTS "authenticated_read"              ON public.integration_vercel_env_index;
DROP POLICY IF EXISTS "authenticated_read_wiki_pages"   ON public.wiki_pages;
DROP POLICY IF EXISTS "wiki_pages_read_authenticated"   ON public.wiki_pages;
-- (empire's wiki page now reads via the requireAdmin-gated /api/wiki server route, WS3 — no
--  browser read of wiki_pages remains, so this does not break the app.)

-- Operational control + authorization model (were: public USING(tenant_id IS NULL ...)).
REVOKE ALL PRIVILEGES ON public.kill_switch_flags FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON public.rbac_permissions  FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON public.feature_flags     FROM anon, authenticated;
DROP POLICY IF EXISTS "kill_switch_flags_read_all" ON public.kill_switch_flags;
DROP POLICY IF EXISTS "rbac_permissions_read_own"  ON public.rbac_permissions;
DROP POLICY IF EXISTS "feature_flags_read_all"     ON public.feature_flags;

-- ── Section 2: DURABILITY — revoke default privileges (the regression root cause) ──
-- pg_default_acl currently re-grants ALL privileges to anon+authenticated on EVERY new
-- public table/function/sequence for the owning roles, so a future table would re-open the
-- hole. Revoke the defaults so new objects inherit nothing.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres, supabase_admin IN SCHEMA public
  REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres, supabase_admin IN SCHEMA public
  REVOKE ALL ON FUNCTIONS FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres, supabase_admin IN SCHEMA public
  REVOKE ALL ON SEQUENCES FROM anon, authenticated;

COMMIT;

-- ── Verify (run after COMMIT; expect no rows / no anon-visible sensitive data) ──
--   -- grants gone:
--   select table_name, privilege_type, grantee from information_schema.role_table_grants
--   where table_schema='public' and grantee in ('anon','authenticated')
--     and table_name in ('wiki_pages','integration_onepassword_index','integration_vercel_env_index',
--                        'kill_switch_flags','rbac_permissions','feature_flags');   -- expect 0 rows
--   -- anon can no longer read (rolled back):
--   begin; set local role anon;
--     select count(*) from public.kill_switch_flags;  -- expect: permission denied / 0
--   rollback;

-- ============================================================================
-- Section 3 (REVIEW — do NOT run blind): lock the BROADER exposed set.
-- Live enumeration: ~1,330 public tables are anon-reachable and ~1,614 reachable by any
-- authenticated JWT via permissive policies. For a single-founder app the browser only
-- legitimately needs auth (session) + founder_id-scoped tables (own policies) + a tiny
-- intentionally-public set — so the durable posture is: REVOKE anon/authenticated on all
-- public tables EXCEPT (a) founder_id-scoped tables and (b) an explicit public allow-list,
-- and let service_role (server) serve everything else. Classify first:
--
--   select p.tablename,
--          bool_or(p.roles::text ~ 'anon') as anon_policy,
--          bool_or(p.roles::text ~ 'authenticated') as auth_policy,
--          exists(select 1 from information_schema.columns c
--                 where c.table_schema='public' and c.table_name=p.tablename
--                   and c.column_name='founder_id') as founder_scoped
--   from pg_policies p
--   where p.schemaname='public'
--     and (p.qual='true' or p.qual ilike '%tenant_id is null%' or p.qual ilike '%is_active%'
--          or p.with_check='true')
--     and p.roles::text !~ 'service_role'
--   group by p.tablename
--   order by founder_scoped, p.tablename;
--
-- Then, for each NON-founder-scoped, NON-allow-listed table T the founder confirms has no
-- legitimate browser reader, run (idempotent):
--   REVOKE ALL PRIVILEGES ON public.T FROM anon, authenticated;
--   DROP POLICY IF EXISTS "<permissive_policy_name>" ON public.T;
-- KEEP genuinely-public tables (e.g. public marketing pricing — confirm synthex_plans /
-- "Anyone can view active plans" is intended-public before locking it).
-- ============================================================================

-- ── DOWN (rollback) — restores the prior grants/policies if needed ───────────
-- Run only to revert Section 1+2:
--   BEGIN;
--   GRANT SELECT ON public.integration_onepassword_index, public.integration_vercel_env_index,
--        public.wiki_pages, public.kill_switch_flags, public.rbac_permissions, public.feature_flags
--        TO anon, authenticated;
--   CREATE POLICY "authenticated_read" ON public.integration_onepassword_index FOR SELECT TO authenticated USING (true);
--   CREATE POLICY "authenticated_read" ON public.integration_vercel_env_index  FOR SELECT TO authenticated USING (true);
--   CREATE POLICY "authenticated_read_wiki_pages" ON public.wiki_pages FOR SELECT TO authenticated USING (true);
--   CREATE POLICY "kill_switch_flags_read_all" ON public.kill_switch_flags FOR SELECT USING (tenant_id IS NULL OR tenant_id = auth.uid());
--   CREATE POLICY "rbac_permissions_read_own"  ON public.rbac_permissions  FOR SELECT USING (tenant_id = auth.uid() OR tenant_id IS NULL);
--   CREATE POLICY "feature_flags_read_all"     ON public.feature_flags     FOR SELECT USING (tenant_id IS NULL OR tenant_id = auth.uid());
--   ALTER DEFAULT PRIVILEGES FOR ROLE postgres, supabase_admin IN SCHEMA public GRANT SELECT ON TABLES TO anon, authenticated;
--   COMMIT;
