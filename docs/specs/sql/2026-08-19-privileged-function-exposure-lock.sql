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
-- PROVEN  : scripts/ship-gates/repro-prod-exposure.sh runs END TO END (exit 0). It
--           reproduces the observed production red (2/3/4 rows), applies this file
--           with its post-condition holding, and then asserts at step 4 that the gate
--           returns EXACTLY ONE row — the deliberate retention above. Zero rows fails
--           it (that state is only reachable by revoking the retention, an outage) and
--           any other row fails it (a real exposure survived).
--
--           CORRECTED 19/08/2026. This block previously said the repro STOPS at step 4
--           and that login survival, no-over-reach and reversible rollback are "NOT
--           REACHED and NOT proven". That was true, and it was true because step 4
--           itself demanded the outage — so steps 5-8 never executed and their own
--           stale assertions stayed invisible. Step 4 now asserts the real contract,
--           and steps 5-8 run: login survives (supabase_auth_admin keeps EXECUTE on
--           both hooks), the fix does not over-reach (an unrelated anon-executable
--           function is untouched), the rollback restores the recorded pre-state and
--           consumes its receipt, and the re-grant is shown load-bearing at step 8.
--           Leaving this paragraph would have understated what is proven in the file
--           the founder actually pastes.
--
--           scripts/ship-gates/prove-rls-execute-coupling.sh is separately proven
--           (exit 0, mutation-checked) and demonstrates why the deliberate row stays.
--
-- SCOPE, stated precisely (corrected 20/08/2026). This file addresses ship-board Rank 1
-- items 1-7 (docs/mission-control/ship-board.md), BUT IT DOES NOT CLOSE THEM ALL:
--   * items 1-5 and 7 are closed by applying this file;
--   * ITEM 6 IS DELIBERATELY NOT CLOSED — `authenticated` KEEPS EXECUTE on
--     get_my_org_ids, because revoking it takes production down. Whether that
--     retention is an exposure or a required RLS pattern is FOUNDER-QUEUE item F9 and
--     is UNRESOLVED. Until F9 is answered, item 6 is CONTESTED, not fixed.
-- The previous wording said this file "closes items 1-7" full stop, which told an
-- operator the retained row was handled when the whole point is that it is not. An
-- independent review caught it in the file the founder actually pastes, which is the
-- worst place for that particular overstatement. The original sentence follows for
-- context:
-- Closes ship-board Rank 1 items 1-5 and 7 (docs/mission-control/ship-board.md), the
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

-- ── 0: OBJECT-SET GUARD — refuse a database that does not carry the objects
--      this file locks. NOT a project-identity check; see the limits below. ────
--
--    NAMED HONESTLY, 20/08/2026. This block was headed "refuse a database that is
--    not this project", which is stronger than what it establishes and was flagged
--    by an independent review (openrouter) as an operator-facing claim the code does
--    not support. What it actually proves is that `public` holds all four of the
--    names this file locks. WHAT IT DOES NOT ESTABLISH: it does not bind the
--    database to the Supabase project `lksfwktwtmyznckodsau`, does not compare
--    argument signatures, bodies, owners or SECURITY DEFINER status, and does not
--    require either dated table (they are legitimately absent on some databases, and
--    the block below says so). A DIFFERENT database that happens to carry one
--    function under each of those four names IS ADMITTED, and the name-driven loops
--    then revoke on it — that residual is demonstrated, not asserted, by
--    prove-apply-identity.sh case 6, so this paragraph cannot quietly drift away
--    from the behaviour. The operator-side defence for it is the connection string,
--    which no in-database check can audit.
--
--    WHY THIS EXISTS. Two independent cross-agent reviews (codex, 19/08/2026)
--    and a concurrent session all reproduced the same defect by different
--    routes: run this file against a FRESH EMPTY database under
--    ON_ERROR_STOP=1 and it revokes on 0 functions, finds both dated tables
--    absent, prints "post-condition OK", COMMITs and exits 0. The founder
--    pastes this by hand into a SQL editor, and pasting into the wrong project
--    is the exact operator error an identity assertion exists to catch. A
--    vacuous success is worse than a failure here, because it is reported as
--    recovery.
--
--    The post-condition below could not catch it: it counts violations among
--    the hooks that EXIST, so an absent hook contributes zero violations and
--    the total is trivially satisfied. Absence of a violation is not presence
--    of the fix. That is a floor on the wrong quantity, and it is why this
--    guard checks the OBJECT SET before anything is mutated rather than the
--    violation count afterwards.
--
--    The matching guard in the .down.sql requires all four functions. This one
--    requires the same four, for the same reason: a partial match does not
--    establish the object set this file operates on, whether the shortfall is a
--    name collision elsewhere or drift on the intended database.
DO $$
DECLARE
  _fns   int;
  _found text;
BEGIN
  -- COUNT DISTINCT NAMES, not rows. `count(*)` counts OVERLOADS: a database holding
  -- four overloads of custom_access_token_hook and none of the other three names
  -- satisfied `= 4` and was admitted as this project — an independent review
  -- (openrouter, 19/08/2026) found it. The name-driven revoke loops below would then
  -- have stripped privileges from four unrelated functions and committed. Counting
  -- the wrong thing is how an identity check becomes a coincidence check.
  SELECT count(DISTINCT p.proname),
         coalesce(string_agg(DISTINCT p.proname, ', ' ORDER BY p.proname), '<none>')
    INTO _fns, _found
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname IN (
      'custom_access_token_hook',
      'before_user_created_hook',
      'prune_integration_history',
      'get_my_org_ids'
    );

  IF _fns <> 4 THEN
    RAISE EXCEPTION
      'apply aborted: this file expects all 4 privileged functions it locks (custom_access_token_hook, before_user_created_hook, prune_integration_history, get_my_org_ids) in schema public, found % (%). Check the connection FIRST — a partial or empty match is what pasting into the wrong database looks like. It can also mean drift or object loss on the RIGHT database, so this is a mismatch of the object set, not proof of either. NOTHING has been changed.',
      _fns, _found;
  END IF;

  RAISE NOTICE 'apply identity guard: all 4 target functions present';
END
$$;

-- ── 0b: PRE-STATE RECEIPT — record what is actually here, before touching it. ─
--
--    WHY. The rollback used to restore a HARD-CODED presumed pre-state: it
--    unconditionally granted EXECUTE to anon, authenticated and PUBLIC on the
--    functions it names. An independent review (codex, 19/08/2026) seeded an
--    owner-only custom_access_token_hook with anon EXECUTE FALSE, ran this file
--    and then the rollback, and anon EXECUTE came back TRUE. A break-glass path
--    that can CREATE an exposure that never existed is not a recovery path — it
--    is a second incident, run by someone who believes they are recovering.
--
--    A rollback can only restore the prior state if the prior state was
--    OBSERVED. So it is captured here, in the same transaction that changes it,
--    and the .down.sql replays exactly these rows and REFUSES if they are absent.
--
--    Captured ONCE. If this file is applied a second time the receipt already
--    holds the true pre-lock state; re-capturing would overwrite it with the
--    locked state and silently destroy the only record of what to restore.
CREATE TABLE IF NOT EXISTS public.privileged_function_exposure_lock_receipt_20260819 (
  captured_at timestamptz NOT NULL DEFAULT now(),
  object_kind text        NOT NULL CHECK (object_kind IN ('function', 'table')),
  object_id   text        NOT NULL,
  grantee     text,
  -- A ROLE NAME IS NOT A ROLE IDENTITY. The rollback replays these rows by NAME,
  -- so if a role is dropped and a different role is created with the same name
  -- between apply and rollback, a name-resolved GRANT hands the recorded privilege
  -- to a principal nobody observed. The rollback used to carry a comment saying
  -- that hazard was "announced on the operator's terminal" — it was not: the skip
  -- fired only when the name was ABSENT, and a same-name replacement resolved and
  -- was granted silently. Reported by an independent review (openrouter,
  -- 20/08/2026). The OID is the identity Postgres actually keeps, so it is
  -- captured here and compared there.
  grantee_oid oid,
  has_execute boolean,
  rls_enabled boolean
);

-- A receipt table created by an EARLIER revision of this file has no grantee_oid
-- column, and `CREATE TABLE IF NOT EXISTS` above would leave it that way — the
-- INSERT below would then fail mid-migration. Added explicitly so the pair stays
-- applicable to a database that already carries the older table.
ALTER TABLE public.privileged_function_exposure_lock_receipt_20260819
  ADD COLUMN IF NOT EXISTS grantee_oid oid;

--    This table is created in `public`, which is precisely the surface this file
--    exists to lock. Items 4 and 5 on the ship board ARE two RLS-disabled tables
--    in public left behind by a dated migration — shipping a third would be the
--    fix introducing the defect it repairs, and prod-exposure.sql's first query
--    would flag it on the very next run. It is locked in the same breath as its
--    creation: RLS on, and no grant to any untrusted role. Nothing but the table
--    owner reads a record of who could execute what.
ALTER TABLE public.privileged_function_exposure_lock_receipt_20260819 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.privileged_function_exposure_lock_receipt_20260819 FROM PUBLIC;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE ALL ON TABLE public.privileged_function_exposure_lock_receipt_20260819 FROM anon';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'REVOKE ALL ON TABLE public.privileged_function_exposure_lock_receipt_20260819 FROM authenticated';
  END IF;
END $$;

DO $$
DECLARE
  _rows int;
BEGIN
  SELECT count(*) INTO _rows FROM public.privileged_function_exposure_lock_receipt_20260819;

  IF _rows > 0 THEN
    RAISE NOTICE 'pre-state receipt: already captured (% row(s)) — keeping the ORIGINAL capture, not overwriting it', _rows;
    RETURN;
  END IF;

  -- One row per (function, grantee) for the roles this file can revoke, PUBLIC
  -- recorded as the empty-string grantee to match aclitem's own convention.
  --
  --    THE PRIVILEGE TEST MUST BE **DIRECT**, NOT EFFECTIVE. An adversarial
  --    review pass flagged this and it reproduces exactly:
  --      GRANT EXECUTE ON FUNCTION f() TO PUBLIC;  -- no grant to anon at all
  --      has_function_privilege('anon', f, 'EXECUTE')  -> TRUE
  --      direct aclitem for anon                       -> ABSENT
  --      proacl                                        -> {owner=X/owner,=X/owner}
  --    has_function_privilege reports the EFFECTIVE privilege, which includes
  --    anything inherited through PUBLIC. Capturing with it records anon as a
  --    holder when only PUBLIC ever held the grant, and the rollback then issues
  --    a DIRECT `GRANT ... TO anon` that never existed. Effective access is
  --    unchanged the instant it runs, which is why it is easy to miss — but the
  --    ACL shape is now wrong, and the next person who revokes PUBLIC expecting
  --    anon's access to go with it will find anon still executing.
  --
  --    That is this branch's own root cause, reappearing inside the fix:
  --    revoking from PUBLIC is not revoking from anon, and by the same token a
  --    grant to PUBLIC is not a grant to anon. Read the aclitem, not the answer
  --    Postgres computes from it.
  --
  --    Default privileges are handled explicitly: proacl IS NULL means the
  --    function carries the built-in default, which grants EXECUTE to PUBLIC and
  --    to nobody else directly.
  INSERT INTO public.privileged_function_exposure_lock_receipt_20260819
    (object_kind, object_id, grantee, grantee_oid, has_execute)
  SELECT 'function',
         -- SCHEMA-QUALIFIED, ALWAYS. `p.oid::regprocedure::text` omits the schema
         -- whenever the schema is visible on search_path, so the receipt recorded
         -- `prune_integration_history()` — a name whose meaning depends on the
         -- search_path of whoever runs the rollback later. Built explicitly here so the
         -- receipt says which object it means.
         format('%I.%I(%s)', n.nspname, p.proname, pg_catalog.oidvectortypes(p.proargtypes)),
         -- oidvectortypes, NOT pg_get_function_identity_arguments: the latter renders
         -- `event jsonb` — argument NAMES included — and `to_regprocedure` rejects that
         -- with `invalid type name "event jsonb"`, so the rollback could not resolve a
         -- single row it had just written. Caught by running the pair, not by reading it.
         -- proargtypes is the IN-argument vector, which is exactly the identity
         -- signature GRANT and REVOKE take.
         g.grantee,
         -- NULL for PUBLIC, which is not a role and has no identity to confuse.
         (SELECT r3.oid FROM pg_roles r3 WHERE r3.rolname = g.grantee),
         CASE
           WHEN g.grantee = '' THEN
             p.proacl IS NULL
             OR EXISTS (SELECT 1 FROM aclexplode(p.proacl) a
                         WHERE a.grantee = 0 AND a.privilege_type = 'EXECUTE')
           ELSE
             p.proacl IS NOT NULL
             AND EXISTS (SELECT 1 FROM aclexplode(p.proacl) a
                          WHERE a.grantee = (SELECT r2.oid FROM pg_roles r2 WHERE r2.rolname = g.grantee)
                            AND a.privilege_type = 'EXECUTE')
         END
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  CROSS JOIN (VALUES ('anon'), ('authenticated'), ('supabase_auth_admin'), ('')) AS g(grantee)
  WHERE n.nspname = 'public'
    AND p.proname IN (
      'custom_access_token_hook',
      'before_user_created_hook',
      'prune_integration_history',
      'get_my_org_ids'
    )
    AND (g.grantee = '' OR EXISTS (SELECT 1 FROM pg_roles r WHERE r.rolname = g.grantee));

  INSERT INTO public.privileged_function_exposure_lock_receipt_20260819
    (object_kind, object_id, rls_enabled)
  SELECT 'table', format('%I.%I', n.nspname, c.relname), c.relrowsecurity
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname IN ('founder_uid_migration_20260810', 'founder_uid_conflict_resolution_20260810');

  SELECT count(*) INTO _rows FROM public.privileged_function_exposure_lock_receipt_20260819;
  IF _rows = 0 THEN
    RAISE EXCEPTION
      'apply aborted: the pre-state receipt captured 0 rows, so the rollback would have nothing to restore and would fall back to guessing. Nothing has been changed.';
  END IF;
  RAISE NOTICE 'pre-state receipt: captured % row(s) — the rollback will restore exactly this state', _rows;
END
$$;

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
--    pasted against a database that does not hold the expected objects fails with
--    something diagnosable. (It names offenders; it does not identify a project.)
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
