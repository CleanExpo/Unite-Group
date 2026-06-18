-- ============================================================================
-- MANUAL PROD APPLY — drip_campaigns reconciliation (GATED: destructive rename)
-- Target: prod lksfwktwtmyznckodsau  ·  Date: 18/06/2026  ·  en-AU
--
-- THE CONFLICT (verified 18/06/2026)
-- Prod's `drip_campaigns` is a DEAD workspace-era table (multi-tenant leftover from
-- the Unite-Hub absorption): scoped by `workspace_id NOT NULL`, columns
-- sequence_type/is_template/template_category, 0 rows. It has 4 FK dependents
-- (campaign_enrollments, campaign_execution_logs, campaign_steps, sent_emails) —
-- also workspace-era, none colliding with the repo's drip_* names.
--
-- The apps/web code (src/app/api/campaigns/drip/route.ts) expects a FOUNDER-scoped
-- drip_campaigns (.eq('founder_id'), inserts business_key/subject/body_html). The
-- two are incompatible tables sharing a name, so the drip feature has NEVER worked
-- on prod with current code.
--
-- RECONCILIATION
-- 1. Rename the dead workspace table out of the way (reversible; preserves it + its
--    4 dependents, whose FKs follow the OID).
-- 2. Create the founder-scoped drip model (drip_campaigns + drip_steps/enrollments/
--    events) — the portion excluded from 2026-06-18_apply_missing_tables_prod.sql §8.
--
-- ⚠️ GATED: Part 1 RENAMES a prod table. Destructive DDL — requires Phill's explicit
-- approval before running. Low risk (0 rows, reversible), but never autonomous.
-- Rollback for Part 1: ALTER TABLE public.drip_campaigns_legacy_workspace RENAME TO drip_campaigns;
-- ============================================================================

BEGIN;

-- ── Part 1: rename the dead workspace drip_campaigns (guarded — only if it is the
--            legacy workspace_id-scoped table AND has no founder_id) ─────────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='drip_campaigns' AND column_name='workspace_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='drip_campaigns' AND column_name='founder_id'
  ) THEN
    -- Guard against double-run: only rename if the legacy archive name is free.
    IF to_regclass('public.drip_campaigns_legacy_workspace') IS NULL THEN
      ALTER TABLE public.drip_campaigns RENAME TO drip_campaigns_legacy_workspace;
      RAISE NOTICE 'Renamed legacy workspace drip_campaigns -> drip_campaigns_legacy_workspace';
    END IF;
  END IF;
END $$;

-- ── Part 2: founder-scoped drip model (idempotent) ────────────────────────────
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;

-- contacts composite key required by the scoped FKs (guarded)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'contacts_id_founder_id_key' AND conrelid = 'public.contacts'::regclass) THEN
    ALTER TABLE public.contacts ADD CONSTRAINT contacts_id_founder_id_key UNIQUE (id, founder_id);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.drip_campaigns (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_key  text NOT NULL,
  name          text NOT NULL,
  subject       text NOT NULL,
  body_html     text NOT NULL,
  body_text     text,
  status        text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','paused','completed','partial','archived')),
  source        text NOT NULL DEFAULT 'api',
  metadata      jsonb NOT NULL DEFAULT '{}',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, founder_id)
);
CREATE TABLE IF NOT EXISTS public.drip_steps (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  campaign_id    uuid NOT NULL,
  step_order     integer NOT NULL CHECK (step_order > 0),
  subject        text NOT NULL,
  body_html      text NOT NULL,
  body_text      text,
  delay_minutes  integer NOT NULL DEFAULT 0 CHECK (delay_minutes >= 0),
  metadata       jsonb NOT NULL DEFAULT '{}',
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, founder_id),
  UNIQUE (campaign_id, step_order),
  FOREIGN KEY (campaign_id, founder_id) REFERENCES public.drip_campaigns(id, founder_id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS public.drip_enrollments (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  campaign_id         uuid NOT NULL,
  contact_id          uuid NOT NULL,
  email               text NOT NULL,
  name                text,
  status              text NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','paused','failed','cancelled')),
  current_step_order  integer NOT NULL DEFAULT 1 CHECK (current_step_order > 0),
  next_run_at         timestamptz NOT NULL DEFAULT now(),
  enrolled_at         timestamptz NOT NULL DEFAULT now(),
  completed_at        timestamptz,
  metadata            jsonb NOT NULL DEFAULT '{}',
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, founder_id),
  UNIQUE (campaign_id, contact_id),
  FOREIGN KEY (campaign_id, founder_id) REFERENCES public.drip_campaigns(id, founder_id) ON DELETE CASCADE,
  FOREIGN KEY (contact_id, founder_id) REFERENCES public.contacts(id, founder_id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS public.drip_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  campaign_id     uuid NOT NULL,
  enrollment_id   uuid NOT NULL,
  contact_id      uuid NOT NULL,
  step_id         uuid,
  event_type      text NOT NULL CHECK (event_type IN ('dry_run_processed','skipped','failed')),
  provider_send   text NOT NULL DEFAULT 'not_attempted',
  metadata        jsonb NOT NULL DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (campaign_id, founder_id) REFERENCES public.drip_campaigns(id, founder_id) ON DELETE CASCADE,
  FOREIGN KEY (enrollment_id, founder_id) REFERENCES public.drip_enrollments(id, founder_id) ON DELETE CASCADE,
  FOREIGN KEY (contact_id, founder_id) REFERENCES public.contacts(id, founder_id) ON DELETE CASCADE,
  FOREIGN KEY (step_id, founder_id) REFERENCES public.drip_steps(id, founder_id) ON DELETE SET NULL (step_id)
);

CREATE INDEX IF NOT EXISTS drip_campaigns_founder_status_idx ON public.drip_campaigns(founder_id, status);
CREATE INDEX IF NOT EXISTS drip_steps_founder_campaign_order_idx ON public.drip_steps(founder_id, campaign_id, step_order);
CREATE INDEX IF NOT EXISTS drip_enrollments_founder_campaign_status_idx ON public.drip_enrollments(founder_id, campaign_id, status, next_run_at);
CREATE INDEX IF NOT EXISTS drip_events_founder_campaign_created_idx ON public.drip_events(founder_id, campaign_id, created_at DESC);

ALTER TABLE public.drip_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drip_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drip_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drip_events ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.drip_campaigns, public.drip_steps, public.drip_enrollments, public.drip_events
  TO authenticated, service_role;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['drip_campaigns','drip_steps','drip_enrollments','drip_events'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_founder_all', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL USING (founder_id = auth.uid()) WITH CHECK (founder_id = auth.uid())', t || '_founder_all', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_service_role_all', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL USING (auth.role() = ''service_role'') WITH CHECK (auth.role() = ''service_role'')', t || '_service_role_all', t);
  END LOOP;
END $$;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['drip_campaigns','drip_steps','drip_enrollments'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I', t || '_updated_at', t);
    EXECUTE format('CREATE TRIGGER %I BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()', t || '_updated_at', t);
  END LOOP;
END $$;

COMMIT;

-- ── VERIFICATION ──────────────────────────────────────────────────────────────
SELECT
  to_regclass('public.drip_campaigns_legacy_workspace') AS legacy_archived,
  (SELECT column_name FROM information_schema.columns
     WHERE table_schema='public' AND table_name='drip_campaigns' AND column_name='founder_id') AS new_drip_campaigns_is_founder_scoped,
  to_regclass('public.drip_steps')       AS drip_steps,
  to_regclass('public.drip_enrollments') AS drip_enrollments,
  to_regclass('public.drip_events')      AS drip_events;
