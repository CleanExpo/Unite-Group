-- Ship-gate proof for the branch's central claim:
--   Postgres checks function EXECUTE against the QUERYING role when it evaluates
--   an RLS policy expression. SECURITY DEFINER on the callee does NOT exempt it.
--
-- Therefore revoking `authenticated` EXECUTE on get_my_org_ids() makes every
-- authenticated read of an org-scoped table fail. Run inside one transaction and
-- rolled back — nothing persists.

BEGIN;

CREATE SCHEMA rlsproof;

CREATE ROLE rlsproof_authenticated NOLOGIN;
GRANT rlsproof_authenticated TO current_user;

-- The tenancy helper, exactly as production has it: SECURITY DEFINER.
CREATE FUNCTION rlsproof.get_my_org_ids()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $fn$ SELECT '11111111-1111-1111-1111-111111111111'::uuid $fn$;

CREATE TABLE rlsproof.organizations (
  id uuid PRIMARY KEY
);
INSERT INTO rlsproof.organizations (id)
VALUES ('11111111-1111-1111-1111-111111111111');

ALTER TABLE rlsproof.organizations ENABLE ROW LEVEL SECURITY;

-- Org-membership-scoped policy that CALLS the definer, as production does.
CREATE POLICY orgs_select ON rlsproof.organizations
  FOR SELECT TO rlsproof_authenticated
  USING (id IN (SELECT rlsproof.get_my_org_ids()));

GRANT USAGE ON SCHEMA rlsproof TO rlsproof_authenticated;
GRANT SELECT ON rlsproof.organizations TO rlsproof_authenticated;

-- ── BEFORE: the role HOLDS EXECUTE on the helper ──────────────────────────
GRANT EXECUTE ON FUNCTION rlsproof.get_my_org_ids() TO rlsproof_authenticated;

SET LOCAL ROLE rlsproof_authenticated;
SELECT 'BEFORE_REVOKE_ROWS=' || count(*)::text FROM rlsproof.organizations;
RESET ROLE;

-- ── THE REVOKE UNDER TEST ─────────────────────────────────────────────────
REVOKE ALL ON FUNCTION rlsproof.get_my_org_ids() FROM PUBLIC;
REVOKE ALL ON FUNCTION rlsproof.get_my_org_ids() FROM rlsproof_authenticated;

-- ── AFTER: same read, same role. Expect: permission denied for function ───
SET LOCAL ROLE rlsproof_authenticated;
SELECT 'AFTER_REVOKE_ROWS=' || count(*)::text FROM rlsproof.organizations;
RESET ROLE;

ROLLBACK;
