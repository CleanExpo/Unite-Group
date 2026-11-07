-- UNI-2326: a campaign publish creates at most one social_posts draft per platform.
--
-- Founder decision (07/11/2026): unique key on campaign id with insert-or-ignore,
-- so a repeat send of the same campaign is a no-op. Built behind the switch
-- CAMPAIGN_PUBLISH_DEDUPE_ENABLED (default off).
--
-- Writer: POST /api/campaigns/[id]/publish is the only route that turns a
-- campaign into social_posts drafts. With the switch on, it writes both columns
-- below and inserts with ON CONFLICT (campaign_id, campaign_platform) DO NOTHING.
-- The conflict columns are owned by CAMPAIGN_DRAFT_CONFLICT_COLUMNS in
-- apps/web/src/lib/campaigns/publish-dedupe.ts; a test pins the two together.
--
-- Existing data: both columns start NULL on every existing row. Postgres treats
-- NULLs as distinct in a UNIQUE constraint, so no existing row can conflict and
-- this migration cannot fail on old duplicates. Posts from other writers keep
-- NULL and are never constrained.
--
-- File only. Apply through a Supabase database branch first (repo CLAUDE.md DB
-- rule). The switch must stay off until this migration is applied.

ALTER TABLE public.social_posts
  ADD COLUMN IF NOT EXISTS campaign_id uuid NULL
    REFERENCES public.campaigns(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS campaign_platform text NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'social_posts_campaign_platform_key'
      AND conrelid = 'public.social_posts'::regclass
  ) THEN
    ALTER TABLE public.social_posts
      ADD CONSTRAINT social_posts_campaign_platform_key
      UNIQUE (campaign_id, campaign_platform);
  END IF;
END
$$;
