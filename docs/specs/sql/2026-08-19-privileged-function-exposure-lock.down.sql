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
-- ✅ TESTED 19/08/2026 by scripts/ship-gates/prove-rollback.sh (exit 0): seeded
-- exposure 3 anon-executable definers -> fix -> 0 -> this file -> back to 3, and
-- this file refuses an empty database standing in for the wrong project. The
-- note below records why it was previously untested and is kept for the record.
--
-- ⚠ AT EARLIER REVISIONS THIS ROLLBACK WAS NOT TESTED.
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

-- ── IDENTITY GUARD — refuse to run against the wrong project ────────────────
-- Independent review (codex, 19/08/2026) demonstrated the failure this closes:
-- on an empty database standing in for the wrong Supabase project, every loop
-- below ran ZERO times and the transaction COMMITted, printing nothing wrong.
-- During an outage that reads as "recovery succeeded" while nothing was
-- recovered. A break-glass file that cannot tell it did nothing is worse than no
-- file. This aborts unless the objects this rollback exists to restore are
-- actually here.
DO $$
DECLARE
  _fns int;
BEGIN
  SELECT count(*) INTO _fns
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname IN (
      'custom_access_token_hook',
      'before_user_created_hook',
      'prune_integration_history',
      'get_my_org_ids'
    );

  -- An independent review defeated an earlier `_fns = 0` test with a database
  -- holding ONE colliding function: the guard reported "1 of 4" and committed.
  -- A partial match is not this project; it is a coincidence, and acting on a
  -- coincidence during a break-glass is how the wrong database gets mutated.
  IF _fns <> 4 THEN
    RAISE EXCEPTION
      'rollback aborted: expected all 4 privileged functions this file restores (custom_access_token_hook, before_user_created_hook, prune_integration_history, get_my_org_ids) in schema public, found %. A partial match is NOT this project. Nothing has been changed.', _fns;
  END IF;

  RAISE NOTICE 'rollback identity guard: all 4 target functions present';
END
$$;

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

-- ── POST-CONDITION — a rollback that changed nothing must not look successful ─
DO $$
DECLARE
  _exposed int;
BEGIN
  -- After a real rollback the exposure is deliberately BACK: anon can execute
  -- the privileged definers again. If nothing is exposed, this file did not do
  -- what it claims, and the operator must not walk away believing it did.
  SELECT count(*) INTO _exposed
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.prosecdef
    AND p.proname IN ('custom_access_token_hook', 'before_user_created_hook', 'prune_integration_history')
    AND has_function_privilege('anon', p.oid, 'EXECUTE');

  IF _exposed = 0 THEN
    RAISE EXCEPTION
      'rollback aborted: completed without re-exposing a single privileged function. The rollback did not take — do NOT report recovery. Nothing has been changed.';
  END IF;

  RAISE NOTICE 'rollback post-condition: % privileged function(s) are anon-executable again, as this rollback intends', _exposed;
END
$$;

COMMIT;
