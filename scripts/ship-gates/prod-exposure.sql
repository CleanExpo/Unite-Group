-- Ship gate: no anonymous access to privileged surfaces in production.
--
-- CONTRACT: every query below MUST return ZERO rows. Any row is a live exposure.
-- Run against production, not a branch — a merged fix is a hypothesis until the
-- live system says otherwise.
--
-- This gate was written BEFORE the fix and watched failing on the real defect
-- (2026-08-18, project lksfwktwtmyznckodsau). A gate never seen going red is
-- not a gate; it is an assertion. Observed red output is recorded beside each
-- query so a future green can be trusted.
--
-- Deliberately NOT included: `rls_enabled_no_policy`. RLS enabled with no policy
-- DENIES ALL by default — those tables are locked, not leaking. There are 89 of
-- them here, and reporting them as exposure would bury the real findings in
-- noise. If one of those tables should be readable, that is an availability bug,
-- not a breach, and belongs on a different board.

-- ── 1. Public tables with row-level security switched off ───────────────────
-- Anyone with the anon key can read and write these over PostgREST.
--
-- OBSERVED RED 2026-08-18, 2 rows:
--   founder_uid_conflict_resolution_20260810
--   founder_uid_migration_20260810
SELECT 'rls_disabled_in_public' AS rule,
       c.relname                AS target
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relrowsecurity = false
ORDER BY c.relname;

-- ── 2. SECURITY DEFINER functions callable by anon ─────────────────────────
-- A SECURITY DEFINER function runs as its OWNER. If anon can call it, anon runs
-- code with the owner's rights — privilege escalation, regardless of RLS.
--
-- OBSERVED RED 2026-08-18, 3 rows. Reading the ACLs rather than the names:
--   custom_access_token_hook    anon=X   mints JWT access-token claims
--   before_user_created_hook    anon=X   runs during user creation
--   prune_integration_history   =X       bare `=X` is PUBLIC, i.e. EVERYONE,
--                                        on a function whose job is DELETING
SELECT 'anon_executable_security_definer' AS rule,
       p.proname                          AS target,
       p.proacl::text                     AS acl
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.prosecdef = true
  AND (p.proacl::text LIKE '%anon=%' OR p.proacl::text LIKE '{=X%')
ORDER BY p.proname;

-- ── 3. SECURITY DEFINER functions callable by any logged-in user ───────────
-- Lower rank than anon, still an escalation: any authenticated account, however
-- it was created, gains the owner's rights.
--
-- OBSERVED RED 2026-08-18, 4 rows: before_user_created_hook,
-- custom_access_token_hook, get_my_org_ids, prune_integration_history
SELECT 'authenticated_executable_security_definer' AS rule,
       p.proname                                   AS target,
       p.proacl::text                              AS acl
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.prosecdef = true
  AND p.proacl::text LIKE '%authenticated=%'
ORDER BY p.proname;
