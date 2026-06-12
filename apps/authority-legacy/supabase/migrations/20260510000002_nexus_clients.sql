-- Nexus Wave 1: nexus_clients table
-- Paying external retainer clients (CCW-CRM first)
-- Named nexus_clients: legacy multi-tenant 'clients' table exists with different schema
-- Board Mandate: Nexus Wave 1

CREATE TABLE IF NOT EXISTS public.nexus_clients (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                    TEXT UNIQUE NOT NULL,
  company_name            TEXT NOT NULL,
  contact_name            TEXT,
  contact_email           TEXT UNIQUE,
  website_url             TEXT,
  stripe_customer_id      TEXT,
  stripe_subscription_id  TEXT,
  plan                    TEXT CHECK (plan IN ('starter', 'growth', 'pro')),
  status                  TEXT NOT NULL DEFAULT 'active'
                          CHECK (status IN ('active', 'paused', 'churned', 'onboarding')),
  linear_project_id       TEXT,
  onboarded_at            TIMESTAMPTZ,
  pi_ceo_key              TEXT,
  brand_config            JSONB DEFAULT '{}',
  created_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nexus_clients_slug   ON public.nexus_clients (slug);
CREATE INDEX IF NOT EXISTS idx_nexus_clients_status ON public.nexus_clients (status);
CREATE INDEX IF NOT EXISTS idx_nexus_clients_plan   ON public.nexus_clients (plan);

ALTER TABLE public.nexus_clients ENABLE ROW LEVEL SECURITY;

-- Postgres does not support CREATE POLICY IF NOT EXISTS — drop first so the
-- migration is idempotent when re-applied to an already-seeded sandbox/prod.
DROP POLICY IF EXISTS "Service role full access on nexus_clients" ON public.nexus_clients;
CREATE POLICY "Service role full access on nexus_clients" ON public.nexus_clients
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated read nexus_clients" ON public.nexus_clients;
CREATE POLICY "Authenticated read nexus_clients" ON public.nexus_clients
  FOR SELECT TO authenticated USING (true);

COMMENT ON TABLE public.nexus_clients IS
  'Nexus paying retainer clients. Auto-provisioned on Stripe webhook. Separate from legacy clients table.';
