-- ROLLBACK for docs/specs/sql/2026-08-19-privileged-function-exposure-lock.sql
--
-- (An earlier header named `20260819010000_revoke_privileged_function_exposure.sql`,
--  a path that exists nowhere in this repo. A break-glass file that names the wrong
--  artefact is a hazard under time pressure.)
--
-- BREAK-GLASS ONLY. Running this restores the state the forward migration OBSERVED
-- and recorded, in whichever direction that is. On PRODUCTION, whose recorded
-- pre-state is the exposed one, that means it REOPENS what the fix closed: the
-- JWT-minting hook, the user-creation hook and a destructive prune function become
-- callable by anon again, and row-level security goes back off on two public tables.
-- Treat it as doing exactly that when you run it against production.
--
-- CORRECTED 20/08/2026 — the paragraph above said it reopens those exposures
-- UNCONDITIONALLY, which stopped being true when the rollback began replaying an
-- observed receipt instead of a presumed pre-state. Against a database whose recorded
-- pre-state was NOT exposed, this file correctly leaves it unexposed
-- (prove-rollback-fidelity.sh case 1 asserts exactly that), and table RLS is likewise
-- returned to its RECORDED value rather than switched off. An operator reading the old
-- wording during an outage would have believed this file had just granted anon access
-- and disabled RLS when it had done neither. Reported by an independent review
-- (openrouter, 20/08/2026).
--
-- It exists because the constitution requires a production change to have a TESTED
-- rollback before it may be applied, and because an untested rollback is a rumour.
--
-- ✅ TESTED 19/08/2026 by scripts/ship-gates/prove-rollback.sh (exit 0): seeded
-- exposure 3 anon-executable definers -> fix -> 0 -> this file -> back to 3, and
-- this file refuses an EMPTY database (an object-set refusal, not proof of project
-- identity — see the guard's own heading below). The
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
-- Consequence, stated plainly, and CORRECTED 19/08/2026: the paragraph above
-- describes an EARLIER REVISION of this file and is retained only as history. It
-- said the constitution's "tested rollback before a production change"
-- precondition was NOT met, in the present tense, in the file an operator opens
-- during a break-glass — while this file's own header and FOUNDER-QUEUE F9 both
-- said the opposite. An independent review flagged the contradiction as making
-- the release instruction ambiguous under exactly the conditions where ambiguity
-- costs the most. It is resolved here rather than in a third document, because
-- correcting the document that was cited and leaving the file that OPERATES is
-- this branch's signature defect.
--
-- CURRENT STATE. The rollback IS tested, for these cases, each pinned by a
-- control that was broken on purpose to prove it can fail:
--   * restores the observed production shape       — prove-rollback.sh
--   * refuses an empty database — an object-set
--     refusal, NOT a project-identity check          — prove-rollback.sh
--   * refuses a partial or overloaded match        — prove-rollback-fidelity.sh case 7
--   * does not invent an exposure that never was   — prove-rollback-fidelity.sh case 1
--   * does not convert a PUBLIC-derived grant into
--     a direct anon grant                          — prove-rollback-fidelity.sh case 4
--   * takes back grants the forward file created   — prove-rollback-fidelity.sh case 5
--   * consumes its receipt, so a second cycle
--     cannot replay a stale pre-state              — prove-rollback-fidelity.sh case 6
--   * does not reject a CORRECT restore of a grant
--     on a function that is not SECURITY DEFINER   — prove-rollback-fidelity.sh case 8
--   * refuses, and NAMES, a recorded privilege it
--     cannot put back (dropped function or role)   — prove-rollback-fidelity.sh case 9
--   * refuses, and NAMES, a recorded TABLE it
--     cannot put back — the same guard, swept       — prove-rollback-fidelity.sh case 10
--   * compares role IDENTITY (oid), not role name,
--     so a same-name replacement is refused         — prove-rollback-fidelity.sh case 11
--   * names an OBJECT rather than a search_path
--     lookup, and refuses anything resolving
--     outside public without touching it            — prove-rollback-fidelity.sh case 12
--
-- STILL NOT TESTED, and it is F9's remaining scope: intermediate partial matches
-- of two or three present functions, and identity beyond names and argument
-- signatures. Function OWNERS are still not compared, so a function dropped and
-- recreated under a different owner between apply and rollback is treated as the
-- same object. Nor is SECURITY DEFINER status compared ACROSS TIME: the receipt
-- does not record it, so a function that gains or loses SECURITY DEFINER between
-- apply and rollback is not detected — case 8 fixes only the post-condition's
-- internal asymmetry, by applying the same definer predicate to both sides of the
-- equality.
--
-- Role identity IS now compared, by oid (case 11) — but note precisely what that
-- case exercises: the forward file is proven to capture the LIVE oid of every
-- recorded role, and the rollback is proven to refuse a recorded oid that no longer
-- matches. The literal DROP ROLE / CREATE ROLE sequence is NOT staged, because
-- anon/authenticated/supabase_auth_admin are cluster-wide on the database this gate
-- runs against and dropping one would break the live local stack.
--
-- Treat recovery as proven for the cases above and unproven outside them.
--
-- Use it only if the revoke is shown to have broken a caller that legitimately
-- needed anon or authenticated EXECUTE. The correct follow-up is then a narrow
-- GRANT to the one role that needs it, not leaving this state in place.

BEGIN;

-- DETERMINISTIC NAME RESOLUTION FOR THE WHOLE TRANSACTION. Every unqualified
-- identifier below — and every identifier this file WRITES into or READS OUT OF the
-- pre-state receipt — resolves against search_path. Left to the session's default, a
-- schema earlier in the path holding a same-signature function makes the pair operate
-- on an object nobody named. Reported by an independent review (openrouter,
-- 20/08/2026). Pinned here for the transaction; the receipt additionally stores
-- SCHEMA-QUALIFIED identities, and the rollback verifies the namespace of whatever it
-- resolves before it mutates anything. Three independent defences, because this one is
-- silent when it fails.
SET LOCAL search_path = public, pg_catalog;

-- ── OBJECT-SET GUARD — refuse a database that does not carry the objects this
--    rollback restores. NOT a project-identity check — the same narrowing applied
--    to the forward file's guard on 20/08/2026, swept here in the same commit
--    rather than left for the next review round to find. It proves the four names
--    are present in public; it does NOT bind the database to a Supabase project,
--    nor compare signatures, owners or definer status. ─────────────────────────
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
  -- DISTINCT NAMES, not rows. `count(*)` counts OVERLOADS, so four overloads of
  -- custom_access_token_hook and none of the other three names satisfied "= 4" and
  -- admitted a database carrying none of the other three names. Caught here by a SECOND independent
  -- reviewer (gemini, 19/08/2026) after the first found the same defect in the forward
  -- file only — the forward fix was applied and this identical guard was left standing,
  -- which is this branch's recurring shape: the class was not swept.
  SELECT count(DISTINCT p.proname) INTO _fns
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
  -- A partial match does not establish that this IS the project either way: it is a
  -- coincidence at best, and acting on a coincidence during a break-glass is how the
  -- wrong database gets mutated.
  IF _fns <> 4 THEN
    RAISE EXCEPTION
      'rollback aborted: expected all 4 privileged functions this file restores (custom_access_token_hook, before_user_created_hook, prune_integration_history, get_my_org_ids) in schema public, found %. Check the connection FIRST — this is what running against the wrong database looks like — but it can equally mean drift or object loss on the right one, so it is a mismatch of the object set and not proof of either. Nothing has been changed.', _fns;
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
  _r            record;
  _restored     int := 0;
  _rows         int;
  -- Entries the receipt records as HELD that this rollback cannot put back.
  -- Counted, named, and fatal — see the guard at the end of this block.
  _unrestorable text[] := '{}';
  _live_oid     oid;
  _obj_oid      oid;
  _obj_schema   text;
  _obj_name     text;
  _obj_ident    text;
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

  -- Functions: drive EVERY recorded (function, grantee) pair BACK to its recorded
  -- value — grant where it held, REVOKE where it did not.
  --
  --    WHY BOTH DIRECTIONS. An earlier revision iterated only `WHERE has_execute`,
  --    so it restored what the lock removed but never removed what the lock ADDED.
  --    The forward file itself issues direct grants — `authenticated` on
  --    get_my_org_ids, `supabase_auth_admin` on both hooks — so against a database
  --    where those were absent beforehand, apply+down left them behind. Reproduced
  --    19/08/2026 on an owner-only fixture: authenticated's DIRECT grants on
  --    get_my_org_ids went 0 -> 1 -> 1. "Restores the exact pre-state" was false in
  --    the one direction nobody was looking, and the anon-only post-condition still
  --    passed, because it counts anon and this grant is to authenticated.
  --
  --    A rollback that only adds is not a rollback; it is a second forward migration
  --    wearing the name.
  FOR _r IN
    SELECT object_id, grantee, grantee_oid, has_execute
    FROM public.privileged_function_exposure_lock_receipt_20260819
    WHERE object_kind = 'function'
  LOOP
    -- A SKIP IS NOT A RESTORATION. Where the receipt recorded the privilege as
    -- NOT held there is nothing to take back from an object that is gone, and the
    -- skip is genuinely benign. Where it recorded the privilege as HELD, skipping
    -- means this rollback is returning a state that differs from the one it
    -- promised to return, and the only post-condition below measures anon on the
    -- three definers — so a recorded `authenticated` or `supabase_auth_admin`
    -- grant, or a grant on an overload that has since been dropped, went missing
    -- with nothing louder than a NOTICE on a terminal nobody reads during an
    -- outage. Collected here and made FATAL at the end of the block, inside the
    -- same transaction, so nothing is changed rather than partially changed.
    _obj_oid := to_regprocedure(_r.object_id);
    IF _obj_oid IS NULL THEN
      IF _r.has_execute THEN
        _unrestorable := _unrestorable || format('%s (recorded EXECUTE for %s; the function no longer exists)',
                                                 _r.object_id, coalesce(nullif(_r.grantee, ''), 'PUBLIC'));
      ELSE
        RAISE NOTICE 'rollback: % is in the receipt but no longer exists — it recorded NO privilege, so there is nothing to take back; skipped', _r.object_id;
      END IF;
      CONTINUE;
    END IF;

    -- VERIFY WHAT THE NAME RESOLVED TO, BEFORE MUTATING IT.
    --
    --    The receipt holds TEXT, and text resolves against search_path. An earlier
    --    revision recorded `p.oid::regprocedure::text`, which omits the schema whenever
    --    the schema is visible — so `prune_integration_history()` meant whatever a later
    --    session's search_path said it meant. With another schema earlier in the path
    --    holding the same signature, this loop would GRANT and REVOKE on THAT function:
    --    the public-name identity guard still passes (the real targets are present), and
    --    the post-condition still balances (its receipt side filters to public and finds
    --    nothing, its live side sees the still-locked public function), so the rollback
    --    commits, consumes the receipt, and reports a recovery it performed on the wrong
    --    object. Reported by an independent review (openrouter, 20/08/2026).
    --
    --    Three defences, because a silent wrong-object mutation deserves more than one:
    --    search_path is pinned for this transaction, the forward file now records
    --    schema-qualified identities, and this block re-reads the catalogue for whatever
    --    it actually resolved and refuses anything that is not one of the four functions
    --    this file locks, in public. The EXECUTEs below then use the identity built from
    --    THAT oid, not the receipt's text, so nothing can re-resolve differently.
    SELECT n.nspname, p.proname,
           -- oidvectortypes, for the same reason the forward file uses it: identity
           -- arguments carry argument NAMES, which are not a valid type list.
           format('%I.%I(%s)', n.nspname, p.proname, pg_catalog.oidvectortypes(p.proargtypes))
      INTO _obj_schema, _obj_name, _obj_ident
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.oid = _obj_oid;

    IF _obj_schema <> 'public'
       OR _obj_name NOT IN ('custom_access_token_hook', 'before_user_created_hook',
                            'prune_integration_history', 'get_my_org_ids') THEN
      _unrestorable := _unrestorable || format('%s (resolves to %I.%I, which is NOT one of the four functions in public this rollback restores — refusing to mutate an object the receipt did not name)',
                                               _r.object_id, _obj_schema, _obj_name);
      CONTINUE;
    END IF;
    -- A role NAME is not a role IDENTITY. If a role present at apply time is dropped
    -- and a DIFFERENT role is created with the same name before the rollback runs, a
    -- name-resolved GRANT hands the old role's recorded privilege to a new principal.
    --
    --    WHAT WAS WRONG, and it was wrong in the comment as much as in the code. This
    --    block used to claim Postgres "has no stable cross-drop role identifier", so
    --    the hazard was "announced rather than silently resolved … on the operator's
    --    terminal". Nothing was announced. The only skip fired when the name was
    --    ABSENT; a same-name REPLACEMENT resolves, so it took the GRANT branch and
    --    committed in silence — the file asserted a safeguard it did not implement, in
    --    a break-glass procedure. Reported by an independent review (openrouter,
    --    20/08/2026). Postgres does keep a stable identifier: the role OID, which a
    --    drop-and-recreate does not preserve. The forward file now records it, and the
    --    comparison below is against that, not against the name.
    IF _r.grantee <> '' AND NOT EXISTS (
         SELECT 1 FROM pg_roles r WHERE r.rolname = _r.grantee) THEN
      IF _r.has_execute THEN
        _unrestorable := _unrestorable || format('%s (recorded EXECUTE for role %s; that role no longer exists)',
                                                 _r.object_id, _r.grantee);
      ELSE
        RAISE NOTICE 'rollback: role % from the receipt no longer exists — it held NO privilege on %, so there is nothing to take back; skipped', _r.grantee, _r.object_id;
      END IF;
      CONTINUE;
    END IF;

    -- IDENTITY, NOT NAME. Fatal in BOTH directions, and deliberately so: a recorded
    -- GRANT would hand the observed role's privilege to a principal nobody observed,
    -- and a recorded REVOKE would strip a privilege from that same unobserved
    -- principal. Neither is the state this receipt describes.
    IF _r.grantee <> '' THEN
      SELECT r.oid INTO _live_oid FROM pg_roles r WHERE r.rolname = _r.grantee;
      IF _r.grantee_oid IS NULL THEN
        -- Captured by an EARLIER revision that recorded no OID, so identity cannot be
        -- checked at all. Refusing is the honest reading: this rollback cannot tell
        -- whether the role it is about to touch is the one that was observed.
        _unrestorable := _unrestorable || format('%s (recorded for role %s by an earlier revision that did not capture the role identity; it cannot be verified)',
                                                 _r.object_id, _r.grantee);
        CONTINUE;
      ELSIF _live_oid <> _r.grantee_oid THEN
        _unrestorable := _unrestorable || format('%s (role %s was DROPPED and RECREATED since the lock — recorded identity %s, current %s; the recorded privilege belongs to a principal that no longer exists)',
                                                 _r.object_id, _r.grantee, _r.grantee_oid, _live_oid);
        CONTINUE;
      END IF;
    END IF;
    IF _r.has_execute THEN
      IF _r.grantee = '' THEN
        EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO PUBLIC', _obj_ident);
      ELSE
        EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO %I', _obj_ident, _r.grantee);
      END IF;
    ELSE
      -- Recorded as NOT held before the lock. If the lock created it, take it back.
      IF _r.grantee = '' THEN
        EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC', _obj_ident);
      ELSE
        EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM %I', _obj_ident, _r.grantee);
      END IF;
    END IF;
    _restored := _restored + 1;
  END LOOP;

  -- Tables: return RLS to the recorded setting, in whichever direction that is.
  FOR _r IN
    SELECT object_id, rls_enabled
    FROM public.privileged_function_exposure_lock_receipt_20260819
    WHERE object_kind = 'table'
  LOOP
    -- THE SAME CLASS, SWEPT. The function branch above was made fatal first and this
    -- one was left emitting a NOTICE — patching the cited line and not the class is
    -- this branch's signature defect, and an independent review (openrouter,
    -- 20/08/2026) caught it here within one round. There is no benign half for a
    -- table: unlike a privilege, an RLS setting is not "held or not held" by a
    -- principal that may have gone away — the recorded object itself is missing, so
    -- NEITHER recorded value can be re-established, and committing would consume the
    -- receipt and destroy the only record of what the pre-state was.
    _obj_oid := to_regclass(_r.object_id);
    IF _obj_oid IS NULL THEN
      _unrestorable := _unrestorable || format('%s (recorded RLS %s; the table no longer exists)',
                                               _r.object_id,
                                               CASE WHEN _r.rls_enabled THEN 'ENABLED' ELSE 'DISABLED' END);
      CONTINUE;
    END IF;

    -- The same wrong-object hazard, through regclass rather than regprocedure, and
    -- swept in the same breath rather than after the next review round finds it.
    SELECT n.nspname, c.relname, format('%I.%I', n.nspname, c.relname)
      INTO _obj_schema, _obj_name, _obj_ident
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.oid = _obj_oid;

    IF _obj_schema <> 'public'
       OR _obj_name NOT IN ('founder_uid_migration_20260810', 'founder_uid_conflict_resolution_20260810') THEN
      _unrestorable := _unrestorable || format('%s (resolves to %I.%I, which is NOT one of the two dated tables in public this rollback restores — refusing to change row-level security on an object the receipt did not name)',
                                               _r.object_id, _obj_schema, _obj_name);
      CONTINUE;
    END IF;

    IF _r.rls_enabled THEN
      EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', _obj_ident);
    ELSE
      EXECUTE format('ALTER TABLE %s DISABLE ROW LEVEL SECURITY', _obj_ident);
    END IF;
    _restored := _restored + 1;
  END LOOP;

  -- FAIL CLOSED ON A PARTIAL RESTORE. Everything above runs inside the single
  -- transaction this file opens, so raising here changes nothing at all — which is
  -- the point. The operator is told exactly which recorded privileges could not be
  -- put back and can recreate the dropped role or function and re-run, instead of
  -- being handed a "recovery complete" for a state that was never recovered.
  IF array_length(_unrestorable, 1) > 0 THEN
    RAISE EXCEPTION
      'rollback aborted: % recorded privilege(s) cannot be restored, so this would return a state DIFFERENT from the one the receipt recorded: %. Recreate the missing role(s)/function(s) and re-run, or restore the ACLs by hand from a backup. Nothing has been changed.',
      array_length(_unrestorable, 1), array_to_string(_unrestorable, '; ');
  END IF;

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

  -- BOTH SIDES MUST MEASURE THE SAME PREDICATE OVER THE SAME IDENTITIES.
  --
  --    WHAT WAS WRONG. `_exposed` above resolves live catalogue entries and
  --    requires `p.prosecdef`; `_expected` selected receipt rows by unanchored
  --    TEXT PREFIX (`object_id LIKE 'prune_integration_history%'`) and applied no
  --    definer test at all. Two asymmetries followed, and neither is theoretical:
  --
  --      * A recorded function that is NOT SECURITY DEFINER counts in `_expected`
  --        and can never count in `_exposed`. A CORRECT rollback — one that put
  --        that function's anon grant back exactly as recorded — then aborted with
  --        "the rollback did not take", refusing a recovery that had worked. Pinned
  --        by prove-rollback-fidelity.sh case 8.
  --      * `object_id` is `regprocedure::text`, whose rendering depends on
  --        search_path: the same function is `prune_integration_history()` or
  --        `public.prune_integration_history()`. A prefix anchored at the bare name
  --        silently matches ZERO rows in the qualified form, so `_expected`
  --        collapses to 0 and the equality test rubber-stamps whatever the restore
  --        did — the failure mode this post-condition exists to prevent.
  --
  --    Resolving each receipt row through `to_regprocedure` and re-asking the SAME
  --    three predicates (`public`, `prosecdef`, the three names) removes both. It
  --    also means a receipt row whose function no longer exists cannot inflate
  --    `_expected` — that entry is not silently dropped, it is caught upstream by
  --    the unrestorable-entry guard in the restore block, which aborts before this
  --    check is ever reached.
  SELECT count(DISTINCT r.object_id) INTO _expected
  FROM public.privileged_function_exposure_lock_receipt_20260819 r
  JOIN pg_proc p ON p.oid = to_regprocedure(r.object_id)
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE r.object_kind = 'function'
    AND r.has_execute
    AND r.grantee IN ('anon', '')
    AND n.nspname = 'public'
    AND p.prosecdef
    AND p.proname IN ('custom_access_token_hook', 'before_user_created_hook', 'prune_integration_history');

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

-- ── CONSUME THE RECEIPT — it describes a lock that no longer exists ──────────
--
--    The receipt records the state before THIS lock. Once the lock is rolled back
--    that record is spent, and keeping it is actively dangerous: the forward file
--    captures ONCE and keeps the original, so a stale receipt is replayed by every
--    later rollback.
--
--    The concrete hazard an independent review (openrouter, 19/08/2026) described:
--    anon EXECUTE true initially -> apply -> down -> an operator MANUALLY revokes
--    anon -> apply -> down. The second down replays the FIRST pre-state and grants
--    anon EXECUTE again, silently undoing a deliberate security change with a
--    procedure the operator believes is a rollback.
--
--    Deleting the rows here makes the lifecycle honest and self-describing:
--      rows present = a lock is in effect, and this is the state to restore
--      rows absent  = no lock in effect, so the next apply captures fresh
--    The TABLE is kept so the pair stays idempotent and the next apply's
--    empty-receipt check still has something to read.
DELETE FROM public.privileged_function_exposure_lock_receipt_20260819;

DO $$ BEGIN
  RAISE NOTICE 'rollback: pre-state receipt consumed — the next apply will capture the CURRENT state, not this one';
END $$;

COMMIT;
