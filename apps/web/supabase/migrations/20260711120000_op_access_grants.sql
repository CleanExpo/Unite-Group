-- 1Password access grants (UNI-2310).
-- A grant is a short-TTL, founder-approved authorisation for the agent to read
-- from 1Password via the SDK (src/lib/integrations/onepassword.ts). With no
-- active grant the read helper refuses — this table IS the authorisation lane
-- and, by (founder_id + reason + created_at), its own audit trail.
--
-- Written by the service role (the grant route / read gate). RLS is enabled +
-- forced with a founder-scoped policy so the founder can read their own grants
-- from the client; service_role bypasses RLS by design.

CREATE TABLE IF NOT EXISTS public.op_access_grants (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_id UUID NOT NULL,
  reason     TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ
);

-- Hot path: "does founder X have an active (unrevoked, unexpired) grant?"
CREATE INDEX IF NOT EXISTS op_access_grants_active_idx
  ON public.op_access_grants(founder_id, expires_at DESC)
  WHERE revoked_at IS NULL;

ALTER TABLE public.op_access_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.op_access_grants FORCE ROW LEVEL SECURITY;

CREATE POLICY "founder_select" ON public.op_access_grants
  FOR SELECT USING (founder_id = auth.uid());
