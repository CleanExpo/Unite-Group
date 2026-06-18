-- ============================================================================
-- MANUAL PROD APPLY — campaigns reconciliation (GATED: destructive rename)
-- Target: prod lksfwktwtmyznckodsau  ·  Date: 18/06/2026  ·  en-AU
--
-- THE CONFLICT (verified 18/06/2026) — same class as the drip reconciliation.
-- Prod's `campaigns` is a DEAD workspace-era EMAIL campaign table (multi-tenant
-- leftover from the Unite-Hub absorption): scoped by `workspace_id`, columns
-- sent_count/opened_count/avg_open_rate/etc., 0 rows, 1 workspace-era FK dependent.
-- The apps/web code (api/campaigns/*, founder/campaigns, campaign-engine cron)
-- expects a FOUNDER-scoped SOCIAL campaign: .eq('founder_id'), columns
-- theme/objective/platforms/post_count/brand_profile_id. Incompatible tables
-- sharing a name → the campaigns feature has NEVER worked on prod.
--
-- DEPENDENCY: the founder-scoped campaigns references brand_profiles(id). Run
-- 2026-06-18_apply_missing_tables_prod.sql FIRST (it creates brand_profiles), then
-- this script. This script also creates campaign_assets — which is why it was
-- REMOVED from the missing-tables apply (it FK'd to the wrong campaigns there).
--
-- ⚠️ GATED: Part 1 RENAMES a prod table. Destructive DDL — requires Phill's explicit
-- approval. Low risk (0 rows, reversible).
-- Rollback for Part 1: ALTER TABLE public.campaigns_legacy_workspace RENAME TO campaigns;
-- ============================================================================

BEGIN;

-- ── Part 1: rename the dead workspace campaigns (guarded — only if it is the
--            legacy workspace_id-scoped table AND has no founder_id) ─────────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='campaigns' AND column_name='workspace_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='campaigns' AND column_name='founder_id'
  ) THEN
    IF to_regclass('public.campaigns_legacy_workspace') IS NULL THEN
      ALTER TABLE public.campaigns RENAME TO campaigns_legacy_workspace;
      RAISE NOTICE 'Renamed legacy workspace campaigns -> campaigns_legacy_workspace';
    END IF;
  END IF;
END $$;

-- ── Part 2: founder-scoped campaigns + campaign_assets (idempotent) ───────────
CREATE EXTENSION IF NOT EXISTS moddatetime;

CREATE TABLE IF NOT EXISTS public.campaigns (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brand_profile_id  UUID NOT NULL REFERENCES public.brand_profiles(id) ON DELETE CASCADE,
  theme             TEXT NOT NULL,
  objective         TEXT NOT NULL CHECK (objective IN ('awareness','engagement','conversion','retention')),
  platforms         TEXT[] NOT NULL DEFAULT '{}',
  post_count        INTEGER NOT NULL DEFAULT 5,
  date_range_start  DATE,
  date_range_end    DATE,
  status            TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','generating','ready','published')),
  metadata          JSONB NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS campaigns_founder_status_idx ON public.campaigns (founder_id, status);
CREATE INDEX IF NOT EXISTS campaigns_brand_profile_idx ON public.campaigns (brand_profile_id);
DROP TRIGGER IF EXISTS set_campaigns_updated_at ON public.campaigns;
CREATE TRIGGER set_campaigns_updated_at BEFORE UPDATE ON public.campaigns
  FOR EACH ROW EXECUTE PROCEDURE moddatetime(updated_at);
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "campaigns_select_own" ON public.campaigns;
CREATE POLICY "campaigns_select_own" ON public.campaigns FOR SELECT TO authenticated USING (founder_id = auth.uid());
DROP POLICY IF EXISTS "campaigns_insert_own" ON public.campaigns;
CREATE POLICY "campaigns_insert_own" ON public.campaigns FOR INSERT TO authenticated WITH CHECK (founder_id = auth.uid());
DROP POLICY IF EXISTS "campaigns_update_own" ON public.campaigns;
CREATE POLICY "campaigns_update_own" ON public.campaigns FOR UPDATE TO authenticated USING (founder_id = auth.uid()) WITH CHECK (founder_id = auth.uid());
DROP POLICY IF EXISTS "campaigns_delete_own" ON public.campaigns;
CREATE POLICY "campaigns_delete_own" ON public.campaigns FOR DELETE TO authenticated USING (founder_id = auth.uid());
DROP POLICY IF EXISTS "campaigns_service_role" ON public.campaigns;
CREATE POLICY "campaigns_service_role" ON public.campaigns FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.campaign_assets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id     UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  founder_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform        TEXT NOT NULL CHECK (platform IN ('facebook','instagram','linkedin','tiktok','youtube')),
  copy            TEXT NOT NULL,
  headline        TEXT,
  cta             TEXT,
  hashtags        TEXT[] NOT NULL DEFAULT '{}',
  image_url       TEXT,
  image_prompt    TEXT NOT NULL DEFAULT '',
  width           INTEGER NOT NULL DEFAULT 1080,
  height          INTEGER NOT NULL DEFAULT 1080,
  variant         INTEGER NOT NULL DEFAULT 1,
  social_post_id  UUID REFERENCES public.social_posts(id) ON DELETE SET NULL,
  status          TEXT NOT NULL DEFAULT 'pending_image' CHECK (status IN ('pending_image','generating_image','ready','published')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS campaign_assets_campaign_idx ON public.campaign_assets (campaign_id);
CREATE INDEX IF NOT EXISTS campaign_assets_founder_status_idx ON public.campaign_assets (founder_id, status);
DROP TRIGGER IF EXISTS set_campaign_assets_updated_at ON public.campaign_assets;
CREATE TRIGGER set_campaign_assets_updated_at BEFORE UPDATE ON public.campaign_assets
  FOR EACH ROW EXECUTE PROCEDURE moddatetime(updated_at);
ALTER TABLE public.campaign_assets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "campaign_assets_select_own" ON public.campaign_assets;
CREATE POLICY "campaign_assets_select_own" ON public.campaign_assets FOR SELECT TO authenticated USING (founder_id = auth.uid());
DROP POLICY IF EXISTS "campaign_assets_insert_own" ON public.campaign_assets;
CREATE POLICY "campaign_assets_insert_own" ON public.campaign_assets FOR INSERT TO authenticated WITH CHECK (founder_id = auth.uid());
DROP POLICY IF EXISTS "campaign_assets_update_own" ON public.campaign_assets;
CREATE POLICY "campaign_assets_update_own" ON public.campaign_assets FOR UPDATE TO authenticated USING (founder_id = auth.uid()) WITH CHECK (founder_id = auth.uid());
DROP POLICY IF EXISTS "campaign_assets_delete_own" ON public.campaign_assets;
CREATE POLICY "campaign_assets_delete_own" ON public.campaign_assets FOR DELETE TO authenticated USING (founder_id = auth.uid());
DROP POLICY IF EXISTS "campaign_assets_service_role" ON public.campaign_assets;
CREATE POLICY "campaign_assets_service_role" ON public.campaign_assets FOR ALL TO service_role USING (true) WITH CHECK (true);

COMMIT;

-- ── VERIFICATION ──────────────────────────────────────────────────────────────
SELECT
  to_regclass('public.campaigns_legacy_workspace') AS legacy_archived,
  (SELECT column_name FROM information_schema.columns
     WHERE table_schema='public' AND table_name='campaigns' AND column_name='founder_id') AS campaigns_is_founder_scoped,
  to_regclass('public.campaign_assets') AS campaign_assets;
