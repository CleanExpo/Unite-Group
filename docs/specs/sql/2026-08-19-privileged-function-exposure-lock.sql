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
-- VERIFY  : scripts/ship-gates/run-prod-exposure.sh "<prod-uri>"  -> must exit 0
-- PROVEN  : scripts/ship-gates/repro-prod-exposure.sh reproduces the observed
--           production red (2/3/4 rows), applies this file, and asserts green,
--           login survival, no over-reach, and a reversible rollback.
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

-- ── 1-3, 6-7: privileged functions must not be callable by anon or by any
--              logged-in account. supabase_auth_admin MUST keep EXECUTE on the
--              two auth hooks or every login breaks — it is re-granted below,
--              after the revoke, so ordering cannot strand it.
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
        'prune_integration_history',
        'get_my_org_ids'
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

-- ── Restore the ONE grant that must survive. Removing supabase_auth_admin's
--    EXECUTE on these two hooks locks every user out of login — the single way
--    this migration could cause a worse outcome than the exposure it closes.
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
DO $$
DECLARE
  _exposed int;
  _authadmin int;
BEGIN
  SELECT count(*) INTO _exposed
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.prosecdef
    AND EXISTS (
      SELECT 1 FROM aclexplode(COALESCE(p.proacl, acldefault('f', p.proowner))) a
      WHERE a.privilege_type = 'EXECUTE'
        AND (a.grantee = 0 OR a.grantee::regrole::text IN ('anon', 'authenticated'))
    );

  IF _exposed <> 0 THEN
    RAISE EXCEPTION
      'post-condition failed: % SECURITY DEFINER function(s) in public still executable by anon/authenticated/PUBLIC',
      _exposed;
  END IF;

  -- The auth hooks must still be callable by the auth service. If the hooks are
  -- absent entirely this is 0 and the check is skipped rather than passed.
  SELECT count(*) INTO _authadmin
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname IN ('custom_access_token_hook', 'before_user_created_hook')
    AND has_function_privilege('supabase_auth_admin', p.oid, 'EXECUTE');

  RAISE NOTICE 'post-condition OK: 0 exposed definers; supabase_auth_admin retains EXECUTE on % auth hook(s)', _authadmin;
END
$$;

COMMIT;
