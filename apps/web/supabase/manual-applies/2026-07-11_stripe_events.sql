-- ============================================================================
-- MANUAL PROD APPLY — stripe_events ledger (UNI-2328)
-- Target: prod lksfwktwtmyznckodsau  ·  Date: 11/07/2026  ·  en-AU
--
-- WHY MANUAL: the Supabase branch-promote workflow is broken for this project
-- (prod's migration history won't replay), so schema lands as reviewed direct
-- DDL — same path as the other files in this directory. Requires Phill's
-- approval; do not run autonomously.
--
-- Mirrors supabase/migrations/20260711100000_stripe_events.sql exactly.
-- SAFE TO RE-RUN: every object is guarded (IF NOT EXISTS). Creates one table +
-- one index; enables + forces RLS with no policy (service_role-only writes from
-- the /api/webhooks/stripe route). It never drops or alters existing objects.
--
-- AFTER APPLYING: register the webhook endpoint https://unite-group.in/api/
-- webhooks/stripe in the Stripe dashboard; the signing secret it returns must
-- match STRIPE_WEBHOOK_SECRET already set in prod.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.stripe_events (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id  TEXT NOT NULL UNIQUE,
  type             TEXT NOT NULL,
  api_version      TEXT,
  livemode         BOOLEAN NOT NULL DEFAULT FALSE,
  payload          JSONB NOT NULL,
  processing_error TEXT,
  received_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS stripe_events_type_received_idx
  ON public.stripe_events(type, received_at DESC);

ALTER TABLE public.stripe_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_events FORCE ROW LEVEL SECURITY;

-- Verify
SELECT to_regclass('public.stripe_events') AS stripe_events_table;
