-- ROLLBACK for 20260819010000_revoke_privileged_function_exposure.sql
--
-- BREAK-GLASS ONLY. Running this deliberately REOPENS the exposures the fix
-- closed: it makes the JWT-minting hook, the user-creation hook and a destructive
-- prune function callable by anon again, and switches row-level security back off
-- on two public tables. It exists because the constitution requires a production
-- change to have a TESTED rollback before it may be applied, and because an
-- untested rollback is a rumour. repro-prod-exposure.sh step 7 executes this file
-- and asserts the gate returns to red — that assertion is the test.
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
