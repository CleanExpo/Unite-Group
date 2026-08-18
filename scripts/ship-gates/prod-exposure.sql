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
-- CORRECTION 2026-08-18, after independent review raised a P0 on queries 2 and 3:
-- those two originally matched proacl with a LIKE on its text form, which
-- under-reports (see the note above query 2). Every definer count taken before
-- this correction — Unite-Group 3 and 4, Synthex 179, Phills CRM 2 — is a FLOOR,
-- not a total. Re-run this gate to get the real number before treating any of
-- them as scoped.
--
-- The same defect voids RestoreAssist's 0 rows as a positive control for
-- queries 2 and 3: an under-reporting predicate returns 0 whether the surface is
-- clean or merely unmatched. Query 1 is unaffected — relrowsecurity is a
-- boolean with no ACL involved — so the RLS counts (97, 2) stand as taken.
--
-- The correction itself was proven, not reasoned: a SECURITY DEFINER function
-- with an untouched (NULL) proacl was planted in a scratch database, the old
-- predicate returned 0 rows against it and the new predicate returned 1.
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
--
-- proacl is matched with aclexplode, NOT a LIKE on its text form. A text match
-- under-reports three ways, and an under-reporting security gate manufactures
-- assurance, which is worse than no gate at all:
--   * proacl IS NULL means DEFAULT privileges, and the default for a function
--     is EXECUTE TO PUBLIC. A definer nobody has ever run GRANT/REVOKE against
--     is public-executable and a LIKE drops it, because NULL LIKE '...' is NULL.
--     That is precisely the set of functions nobody has thought about.
--   * `LIKE '{=X%'` anchors the PUBLIC grant to the START of the aclitem[]
--     array, so `{postgres=X/postgres,=X/postgres}` is missed.
--   * `LIKE '%anon=%'` also matches a role merely NAMED like anon.
-- acldefault('f', proowner) materialises the implicit default; grantee = 0 is
-- PUBLIC. Demonstrated against Postgres 17: the old predicate returns false for
-- both a NULL acl and a non-leading PUBLIC grant, and the new one returns true
-- for both while still returning false for an owner-only grant.
--
-- The role arm compares the grantee's RENDERED NAME, not to_regrole('anon')::oid.
-- to_regrole returns NULL for a role that does not exist, and `grantee = NULL`
-- is NULL rather than false, so an oid comparison silently deletes its own arm
-- on any database lacking the role — reintroducing the exact silent-false-
-- negative class this query was rewritten to remove. Raised as P1 by the second
-- review round and confirmed on Postgres 17: to_regrole on a missing role IS
-- NULL, and the comparison against it IS NULL. grantee::regrole::text renders
-- PUBLIC as '-' and a real role as its name, so it cannot be NULL-swallowed.
SELECT 'anon_executable_security_definer' AS rule,
       p.proname                          AS target,
       COALESCE(p.proacl::text, '(default: EXECUTE TO PUBLIC)') AS acl
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.prosecdef = true
  AND EXISTS (
        SELECT 1
        FROM aclexplode(COALESCE(p.proacl, acldefault('f', p.proowner))) a
        WHERE a.privilege_type = 'EXECUTE'
          AND (a.grantee = 0 OR a.grantee::regrole::text = 'anon')
      )
ORDER BY p.proname;

-- ── 3. SECURITY DEFINER functions callable by any logged-in user ───────────
-- Lower rank than anon, still an escalation: any authenticated account, however
-- it was created, gains the owner's rights.
--
-- OBSERVED RED 2026-08-18, 4 rows: before_user_created_hook,
-- custom_access_token_hook, get_my_org_ids, prune_integration_history
--
-- Same aclexplode treatment as query 2, and for the same reason: a NULL proacl
-- is EXECUTE TO PUBLIC, and PUBLIC includes every authenticated account.
SELECT 'authenticated_executable_security_definer' AS rule,
       p.proname                                   AS target,
       COALESCE(p.proacl::text, '(default: EXECUTE TO PUBLIC)') AS acl
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.prosecdef = true
  AND EXISTS (
        SELECT 1
        FROM aclexplode(COALESCE(p.proacl, acldefault('f', p.proowner))) a
        WHERE a.privilege_type = 'EXECUTE'
          AND (a.grantee = 0 OR a.grantee::regrole::text = 'authenticated')
      )
ORDER BY p.proname;
