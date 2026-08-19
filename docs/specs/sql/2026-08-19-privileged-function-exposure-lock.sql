-- Unite-Group — privileged function exposure lock (2026-08-19)
--
-- HOW THIS IS APPLIED. Manually, by the founder, in the prod SQL editor for
-- `lksfwktwtmyznckodsau` — the repo convention for prod DDL (docs/specs/sql/,
-- transaction-wrapped and idempotent). It is deliberately NOT in
-- apps/web/supabase/migrations: `supabase db push` is unsafe on this project
-- (57 local-only vs 95 prod-only migrations of drift, per
-- docs/specs/spm-rls-exposure-remediation-2026-07-12.md), so a file placed
-- there would add drift and never reach production.
--
-- ROLLBACK: docs/specs/sql/2026-08-19-privileged-function-exposure-lock.down.sql
-- VERIFY  : scripts/ship-gates/run-prod-exposure.sh "<prod-uri>"
--           -> expect exit 1 with EXACTLY ONE row:
--              authenticated_executable_security_definer | get_my_org_ids
--           **DO NOT DRIVE THIS TO EXIT 0.** The only way to clear that row is
--           to revoke `authenticated` EXECUTE on get_my_org_ids, which takes
--           production down — see the block at "6: RLS HELPERS" below, and
--           FOUNDER-QUEUE.md item F9. Any OTHER row is a real failure: roll back.
-- PROVEN  : scripts/ship-gates/repro-prod-exposure.sh reproduces the observed
--           production red (2/3/4 rows) and applies this file with its
--           post-condition holding. It then STOPS: it exits 1 at step 4 on the
--           deliberate row above, so its later assertions (login survival, no
--           over-reach, reversible rollback) are NOT REACHED and are NOT proven
--           at this revision. scripts/ship-gates/prove-rls-execute-coupling.sh
--           IS proven (exit 0, mutation-checked) and demonstrates why the
--           deliberate row must stay.
--
-- Closes ship-board Rank 1 items 1-7 (docs/mission-control/ship-board.md), the
-- live exposures found by scripts/ship-gates/prod-exposure.sql on 18/08/2026.
--
-- ROOT CAUSE. 20260620010000_auth_signup_allowlist.sql already ends each hook
-- with `REVOKE EXECUTE ... FROM PUBLIC`. That revoke is real but incomplete:
-- it removes the implicit PUBLIC grant and leaves any EXPLICIT `anon=X` /
-- `authenticated=X` entry in proacl untouched. Production shows exactly that
-- residue, which is why a migration that looks like it locked the hooks shipped
-- a surface that is still anon-callable. Revoking from PUBLIC is not revoking
-- from anon.
--
-- WHY THE REVOKES ARE NAME-DRIVEN, NOT SIGNATURE-DRIVEN. A REVOKE naming a
-- signature that does not exist raises; a signature guarded by `to_regprocedure`
-- that guesses wrong simply skips, silently, and the gate then reads green
-- because nothing was examined. The DO block below enumerates pg_proc, so every
-- overload of every named function is covered and the count of what was actually
-- touched is RAISEd as a NOTICE — an assertion you can read rather than assume.
--
-- WHAT IS DELIBERATELY NOT HERE. No schema-wide `ALTER DEFAULT PRIVILEGES`.
-- That would change the privilege model for every future function in public,
-- which is a far wider blast radius than the seven boarded items and was not
-- reviewed as part of them. It is recorded as a recommendation on the ship board
-- instead of smuggled into an exposure fix.

BEGIN;

-- ── 1-3, 7: privileged functions no untrusted role may call. anon AND
--            authenticated both lose EXECUTE. supabase_auth_admin MUST keep
--            EXECUTE on the two auth hooks or every login breaks — it is
--            re-granted below, after the revoke, so ordering cannot strand it.
DO $$
DECLARE
  _fn      regprocedure;
  _touched int := 0;
BEGIN
  FOR _fn IN
    SELECT p.oid::regprocedure
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'custom_access_token_hook',
        'before_user_created_hook',
        'prune_integration_history'
      )
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', _fn);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', _fn);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM authenticated', _fn);
    _touched := _touched + 1;
  END LOOP;

  RAISE NOTICE 'revoke_privileged_function_exposure: revoked on % function(s)', _touched;
END
$$;

-- ── Restore the ONE grant that must survive. The REVOKE ALL ... FROM PUBLIC
--    above strips PUBLIC, and on production `prune_integration_history` is
--    observed holding its grant through PUBLIC alone ({postgres=X/postgres,
--    =X/postgres}, gate run 18/08/2026). If `supabase_auth_admin` reaches an
--    auth hook the same way, the PUBLIC revoke strands it and EVERY login
--    breaks. Re-granting explicitly AFTER the revoke makes ordering
--    irrelevant. Scoped to the two auth hooks only: supabase_auth_admin has no
--    business executing prune_integration_history.
--
--    This block was present in 44c44368f, deleted without mention in e964ab9bf
--    when the second DO block was repurposed for get_my_org_ids, and restored
--    here after an independent review found three documents still asserting it
--    existed. The post-condition below is the assertion that catches its
--    absence; this block is the mechanism that prevents it.
DO $$
DECLARE
  _fn regprocedure;
BEGIN
  FOR _fn IN
    SELECT p.oid::regprocedure
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN ('custom_access_token_hook', 'before_user_created_hook')
  LOOP
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO supabase_auth_admin', _fn);
    RAISE NOTICE 'revoke_privileged_function_exposure: supabase_auth_admin re-granted EXECUTE on %', _fn;
  END LOOP;
END
$$;

-- ── 6: RLS HELPERS — anon revoked, `authenticated` DELIBERATELY RETAINED.
--
-- Postgres checks function EXECUTE against the QUERYING role when it evaluates a
-- row-level-security policy expression. SECURITY DEFINER on the callee does not
-- exempt it. `public.organizations` carries orgs_all / orgs_select /
-- service_orgs policies that are org-membership-scoped via get_my_org_ids()
-- (apps/empire/supabase/migrations/20260513180500_notifications_projects_organizations.sql:60),
-- so revoking EXECUTE from `authenticated` would make every authenticated read of
-- that table fail outright with "permission denied for function get_my_org_ids" —
-- an outage strictly worse than the exposure this file closes, and one whose only
-- recovery path is the rollback, which re-opens the anon-callable JWT hook.
--
-- DEMONSTRATED, and here is the run. scripts/ship-gates/prove-rls-execute-coupling.sh
-- builds exactly this arrangement — a SECURITY DEFINER tenancy helper, an
-- org-scoped table, an RLS policy that calls the helper — and reads it as the
-- authenticated role before and after the revoke:
--
--   before revoke: authenticated read returned 1 row
--   after  revoke: ERROR: permission denied for function get_my_org_ids
--
-- Run 19/08/2026 against Postgres 17.6, exit 0. The gate is mutation-checked:
-- with the revoke removed it exits 1 ("claim NOT reproduced"), and the source
-- was restored byte-identical (shasum verified). Everything runs in one
-- transaction and is ROLLBACK'd.
--
-- An earlier revision of this comment cited "repro-prod-exposure.sh step 9",
-- which has never existed; that script has steps 0-8 and none of them tests
-- this. The citation is now a script you can run.
--
-- `anon` is still revoked: an unauthenticated caller has no legitimate use for a
-- tenancy helper. The EXECUTE for `authenticated` is re-granted EXPLICITLY after
-- the PUBLIC revoke, so the PUBLIC revoke cannot strand it.
DO $$
DECLARE
  _fn regprocedure;
BEGIN
  FOR _fn IN
    SELECT p.oid::regprocedure
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'get_my_org_ids'
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', _fn);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', _fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', _fn);
    RAISE NOTICE 'revoke_privileged_function_exposure: % locked to authenticated only', _fn;
  END LOOP;
END
$$;

-- ── 4-5: dated one-off migration artefacts left in public with RLS off, so the
--         anon key can read and write them over PostgREST. RLS enabled with no
--         policy denies all access, which closes the exposure without deleting
--         data. DROP remains the founder's call; this migration does not take
--         it, because an agent dropping a table it cannot inspect is the one
--         irreversible move on this board.
DO $$
DECLARE
  _tbl text;
BEGIN
  FOREACH _tbl IN ARRAY ARRAY[
    'public.founder_uid_migration_20260810',
    'public.founder_uid_conflict_resolution_20260810'
  ] LOOP
    IF to_regclass(_tbl) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', _tbl);
      RAISE NOTICE 'revoke_privileged_function_exposure: RLS enabled on %', _tbl;
    ELSE
      RAISE NOTICE 'revoke_privileged_function_exposure: % absent, nothing to do', _tbl;
    END IF;
  END LOOP;
END
$$;

-- ── Post-condition, enforced in the same transaction that made the change.
--    Without this the migration reports success on the strength of having run,
--    which is not the same as having worked.
--
--    It asks has_function_privilege rather than matching grantee NAMES in proacl.
--    A name match misses privilege reached through role INHERITANCE: with
--    `GRANT app_helper TO anon` and the definer granted to app_helper, anon can
--    execute the function while no `anon=X` entry exists anywhere in proacl, and
--    a name-matching check reports zero exposures over a live one.
--
--    It also names the offenders rather than raising a bare count, so a file
--    pasted against the wrong project fails with something diagnosable.
DO $$
DECLARE
  _anon_exposed  text[];
  _authed_extra  text[];
  _authadmin     int;
  -- Definers `authenticated` is ALLOWED to execute. RLS helpers must be here or
  -- their policies break; see the get_my_org_ids block above.
  _rls_helpers   text[] := ARRAY['get_my_org_ids'];
BEGIN
  SELECT coalesce(array_agg(p.oid::regprocedure::text ORDER BY 1), '{}')
    INTO _anon_exposed
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.prosecdef
    AND has_function_privilege('anon', p.oid, 'EXECUTE');

  IF array_length(_anon_exposed, 1) > 0 THEN
    RAISE EXCEPTION
      'post-condition failed: SECURITY DEFINER function(s) in public still executable by anon: %',
      array_to_string(_anon_exposed, ', ');
  END IF;

  SELECT coalesce(array_agg(p.oid::regprocedure::text ORDER BY 1), '{}')
    INTO _authed_extra
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.prosecdef
    AND has_function_privilege('authenticated', p.oid, 'EXECUTE')
    AND NOT (p.proname = ANY (_rls_helpers));

  IF array_length(_authed_extra, 1) > 0 THEN
    RAISE EXCEPTION
      'post-condition failed: SECURITY DEFINER function(s) in public still executable by authenticated and not on the RLS-helper allowlist: %',
      array_to_string(_authed_extra, ', ');
  END IF;

  -- The auth hooks must still be callable by the auth service. This is an
  -- ASSERTION, not a notice: a migration that silently strands supabase_auth_admin
  -- takes every login down, so it must refuse to commit rather than report.
  -- Counted against the hooks that EXIST, so an absent hook cannot fake a pass.
  SELECT count(*) INTO _authadmin
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname IN ('custom_access_token_hook', 'before_user_created_hook')
    AND NOT has_function_privilege('supabase_auth_admin', p.oid, 'EXECUTE');

  IF _authadmin > 0 THEN
    RAISE EXCEPTION
      'post-condition failed: supabase_auth_admin lost EXECUTE on % auth hook(s) — this would lock out every login',
      _authadmin;
  END IF;

  RAISE NOTICE 'post-condition OK: 0 anon-executable definers; 0 unexpected authenticated-executable definers; supabase_auth_admin retains EXECUTE on every auth hook present';
END
$$;

COMMIT;
