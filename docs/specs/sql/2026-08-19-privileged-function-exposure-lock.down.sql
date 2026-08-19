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

-- ── RESTORE THE OBSERVED PRE-STATE, NOT A PRESUMED ONE ──────────────────────
--
--    WHAT WAS WRONG. This block used to GRANT a hard-coded pre-state: EXECUTE to
--    anon and authenticated on both auth hooks, to PUBLIC on the prune, to
--    authenticated on get_my_org_ids — unconditionally, whatever the database
--    actually looked like before the lock. An independent review (codex,
--    19/08/2026) seeded an owner-only custom_access_token_hook with anon EXECUTE
--    FALSE, applied the forward file, applied this one, and anon EXECUTE came
--    back TRUE. The rollback CREATED an exposure that had never existed, during
--    the one procedure an operator runs while trusting it most.
--
--    A rollback cannot restore a state nobody recorded. The forward file now
--    captures the observed pre-state into
--    public.privileged_function_exposure_lock_receipt_20260819 before it mutates
--    anything, and this block replays exactly those rows. No receipt means no
--    restore: it ABORTS rather than falling back to guessing, because a guess
--    that happens to be wrong is indistinguishable from a successful recovery.
DO $$
DECLARE
  _r        record;
  _restored int := 0;
  _rows     int;
BEGIN
  IF to_regclass('public.privileged_function_exposure_lock_receipt_20260819') IS NULL THEN
    RAISE EXCEPTION
      'rollback aborted: no pre-state receipt table. This rollback restores the state the forward migration OBSERVED; without that record it would have to guess, and a wrong guess grants privileges that never existed. Apply the forward migration from this same revision, or restore the ACLs by hand from a backup. Nothing has been changed.';
  END IF;

  SELECT count(*) INTO _rows FROM public.privileged_function_exposure_lock_receipt_20260819;
  IF _rows = 0 THEN
    RAISE EXCEPTION
      'rollback aborted: the pre-state receipt table exists but is EMPTY, so there is nothing to restore and no way to tell a clean pre-state from an unrecorded one. Nothing has been changed.';
  END IF;

  -- Functions: re-grant EXECUTE ONLY where the receipt recorded it held.
  FOR _r IN
    SELECT object_id, grantee, has_execute
    FROM public.privileged_function_exposure_lock_receipt_20260819
    WHERE object_kind = 'function' AND has_execute
  LOOP
    IF to_regprocedure(_r.object_id) IS NULL THEN
      RAISE NOTICE 'rollback: % is in the receipt but no longer exists — skipped', _r.object_id;
      CONTINUE;
    END IF;
    IF _r.grantee = '' THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO PUBLIC', _r.object_id);
    ELSE
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO %I', _r.object_id, _r.grantee);
    END IF;
    _restored := _restored + 1;
  END LOOP;

  -- Tables: return RLS to the recorded setting, in whichever direction that is.
  FOR _r IN
    SELECT object_id, rls_enabled
    FROM public.privileged_function_exposure_lock_receipt_20260819
    WHERE object_kind = 'table'
  LOOP
    IF to_regclass(_r.object_id) IS NULL THEN
      RAISE NOTICE 'rollback: % is in the receipt but no longer exists — skipped', _r.object_id;
      CONTINUE;
    END IF;
    IF _r.rls_enabled THEN
      EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', _r.object_id);
    ELSE
      EXECUTE format('ALTER TABLE %s DISABLE ROW LEVEL SECURITY', _r.object_id);
    END IF;
    _restored := _restored + 1;
  END LOOP;

  RAISE NOTICE 'rollback: restored % recorded pre-state entr(ies) from the receipt', _restored;
END
$$;

-- ── POST-CONDITION — a rollback that changed nothing must not look successful ─
DO $$
DECLARE
  _exposed  int;
  _expected int;
BEGIN
  -- The post-condition is EQUALITY WITH THE RECEIPT, not "something must be
  -- exposed". An earlier revision demanded re-exposure outright — "abort if 0
  -- privileged functions are anon-executable" — which encodes the assumption
  -- that the pre-state was always the observed production shape. Against a
  -- database whose pre-state had NO anon exposure, a CORRECT rollback restores
  -- nothing exposed and that check aborted it: the two guards contradicted each
  -- other, and the fidelity guard is the one that is right. Found by running
  -- scripts/ship-gates/prove-rollback-fidelity.sh, not by reading the file.
  --
  -- Equality still catches the failure the old check existed for. If the
  -- production pre-state had 3 anon-executable definers and the rollback
  -- restores 0, expected=3 <> restored=0 and this aborts exactly as before.
  SELECT count(*) INTO _exposed
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.prosecdef
    AND p.proname IN ('custom_access_token_hook', 'before_user_created_hook', 'prune_integration_history')
    AND has_function_privilege('anon', p.oid, 'EXECUTE');

  SELECT count(DISTINCT object_id) INTO _expected
  FROM public.privileged_function_exposure_lock_receipt_20260819
  WHERE object_kind = 'function'
    AND has_execute
    AND grantee IN ('anon', '')
    AND object_id LIKE ANY (ARRAY['custom_access_token_hook%', 'before_user_created_hook%', 'prune_integration_history%']);

  IF _exposed <> _expected THEN
    RAISE EXCEPTION
      'rollback aborted: restored state does not match the recorded pre-state. The receipt says % privileged function(s) were anon-executable before the lock; % are now. Too few means the rollback did not take; too many means it granted access that never existed. Either way, do NOT report recovery. Nothing has been changed.',
      _expected, _exposed;
  END IF;

  IF _expected = 0 THEN
    RAISE NOTICE 'rollback post-condition: 0 anon-executable privileged functions, matching the recorded pre-state — this database was never exposed, and the rollback correctly did not expose it';
  ELSE
    RAISE NOTICE 'rollback post-condition: % privileged function(s) are anon-executable again, exactly as the pre-state receipt recorded', _exposed;
  END IF;
END
$$;

COMMIT;
