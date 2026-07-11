-- ============================================================================
-- MANUAL PROD APPLY — op_access_grants (UNI-2310)
-- Target: prod lksfwktwtmyznckodsau  ·  Date: 11/07/2026  ·  en-AU
--
-- WHY MANUAL: the Supabase branch-promote workflow is broken for this project
-- (prod's migration history won't replay), so schema lands as reviewed direct
-- DDL — same path as the other files in this directory. Requires Phill's
-- approval; do not run autonomously.
--
-- Mirrors supabase/migrations/20260711120000_op_access_grants.sql exactly.
-- SAFE TO RE-RUN: table + index are guarded (IF NOT EXISTS). The CREATE POLICY
-- is NOT guarded (Postgres has no IF NOT EXISTS for policies) — if re-applying,
-- either DROP POLICY IF EXISTS "founder_select" ON public.op_access_grants first,
-- or skip the final statement. It never drops or alters existing data.
--
-- AFTER APPLYING: nothing else is required to wire the feature — the grant route
-- and read gate consult this table directly. Set OP_SERVICE_ACCOUNT_TOKEN in prod
-- only when 1Password reads are actually wanted; until then the read helper
-- reports not-configured and the status panel shows 1Password as not_connected.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.op_access_grants (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_id UUID NOT NULL,
  reason     TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS op_access_grants_active_idx
  ON public.op_access_grants(founder_id, expires_at DESC)
  WHERE revoked_at IS NULL;

ALTER TABLE public.op_access_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.op_access_grants FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "founder_select" ON public.op_access_grants;
CREATE POLICY "founder_select" ON public.op_access_grants
  FOR SELECT USING (founder_id = auth.uid());

-- Verify
SELECT to_regclass('public.op_access_grants') AS op_access_grants_table;
