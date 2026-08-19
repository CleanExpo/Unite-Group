-- ROLLBACK for docs/specs/sql/2026-08-19-privileged-function-exposure-lock.sql
--
-- (An earlier header named `20260819010000_revoke_privileged_function_exposure.sql`,
--  a path that exists nowhere in this repo. A break-glass file that names the wrong
--  artefact is a hazard under time pressure.)
--
-- BREAK-GLASS ONLY. Running this deliberately REOPENS the exposures the fix
-- closed: it makes the JWT-minting hook, the user-creation hook and a destructive
-- prune function callable by anon again, and switches row-level security back off
-- on two public tables. It exists because the constitution requires a production
-- change to have a TESTED rollback before it may be applied, and because an
-- untested rollback is a rumour.
--
-- ⚠ AT THIS REVISION THIS ROLLBACK IS NOT TESTED, AND SAYING SO IS THE POINT.
-- The test was repro-prod-exposure.sh step 7, which executes this file and
-- asserts the gate returns to red. Step 7 DOES NOT RUN: the repro exits 1 at
-- step 4 on the deliberate get_my_org_ids row. This file's SQL BODY is also
-- unchanged since 44c44368f (the header was rewritten in ab092ace0, so a git
-- diff against that commit is non-empty; the body is the part that would have
-- been tested), so it has never executed against the fix in its current form —
-- which now includes a supabase_auth_admin re-grant that did not exist then.
--
-- Consequence, stated plainly: the constitution's "tested rollback before a
-- production change" precondition is NOT met. That is part of founder item F9,
-- and it is a reason not to apply the fix yet — not a footnote.
--
-- Use it only if the revoke is shown to have broken a caller that legitimately
-- needed anon or authenticated EXECUTE. The correct follow-up is then a narrow
-- GRANT to the one role that needs it, not leaving this state in place.

BEGIN;

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
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO anon, authenticated', _fn);
  END LOOP;

  FOR _fn IN
    SELECT p.oid::regprocedure
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'prune_integration_history'
  LOOP
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO PUBLIC', _fn);
  END LOOP;

  FOR _fn IN
    SELECT p.oid::regprocedure
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'get_my_org_ids'
  LOOP
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', _fn);
  END LOOP;
END
$$;

DO $$
DECLARE
  _tbl text;
BEGIN
  FOREACH _tbl IN ARRAY ARRAY[
    'public.founder_uid_migration_20260810',
    'public.founder_uid_conflict_resolution_20260810'
  ] LOOP
    IF to_regclass(_tbl) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE %s DISABLE ROW LEVEL SECURITY', _tbl);
    END IF;
  END LOOP;
END
$$;

COMMIT;
