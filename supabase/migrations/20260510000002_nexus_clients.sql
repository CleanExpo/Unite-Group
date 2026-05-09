-- Nexus Wave 1: clients table
-- Paying external retainer clients (CCW-CRM first)
-- Board Mandate: Nexus Wave 1

CREATE TABLE IF NOT EXISTS public.clients (
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

CREATE INDEX IF NOT EXISTS idx_clients_slug   ON public.clients (slug);
CREATE INDEX IF NOT EXISTS idx_clients_status ON public.clients (status);
CREATE INDEX IF NOT EXISTS idx_clients_plan   ON public.clients (plan);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on clients" ON public.clients
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated read clients" ON public.clients
  FOR SELECT TO authenticated USING (true);

COMMENT ON TABLE public.clients IS
  'Paying external retainer clients. Auto-provisioned on Stripe webhook. CCW is seed record.';
