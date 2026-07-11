-- Stripe webhook event ledger (UNI-2328).
-- Append-only audit of every signature-verified Stripe webhook event. The
-- UNIQUE(stripe_event_id) constraint dedupes Stripe's at-least-once delivery so
-- the webhook handler is idempotent. Written only by the service role (the
-- webhook route); RLS is enabled + forced with no policy, so anon/authenticated
-- cannot read or write it while service_role bypasses RLS by design.

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
