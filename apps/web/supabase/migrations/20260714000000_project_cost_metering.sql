-- Project cost metering (WS1) — per-business cost + revenue → P&L.
--
-- Read-only ingestion writes raw_cost_event (immutable audit) and cost_record
-- (attributed, in AUD). Provider-agnostic: cost_source rows cover Vercel,
-- DigitalOcean, Stripe, Railway, Supabase, LLM APIs, ElevenLabs, Twilio, domains.
-- Service-role writes only; founder-scoped SELECT on the P&L tables via
-- businesses.founder_id. Audit/config tables are service-role-only (forced RLS,
-- no policy) — matching the stripe_events pattern.
--
-- Prepared for out-of-band apply via Supabase (never prisma db push). Additive
-- only; no changes to existing tables.

-- ── sources & raw audit ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.cost_source (
  id              TEXT PRIMARY KEY,          -- 'vercel','digitalocean','stripe',...
  name            TEXT NOT NULL,
  reachability    TEXT NOT NULL DEFAULT 'token'
                    CHECK (reachability IN ('token', 'key-gate')),
  native_currency TEXT NOT NULL DEFAULT 'USD',
  enabled         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.raw_cost_event (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cost_source_id TEXT NOT NULL REFERENCES public.cost_source(id),
  external_id    TEXT NOT NULL,              -- source's id for at-least-once dedupe
  match_key      TEXT NOT NULL,              -- resource attribution maps on
  period_start   DATE NOT NULL,
  period_end     DATE NOT NULL,
  amount         NUMERIC(14,4) NOT NULL,     -- native currency
  currency       TEXT NOT NULL,
  raw            JSONB NOT NULL DEFAULT '{}',
  ingested_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (cost_source_id, external_id, period_start)
);

-- ── attribution config ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.allocation_rule (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cost_source_id TEXT NOT NULL REFERENCES public.cost_source(id),
  match_key      TEXT NOT NULL,
  business_id    UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
  weight         NUMERIC(6,4) NOT NULL DEFAULT 1.0
                    CHECK (weight > 0 AND weight <= 1),
  note           TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── attributed cost & revenue (the P&L tables) ───────────────────────────────
CREATE TABLE IF NOT EXISTS public.cost_record (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- NULL business_id = an internal cost centre (tooling), metered for total
  -- burn but not billed to a client; excluded from the founder per-business view.
  business_id       UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
  cost_source_id    TEXT NOT NULL REFERENCES public.cost_source(id),
  raw_cost_event_id UUID REFERENCES public.raw_cost_event(id) ON DELETE CASCADE,
  period_start      DATE NOT NULL,
  period_end        DATE NOT NULL,
  amount_aud        NUMERIC(14,4) NOT NULL,
  allocation_note   TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Idempotent re-ingest: one row per (raw event, business). NULLS NOT DISTINCT
  -- so internal rows (null business_id) dedupe too (Postgres 15+).
  UNIQUE NULLS NOT DISTINCT (raw_cost_event_id, business_id)
);
CREATE INDEX IF NOT EXISTS cost_record_business_period_idx
  ON public.cost_record (business_id, period_start);

CREATE TABLE IF NOT EXISTS public.revenue_record (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id  UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end   DATE NOT NULL,
  amount_aud   NUMERIC(14,4) NOT NULL,
  stripe_ref   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (business_id, period_start, stripe_ref)
);
CREATE INDEX IF NOT EXISTS revenue_record_business_period_idx
  ON public.revenue_record (business_id, period_start);

-- ── data-quality queue (quarantine-first cleanse) ────────────────────────────
CREATE TABLE IF NOT EXISTS public.unattributed_cost (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raw_cost_event_id UUID NOT NULL REFERENCES public.raw_cost_event(id) ON DELETE CASCADE,
  reason            TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'open'
                      CHECK (status IN ('open', 'resolved')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.data_quality_flag (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity      TEXT NOT NULL,                 -- e.g. 'business:restoreassist'
  rule        TEXT NOT NULL,
  severity    TEXT NOT NULL DEFAULT 'warn'
                CHECK (severity IN ('info', 'warn', 'block')),
  status      TEXT NOT NULL DEFAULT 'open'
                CHECK (status IN ('open', 'quarantined', 'resolved')),
  evidence    JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- ── RLS ──────────────────────────────────────────────────────────────────────
-- P&L tables: founder-scoped SELECT via business ownership; service_role writes.
ALTER TABLE public.cost_record   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revenue_record ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cost_record_founder_read ON public.cost_record;
CREATE POLICY cost_record_founder_read ON public.cost_record FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = cost_record.business_id AND b.founder_id = auth.uid()
  ));

DROP POLICY IF EXISTS revenue_record_founder_read ON public.revenue_record;
CREATE POLICY revenue_record_founder_read ON public.revenue_record FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = revenue_record.business_id AND b.founder_id = auth.uid()
  ));

-- Config/audit tables: service-role only (forced RLS, no policy).
ALTER TABLE public.cost_source        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cost_source        FORCE ROW LEVEL SECURITY;
ALTER TABLE public.raw_cost_event     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raw_cost_event     FORCE ROW LEVEL SECURITY;
ALTER TABLE public.allocation_rule    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.allocation_rule    FORCE ROW LEVEL SECURITY;
ALTER TABLE public.unattributed_cost  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unattributed_cost  FORCE ROW LEVEL SECURITY;
ALTER TABLE public.data_quality_flag  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_quality_flag  FORCE ROW LEVEL SECURITY;

-- Seed the known cost sources (idempotent).
INSERT INTO public.cost_source (id, name, reachability, native_currency) VALUES
  ('vercel',       'Vercel',        'token',    'USD'),
  ('digitalocean', 'DigitalOcean',  'key-gate', 'USD'),
  ('stripe',       'Stripe',        'token',    'AUD'),
  ('railway',      'Railway',       'token',    'USD'),
  ('supabase',     'Supabase',      'token',    'USD'),
  ('anthropic',    'Anthropic',     'key-gate', 'USD'),
  ('openai',       'OpenAI',        'key-gate', 'USD'),
  ('elevenlabs',   'ElevenLabs',    'key-gate', 'USD'),
  ('twilio',       'Twilio',        'key-gate', 'USD'),
  ('domains',      'Domains',       'key-gate', 'AUD')
ON CONFLICT (id) DO NOTHING;
