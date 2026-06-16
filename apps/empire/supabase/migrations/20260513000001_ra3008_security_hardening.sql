-- RA-3008 — Wave 2 multi-tenant security hardening.
--
-- Two changes ship together as defense-in-depth on the auth/RLS layer:
--
-- 1. Profiles role-lock trigger
--    Prevents a `client` from escalating themselves to `founder` by
--    UPDATE-ing their own `profiles.role` column. Only `service_role`
--    (Postgres BYPASSRLS) and explicit DB superuser may change role.
--
-- 2. Sensitive-column lockdown (3 tables, ERROR-severity advisor finding)
--    `agent_consensus_scores`, `agent_negotiation_proposals`,
--    `negotiation_transcripts` all expose `session_id` via the public
--    REST API without RLS. This is the worst-shape finding in the
--    Supabase Advisor scan (security 0023). Enable RLS + lock to
--    service-role only — internal agent infrastructure that uses the
--    service-role key continues working; anon-key + authenticated-key
--    callers stop seeing these rows immediately.
--
-- See `~/2nd Brain/Wiki/unite-group-rls-audit-2026-05-12.md` for the
-- full audit including the 71 rls_disabled_in_public + 84 security_definer_view
-- findings deliberately left to follow-up PRs (each requires per-table
-- workspace-isolation policy design).

-- ──────────────────────────────────────────────────────────────────────────
-- 1. Profiles role-lock trigger
-- ──────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.enforce_profiles_role_immutability()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    -- Allow only when the caller is the service role (postgres) or
    -- an explicit DB-superuser session.
    IF (current_setting('request.jwt.claims', true)::jsonb->>'role') = 'service_role'
       OR session_user IN ('postgres', 'supabase_admin') THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION
      'profiles.role is immutable to non-service roles (RA-3008). '
      'Current claims role: %, session_user: %.',
      (current_setting('request.jwt.claims', true)::jsonb->>'role'),
      session_user
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN NEW;
END;
$$;

-- Idempotent install — drop + recreate so re-deploys work cleanly.
DROP TRIGGER IF EXISTS enforce_profiles_role_immutability ON public.profiles;
CREATE TRIGGER enforce_profiles_role_immutability
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_profiles_role_immutability();

COMMENT ON FUNCTION public.enforce_profiles_role_immutability() IS
  'RA-3008: prevents privilege escalation by blocking UPDATE on profiles.role from non-service-role contexts.';

-- ──────────────────────────────────────────────────────────────────────────
-- 2. Sensitive-column lockdown (3 tables)
-- ──────────────────────────────────────────────────────────────────────────

ALTER TABLE public.agent_consensus_scores     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_negotiation_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.negotiation_transcripts    ENABLE ROW LEVEL SECURITY;

-- Service-role-only access. The internal agent workers connect via the
-- service-role key which BYPASSes RLS in Postgres, so they keep working.
-- Anon-key + authenticated-key REST callers get an empty result set.
DROP POLICY IF EXISTS service_role_only ON public.agent_consensus_scores;
CREATE POLICY service_role_only
  ON public.agent_consensus_scores
  FOR ALL
  USING ((current_setting('request.jwt.claims', true)::jsonb->>'role') = 'service_role')
  WITH CHECK ((current_setting('request.jwt.claims', true)::jsonb->>'role') = 'service_role');

DROP POLICY IF EXISTS service_role_only ON public.agent_negotiation_proposals;
CREATE POLICY service_role_only
  ON public.agent_negotiation_proposals
  FOR ALL
  USING ((current_setting('request.jwt.claims', true)::jsonb->>'role') = 'service_role')
  WITH CHECK ((current_setting('request.jwt.claims', true)::jsonb->>'role') = 'service_role');

DROP POLICY IF EXISTS service_role_only ON public.negotiation_transcripts;
CREATE POLICY service_role_only
  ON public.negotiation_transcripts
  FOR ALL
  USING ((current_setting('request.jwt.claims', true)::jsonb->>'role') = 'service_role')
  WITH CHECK ((current_setting('request.jwt.claims', true)::jsonb->>'role') = 'service_role');

COMMENT ON TABLE public.agent_consensus_scores IS
  'RA-3008: locked to service-role only. Internal agent infra reads/writes via service-role JWT (BYPASSRLS). External API callers see empty result.';
COMMENT ON TABLE public.agent_negotiation_proposals IS
  'RA-3008: locked to service-role only. See agent_consensus_scores comment.';
COMMENT ON TABLE public.negotiation_transcripts IS
  'RA-3008: locked to service-role only. See agent_consensus_scores comment.';
