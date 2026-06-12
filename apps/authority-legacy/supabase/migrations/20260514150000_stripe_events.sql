-- Stripe event ledger + provisioning queue
--
-- stripe_events:  append-only audit of every webhook event received, with the
-- raw payload preserved for replay and forensic inspection. Dedupe by
-- stripe_event_id ensures Stripe's at-least-once delivery doesn't double-fire
-- side effects.
--
-- stripe_provisioning_queue:  rows the swarm worker picks up to trigger the
-- Hour-1 portal provisioning when a first-payment lands. Pull pattern keeps
-- the webhook handler small and bounded.

CREATE TABLE IF NOT EXISTS public.stripe_events (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id     TEXT NOT NULL UNIQUE,
  type                TEXT NOT NULL,
  api_version         TEXT,
  livemode            BOOLEAN NOT NULL DEFAULT FALSE,
  payload             JSONB NOT NULL,
  processing_error    TEXT,
  received_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS stripe_events_type_received_idx
  ON public.stripe_events(type, received_at DESC);

CREATE TABLE IF NOT EXISTS public.stripe_provisioning_queue (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_customer_id  TEXT NOT NULL,
  nexus_slug          TEXT NOT NULL,
  trigger             TEXT NOT NULL,
  trigger_payload     JSONB NOT NULL DEFAULT '{}'::jsonb,
  status              TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','processing','done','failed')),
  processing_error    TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at        TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS stripe_provisioning_queue_pending_idx
  ON public.stripe_provisioning_queue(status, created_at)
  WHERE status = 'pending';

ALTER TABLE public.stripe_events                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_provisioning_queue    ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS stripe_events_service_all ON public.stripe_events;
CREATE POLICY stripe_events_service_all ON public.stripe_events FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

DROP POLICY IF EXISTS stripe_provisioning_service_all ON public.stripe_provisioning_queue;
CREATE POLICY stripe_provisioning_service_all ON public.stripe_provisioning_queue FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
