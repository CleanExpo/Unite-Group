-- 20260513000400_ccw_support_tickets.sql
-- Wave 5.2 — CCW first-client treatment.
-- Ledger of every Toby/CCW inbound support touch. Populated by
-- ~/.hermes/scripts/toby-watch.py (Gmail/Composio) and consumed by
-- swarm/cs.py + swarm/six_pager.py to surface CCW as the first row in
-- the daily 6-pager CS section.

BEGIN;

CREATE TABLE IF NOT EXISTS public.ccw_support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL CHECK (source IN ('gmail','manual','linear')),
  gmail_message_id text UNIQUE,            -- nullable; only for gmail source
  gmail_thread_id text,
  subject text,
  from_email text NOT NULL,
  to_email text,
  received_at timestamptz NOT NULL,        -- when ticket landed
  first_response_at timestamptz,           -- when Phill (or anyone) first replied to this thread
  resolved_at timestamptz,
  state text NOT NULL DEFAULT 'open' CHECK (state IN ('open','responded','resolved','escalated','closed')),
  priority text DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  notified_at timestamptz,                 -- when Telegram alert fired (single-shot dedup)
  customer_org text NOT NULL DEFAULT 'ccw',
  snippet text,
  raw_metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ccw_tickets_state ON public.ccw_support_tickets (state, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_ccw_tickets_received ON public.ccw_support_tickets (received_at DESC);

ALTER TABLE public.ccw_support_tickets ENABLE ROW LEVEL SECURITY;

-- Service-role only (matches developer_profile pattern; no end-user RLS surface yet)
CREATE POLICY "service_role_full_access" ON public.ccw_support_tickets
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.ccw_tickets_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ccw_tickets_updated_at_trg ON public.ccw_support_tickets;
CREATE TRIGGER ccw_tickets_updated_at_trg
  BEFORE UPDATE ON public.ccw_support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.ccw_tickets_updated_at();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ccw_support_tickets TO service_role;

COMMIT;
