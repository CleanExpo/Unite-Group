-- ============================================================================
-- Unite-Group Nexus — B5 RLS remediation (operating-readiness gate)
-- Generated 2026-06-27 from a read-only audit of prod (lksfwktwtmyznckodsau).
-- Paste into the Supabase SQL editor (prod) after review. Run inside a transaction.
--
-- AUDIT SUMMARY (what was actually found — most "findings" were noise):
--   • 0 tables with RLS disabled (1747 enabled) → NO unprotected tables. B5 P0 is clean.
--   • 340 "always-true" policies exist, but:
--       - 17/18 on founder-scoped tables are service_role ALL USING(true) — CORRECT
--         (service_role bypasses RLS; explicit policy is the standard pattern). DO NOT change.
--       - 331 are on non-founder (global/config/integration) tables. This is a
--         single-founder app (one authenticated user), so authenticated-read of
--         global/config data is acceptable; lock to service_role only if a table
--         later holds multi-tenant data. Review query in Section 2 — no blind fix.
--   • operator_jobs / operator_events ALREADY EXIST in prod (B3 done — nothing to add).
--   • 214 functions lack a set search_path, but 0 are SECURITY DEFINER → low risk; skipped.
--
-- The ONE genuine founder-isolation bug is fixed in Section 1.
-- ============================================================================

BEGIN;

-- ── Section 1: REQUIRED FIX — businesses authenticated read-all ──────────────
-- `businesses` (a founder_id-scoped table) has a redundant permissive policy
-- "Authenticated read businesses" = SELECT TO authenticated USING (true).
-- Because RLS policies are OR'd, this overrides the correct founder-scoped
-- "businesses_select" (USING founder_id = auth.uid()) and lets ANY authenticated
-- user read ALL businesses. The correct founder-scoped SELECT already exists,
-- so dropping the always-true policy tightens access without locking out the
-- founder. Verified: businesses_select (public, founder_id = auth.uid()) remains.
DROP POLICY IF EXISTS "Authenticated read businesses" ON public.businesses;

COMMIT;

-- After running, confirm the fix (should show only founder-scoped + service_role SELECT):
--   select policyname, cmd, roles::text, qual
--   from pg_policies where schemaname='public' and tablename='businesses' and cmd='SELECT';


-- ============================================================================
-- Section 2 (OPTIONAL — REVIEW, do not run blind): classify non-founder
-- always-true policies that target authenticated/public. For each, decide:
--   keep (intended global/config read)  OR  restrict to service_role.
-- This is a single-founder app today, so most are acceptable; revisit before
-- onboarding any second user / multi-tenant data.
-- ============================================================================
-- select p.tablename, p.policyname, p.cmd, p.roles::text as roles
-- from pg_policies p
-- where p.schemaname='public'
--   and ( p.with_check='true' or (p.qual='true' and p.cmd in ('SELECT','ALL')) )
--   and not (p.roles::text = '{service_role}')
--   and not exists (select 1 from information_schema.columns c
--                   where c.table_schema='public' and c.table_name=p.tablename
--                     and c.column_name='founder_id')
-- order by p.tablename, p.cmd;
--
-- Template to restrict one such table to service_role only (example):
--   -- DROP POLICY "<authenticated_always_true_policy>" ON public.<table>;
--   -- (a service_role ALL policy, if present, already covers server-side access)
